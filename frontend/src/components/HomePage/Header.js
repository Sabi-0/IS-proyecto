// src/components/Header/Header.js

import React, { useState, useRef } from 'react';
import './Header.css'; // Crearemos este archivo ahora
import ThemeToggle from '../../ThemeToggle';

const Header = ({ onNavigate, handleLogout }) => {
  const navRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({
    opacity: 0,
    width: 0,
    transform: 'translateX(0px)',
  });

  const handleMouseEnter = (e) => {
    const button = e.currentTarget;
    const { width, height, left } = button.getBoundingClientRect();
    const parentLeft = navRef.current.getBoundingClientRect().left;

    setPillStyle({
      opacity: 1,
      width: `${width}px`,
      height: `${height}px`,
      transform: `translateX(${left - parentLeft}px)`,
    });
  };

  const handleMouseLeave = () => {
    setPillStyle({ ...pillStyle, opacity: 0 });
  };

  return (
    <header className="homepage-header">
      <div className="logo">CircusMind</div>
      <nav 
        className="header-nav" 
        ref={navRef} 
        onMouseLeave={handleMouseLeave}
      >
        <div className="header-pill" style={pillStyle}></div>
        <button onMouseEnter={handleMouseEnter} onClick={() => onNavigate('/profile')}>Perfil</button>
        <button onMouseEnter={handleMouseEnter} onClick={() => onNavigate('/notifications')}>Notificaciones</button>
        <button onMouseEnter={handleMouseEnter} onClick={() => onNavigate('/settings')}>Ajustes</button>
        <button onMouseEnter={handleMouseEnter} onClick={handleLogout}>Cerrar Sesión</button>
        <div onMouseEnter={handleMouseEnter}>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
};

export default Header;