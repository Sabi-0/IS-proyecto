// src/ThemeToggle.js

import React, { useState, useEffect } from 'react';
import './ThemeToggle.css'; // Crearemos este archivo CSS ahora

const ThemeToggle = () => {
  // 1. Estado para guardar el tema actual. Lo inicializamos desde localStorage para recordar la elección del usuario
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // 2. useEffect se ejecuta cuando el componente se carga o cuando 'theme' cambia
  useEffect(() => {
    // Aplica el atributo al body
    document.body.setAttribute('data-theme', theme);
    // Guarda la elección en localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 3. Función para cambiar el tema
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="toggle-container">
      <label className="switch">
        <input 
          type="checkbox" 
          onChange={toggleTheme} 
          // Marcamos el checkbox si el tema es claro
          checked={theme === 'light'} 
        />
        <span className="slider round"></span>
      </label>
    </div>
  );
};

export default ThemeToggle;