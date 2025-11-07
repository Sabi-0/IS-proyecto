import React, { useState, useEffect } from 'react';
import './Leaderboard.css';

// ¡URL DEL BACKEND PARA DESPLIEGUE!
const BACKEND_URL = 'https://glairy-debroah-downwardly.ngrok-free.dev';

const Leaderboard = ({ onBack }) => {
// ... (estados existentes sin cambios)
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/leaderboard`, {
            headers: {
                // --- ¡CORRECCIÓN NGROK! ---
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar el leaderboard.');
        }
// ... (código existente sin cambios)
        const data = await response.json();
        setLeaderboardData(data); 
      } catch (err) {
        setError(err.message);
        console.error("Error al cargar leaderboard:", err);
      }
      setIsLoading(false);
    };

    fetchLeaderboard();
  }, []); 

  return (
    <div className="leaderboard-container">
// ... (código de renderizado existente sin cambios)
      <div className="leaderboard-box">
        <button onClick={onBack} className="back-button-leaderboard">← Volver al Inicio</button>
        <h1>🏆 Leaderboard Global 🏆</h1>
        <p>¡Descubre quiénes son los mejores jugadores!</p>
        
        {isLoading && <div className="loading-leaderboard">Cargando ranking...</div>}
        
        {error && <div className="error-leaderboard">{error}</div>}
        
        {!isLoading && !error && (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Jugador</th>
                <th>Puntuación Total</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((player, index) => (
                <tr key={index} className={index < 3 ? 'top-player' : ''}>
                  <td className="position-cell">{index + 1}</td>
                  <td className="name-cell">{player.display_name}</td>
                  <td className="score-cell">{player.total_score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;