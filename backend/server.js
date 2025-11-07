// --- Cargar variables de entorno ---
require('dotenv').config(); 

// --- Importaciones ---
// ... (imports existentes: express, cors, admin, pg, http, Server)
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");

// --- Configuración Inicial ---
// ... (config existente: app, port)
const app = express();
const port = 4000;

// --- Configuración de Firebase Admin ---
// ... (config existente: serviceAccount, admin.initializeApp)
const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Configuración de PostgreSQL (Conectado a Supabase) ---
// ... (config existente: pool)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middlewares
// ... (config existente: app.use(cors), app.use(express.json))
app.use(cors());
app.use(express.json());

// Middleware para verificar el token de Firebase
async function verificarToken(req, res, next) {
// ... (código existente de verificarToken)
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).send('No autorizado: Token no proporcionado.');
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(401).send('No autorizado: Token inválido.');
  }
}

// --- Ruta API para Sincronizar Usuario ---
app.post('/sync-user', verificarToken, async (req, res) => {
// ... (código existente de /sync-user)
  const firebaseUid = req.user.uid;
  
  if (!req.user.email) {
    console.log(`Intento de sincronización de usuario anónimo (UID: ${firebaseUid}). Sincronización omitida.`);
    return res.status(200).send({ message: 'Usuario anónimo, no se requiere sincronización.' });
  }

  const email = req.user.email;
  const displayName = req.user.name || email.split('@')[0]; 

  console.log(`Intentando sincronizar usuario: ${firebaseUid}`);

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userCheck.rows.length === 0) {
      console.log(`Usuario ${firebaseUid} no encontrado, creando...`);
      await pool.query(
        'INSERT INTO users (firebase_uid, email, display_name, created_at) VALUES ($1, $2, $3, NOW())',
        [firebaseUid, email, displayName]
      );
      console.log(`Usuario ${firebaseUid} creado exitosamente.`);
      res.status(201).send({ message: 'Usuario creado y sincronizado.' });
    } else {
      console.log(`Usuario ${firebaseUid} ya existe.`);
      res.status(200).send({ message: 'Usuario ya sincronizado.' });
    }
  } catch (dbError) {
    console.error('Error en la base de datos al sincronizar usuario:', dbError);
    res.status(500).send({ error: 'Error interno del servidor.' });
  }
});

// --- (Aquí irán tus futuras rutas: /leaderboard, /save-score, etc.) ---
// --- NUEVA RUTA: Guardar Puntuación de Partida ---
app.post('/save-score', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  // Obtenemos los datos de la partida desde el frontend
  const { score, questionsTotal, gameMode, categoryName, difficulty } = req.body;

  // Validamos que tenemos los datos mínimos
  if (score === undefined || questionsTotal === undefined) {
    return res.status(400).send({ error: 'Faltan datos de la puntuación.' });
  }

  const client = await pool.connect(); // Conectamos a la DB

  try {
    // Iniciamos una transacción para asegurar que ambas operaciones (guardar sesión y actualizar stats) se completen
    await client.query('BEGIN');

    // 1. Insertamos la sesión de juego en la tabla 'game_sessions'
    const sessionQuery = `
      INSERT INTO game_sessions 
        (user_uid, game_mode, category_name, difficulty, score, questions_total, started_at, ended_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `;
    await client.query(sessionQuery, [user_uid, gameMode, categoryName, difficulty, score, questionsTotal]);
    
    // 2. Actualizamos las estadísticas acumulativas del usuario en 'user_stats'
    const statsQuery = `
      UPDATE user_stats 
      SET 
        total_score = total_score + $1,
        games_played = games_played + 1,
        correct_answers = correct_answers + $2 
      WHERE user_uid = $3
    `;
    await client.query(statsQuery, [score, score, user_uid]); // Asumimos que score = N° de respuestas correctas por ahora

    // Si todo va bien, confirmamos la transacción
    await client.query('COMMIT');
    
    console.log(`Puntuación guardada para el usuario ${user_uid}. Score: ${score}`);
    res.status(200).send({ message: 'Puntuación guardada exitosamente.' });

  } catch (error) {
    // Si algo falla, revertimos la transacción
    await client.query('ROLLBACK');
    console.error('Error al guardar la puntuación:', error);
    res.status(500).send({ error: 'Error interno al guardar la puntuación.' });
  } finally {
    // Liberamos la conexión
    client.release();
  }
});

// --- NUEVA RUTA: Obtener Leaderboard ---
// Esta ruta es pública (no usa 'verificarToken') para que cualquiera la pueda ver.
app.get('/leaderboard', async (req, res) => {
  console.log("Petición recibida para /leaderboard");
  try {
    // Unimos 'user_stats' con 'users' para obtener los nombres
    const query = `
      SELECT 
        u.display_name, 
        s.total_score,
        s.games_played
      FROM user_stats s
      JOIN users u ON s.user_uid = u.firebase_uid
      ORDER BY s.total_score DESC
      LIMIT 10; 
    `;
    
    const { rows } = await pool.query(query);
    
    console.log("Leaderboard enviado:", rows);
    res.status(200).json(rows); // Enviamos el top 10 como JSON

  } catch (error) {
    console.error('Error al obtener el leaderboard:', error);
    res.status(500).send({ error: 'Error interno al obtener el leaderboard.' });
  }
});


// --- Configuración del Servidor HTTP y Socket.io ---
const server = http.createServer(app); 
// ... (código existente de Socket.io sin cambios)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let connectedUsers = []; 

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado:', socket.id);

  socket.on('joinLobby', (userData) => {
    console.log('Usuario', userData.displayName, 'se unió al lobby');
    const newUser = { id: socket.id, displayName: userData.displayName || `Jugador_${socket.id.substring(0,4)}` };
    connectedUsers.push(newUser);
    io.emit('updateUserList', connectedUsers);
    socket.emit('welcomeMessage', `¡Bienvenido al lobby, ${newUser.displayName}!`);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
    io.emit('updateUserList', connectedUsers);
  });
});


// --- Iniciar el Servidor ---
server.listen(port, () => {
// ... (código existente sin cambios)
  console.log(`Servidor API y WebSocket corriendo en http://localhost:${port}`);
});