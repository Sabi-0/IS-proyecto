import React, { useEffect, useState } from 'react';
import AuthPage from './components/Authpage/AuthPage.js';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { syncUser } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // --- 2. Lógica para sincronizar con el backend ---
      if (currentUser) {
        try {
          // Obtenemos el token del usuario actual
          const token = await currentUser.getIdToken();
          // Enviamos el token a nuestro backend
          await syncUser(token);
        } catch (error) {
          console.error("No se pudo obtener el token o sincronizar el usuario.", error);
        }
      }
      // --------------------------------------------------

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="App">
      {user ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1>¡Bienvenido!</h1>
          <p>Email: {user.email || 'Invitado'}</p>
          <p>UID: {user.uid}</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px' }}>
            Cerrar Sesión
          </button>
        </div>
      ) : (
        <AuthPage />
      )}
    </div>
  );
}

export default App;
