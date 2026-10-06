/**
 * Salva una nuova prenotazione attiva nel localStorage.
 * - Rimuove automaticamente quelle scadute (passate rispetto a Date.now()).
 * - Evita duplicati controllando il `code`.
 * - Ordina le prenotazioni dalla più vicina alla più lontana nel tempo.
 */
export const saveActiveBooking = (newBooking) => {
  if (!newBooking || !newBooking.code) return [];

  const STORAGE_KEY = 'my_active_bookings';
  const now = new Date();

  // 1. Recupera la lista esistente
  let stored = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stored)) stored = [];
  } catch (e) {
    stored = [];
  }

  // 2. Filtra le prenotazioni ancora attive nel futuro
  // Se non c'è startTime valido, la mantiene per sicurezza
  const activeBookings = stored.filter((item) => {
    if (!item.startTime) return true;
    return new Date(item.startTime) > now;
  });

  // 3. Rimuove eventuale duplicato con lo stesso codice prima di reinserirlo
  const filtered = activeBookings.filter((item) => item.code !== newBooking.code);

  // 4. Aggiunge la nuova prenotazione
  filtered.push({
    code: newBooking.code,
    serviceName: newBooking.serviceName,
    startTime: newBooking.startTime,
    createdAt: new Date().toISOString(),
  });

  // 5. Ordina per data crescente (il prossimo appuntamento è in cima)
  filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // 6. Salva l'array aggiornato
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  return filtered;
};

/**
 * Rimuove un codice dal localStorage quando l'utente annulla la prenotazione
 */
export const removeBookingCode = (codeToRemove) => {
  if (!codeToRemove) return;
  const STORAGE_KEY = 'my_active_bookings';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const updated = stored.filter((item) => item.code !== codeToRemove);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
};