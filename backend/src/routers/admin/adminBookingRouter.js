import express from 'express';
import {
  getBookings,
  createManualBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  getBookingReminderLink,
  updateReminderStatus,
  createTimeBlock
} from '../../controllers/AdminBookingController.js';
import { requireAdminOnly } from '../../middlewares/authMiddleware.js';
const router = express.Router();

/**
 * @route   GET /api/admin/bookings
 * @desc    Carica l'agenda appuntamenti (con populate di servizio e barbiere)
 * @query   date (YYYY-MM-DD per giorno singolo)
 * @query   startDate, endDate (per visualizzazione settimanale/mensile)
 * @query   workerId (opzionale, filtra per specifico barbiere)
 * @query   status (opzionale, es: "confirmed,completed")
 */
router.get('/', getBookings);

/**
 * 3. REGISTRAZIONE BLOCCO ORARIO / ASSENZA (Staff + Admin)
 * POST /api/admin/bookings/block
 * Riceve { workerId, startDate, endDate, reason }
 */
router.post('/block', createTimeBlock);

/**
 * @route   POST /api/admin/bookings
 * @desc    Inserimento manuale appuntamento (walk-in o prenotazione telefonica)
 * @body    clientName, clientPhone, serviceId, workerId (opz.), dateStr, timeStr, notes (opz.)
 */
router.post('/', createManualBooking);

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Modifica i dettagli di una prenotazione esistente (orario, cliente, operatore, note)
 * @params  id (ObjectId della prenotazione)
 * @body    clientName, clientPhone, serviceId, workerId, dateStr, timeStr, notes
 */
router.put('/:id', updateBooking);

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    Eliminazione permanente della prenotazione dal database (Hard delete)
 * @params  id (ObjectId della prenotazione)
 */
router.delete('/:id', requireAdminOnly, deleteBooking);

/**
 * @route   PATCH /api/admin/bookings/:id/status
 * @desc    Aggiorna lo stato: 'confirmed', 'completed', 'no-show', 'cancelled'
 *          (Vincolo: 'no-show' e 'cancelled' modificabili solo entro le 23:59 del giorno dell'appuntamento)
 * @params  id (ObjectId della prenotazione)
 * @body    status (string)
 */
router.patch('/:id/status', updateBookingStatus);

/**
 * @route   GET /api/admin/bookings/:id/reminder-link
 * @desc    Genera l'URL wa.me con testo preimpostato per inviare il promemoria manuale al cliente
 * @params  id (ObjectId della prenotazione)
 */
router.get('/:id/reminder-link', getBookingReminderLink);

/**
 * @route   PATCH /api/admin/bookings/:id/reminder-status
 * @desc    Aggiorna il flag di invio promemoria (sent: true/false) e il relativo timestamp
 * @params  id (ObjectId della prenotazione)
 * @body    sent (boolean, default: true)
 */
router.patch('/:id/reminder-status', updateReminderStatus);

export default router;