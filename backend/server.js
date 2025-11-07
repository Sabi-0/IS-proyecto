// --- Cargar variables de entorno ---
require('dotenv').config(); 

// --- Importaciones ---
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");

// --- Configuración Inicial ---
const app = express();
const port = 4000;

// --- Configuración de Firebase Admin ---
const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Configuración de PostgreSQL (Conectado a Supabase) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware para verificar el token de Firebase
async function verificarToken(req, res, next) {
// ... (código existente sin cambios)
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
  
  // --- ¡CORRECCIÓN CLAVE DE ROBUSTEZ! ---
  // Los usuarios anónimos (invitados) no tienen email.
  // Verificamos si existe el email antes de continuar.
  if (!req.user.email) {
    console.log(`Intento de sincronización de usuario anónimo (UID: ${firebaseUid}). Sincronización omitida.`);
    // Respondemos con éxito, porque el frontend no necesita hacer nada más.
    return res.status(200).send({ message: 'Usuario anónimo, no se requiere sincronización.' });
  }
  // --- FIN DE LA CORRECCIÓN ---

  const email = req.user.email;
  // Usamos el display_name de Firebase si existe, si no, creamos uno a partir del email
  const displayName = req.user.name || email.split('@')[0]; // Ahora 'email' NUNCA será nulo aquí

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