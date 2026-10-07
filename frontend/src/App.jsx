import HomePage from './components/HomePage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ManageBookingPage from './components/ManageBooking';
import AdminLayout from './components/AdminLayout';
import StaffLogin from './components/StaffLogin';
import StaffScheduleDashboard from './components/StaffScheduleDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SettingsPage from './components/SettingPage';
import StaffPage from './components/StaffAndServices';
import InstallAppNotice from './components/InstallAppNotice';

// Verifica la modalità impostata su Vercel (.env)
const isAdminApp = import.meta.env.VITE_APP_MODE === 'admin';

export default function App() {
  return (
    <BrowserRouter>
      <InstallAppNotice />
      <Routes>
        {/* Rotta iniziale: se siamo sull'app Admin va subito a /admin/schedule, altrimenti mostra HomePage */}
        <Route 
          path="/" 
          element={
            isAdminApp ? (
              <Navigate to="/admin/schedule" replace />
            ) : (
              <HomePage />
            )
          } 
        />

        {/* Rotte Clienti */}
        <Route path="/disdici" element={<ManageBookingPage />} />
        <Route path="/manage/:code?" element={<ManageBookingPage />} />

        {/* Login Gestionale */}
        <Route path="/admin/login" element={<StaffLogin />} />

        {/* Area Gestionale Protetta */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            {/* Redirect automatico da /admin a /admin/schedule */}
            <Route index element={<Navigate to="schedule" replace />} />
            
            <Route path="schedule" element={<StaffScheduleDashboard />} />
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="workers" element={<StaffPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback per pagine non trovate */}
        <Route 
          path="*" 
          element={<Navigate to={isAdminApp ? "/admin/schedule" : "/"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}