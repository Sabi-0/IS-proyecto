import React, { useEffect, useState } from 'react';
import AuthPage from './components/Authpage/AuthPage.js';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { syncUser } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Nuevo estado para la carga inicial

  useEffect(() => {
    // onAuthStateChanged nos dice si el usuario está logueado o no
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // La comprobación inicial ha terminado
    });

    // Limpiamos el listener cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Mientras se comprueba el estado de autenticación, no mostramos nada
  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="App">
      {user ? (
        // Si hay un usuario, muestra la bienvenida
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1>¡Bienvenido!</h1>
          <p>Email: {user.email || 'Invitado'}</p>
          <p>UID: {user.uid}</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px' }}>
            Cerrar Sesión
          </button>
        </div>
      ) : (
        // Si no hay usuario, muestra la página de login
        <AuthPage />
      )}
    </div>
  );
}

export default App;
