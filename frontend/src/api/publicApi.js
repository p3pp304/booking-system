import { publicRequest } from './api';

// Lista dei servizi attivi per il listino e il wizard
export const fetchServices = () => {
  return publicRequest('/services', {
    method: 'GET',
  });
};

// Barbieri operativi (isActive: true, isDeleted: false)
export const fetchWorkers = () => {
  return publicRequest('/workers', {
    method: 'GET',
  });
};

// Calcolo slot orari disponibili per data, servizio e barbiere opzionale
export const fetchAvailableSlots = ({ date, serviceId, workerId }) => {
  const params = new URLSearchParams({
    date,
    serviceId,
  });

  if (workerId) {
    params.append('workerId', workerId);
  }

  return publicRequest(`/bookings/available-slots?${params.toString()}`, {
    method: 'GET',
  });
};

// Creazione di una nuova prenotazione cliente
export const createBooking = (payload) => {
  return publicRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Dettagli prenotazione e verifica policy di disdetta
export const fetchBookingByCode = (code) => {
  return publicRequest(`/bookings/manage/${code}`, {
    method: 'GET',
  });
};

// Annullamento appuntamento tramite token di disdetta
export const cancelBookingByCode = (code) => {
  return publicRequest(`/bookings/cancel/${code}`, {
    method: 'POST',
  });
};