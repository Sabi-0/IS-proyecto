import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'; 
import './MultiplayerLobby.css';

const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";


const MultiplayerLobby = ({ user, onNavigate, onBack }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const socketRef = useRef(null); 

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Conectado al servidor WebSocket!');
      setIsConnected(true);
      socket.emit('joinLobby', { 
        displayName: user?.displayName || user?.email?.split('@')[0] || 'Invitado' 
      });
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket.');
      setIsConnected(false);
      setLobbyUsers([]); 
      setIsStarting(false);
      setWelcomeMsg('');
    });

    socket.on('updateUserList', (users) => {
      console.log('Lista de usuarios actualizada:', users);
      setLobbyUsers(users);
    });
    
    socket.on('welcomeMessage', (msg) => {
        setWelcomeMsg(msg);
    });

    // --- INICIO DE JUEGO ---
    socket.on('gameLoading', () => {
        console.log("Servidor preparando torneo...");
        setIsStarting(true);
    });

    socket.on('tournamentStarting', () => {
        console.log("¡El torneo comienza!");
        // Ahora onNavigate ya existe y funcionará
        if (onNavigate) {
             onNavigate('tournament-game'); 
        }
    });

    return () => {
      console.log('Desconectando socket...');
      socket.disconnect();
    };
  }, [user, onNavigate]); 

  const handleStartGame = () => {
      if (socketRef.current) {
          console.log("Solicitando inicio de torneo...");
          setIsStarting(true);
          socketRef.current.emit('startTournament');
      }
  };

  return (
    <div className="multiplayer-lobby-container">
      <div className="multiplayer-lobby-box">
        <button onClick={onBack} className="back-button-lobby-mp">← Volver al Inicio</button>
        <h2>Lobby Multijugador</h2>

        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          Estado: {isConnected ? 'Conectado' : 'Desconectado'}
        </div>
        
        {welcomeMsg && <p className="welcome-text">{welcomeMsg}</p>}

        <div className="lobby-content-mp">
          <h3>Jugadores en el Lobby ({lobbyUsers.length})</h3>
          {lobbyUsers.length > 0 ? (
            <ul className="user-list">
              {lobbyUsers.map((lobbyUser) => (
                <li key={lobbyUser.id} className={lobbyUser.id === socketRef.current?.id ? 'current-user' : ''}>
                  {lobbyUser.displayName} {lobbyUser.id === socketRef.current?.id ? '(Tú)' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-lobby-text">Esperando jugadores...</p>
          )}

          {lobbyUsers.length >= 1 && isConnected && (
             <button 
                className="start-game-button-placeholder" 
                onClick={handleStartGame} 
                disabled={isStarting}
                style={{ backgroundColor: isStarting ? '#ccc' : '#4CAF50', cursor: isStarting ? 'wait' : 'pointer' }}
             >
               {isStarting ? "Iniciando..." : "¡INICIAR TORNEO! (3 Rondas)"}
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;