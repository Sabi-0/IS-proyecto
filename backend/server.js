// --- Cargar variables de entorno ---
require('dotenv').config(); 

// --- Importaciones ---
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require("socket.io");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

// --- Preguntas de Respaldo (Plan B) ---
const BACKUP_QUESTIONS = [
    { category: "Plan B (Ciencia)", question: "¿Planeta más grande?", correct_answer: "Júpiter", incorrect_answers: ["Tierra", "Marte", "Saturno"] },
    { category: "Plan B (Ciencia)", question: "¿Fórmula del agua?", correct_answer: "H2O", incorrect_answers: ["CO2", "O2", "NaCl"] },
    { category: "Plan B (Ciencia)", question: "¿Metal líquido a temp. ambiente?", correct_answer: "Mercurio", incorrect_answers: ["Plomo", "Cobre", "Aluminio"] },
    { category: "Plan B (Ciencia)", question: "¿Qué gas respiran las plantas?", correct_answer: "Dióxido de Carbono", incorrect_answers: ["Oxígeno", "Nitrógeno", "Helio"] },
    { category: "Plan B (Ciencia)", question: "¿Centro de la célula?", correct_answer: "Núcleo", incorrect_answers: ["Membrana", "Mitocondria", "Citoplasma"] },
    // Ronda 2
    { category: "Plan B (Historia)", question: "Capital de Francia?", correct_answer: "París", incorrect_answers: ["Londres", "Madrid", "Berlín"] },
    { category: "Plan B (Historia)", question: "¿En qué año cayó el muro de Berlín?", correct_answer: "1989", incorrect_answers: ["1991", "1987", "1990"] },
    { category: "Plan B (Historia)", question: "¿Quién pintó la Mona Lisa?", correct_answer: "Leonardo da Vinci", incorrect_answers: ["Miguel Ángel", "Rafael", "Donatello"] },
    { category: "Plan B (Historia)", question: "¿Dónde se originaron los Juegos Olímpicos?", correct_answer: "Grecia", incorrect_answers: ["Roma", "Egipto", "China"] },
    { category: "Plan B (Historia)", question: "Primera guerra mundial empezó en?", correct_answer: "1914", incorrect_answers: ["1912", "1916", "1918"] },
    // Ronda 3
    { category: "Plan B (General)", question: "2 + 2?", correct_answer: "4", incorrect_answers: ["3", "5", "22"] },
    { category: "Plan B (General)", question: "¿Color del cielo?", correct_answer: "Azul", incorrect_answers: ["Verde", "Rojo", "Amarillo"] },
    { category: "Plan B (General)", question: "¿Cuántos días tiene la semana?", correct_answer: "7", incorrect_answers: ["5", "6", "8"] },
    { category: "Plan B (General)", question: "¿Océano más grande?", correct_answer: "Pacífico", incorrect_answers: ["Atlántico", "Índico", "Ártico"] },
    { category: "Plan B (General)", question: "¿Inverso de 'caliente'?", correct_answer: "Frío", incorrect_answers: ["Tibio", "Helado", "Templado"] }
];

// --- Middleware de Token (sin cambios) ---
async function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).send('No autorizado');
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) { res.status(401).send('Token inválido'); }
}

// --- TODAS TUS RUTAS API (Sin cambios) ---
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
      "https://is-proyecto.vercel.app",
      "https://is-proyecto-doud.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

// --- Estado Global del Torneo ---
let connectedUsers = []; // Guarda { id: socketId, displayName: '...', uid: '...' }
let gameState = {
  status: 'lobby', // 'lobby', 'loading', 'playing', 'finished'
  currentQuestionIndex: 0,
  totalQuestions: 15, // 3 Rondas x 5 Preguntas
  questions: [],   
  playerScores: {}, // { socketId: { score: 100, name: 'Samuel', uid: '...' } }
  playerAnswers: {} // { socketId: 'Respuesta' }
};

