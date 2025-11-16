import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './TournamentGame.css';
import { auth } from '../../firebaseConfig'; // Importamos auth

const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";

export const TournamentGame = ({ user, onNavigate }) => {
  const [questionData, setQuestionData] = useState(null);
  const [message, setMessage] = useState("Conectando a la sala de juego...");
  const [gameResults, setGameResults] = useState(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState(null); 
  const [correctAnswer, setCorrectAnswer] = useState(null); 
  const [isAnswered, setIsAnswered] = useState(false); 
  const [isRoundOver, setIsRoundOver] = useState(false); 
  
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

    socket.on('connect', () => {
        console.log("[DEBUG TournamentGame] Socket conectado ID:", socket.id);
        if(user && !user.isAnonymous) {
            auth.currentUser.getIdToken(true).then(token => {
                socket.emit('joinLobby', { token });
            });
        }
        setMessage("Esperando que inicie el torneo...");
    });

    socket.on('newQuestion', (data) => {
        console.log("[DEBUG TournamentGame] Pregunta recibida:", data);
        setQuestionData(data);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setIsAnswered(false);
        setIsRoundOver(false);
        setMessage(""); 
    });

    socket.on('roundResults', (data) => {
        console.log("[DEBUG TournamentGame] Resultados de ronda:", data);
        setCorrectAnswer(data.correctAnswer);
        setIsRoundOver(true); 
        setMessage("Ronda terminada. Cargando siguiente pregunta...");
    });

    socket.on('gameEnded', (results) => {
        console.log("[DEBUG TournamentGame] Fin del juego:", results);
        setGameResults(results);
    });

    return () => {
        console.log("[DEBUG TournamentGame] Desconectando...");
        socket.disconnect();
    };
  }, [user]); 

  const handleAnswer = (option) => {
      if (isAnswered) return;
      setIsAnswered(true); 
      setSelectedAnswer(option); 
      setMessage("¡Respuesta enviada! Esperando a los demás...");
      socketRef.current.emit('submitAnswer', { answer: option });
  };

  // --- RENDERIZADO DE RESULTADOS ---
  if (gameResults) {
      const winner = gameResults.podium[0] || { displayName: "Nadie" };
      return (
          <div className="tournament-container results-bg">
              <div className="tournament-box">
                  <h1>🏆 ¡Torneo Finalizado! 🏆</h1>
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

  // --- RENDERIZADO DE ESPERA (Carga inicial o entre rondas) ---
  if (!questionData || isRoundOver) {
      return (
          <div className="tournament-container">
              <div className="waiting-box">
                  <h2>{message}</h2>
                  <div className="spinner">⏳</div>
                  {/* Mostramos la pregunta anterior con los resultados si estamos entre rondas */}
                  {isRoundOver && questionData && (
                    <div className="tournament-box game-mode" style={{marginTop: '20px', opacity: 0.8}}>
                        <h2 className="question-text-online">{decodeHTML(questionData.question)}</h2>
                        <div className="options-grid-online">
                            {questionData.options.map((opt, i) => {
                              let btnClass = "option-btn-online";
                              const decodedOpt = decodeHTML(opt);
                              if (decodedOpt === decodeHTML(correctAnswer)) {
                                  btnClass += " correct";
                              } else if (decodedOpt === decodeHTML(selectedAnswer)) {
                                  // --- ¡ARREGLO DE TYPO! ---
                                  btnClass += " incorrect";
                              }
                              return <button key={i} className={btnClass} disabled>{decodedOpt}</button>;
                            })}
                        </div>
                    </div>
                  )}
              </div>
          </div>
      );
  }

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
              let btnClass = "option-btn-online";
              if (isAnswered) {
                if (decodeHTML(opt) === decodeHTML(selectedAnswer)) {
                  btnClass += " selected";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)} 
                  className={btnClass}
                  disabled={isAnswered} 
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