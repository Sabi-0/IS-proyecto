// src/components/HomePage/HomePage.js

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import './HomePage.css';
import InteractiveCardButton from './InteractiveCardButton'; 
import Header from './Header';

// --- Componente del Modelo 3D ---
function CharacterModel() {
  const { scene } = useGLTF('/stylized_character/scene.gltf');
  
  scene.scale.set(1.5, 1.5, 1.5);
  scene.position.set(-5, -2, 0);
  scene.rotation.set(0, 0.7, 0);

  return <primitive object={scene} />;
}


// --- Componente HomePage ---
const HomePage = ({ user, handleLogout, onNavigate }) => {
  const handleNavigation = (path) => {
    onNavigate(path);
  };

  return (
    <div className="homepage-container">
      
      {/* Canvas 3D */}
      <Canvas className="canvas-background" camera={{ position: [0, 0, 9], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <Environment preset="city" /> 
          <CharacterModel />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Suspense>
      </Canvas>

      {/* Interfaz de Usuario */}
      <div className="ui-container">
        <Header onNavigate={handleNavigation} handleLogout={handleLogout} />

        <main className="homepage-main">
          <div className="welcome-message">
            <h1>Bienvenido, {user?.displayName || 'Jugador'}!</h1>
            <p>¿Listo para un nuevo desafío?</p>
          </div>
          <button className="play-now-button" onClick={() => handleNavigation('trivia-random')}>
            Jugar ahora
          </button>

          <div className="dashboard-grid">
            <InteractiveCardButton
              title="Modo Clásico"
              description="Trivias y categorías."
              onClick={() => handleNavigation('category-selection')}
            />
            <InteractiveCardButton
              title="Modo Torneo"
              description="Torneos."
              onClick={() => handleNavigation('tournament-lobby')}
            />
            <InteractiveCardButton
              title="Aprendizaje"
              description="Accede a los cursos interactivos."
              onClick={() => handleNavigation('learning')}
            />
            <InteractiveCardButton
              title="Leaderboards"
              description="Ranking e historial."
              onClick={() => handleNavigation('leaderboard')}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;