const decodeHTMLEntities = (text) => {
  if (!text) return "";
  return text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

const getRandomCategoryID = () => Math.floor(Math.random() * (32 - 9 + 1)) + 9;
const difficulties = ['easy', 'medium', 'hard'];
const getRandomDifficulty = () => difficulties[Math.floor(Math.random() * difficulties.length)];

io.on('connection', (socket) => {
  console.log('Conexión socket:', socket.id);

  // --- 1. UNIRSE AL LOBBY (AHORA SEGURO CON TOKEN) ---
  socket.on('joinLobby', async (data) => {
    try {
      // Verificamos el token de Firebase que envía el cliente
      const decodedToken = await admin.auth().verifyIdToken(data.token);
      const user_uid = decodedToken.uid;

      // Buscamos el nombre de usuario en nuestra DB de Supabase
      const { rows } = await pool.query('SELECT display_name FROM users WHERE firebase_uid = $1', [user_uid]);
      const displayName = rows.length > 0 ? rows[0].display_name : "Jugador";

      // Añadimos al usuario a la lista
      const existingUser = connectedUsers.find(u => u.id === socket.id);
      if (!existingUser) {
          const newUser = { id: socket.id, displayName, uid: user_uid };
          connectedUsers.push(newUser);
          gameState.playerScores[socket.id] = { score: 0, name: displayName, uid: user_uid }; 
      }
      
      io.emit('updateUserList', connectedUsers);
      socket.emit('welcomeMessage', `¡Bienvenido al lobby, ${displayName}!`);

    } catch (error) {
      console.error("Error en joinLobby (token inválido?):", error.message);
      socket.emit('error', 'Autenticación fallida.');
    }
  });

  // --- 2. INICIAR TORNEO (LÓGICA ARREGLADA) ---
  socket.on('startTournament', async () => {
    if (gameState.status !== 'lobby') return; 
    
    console.log("¡Intentando iniciar torneo 3x5!");
    gameState.status = 'loading';
    gameState.currentQuestionIndex = 0;
    gameState.playerAnswers = {};
    connectedUsers.forEach(u => {
      if(gameState.playerScores[u.id]) {
        gameState.playerScores[u.id].score = 0;
      }
    });

    io.emit('gameLoading'); // Feedback visual

    try {
        let allQuestions = [];
        // Pedimos 3 rondas de 5 preguntas
        for (let i = 0; i < 3; i++) {
            const category = getRandomCategoryID();
            const difficulty = getRandomDifficulty();
            const apiUrl = `https://opentdb.com/api.php?amount=5&category=${category}&difficulty=${difficulty}&type=multiple`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.response_code === 0 && data.results.length > 0) {
                allQuestions.push(...data.results);
            } else {
                // Si la API falla, intentamos una genérica
                const retryResponse = await fetch(`https://opentdb.com/api.php?amount=5&type=multiple`);
                const retryData = await retryResponse.json();
                if (retryData.results && retryData.results.length > 0) {
                    allQuestions.push(...retryData.results);
                }
            }
        }
        
        // --- ¡ARREGLO DEL BUG! ---
        // 1. Revisar si tenemos CUALQUIER pregunta
        if (allQuestions.length === 0) {
            console.warn("API falló completamente. Usando 15 preguntas de respaldo.");
            gameState.questions = [...BACKUP_QUESTIONS]; // Usar una copia
        } else {
            // 2. Si tenemos, pero menos de 15, rellenar
            if (allQuestions.length < 15) {
                console.warn(`API solo trajo ${allQuestions.length}. Rellenando...`);
                const needed = 15 - allQuestions.length;
                allQuestions.push(...BACKUP_QUESTIONS.slice(0, needed));
            }
            gameState.questions = allQuestions.slice(0, 15); // Asegurar 15
        }
        
        gameState.totalQuestions = gameState.questions.length;
        if (gameState.totalQuestions === 0) throw new Error("No hay preguntas de respaldo");

    } catch (e) {
        console.error("Error crítico al buscar preguntas. Usando 15 de respaldo.", e.message);
        gameState.questions = [...BACKUP_QUESTIONS];
        gameState.totalQuestions = BACKUP_QUESTIONS.length;
    }

    gameState.status = 'playing';
    io.emit('tournamentStarting'); 
    setTimeout(() => sendNextQuestion(), 2000); // Empezar el juego
  });

  // --- 3. RECIBIR RESPUESTA (Sin cambios) ---
  socket.on('submitAnswer', (data) => {
      if (gameState.playerAnswers[socket.id]) return; // Ya respondió
      if (!gameState.questions[gameState.currentQuestionIndex]) return; // Juego terminó
      
      const { answer } = data;
      const currentQ = gameState.questions[gameState.currentQuestionIndex];
      gameState.playerAnswers[socket.id] = answer; 

      if (currentQ) {
          const isCorrect = decodeHTMLEntities(answer) === decodeHTMLEntities(currentQ.correct_answer);
          if (isCorrect) {
            // Asegurarse que el score existe antes de sumar
            if (gameState.playerScores[socket.id]) {
                gameState.playerScores[socket.id].score += 100;
            }
          }
      }

      const answeredCount = Object.keys(gameState.playerAnswers).length;
      if (answeredCount >= connectedUsers.length) {
          endRound(); 
      }
  });

  // --- 4. DESCONEXIÓN (Sin cambios) ---
  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    const wasInLobby = connectedUsers.some(u => u.id === socket.id);
    connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
    // No borramos el puntaje, por si se reconecta
    // delete gameState.playerScores[socket.id]; 
    delete gameState.playerAnswers[socket.id]; 
    
    if(wasInLobby) io.emit('updateUserList', connectedUsers);
    
    if (connectedUsers.length === 0) {
        gameState.status = 'lobby';
        gameState.questions = [];
    } else {
        const answeredCount = Object.keys(gameState.playerAnswers).length;
        if (gameState.status === 'playing' && answeredCount >= connectedUsers.length) {
            endRound();
        }
    }
  });
});

