// La URL base de tu futuro backend
const API_URL = 'http://localhost:4000/api';

/**
 * Sincroniza el usuario de Firebase con nuestra base de datos del backend.
 * Se llama cada vez que un usuario inicia sesión.
 * @param {string} token - El ID Token de Firebase del usuario.
 */
export const syncUser = async (token) => {
  try {
    const response = await fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Enviamos el token para la verificación
      }
    });

    if (!response.ok) {
      throw new Error('Error al sincronizar el usuario en el backend.');
    }

    const data = await response.json();
    console.log('Usuario sincronizado exitosamente:', data);
    return data;

  } catch (error) {
    console.error('Error en syncUser:', error);
  }
};
