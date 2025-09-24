import React from 'react';
import './Leaderboard.css';

const mockLeaderboardData = [
  { position: 1, name: 'Samuel', score: 9850 },
  { position: 2, name: 'Marcos', score: 9700 },
  { position: 3, name: 'Axel', score: 8500 },
  { position: 4, name: 'Jugador_Top', score: 7600 },
  { position: 5, name: 'Ana', score: 7350 },
  { position: 6, name: 'Carlos', score: 6800 },
  { position: 7, name: 'Laura', score: 6500 },
  { position: 8, name: 'David', score: 6100 },
  { position: 9, name: 'Sofia', score: 5900 },
  { position: 10, name: 'Miguel', score: 5550 },
];

const Leaderboard = ({ onBack }) => {
  return (
    <div className="leaderboard-container">
      <div className="leaderboard-box">
        <button onClick={onBack} className="back-button-leaderboard">← Volver al Inicio</button>
        <h1>🏆 Leaderboard Global 🏆</h1>
        <p>¡Descubre quiénes son los mejores jugadores!</p>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Jugador</th>
              <th>Puntuación</th>
            </tr>
          </thead>
          <tbody>
            {mockLeaderboardData.map((player) => (
              <tr key={player.position} className={player.position <= 3 ? 'top-player' : ''}>
                <td className="position-cell">{player.position}</td>
                <td className="name-cell">{player.name}</td>
                <td className="score-cell">{player.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
