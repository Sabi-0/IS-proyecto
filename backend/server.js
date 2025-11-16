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

// --- RUTA MODIFICADA: Guardar Puntuación de Partida ---
app.post('/save-score', verificarToken, async (req, res) => {
// ... (código existente de /save-score)
  const user_uid = req.user.uid;
  
  const { score, questionsTotal, gameMode, categoryName, difficulty, correctAnswers, incorrectAnswers } = req.body;

  if (score === undefined || questionsTotal === undefined || correctAnswers === undefined || incorrectAnswers === undefined) {
    return res.status(400).send({ error: 'Faltan datos de la puntuación (score, total, correct, incorrect).' });
  }

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN');

    const sessionQuery = `
      INSERT INTO game_sessions 
        (user_uid, game_mode, category_name, difficulty, score, questions_total, started_at, ended_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `;
    await client.query(sessionQuery, [user_uid, gameMode, categoryName, difficulty, score, questionsTotal]);
    
    const statsQuery = `
      UPDATE user_stats 
      SET 
        total_score = total_score + $1,
        games_played = games_played + 1,
        correct_answers = correct_answers + $2,
        incorrect_answers = incorrect_answers + $3
      WHERE user_uid = $4
    `;
    await client.query(statsQuery, [score, correctAnswers, incorrectAnswers, user_uid]); 

    await client.query('COMMIT');
    
    console.log(`Puntuación guardada para el usuario ${user_uid}. Score: ${score}, Correctas: ${correctAnswers}, Incorrectas: ${incorrectAnswers}`);
    res.status(200).send({ message: 'Puntuación guardada exitosamente.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar la puntuación:', error);
    res.status(500).send({ error: 'Error interno al guardar la puntuación.' });
  } finally {
    client.release();
  }
});

// --- RUTA MODIFICADA: Obtener Perfil de Usuario ---
app.get('/profile', verificarToken, async (req, res) => {
// ... (código existente de /profile)
  const user_uid = req.user.uid;
  console.log(`Petición recibida para /profile del usuario ${user_uid}`);
  
  try {
    const query = `
      SELECT 
        u.display_name, 
        u.email, 
        u.avatar_url,
        u.created_at,
        s.total_score, 
        s.games_played, 
        s.correct_answers, 
        s.incorrect_answers 
      FROM users u
      LEFT JOIN user_stats s ON u.firebase_uid = s.user_uid
      WHERE u.firebase_uid = $1;
    `;
    const { rows } = await pool.query(query, [user_uid]);

    if (rows.length === 0) {
      return res.status(404).send({ error: 'Perfil de usuario no encontrado.' });
    }
    
    console.log("Perfil de usuario enviado:", rows[0]);
    res.status(200).json(rows[0]); 

  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).send({ error: 'Error interno al obtener el perfil.' });
  }
});

// POST /profile/avatar - Actualiza el avatar del usuario
app.post('/profile/avatar', verificarToken, async (req, res) => {
// ... (código existente de /profile/avatar)
  const user_uid = req.user.uid;
  const { avatarUrl } = req.body; 

  if (!avatarUrl) {
    return res.status(400).send({ error: 'No se proporcionó URL de avatar.' });
  }

  console.log(`Actualizando avatar para ${user_uid} a: ${avatarUrl}`);

  try {
    const query = `
      UPDATE users 
      SET avatar_url = $1 
      WHERE firebase_uid = $2
      RETURNING avatar_url;
    `;
    const { rows } = await pool.query(query, [avatarUrl, user_uid]);

    if (rows.length === 0) {
      return res.status(404).send({ error: 'Usuario no encontrado para actualizar.' });
    }

    res.status(200).send({ message: 'Avatar actualizado exitosamente.', avatarUrl: rows[0].avatar_url });

  } catch (error) {
    console.error('Error al actualizar el avatar:', error);
    res.status(500).send({ error: 'Error interno al actualizar el avatar.' });
  }
});


// --- RUTA: Obtener Leaderboard ---
app.get('/leaderboard', async (req, res) => {
// ... (código existente de /leaderboard)
  console.log("Petición recibida para /leaderboard");
  try {
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
    res.status(200).json(rows); 

  } catch (error) {
    console.error('Error al obtener el leaderboard:', error);
    res.status(500).send({ error: 'Error interno al obtener el leaderboard.' });
  }
});

// GET /learning/progress - Obtener qué lecciones ha completado el usuario
app.get('/learning/progress', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  try {
    // Asumiendo que creaste la tabla 'user_lesson_progress' con el script SQL
    const query = 'SELECT lesson_id FROM user_lesson_progress WHERE user_uid = $1';
    const { rows } = await pool.query(query, [user_uid]);
    
    // Devolvemos un array simple de IDs: ['m1-l1', 'm1-l2']
    const completedLessonIds = rows.map(row => row.lesson_id);
    res.status(200).json(completedLessonIds);
  } catch (error) {
    console.error('Error al obtener progreso de aprendizaje:', error);
    res.status(500).send({ error: 'Error interno.' });
  }
});

