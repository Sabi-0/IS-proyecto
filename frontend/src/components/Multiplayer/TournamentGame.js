import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './TournamentGame.css';

const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";

const TournamentGame = ({ user, onNavigate }) => {
  const [questionData, setQuestionData] = useState(null);
  const [waiting, setWaiting] = useState(true); 
  const [message, setMessage] = useState("Preparando la sala...");
  const [gameResults, setGameResults] = useState(null);

  // --- NUEVOS ESTADOS PARA FEEDBACK ---
  const [selectedAnswer, setSelectedAnswer] = useState(null); // Tu elección
  const [correctAnswer, setCorrectAnswer] = useState(null); // La respuesta correcta
  const [isAnswered, setIsAnswered] = useState(false); // Bloquea botones
  const [isRoundOver, setIsRoundOver] = useState(false); // Muestra colores
  
  const socketRef = useRef(null);

  const decodeHTML = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
        extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
    });

    const socket = socketRef.current;

    socket.emit('joinLobby', { displayName: user?.displayName || 'Jugador' });
    setMessage("Esperando que inicie el torneo..."); // Mensaje inicial

    socket.on('newQuestion', (data) => {
        console.log("Nueva pregunta recibida");
        setQuestionData(data);
        // Reseteamos estados de ronda
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setIsAnswered(false);
        setIsRoundOver(false);
        setWaiting(false); // Dejamos de esperar
        setMessage("");
    });

    // --- NUEVO LISTENER PARA FEEDBACK ---
    socket.on('roundResults', (data) => {
        console.log("Resultados de ronda:", data);
        setCorrectAnswer(data.correctAnswer); // Guardamos la correcta
        setIsRoundOver(true); // Activamos modo "mostrar colores"
        setMessage("Ronda terminada. Cargando siguiente...");
    });

    socket.on('gameEnded', (results) => {
        console.log("Juego terminado");
        setGameResults(results);
        setWaiting(true); 
    });

    return () => socket.disconnect();
  }, [user]); // Dependencia [user] está bien

  const handleAnswer = (option) => {
      // No hacer nada si ya se respondió
      if (isAnswered) return;

      setIsAnswered(true); // Bloquear botones
      setSelectedAnswer(option); // Marcar tu elección visualmente
      setMessage("¡Respuesta enviada! Esperando a los demás...");
      
      socketRef.current.emit('submitAnswer', { 
          answer: option, 
      });
  };

  // --- RENDERIZADO DE RESULTADOS ---
  if (gameResults) {
      const winner = gameResults.podium[0] || { displayName: "Nadie" };
      return (
          <div className="tournament-container results-bg">
              <div className="tournament-box">
                  <h1>🏆 Torneo Finalizado 🏆</h1>
                  <h2>Ganador: {winner.displayName}</h2>
                  <div className="podium-list">
                      {gameResults.podium.map((p, i) => (
                          <div key={i} className={`podium-item rank-${i+1}`}>
                              <span>#{i+1}</span>
                              <strong>{p.displayName}</strong>
                              <span>{p.score} pts</span>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => onNavigate('homepage')} className="exit-button">Volver al Inicio</button>
              </div>
          </div>
      );
  }

  // --- RENDERIZADO DE ESPERA ---
  if (waiting && !questionData) {
      return (
          <div className="tournament-container">
              <div className="waiting-box">
                  <h2>{message}</h2>
                  <div className="spinner">⏳</div>
              </div>
          </div>
      );
  }
  
  // Si questionData es nulo aquí, es un error, pero el waiting lo agarra
  if (!questionData) return null; 

  // --- RENDERIZADO DE JUEGO ---
  return (
    <div className="tournament-container">
      <div className="tournament-box game-mode">
        <div className="game-header">
            <span>Pregunta {questionData.round} / {questionData.totalQuestions}</span>
            <span className="category-tag">{decodeHTML(questionData.categoryName)}</span>
        </div>
        
        <h2 className="question-text-online">{decodeHTML(questionData.question)}</h2>
        
        <div className="options-grid-online">
            {questionData.options.map((opt, i) => {
              // --- LÓGICA DE CLASES CSS PARA FEEDBACK ---
              let btnClass = "option-btn-online";
              if (isRoundOver) {
                // Ronda terminó, mostrar correcta e incorrecta
                if (decodeHTML(opt) === decodeHTML(correctAnswer)) {
                  btnClass += " correct";
                } else if (decodeHTML(opt) === decodeHTML(selectedAnswer)) {
                  btnClass += " incorrect";
                }
              } else if (isAnswered) {
                // Ronda en curso, solo mostrar mi selección
                if (decodeHTML(opt) === decodeHTML(selectedAnswer)) {
                  btnClass += " selected";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)} 
                  className={btnClass}
                  disabled={isAnswered} // Deshabilitar botones al responder
                >
                    {decodeHTML(opt)}
                </button>
              );
            })}
        </div>

        {isAnswered && (
          <div className="waiting-overlay">
            <h3>{message}</h3>
          </div>
        )}

      </div>
    </div>
  );
};

// --- ¡Exportación por Defecto! ---
export default TournamentGame;