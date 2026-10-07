import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const [token, setToken] = useState(() => localStorage.getItem('staff_token'));

  useEffect(() => {
    const handleExpiredSession = () => setToken(null);
    window.addEventListener('staff-auth-expired', handleExpiredSession);
    return () => window.removeEventListener('staff-auth-expired', handleExpiredSession);
  }, []);

  // 1. Se NON sei autenticato, ti caccia al login
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // 2. Se SEI autenticato, lascia passare e mostra la pagina richiesta!
  return <Outlet />;
}