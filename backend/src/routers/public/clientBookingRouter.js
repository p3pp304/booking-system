import express from 'express';
import { createBooking, getSlots, getBookingForManagement, cancelBooking } from '../../controllers/ClientBookingController.js';

const router = express.Router();

/**
 * @route   GET /api/bookings/available-slots
 * @desc    Calcola gli slot orari disponibili per una determinata data
 * @query   date (YYYY-MM-DD), serviceId (string), workerId (opzionale)
 */
router.get('/available-slots', getSlots);

/**
 * @route   POST /api/bookings
 * @desc    Crea una nuova prenotazione da parte del cliente (controllo conflitti + anti-spam)
 * @body    clientName, clientPhone, serviceId, workerId (opzionale), dateStr, timeStr, notes
 */
router.post('/', createBooking);

/**
 * @route   GET /api/bookings/manage/:code
 * @desc    Riepilogo appuntamento per il cliente e verifica idoneità disdetta (< 4 ore)
 * @params  code (cancellationCode univoco)
 */
router.get('/manage/:code', getBookingForManagement);

/**
 * @route   POST /api/bookings/cancel/:code
 * @desc    Esegue la disdetta autonoma del cliente se rispetta il preavviso minimo
 * @params  code (cancellationCode univoco)
 */
router.post('/cancel/:code', cancelBooking);

export default router;