import React from 'react';
import './TournamentLobby.css';

const TournamentLobby = ({ onBack }) => {
  return (
    <div className="tournament-lobby-container">
      <div className="tournament-lobby-box">
        <button onClick={onBack} className="back-button-lobby">← Volver al Inicio</button>
        <h2>Modo Torneo</h2>
        <div className="lobby-content">
          <p className="status-text">¡El modo torneo está en desarrollo!</p>
          <p className="description-text">
            Próximamente podrás competir en rondas eliminatorias contra otros jugadores para ganar premios increíbles.
          </p>
          <div className="spinner"></div>
          <p className="coming-soon">¡Vuelve pronto!</p>
        </div>
      </div>
    </div>
  );
};

export default TournamentLobby;