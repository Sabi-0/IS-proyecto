import React, { useState, useEffect } from 'react';
import './Leaderboard.css';

// ¡Ya no necesitamos mockLeaderboardData!

const Leaderboard = ({ onBack }) => {
  // Estados para manejar los datos reales
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect para cargar los datos cuando el componente se monta
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Llamamos a nuestro nuevo endpoint del backend
        const response = await fetch('http://localhost:4000/leaderboard');
        if (!response.ok) {
          throw new Error('No se pudo cargar el leaderboard.');
        }
        const data = await response.json();
        setLeaderboardData(data); // Guardamos los datos reales en el estado
      } catch (err) {
        setError(err.message);
        console.error("Error al cargar leaderboard:", err);
      }
      setIsLoading(false);
    };

    fetchLeaderboard();
  }, []); // El array vacío [] asegura que esto solo se ejecute una vez

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-box">
        <button onClick={onBack} className="back-button-leaderboard">← Volver al Inicio</button>
        <h1>🏆 Leaderboard Global 🏆</h1>
        <p>¡Descubre quiénes son los mejores jugadores!</p>
        
        {/* Manejamos los 3 estados posibles: Cargando, Error, Éxito */}
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
              {/* Mapeamos sobre los datos REALES del estado */}
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