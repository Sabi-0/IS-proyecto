import React from 'react';
import './HomePage.css';

const HomePage = ({ user, handleLogout }) => {
  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <h1>Mi Aplicación</h1>
        <div className="user-info">
          <span>{user.email || 'Invitado'}</span>
          <button onClick={handleLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      </header>
      <main className="homepage-main">
        <h2>Página de Inicio</h2>
        <p>¡Bienvenido! El contenido principal de tu aplicación irá aquí.</p>
        {/* Puedes empezar a construir el resto de tu aplicación desde aquí */}
      </main>
    </div>
  );
};

export default HomePage;