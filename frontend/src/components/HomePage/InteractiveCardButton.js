// src/components/InteractiveCardButton.js

import React from 'react';
import './InteractiveCardButton.css';

// Componente simple, la magia está en el CSS.
const InteractiveCardButton = ({ title, description, onClick }) => {
  return (
    <div
      className="interactive-card"
      onClick={onClick}
    >
      <div className="interactive-card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default InteractiveCardButton;