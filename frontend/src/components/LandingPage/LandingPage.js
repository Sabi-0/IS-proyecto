import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onNavigateToAuth }) => {
  return (
    <div className="landing-container">
      <div className="landing-box">
        <h1>Bienvenido a CircusMind</h1>
        <p>Tu plataforma de aprendizaje interactiva.</p>
        <button onClick={onNavigateToAuth} className="landing-button">
          Ingresar al Sistema
        </button>
      </div>
    </div>
  );
};

export default LandingPage;