// POST /learning/complete - Marcar una lección como completada
app.post('/learning/complete', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  const { lessonId } = req.body;

  if (!lessonId) return res.status(400).send({ error: 'Falta el ID de la lección.' });

  try {
    // Guardamos el progreso. ON CONFLICT DO NOTHING evita errores si ya estaba completada.
    const query = `
      INSERT INTO user_lesson_progress (user_uid, lesson_id, completed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_uid, lesson_id) DO NOTHING
    `;
    await pool.query(query, [user_uid, lessonId]);
    res.status(200).send({ message: 'Lección registrada como completada.' });
  } catch (error) {
    console.error('Error al guardar progreso de aprendizaje:', error);
    res.status(500).send({ error: 'Error interno.' });
  }
});


// --- Configuración del Servidor HTTP y Socket.io ---
const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    // Ahora aceptamos ambas URLs: tu localhost y tu Vercel
    origin: [
      "http://localhost:3000", 
      "https://is-proyecto-doud.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});


let connectedUsers = []; let gameState = {
  status: 'lobby', 
  currentRound: 0,
  totalRounds: 3,  // Configurado a 3 Rondas
  questions: [],   
  playerScores: {}, 
  answersInRound: 0
};

// Función para limpiar texto de la API
const decodeHTMLEntities = (text) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

io.on('connection', (socket) => {
  console.log('Conexión socket:', socket.id);

  // 1. Unirse al Lobby
  socket.on('joinLobby', (userData) => {
    const displayName = userData.displayName || `Jugador`;
    
    // Verificar si ya existe para no duplicar en la lista visual
    const existingUserIndex = connectedUsers.findIndex(u => u.id === socket.id);
    if (existingUserIndex === -1) {
        connectedUsers.push({ id: socket.id, displayName });
        gameState.playerScores[socket.id] = 0; // Inicializar score
    }
    
    io.emit('updateUserList', connectedUsers);
    socket.emit('welcomeMessage', `¡Bienvenido al lobby, ${displayName}!`);
  });

  // 2. Iniciar el Torneo
  socket.on('startTournament', async () => {
    if (gameState.status === 'playing') return; // Ya empezó
    
    console.log("¡Iniciando torneo!");
    gameState.status = 'playing';
    gameState.currentRound = 0;
    gameState.answersInRound = 0;
    
    // Resetear puntajes
    connectedUsers.forEach(u => gameState.playerScores[u.id] = 0);

    // Obtener preguntas de la API
    try {
        const apiUrl = `https://opentdb.com/api.php?amount=${gameState.totalRounds}&type=multiple`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.response_code === 0) {
            gameState.questions = data.results;
            io.emit('tournamentStarting'); // Avisar al frontend para cambiar de pantalla
            
            // Esperar 3 segundos y mandar la primera pregunta
            setTimeout(() => sendNextQuestion(), 3000);
        } else {
            console.error("Error API OpenTDB");
            gameState.status = 'lobby';
        }
    } catch (e) {
        console.error("Error fetch:", e);
        gameState.status = 'lobby';
    }
  });

  // 3. Recibir Respuesta
  socket.on('submitAnswer', (data) => {
      const { answer } = data;
      const currentQ = gameState.questions[gameState.currentRound];
      
      if (currentQ) {
          const isCorrect = decodeHTMLEntities(answer) === decodeHTMLEntities(currentQ.correct_answer);
          if (isCorrect) {
              gameState.playerScores[socket.id] += 100; // 100 puntos por correcta
          }
      }

      gameState.answersInRound++;

      // Si todos respondieron, siguiente ronda
      if (gameState.answersInRound >= connectedUsers.length) {
          gameState.currentRound++;
          gameState.answersInRound = 0;

          if (gameState.currentRound < gameState.totalRounds) {
              setTimeout(() => sendNextQuestion(), 2000); 
          } else {
              setTimeout(() => endGame(), 2000); 
          }
      }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
    delete gameState.playerScores[socket.id];
    io.emit('updateUserList', connectedUsers);
    
    if (connectedUsers.length === 0) {
        gameState.status = 'lobby';
    }
  });
});

// --- Funciones Auxiliares del Juego ---

function sendNextQuestion() {
    const q = gameState.questions[gameState.currentRound];
    const allOptions = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    
    const questionPayload = {
        round: gameState.currentRound + 1,
        total: gameState.totalRounds,
        category: q.category,
        question: q.question,
        options: allOptions
    };
    
    io.emit('newQuestion', questionPayload);
}

function endGame() {
    gameState.status = 'finished';
    
    const podium = connectedUsers.map(user => ({
        displayName: user.displayName,
        score: gameState.playerScores[user.id] || 0
    })).sort((a, b) => b.score - a.score);

    console.log("Torneo terminado. Podio:", podium);
    io.emit('gameEnded', { podium });
    
    // Volver al lobby en 15 segundos
    setTimeout(() => {
        gameState.status = 'lobby';
    }, 15000);
}

// --- Iniciar el Servidor ---
server.listen(port, () => {
// ... (código existente sin cambios)
  console.log(`Servidor API y WebSocket corriendo en http://localhost:${port}`);
});