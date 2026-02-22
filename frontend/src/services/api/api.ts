import axios from 'axios';

/**
 * Instance centralisée d'Axios pour toutes les requêtes backend.
 * Elle gère automatiquement l'injection du Bearer Token et le logout en cas d'expiration.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête : Ajout du Bearer Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse : Gestion globale des erreurs (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si l'erreur est 401 (Non autorisé) ou 403 (Token expiré/invalide)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== 'undefined') {
        // Suppression des tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // Optionnel, selon votre stockage
        
        // Redirection immédiate vers la page de connexion
        // Note: window.location.href est utilisé pour forcer un rechargement propre
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
