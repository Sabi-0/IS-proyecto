import React, { useState } from 'react';
import { auth, googleProvider } from '../../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously
} from "firebase/auth";

import './AuthPage.css';

const AuthPage = ({ onBack }) => { // <-- Recibe la función onBack
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error("Error al registrar:", err.message);
      setError(err.message);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('¡Inicio de sesión exitoso!');
    } catch (err) {
      console.error("Error al iniciar sesión:", err.message);
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
      setMessage('¡Inicio de sesión con Google exitoso!');
    } catch (err) {
      console.error("Error al iniciar sesión con Google:", err.message);
      setError(err.message);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setMessage('');
    try {
      await signInAnonymously(auth);
      setMessage('¡Sesión como Invitado iniciada!');
    } catch (err) {
      console.error("Error al iniciar sesión como invitado:", err.message);
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        {/* --- Botón para regresar --- */}
        <button onClick={onBack} className="back-button">← Regresar</button>
        
        <h2>Ingreso al Sistema</h2>

        {error && <p className="error-message">Error: {error}</p>}
        {message && <p className="success-message">{message}</p>}

        <form onSubmit={handleEmailSignIn} className="email-auth-form">
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
            />
          </div>
          <div className="button-group">
            <button type="submit">Iniciar Sesión</button>
            <button type="button" onClick={handleEmailSignUp}>Registrarse</button>
          </div>
        </form>

        <div className="divider">O</div>

        <div className="social-auth-options">
          <button onClick={handleGoogleSignIn} className="google-btn">
            Iniciar Sesión con Google <span></span>
          </button>
          <button onClick={handleGuestSignIn} className="guest-btn">
            Entrar como Invitado <span> </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;