// --- Funciones Auxiliares del Juego ---

function sendNextQuestion() {
    if (!gameState.questions[gameState.currentQuestionIndex]) {
        endGame(); // No hay más preguntas
        return;
    }
    gameState.playerAnswers = {}; // Reseteamos respuestas
    const q = gameState.questions[gameState.currentQuestionIndex];
    const allOptions = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    
    const questionPayload = {
        round: gameState.currentQuestionIndex + 1,
        totalQuestions: gameState.totalQuestions,
        categoryName: q.category,
        question: q.question,
        options: allOptions
    };
    io.emit('newQuestion', questionPayload);
}

function endRound() {
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    
    // 1. Enviamos la respuesta correcta (¡el frontend lo necesita!)
    io.emit('roundResults', { 
        correctAnswer: currentQ.correct_answer 
    });

    // 2. Pasamos a la siguiente pregunta
    gameState.currentQuestionIndex++;
    
    // 3. Verificamos si el juego terminó
    if (gameState.currentQuestionIndex >= gameState.totalQuestions) {
        setTimeout(() => endGame(), 3000); // Esperar 3s para mostrar podio
    } else {
        setTimeout(() => sendNextQuestion(), 3000); // Esperar 3s para ver la respuesta
    }
}

async function endGame() {
    gameState.status = 'finished';
    
    const podium = Object.values(gameState.playerScores)
        .sort((a, b) => b.score - a.score);

    console.log("Torneo terminado. Guardando en BD y enviando podio:", podium);
    
    // --- ¡NUEVO! GUARDAR RESULTADOS EN LA BASE DE DATOS ---
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Usamos Promise.all para guardar todos los puntajes en paralelo
        const savePromises = [];
        for (const player of podium) {
            if (player.uid) { // Solo si tenemos el UID (no anónimos)
                const score = player.score;
                const correctAnswers = score / 100; // 100 pts por acierto
                const incorrectAnswers = gameState.totalQuestions - correctAnswers;
                
                // 1. Guardar la sesión
                const sessionQuery = `INSERT INTO game_sessions (user_uid, game_mode, category_name, difficulty, score, questions_total, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`;
                savePromises.push(client.query(sessionQuery, [player.uid, 'tournament', 'Variado', 'Variada', score, gameState.totalQuestions]));
                
                // 2. Actualizar estadísticas
                const statsQuery = `UPDATE user_stats SET total_score = total_score + $1, games_played = games_played + 1, correct_answers = correct_answers + $2, incorrect_answers = incorrect_answers + $3 WHERE user_uid = $4`;
                savePromises.push(client.query(statsQuery, [score, correctAnswers, incorrectAnswers, player.uid]));
            }
        }
        await Promise.all(savePromises);
        await client.query('COMMIT');
        console.log("Resultados del torneo guardados en la BD.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error al guardar resultados del torneo en la BD:", error);
    } finally {
        client.release();
    }
    // --- FIN DE GUARDADO EN BD ---

    io.emit('gameEnded', { podium });
    
    setTimeout(() => {
        gameState.status = 'lobby';
        gameState.questions = [];
        gameState.currentQuestionIndex = 0;
    }, 15000); 
}

// --- Iniciar el Servidor ---
server.listen(port, () => {
  console.log(`Servidor API y WebSocket corriendo en http://localhost:${port}`);
});