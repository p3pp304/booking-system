const localUrl = import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3000';
export const API_BASE_URL = import.meta.env.DEV ? localUrl : '';

/**
 * Wrapper per le chiamate PUBBLICHE del cliente.
 * Nessun accesso al token, pulito per la navigazione libera.
 */
export const publicRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Errore durante la richiesta al server');
  }

  return res.json();
};

/**
 * Wrapper per le chiamate PROTETTE di Admin e Staff.
 * Inietta automaticamente il token JWT presente nel browser.
 */
export const adminRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Errore durante la richiesta protetta');
  }

  return res.json();
};