import React from 'react';
import './TriviaResults.css';

const TriviaResults = ({ score, totalQuestions, onPlayAgain }) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  return (
    <div className="results-container">
      <div className="results-box">
        <h1>¡Juego Terminado!</h1>
        <p className="score-text">
          Tu puntuación final es: <span>{score}</span> de {totalQuestions}
        </p>
        <div className="percentage">{percentage}%</div>
        <button onClick={onPlayAgain} className="play-again-button">
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default TriviaResults;
