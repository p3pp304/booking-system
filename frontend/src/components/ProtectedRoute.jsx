import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
  const [token, setToken] = useState(() => localStorage.getItem('staff_token'));
  const role = localStorage.getItem('staff_role');

  useEffect(() => {
    const handleExpiredSession = () => setToken(null);
    window.addEventListener('staff-auth-expired', handleExpiredSession);
    return () => window.removeEventListener('staff-auth-expired', handleExpiredSession);
  }, []);

  // 1. Se NON sei autenticato, ti caccia al login
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to="/admin/schedule" replace />;
  }

  // 2. Se SEI autenticato, lascia passare e mostra la pagina richiesta!
  return <Outlet />;
}