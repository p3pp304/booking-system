import HomePage from './components/HomePage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ManageBookingPage from './components/ManageBooking';
import AdminLayout from './components/AdminLayout';
import StaffLogin from './components/StaffLogin';
import StaffScheduleDashboard from './components/StaffScheduleDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SettingsPage from './components/SettingPage';
import StaffPage from './components/StaffAndServices';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pagina principale con vetrina e booking panel */}
        <Route path="/" element={<HomePage />} />

        {/* Rotta di disdetta / gestione appuntamento */}
        <Route path="/disdici" element={<ManageBookingPage />} />
        {/* Supporta anche la variante con parametro se preferisci /manage/CODICE */}
        <Route path="/manage/:code?" element={<ManageBookingPage />} />

        {/* Login Gestionale */}
        <Route path="/admin/login" element={<StaffLogin />} />

        {/* Area Gestionale Protetta */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="schedule" element={<StaffScheduleDashboard />} />
            {/* Workers / Staff */}
            <Route 
              path="workers" 
              element={<StaffPage />} 
            />

            {/* Impostazioni */}
            <Route 
              path="settings" 
              element={<SettingsPage/>} 
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
