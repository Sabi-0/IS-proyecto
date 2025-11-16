import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client'; 
import './MultiplayerLobby.css';

// --- ¡URL DEL BACKEND PARA DESPLIEGUE! ---
const SOCKET_SERVER_URL = "https://glairy-debroah-downwardly.ngrok-free.dev";

// Añadimos 'onNavigate' a las props para poder cambiar de pantalla
const MultiplayerLobby = ({ user, onNavigate, onBack }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState('');
  const socketRef = useRef(null); 

  useEffect(() => {
    // --- Conexión con cabecera de ngrok ---
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
      setWelcomeMsg('');
    });

    socket.on('updateUserList', (users) => {
      console.log('Lista de usuarios actualizada:', users);
      setLobbyUsers(users);
    });
    
    socket.on('welcomeMessage', (msg) => {
        setWelcomeMsg(msg);
    });

    // --- NUEVO: ESCUCHAR INICIO DE TORNEO ---
    // Cuando el servidor dice "Empiecen", nos movemos a la pantalla de juego
    socket.on('tournamentStarting', () => {
        console.log("¡El torneo comienza!");
        onNavigate('tournament-game'); 
    });

    return () => {
      console.log('Desconectando socket...');
      socket.disconnect();
    };
  }, [user, onNavigate]); 

  // --- NUEVO: FUNCIÓN PARA INICIAR EL JUEGO ---
  const handleStartGame = () => {
      if (socketRef.current) {
          // Le decimos al servidor que inicie el torneo para todos
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

          {/* --- BOTÓN ACTIVADO --- */}
          {/* Cambiamos la lógica: Si hay gente y estamos conectados, el botón funciona */}
          {lobbyUsers.length >= 1 && isConnected && (
             <button 
                className="start-game-button-placeholder" 
                onClick={handleStartGame} // Ahora llama a la función
             >
               ¡INICIAR TORNEO! (3 Rondas)
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;