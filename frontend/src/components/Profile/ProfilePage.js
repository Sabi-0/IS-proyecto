import React, { useState, useEffect } from 'react';
import { auth } from '../../firebaseConfig.js'; 
import './ProfilePage.css';

// ¡URL DEL BACKEND PARA DESPLIEGUE!
const BACKEND_URL = 'https://glairy-debroah-downwardly.ngrok-free.dev';

const AVATARS = [
// ... (avatares existentes sin cambios)
  '/avatars/leon.png',     
  '/avatars/pinguino.png', 
  '/avatars/rana.png',      
  '/avatars/tigre.png',     
];

const ProfilePage = ({ user, onBack }) => {
// ... (estados existentes sin cambios)
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return; 

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken(true);
        const response = await fetch(`${BACKEND_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            // --- ¡CORRECCIÓN NGROK! ---
            'ngrok-skip-browser-warning': 'true'
          }
        });

        if (!response.ok) {
// ... (código existente sin cambios)
          throw new Error('No se pudieron cargar los datos del perfil.');
        }
        
        const data = await response.json();
        setProfileData(data);
        setSelectedAvatar(data.avatar_url); 
      } catch (err) {
// ... (código existente sin cambios)
        setError(err.message);
        console.error("Error al cargar perfil:", err);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]); 

  const handleSaveAvatar = async () => {
// ... (código existente sin cambios)
    if (!selectedAvatar || selectedAvatar === profileData.avatar_url) {
      setMessage('No hay cambios que guardar.');
      return;
    }

    setMessage('Guardando...');
    setError(null);

    try {
      const token = await user.getIdToken(true);
      const response = await fetch(`${BACKEND_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          // --- ¡CORRECCIÓN NGROK! ---
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ avatarUrl: selectedAvatar })
      });

      if (!response.ok) {
// ... (código existente sin cambios)
        throw new Error('No se pudo guardar el avatar.');
      }
      
      const data = await response.json();
      setProfileData(prev => ({ ...prev, avatar_url: data.avatarUrl }));
// ... (código existente sin cambios)
      setMessage('¡Avatar guardado exitosamente!');
    } catch (err) {
      setError(err.message);
      console.error("Error al guardar avatar:", err);
    }
  };

  if (isLoading) {
// ... (código de renderizado existente sin cambios)
    return <div className="loading-screen">Cargando perfil...</div>;
  }

  if (error) {
    return <div className="error-bar">{error}</div>;
  }

  if (!profileData) {
    return <div className="loading-screen">No se encontraron datos del perfil.</div>;
  }

  const totalAnswers = (profileData.correct_answers || 0) + (profileData.incorrect_answers || 0);
  const accuracy = totalAnswers === 0 ? 0 : Math.round((profileData.correct_answers / totalAnswers) * 100);

  return (
    <div className="profile-page-container">
{/* ... (código de renderizado existente sin cambios) */}
      <div className="profile-box">
        <button onClick={onBack} className="back-button-profile">← Volver al Inicio</button>
        
        <div className="profile-header">
          <img 
            src={profileData.avatar_url || 'https://placehold.co/150x150/cccccc/FFFFFF?text=...'} 
            alt="Avatar actual" 
            className="current-avatar"
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/150x150/cccccc/FFFFFF?text=Error'; }}
          />
          <h2>{profileData.display_name}</h2>
          <p>{profileData.email}</p>
          <p>Miembro desde: {new Date(profileData.created_at).toLocaleDateString()}</p>
        </div>

        <div className="profile-stats">
          <h3>Estadísticas de Juego</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Puntaje Total</h4>
              <span>{profileData.total_score.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <h4>Partidas Jugadas</h4>
              <span>{profileData.games_played}</span>
            </div>
            <div className="stat-card">
              <h4>Precisión</h4>
              <span>{accuracy}%</span>
            </div>
          </div>
        </div>

        <div className="profile-avatar-selector">
          <h3>Elige tu Avatar</h3>
          <div className="avatar-grid">
            {AVATARS.map((avatarUrl, index) => (
              <img
                key={index}
                src={avatarUrl}
                alt={`Avatar ${index + 1}`}
                className={`avatar-option ${selectedAvatar === avatarUrl ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(avatarUrl)}
              />
            ))}
          </div>
          <button onClick={handleSaveAvatar} className="save-avatar-button">
            Guardar Cambios
          </button>
          {message && <p className="profile-message">{message}</p>}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;