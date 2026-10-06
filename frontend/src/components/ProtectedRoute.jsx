import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('staff_token');

  // 1. Se NON sei autenticato, ti caccia al login
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // 2. Se SEI autenticato, lascia passare e mostra la pagina richiesta!
  return <Outlet />;
}