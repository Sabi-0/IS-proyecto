require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const port = 4000;

// --- Configuración de Firebase Admin ---
const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Configuración de PostgreSQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(cors());
app.use(express.json());

// --- PREGUNTAS DE RESPALDO (PLAN B) ---
const BACKUP_QUESTIONS = [
    { category: "Plan B", question: "¿Cuál es el planeta más grande del sistema solar?", correct_answer: "Júpiter", incorrect_answers: ["Tierra", "Marte", "Saturno"] },
    { category: "Plan B", question: "¿Cuánto es 2 + 2?", correct_answer: "4", incorrect_answers: ["3", "5", "22"] },
    { category: "Plan B", question: "¿Capital de Francia?", correct_answer: "París", incorrect_answers: ["Londres", "Madrid", "Berlín"] }
];

// Middleware para verificar token
async function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).send('No autorizado');
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).send('Token inválido');
  }
}

// --- RUTAS API ---
app.post('/sync-user', verificarToken, async (req, res) => {
  const firebaseUid = req.user.uid;
  if (!req.user.email) return res.status(200).send({ message: 'Anonimo' });
  const email = req.user.email;
  const displayName = req.user.name || email.split('@')[0]; 
  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
    if (userCheck.rows.length === 0) {
      await pool.query('INSERT INTO users (firebase_uid, email, display_name, created_at) VALUES ($1, $2, $3, NOW())', [firebaseUid, email, displayName]);
      res.status(201).send({ message: 'Usuario creado.' });
    } else {
      res.status(200).send({ message: 'Usuario existente.' });
    }
  } catch (dbError) { console.error(dbError); res.status(500).send({ error: 'Error DB' }); }
});

app.post('/save-score', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  const { score, questionsTotal, gameMode, categoryName, difficulty, correctAnswers, incorrectAnswers } = req.body;
  if (score === undefined) return res.status(400).send({ error: 'Faltan datos.' });
  const client = await pool.connect(); 
  try {
    await client.query('BEGIN');
    const sessionQuery = `INSERT INTO game_sessions (user_uid, game_mode, category_name, difficulty, score, questions_total, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`;
    await client.query(sessionQuery, [user_uid, gameMode, categoryName, difficulty, score, questionsTotal]);
    const statsQuery = `UPDATE user_stats SET total_score = total_score + $1, games_played = games_played + 1, correct_answers = correct_answers + $2, incorrect_answers = incorrect_answers + $3 WHERE user_uid = $4`;
    await client.query(statsQuery, [score, correctAnswers || 0, incorrectAnswers || 0, user_uid]); 
    await client.query('COMMIT');
    res.status(200).send({ message: 'Puntuación guardada.' });
  } catch (error) { await client.query('ROLLBACK'); res.status(500).send({ error: 'Error interno.' }); } finally { client.release(); }
});

app.get('/profile', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  try {
    const query = `SELECT u.display_name, u.email, u.avatar_url, u.created_at, s.total_score, s.games_played, s.correct_answers, s.incorrect_answers FROM users u LEFT JOIN user_stats s ON u.firebase_uid = s.user_uid WHERE u.firebase_uid = $1;`;
    const { rows } = await pool.query(query, [user_uid]);
    if (rows.length === 0) return res.status(404).send({ error: 'Perfil no encontrado.' });
    res.status(200).json(rows[0]); 
  } catch (error) { res.status(500).send({ error: 'Error interno.' }); }
});

app.post('/profile/avatar', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  const { avatarUrl } = req.body; 
  if (!avatarUrl) return res.status(400).send({ error: 'No URL.' });
  try {
    const { rows } = await pool.query('UPDATE users SET avatar_url = $1 WHERE firebase_uid = $2 RETURNING avatar_url', [avatarUrl, user_uid]);
    res.status(200).send({ message: 'Avatar actualizado.', avatarUrl: rows[0].avatar_url });
  } catch (error) { res.status(500).send({ error: 'Error interno.' }); }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const query = `SELECT u.display_name, s.total_score, s.games_played FROM user_stats s JOIN users u ON s.user_uid = u.firebase_uid ORDER BY s.total_score DESC LIMIT 10;`;
    const { rows } = await pool.query(query);
    res.status(200).json(rows); 
  } catch (error) { res.status(500).send({ error: 'Error interno.' }); }
});

