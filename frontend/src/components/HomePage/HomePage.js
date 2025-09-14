import React from 'react';
import './HomePage.css'; 

// Pequeños componentes de iconos en formato SVG para el header
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);


const HomePage = ({ user, handleLogout }) => {
  // Nota: por ahora los botones solo mostrarán un log en la consola.
  const handleNavigation = (path) => {
    console.log(`Navegando a: ${path}`);
    //history.push(path) con React Router
  };

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <div className="logo">CircusMind</div>
        <nav className="header-nav">
          {/* Estos botones son funcionales, pero por ahora solo muestran un log */}
          <button onClick={() => handleNavigation('/profile')} className="nav-icon-button" aria-label="Perfil"><UserIcon /></button>
          <button onClick={() => handleNavigation('/notifications')} className="nav-icon-button" aria-label="Notificaciones"><BellIcon /></button>
          <button onClick={() => handleNavigation('/settings')} className="nav-icon-button" aria-label="Ajustes"><SettingsIcon /></button>
          <button onClick={handleLogout} className="logout-button-header">Cerrar Sesión</button>
        </nav>
      </header>

      <main className="homepage-main">
        <div className="welcome-message">
            <h1>Bienvenido, {user?.displayName || user?.email || 'Jugador'}!</h1>
            <p>¿Listo para un nuevo desafío?</p>
        </div>
        
        <button className="play-now-button" onClick={() => handleNavigation('/trivia/random')}>
          Jugar ahora
        </button>

        <div className="dashboard-grid">
          <div className="card" onClick={() => handleNavigation('/classic')}>
            <h3>Modo Clásico</h3>
            <p>Trivias y categorías.</p>
          </div>
          <div className="card" onClick={() => handleNavigation('/tournament')}>
            <h3>Modo Torneo</h3>
            <p>Torneos.</p>
          </div>
          <div className="card" onClick={() => handleNavigation('/learning')}>
            <h3>Aprendizaje</h3>
            <p>Accede a los cursos interactivos.</p>
          </div>
          <div className="card" onClick={() => handleNavigation('/leaderboards')}>
            <h3>Leaderboards</h3>
            <p>Ranking e historial.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
