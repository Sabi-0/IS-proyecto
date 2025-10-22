import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'; // Cliente de Socket.io
import './MultiplayerLobby.css';

// URL de tu servidor backend
const SOCKET_SERVER_URL = "http://localhost:4000";

const MultiplayerLobby = ({ user, onBack }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const socketRef = useRef(null); // Usamos useRef para mantener la instancia del socket

  useEffect(() => {
    // Conectar al servidor de Socket.io cuando el componente se monta
    socketRef.current = io(SOCKET_SERVER_URL);
    const socket = socketRef.current;

    // --- Manejadores de Eventos del Socket ---
    socket.on('connect', () => {
      console.log('Conectado al servidor WebSocket!');
      setIsConnected(true);
      // Una vez conectado, enviamos nuestros datos para unirnos al lobby
      socket.emit('joinLobby', { 
        displayName: user?.displayName || user?.email?.split('@')[0] || 'Invitado' 
      });
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket.');
      setIsConnected(false);
      setLobbyUsers([]); // Limpiar lista al desconectar
      setWelcomeMsg('');
    });

    socket.on('updateUserList', (users) => {
      console.log('Lista de usuarios actualizada:', users);
      setLobbyUsers(users);
    });
    
    socket.on('welcomeMessage', (msg) => {
        setWelcomeMsg(msg);
    });

    // --- Limpieza al Desmontar ---
    // Asegurarse de desconectar el socket cuando el componente se destruye
    return () => {
      console.log('Desconectando socket...');
      socket.disconnect();
    };
  }, [user]); // Dependemos de 'user' por si cambia la info

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

          {/* Aquí iría un botón para iniciar el juego cuando haya suficientes jugadores */}
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