app.get('/learning/progress', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  try {
    const query = 'SELECT lesson_id FROM user_lesson_progress WHERE user_uid = $1';
    const { rows } = await pool.query(query, [user_uid]);
    const completedLessonIds = rows.map(row => row.lesson_id);
    res.status(200).json(completedLessonIds);
  } catch (error) { res.status(500).send({ error: 'Error interno.' }); }
});

app.post('/learning/complete', verificarToken, async (req, res) => {
  const user_uid = req.user.uid;
  const { lessonId } = req.body;
  if (!lessonId) return res.status(400).send({ error: 'Falta ID.' });
  try {
    const query = `INSERT INTO user_lesson_progress (user_uid, lesson_id, completed_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_uid, lesson_id) DO NOTHING`;
    await pool.query(query, [user_uid, lessonId]);
    res.status(200).send({ message: 'Lección completada.' });
  } catch (error) { res.status(500).send({ error: 'Error interno.' }); }
});


// --- LÓGICA DE JUEGO ONLINE (SOCKET.IO) ---

const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "https://is-proyecto.vercel.app",      // Tu dominio principal
      "https://is-proyecto-doud.vercel.app"  // Tu dominio de despliegue
    ],
    methods: ["GET", "POST"]
  }
});

let connectedUsers = []; 
let gameState = {
  status: 'lobby', 
  currentRound: 0,
  totalRounds: 3,
  questions: [],   
  playerScores: {}, 
  answersInRound: 0
};

const decodeHTMLEntities = (text) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

io.on('connection', (socket) => {
  console.log('Conexión socket:', socket.id);

  socket.on('joinLobby', (userData) => {
    const displayName = userData.displayName || `Jugador`;
    const existingUserIndex = connectedUsers.findIndex(u => u.id === socket.id);
    if (existingUserIndex === -1) {
        connectedUsers.push({ id: socket.id, displayName });
        gameState.playerScores[socket.id] = 0; 
    }
    io.emit('updateUserList', connectedUsers);
    socket.emit('welcomeMessage', `¡Bienvenido al lobby, ${displayName}!`);
  });

  socket.on('startTournament', async () => {
    if (gameState.status === 'playing') return; 
    console.log("¡Iniciando torneo!");
    gameState.status = 'playing';
    gameState.currentRound = 0;
    gameState.answersInRound = 0;
    connectedUsers.forEach(u => gameState.playerScores[u.id] = 0);

    io.emit('gameLoading');

    try {
        const apiUrl = `https://opentdb.com/api.php?amount=${gameState.totalRounds}&type=multiple`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.response_code === 0) {
            gameState.questions = data.results;
        } else {
            throw new Error("API OpenTDB error");
        }
    } catch (e) {
        console.error("Usando Plan B");
        gameState.questions = BACKUP_QUESTIONS;
    }

    io.emit('tournamentStarting'); 
    setTimeout(() => sendNextQuestion(), 3000);
  });

  socket.on('submitAnswer', (data) => {
      const { answer } = data;
      const currentQ = gameState.questions[gameState.currentRound];
      if (currentQ) {
          const isCorrect = decodeHTMLEntities(answer) === decodeHTMLEntities(currentQ.correct_answer);
          if (isCorrect) gameState.playerScores[socket.id] += 100; 
      }
      gameState.answersInRound++;
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

  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
    delete gameState.playerScores[socket.id];
    io.emit('updateUserList', connectedUsers);
    if (connectedUsers.length === 0) gameState.status = 'lobby';
  });
});

function sendNextQuestion() {
    if (!gameState.questions[gameState.currentRound]) { endGame(); return; }
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

    io.emit('gameEnded', { podium });
    setTimeout(() => gameState.status = 'lobby', 15000);
}

server.listen(port, () => {
  console.log(`Servidor API y WebSocket corriendo en http://localhost:${port}`);
});