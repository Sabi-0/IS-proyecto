import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'; 
import './MultiplayerLobby.css';

// --- ¡URL DEL BACKEND PARA DESPLIEGUE! ---
// ¡YA ESTÁ ACTUALIZADA CON TU URL DE NGROK!
const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";
// ---

const MultiplayerLobby = ({ user, onBack }) => {
// ... (estados existentes sin cambios)
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const socketRef = useRef(null); 

  useEffect(() => {
    // --- ¡CORRECCIÓN NGROK! ---
    // Añadimos la cabecera especial en la conexión del socket
    socketRef.current = io(SOCKET_SERVER_URL, {
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
// ... (código existente sin cambios)
      console.log('Conectado al servidor WebSocket!');
      setIsConnected(true);
      socket.emit('joinLobby', { 
        displayName: user?.displayName || user?.email?.split('@')[0] || 'Invitado' 
      });
    });

    socket.on('disconnect', () => {
// ... (código existente sin cambios)
      console.log('Desconectado del servidor WebSocket.');
      setIsConnected(false);
      setLobbyUsers([]); 
      setWelcomeMsg('');
    });

    socket.on('updateUserList', (users) => {
// ... (código existente sin cambios)
      console.log('Lista de usuarios actualizada:', users);
      setLobbyUsers(users);
    });
    
    socket.on('welcomeMessage', (msg) => {
// ... (código existente sin cambios)
        setWelcomeMsg(msg);
    });

    return () => {
// ... (código existente sin cambios)
      console.log('Desconectando socket...');
      socket.disconnect();
    };
  }, [user]); 

  return (
    <div className="multiplayer-lobby-container">
{/* ... (código de renderizado existente sin cambios) */}
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

          {lobbyUsers.length >= 2 && isConnected && (
             <button className="start-game-button-placeholder" disabled>
               Iniciar Partida (Próximamente)
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;