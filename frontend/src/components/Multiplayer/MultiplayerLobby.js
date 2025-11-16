import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'; 
import './MultiplayerLobby.css';
import { auth } from '../../firebaseConfig'; // Importamos auth

const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";

const MultiplayerLobby = ({ user, onNavigate, onBack }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const socketRef = useRef(null); 

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
    });
    const socket = socketRef.current;

    socket.on('connect', async () => {
      console.log('Conectado al servidor WebSocket!');
      setIsConnected(true);
      
      // --- ¡AUTENTICACIÓN DE SOCKET! ---
      if (user && !user.isAnonymous) {
          try {
              const token = await auth.currentUser.getIdToken(true);
              // Enviamos el token para que el backend nos identifique
              socket.emit('joinLobby', { token }); 
          } catch (error) {
              console.error("Error al obtener token para el lobby:", error);
          }
      } else {
          console.warn("Usuario invitado intentando unirse al lobby.");
          // Opcional: manejar usuarios invitados (el backend ya los ignora)
      }
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket.');
      setIsConnected(false);
      setLobbyUsers([]); 
      setIsStarting(false);
      setWelcomeMsg('');
    });

    socket.on('updateUserList', (users) => setLobbyUsers(users));
    socket.on('welcomeMessage', (msg) => setWelcomeMsg(msg));

    socket.on('gameLoading', () => {
        setIsStarting(true);
    });

    socket.on('tournamentStarting', () => {
        if (onNavigate) {
             onNavigate('tournament-game'); 
        }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, onNavigate]); 

  const handleStartGame = () => {
      if (socketRef.current) {
          setIsStarting(true);
          socketRef.current.emit('startTournament');
      }
  };

  return (
    <div className="multiplayer-lobby-container">
      <div className="multiplayer-lobby-box">
        <button onClick={onBack} className="back-button-lobby-mp">← Salir</button>
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

          {/* Habilitamos el botón solo si hay 2 o más jugadores */}
          {lobbyUsers.length >= 2 && isConnected && (
             <button 
                className="start-game-button-placeholder" 
                onClick={handleStartGame} 
                disabled={isStarting}
                style={{ backgroundColor: isStarting ? '#ccc' : '#4CAF50', cursor: isStarting ? 'wait' : 'pointer' }}
             >
               {isStarting ? "Iniciando..." : `¡INICIAR TORNEO! (${lobbyUsers.length} Jugadores)`}
             </button>
          )}
           {lobbyUsers.length < 2 && isConnected && (
             <button 
                className="start-game-button-placeholder" 
                disabled={true}
             >
               Esperando (mín. 2 jugadores)
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;