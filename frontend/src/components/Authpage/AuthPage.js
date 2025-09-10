import React, { useState } from 'react';
import { auth, googleProvider } from '../../firebaseConfig.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously
} from "firebase/auth";
import './AuthPage.css'; 

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // Para cambiar entre login y registro

  // Función genérica para manejar login/registro con email
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('¡Registro exitoso!.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Login con Google
  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  // Login como invitado
  const handleGuestSignIn = async () => {
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
        <form onSubmit={handleEmailAuth}>
          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña "
              required
              minLength="6"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-button">
            {isRegistering ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="toggle-auth-mode">
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
        <div className="divider">o</div>
        <button onClick={handleGoogleSignIn} className="social-button google">
          Continuar con Google
        </button>
        <button onClick={handleGuestSignIn} className="social-button guest">
          Entrar como Invitado
        </button>
      </div>
    </div>
  );
};

export default AuthPage;