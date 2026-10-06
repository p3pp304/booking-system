import { adminRequest, publicRequest } from './api';

// ==========================================
// 1. AUTENTICAZIONE E PROFILO  (sia staff che admin)
// ==========================================

export const loginAdmin = (credentials) => {
  return adminRequest('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const fetchAdminProfile = () => {
  return adminRequest('/admin/profile/me', {
    method: 'GET',
  });
};

export const updateAdminProfile = (profileData) => {
  return adminRequest('/admin/profile/me', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const changeAdminPassword = (passwords) => {
  return adminRequest('/admin/profile/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwords),
  });
};

// ==========================================
// 2. AGENDA E APPUNTAMENTI
// ==========================================

export const fetchAdminBookings = (dateStr, workerId = null) => {
  const params = new URLSearchParams({ date: dateStr });
  if (workerId) {
    params.append('workerId', workerId);
  }

  return adminRequest(`/admin/bookings?${params.toString()}`, {
    method: 'GET',
  });
};

export const createManualBooking = (bookingData) => {
  return adminRequest('/admin/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
};

export const createBlockBooking = (blockData) => {
  return adminRequest('/admin/bookings/block', {
    method: 'POST',
    body: JSON.stringify(blockData),
  });
};

export const updateBookingDetails = (id, bookingData) => {
  return adminRequest(`/admin/bookings/${id}`, {
    method: 'PUT', 
    body: JSON.stringify(bookingData),
  });
};

export const updateBookingStatus = (id, status) => {
  return adminRequest(`/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const deleteBookingDefinitive = (id) => {
  return adminRequest(`/admin/bookings/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// 3. GESTIONE ORGANICO (BARBIERI)
// ==========================================

export const fetchAllWorkers = () => {
  return adminRequest('/admin/workers', {
    method: 'GET',
  });
};

export const createWorker = (workerData) => {
  return adminRequest('/admin/workers', {
    method: 'POST',
    body: JSON.stringify(workerData),
  });
};

export const updateWorker = (id, workerData) => {
  return adminRequest(`/admin/workers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(workerData),
  });
};

export const toggleWorkerActive = (id) => {
  return adminRequest(`/admin/workers/${id}/toggle-active`, {
    method: 'PATCH',
  });
};

export const deleteWorker = (id) => {
  return adminRequest(`/admin/workers/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// 4. LISTINO SERVIZI
// ==========================================

export const fetchAllServicesAdmin = () => {
  return adminRequest('/admin/services/all', {
    method: 'GET',
  });
};

export const createService = (serviceData) => {
  return adminRequest('/admin/services', {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
};

export const updateService = (id, serviceData) => {
  return adminRequest(`/admin/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(serviceData),
  });
};

export const deleteService = (id) => {
  return adminRequest(`/admin/services/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// PROMEMORIA WHATSAPP
// ==========================================

export const fetchBookingReminderLink = (id) => {
  return adminRequest(`/admin/bookings/${id}/reminder-link`, {
    method: 'GET',
  });
};

export const updateBookingReminderStatus = (id, sent = true) => {
  return adminRequest(`/admin/bookings/${id}/reminder-status`, {
    method: 'PATCH',
    body: JSON.stringify({ sent }),
  });
};

// INCASSI
export const fetchAdminRevenueStats = ({ period = 'month', year, month, date } = {}) => {
  const params = new URLSearchParams({ period });
  if (year) params.append('year', year);
  if (month) params.append('month', month);
  if (date) params.append('date', date);

  return adminRequest(`/admin/revenue?${params.toString()}`, {
    method: 'GET',
  });
};