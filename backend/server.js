require('dotenv').config(); 

// --- Importaciones ---
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const http = require('http'); // Necesario para Socket.io
const { Server } = require("socket.io"); // Importamos Socket.io

// --- Configuración Inicial ---
const app = express();
const port = 4000;

// --- Configuración de Firebase Admin ---
const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Configuración de PostgreSQL (Conectado a Supabase) ---
// El Pool ahora toma la cadena de conexión directamente desde el archivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requiere SSL
  ssl: {
    rejectUnauthorized: false
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware para verificar el token de Firebase
async function verificarToken(req, res, next) {
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
  const firebaseUid = req.user.uid;
  const email = req.user.email;
  // Usamos el display_name de Firebase si existe, si no, el email
  const displayName = req.user.name || req.user.email.split('@')[0];

  console.log(`Intentando sincronizar usuario: ${firebaseUid}`);

  try {
    // 1. Revisamos si el usuario ya existe en nuestra BD
    const userCheck = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userCheck.rows.length === 0) {
      // 2. Si no existe, lo creamos
      console.log(`Usuario ${firebaseUid} no encontrado, creando...`);
      await pool.query(
        'INSERT INTO users (firebase_uid, email, display_name, created_at) VALUES ($1, $2, $3, NOW())',
        [firebaseUid, email, displayName]
      );
      console.log(`Usuario ${firebaseUid} creado exitosamente.`);
      // El disparador (trigger) en Supabase creará automáticamente la fila en user_stats
      res.status(201).send({ message: 'Usuario creado y sincronizado.' });
    } else {
      // 3. Si ya existe, solo respondemos OK
      console.log(`Usuario ${firebaseUid} ya existe.`);
      res.status(200).send({ message: 'Usuario ya sincronizado.' });
    }
  } catch (dbError) {
    console.error('Error en la base de datos al sincronizar usuario:', dbError);
    res.status(500).send({ error: 'Error interno del servidor.' });
  }
});

// --- (Aquí irán tus futuras rutas: /leaderboard, /save-score, etc.) ---


// --- Configuración del Servidor HTTP y Socket.io ---
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Permite la conexión desde tu frontend de React
    methods: ["GET", "POST"]
  }
});

let connectedUsers = []; // Lista simple para mantener a los usuarios conectados

// Lógica de Socket.io
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
  console.log(`Servidor API y WebSocket corriendo en http://localhost:${port}`);
});