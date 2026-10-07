const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const localApiUrl = import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3000';
let apiConfigurationError = '';
let apiBaseUrl = import.meta.env.DEV ? localApiUrl : '';

if (configuredApiUrl) {
  try {
    const parsedUrl = new URL(configuredApiUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
      throw new Error('Use only the backend origin, without a path such as /api or /dhkbdw.');
    }
    apiBaseUrl = parsedUrl.origin;
  } catch (error) {
    apiConfigurationError = `VITE_API_BASE_URL non valido: ${error.message}`;
    console.error(apiConfigurationError);
  }
}

export const API_BASE_URL = apiBaseUrl.replace(/\/$/, '');

const assertApiConfiguration = () => {
  if (apiConfigurationError) throw new Error(apiConfigurationError);
};

/**
 * Wrapper per le chiamate PUBBLICHE del cliente.
 * Nessun accesso al token, pulito per la navigazione libera.
 */
export const publicRequest = async (endpoint, options = {}) => {
  assertApiConfiguration();
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
  assertApiConfiguration();
  const token = localStorage.getItem('staff_token') || localStorage.getItem('auth_token');

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