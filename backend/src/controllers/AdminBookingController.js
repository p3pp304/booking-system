import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Worker from '../models/Worker.js';
import Service from '../models/Service.js';
import businessConfig from '../config/business.config.js';


const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * @route   GET /api/admin/bookings
 * @desc    Recupera la lista appuntamenti per l'agenda admin con populate
 * @query   date (es: YYYY-MM-DD per singolo giorno)
 * @query   startDate, endDate (per range date)
 * @query   workerId (opzionale, filtra per barbiere)
 * @query   status (opzionale, es: "confirmed,completed")
 */
export const getBookings = async (req, res) => {
  try {
    const { date, startDate, endDate, workerId, status } = req.query;
    const filter = {};

    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      filter.startTime = {
        $gte: new Date(year, month - 1, day, 0, 0, 0, 0),
        $lte: new Date(year, month - 1, day, 23, 59, 59, 999)
      };
    } else if (startDate && endDate) {
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      filter.startTime = {
        $gte: new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0),
        $lte: new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999)
      };
    }

    if (req.user?.role === 'staff') {
      if (!req.user.workerId) {
        return res.status(403).json({ error: 'Account staff non collegato a un operatore.' });
      }
      filter.workerId = req.user.workerId;
    } else if (workerId) {
      filter.workerId = workerId;
    }
    if (status) filter.status = { $in: status.split(',') };

    const bookings = await Booking.find(filter)
      .populate('serviceId', 'name durationMinutes price')
      .populate('workerId', 'name')
      .sort({ startTime: 1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    console.error('Errore getBookings:', error);
    res.status(500).json({ error: 'Errore recupero appuntamenti.' });
  }
};

/**
 * @route   POST /api/admin/bookings
 * @desc    Inserimento manuale appuntamento (walk-in o telefonico) senza limiti anti-spam
 * @body    clientName, clientPhone, serviceId, workerId (opz.), dateStr, timeStr, datetime, notes (opz.)
 */
export const createManualBooking = async (req, res) => {
  try {
    // 1. Aggiungiamo 'datetime' che ci viene inviato dal frontend
    const { clientName, clientPhone, serviceId, workerId, dateStr, timeStr, datetime, notes } = req.body;

    if (!clientName || !clientPhone || !serviceId || !dateStr || !timeStr || !datetime) {
      return res.status(400).json({ error: 'Dati obbligatori mancanti.' });
    }

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Servizio non trovato.' });

    // 2. Estraiamo anno, mese e giorno per usarli più avanti nel controllo capienza
    const [year, month, day] = dateStr.split('-').map(Number);

    // 3. IL TRUCCO DELLA Z: usiamo il 'datetime' puro inviato dal frontend
    const startTime = new Date(datetime);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    let assignedWorkerId = workerId || null;

    if (workerId) {
      const conflict = await Booking.findOne({
        workerId,
        status: { $in: ['confirmed', 'completed'] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      });
      if (conflict) {
        return res.status(409).json({ error: 'Operatore già occupato in questo slot.' });
      }
    } else {
      const targetDate = new Date(year, month - 1, day);
      const dayKey = dayNames[targetDate.getDay()];
      const schedule = businessConfig.weeklySchedule?.[dayKey];
      const dailyOverride = businessConfig.capacityOverrides?.find((o) => o.date === dateStr);
      const maxCapacity =
        dailyOverride?.activeSeats ||
        schedule?.activeSeats ||
        businessConfig.bookingRules?.defaultSeats ||
        1;

      const conflictingBookings = await Booking.find({
        status: { $in: ['confirmed', 'completed'] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }).select('workerId');

      if (conflictingBookings.length >= maxCapacity) {
        return res.status(409).json({ error: 'Postazioni al completo per questo orario.' });
      }

      const busyWorkerIds = conflictingBookings.map((b) => b.workerId?.toString()).filter(Boolean);
      const availableWorker = await Worker.findOne({
        _id: { $nin: busyWorkerIds },
        isActive: true
      });
      if (availableWorker) assignedWorkerId = availableWorker._id;
    }

    const cancellationCode = crypto.randomBytes(8).toString('hex');
    const newBooking = await Booking.create({
      clientName,
      clientPhone,
      serviceId,
      price: service.price,
      workerId: assignedWorkerId,
      startTime,
      endTime,
      notes: notes || '',
      cancellationCode,
      status: 'confirmed',
      isManual: true
    });

    res.status(201).json({ success: true, booking: newBooking });
  } catch (error) {
    console.error('Errore createManualBooking:', error);
    res.status(500).json({ error: 'Errore inserimento manuale.' });
  }
};

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Modifica dettagli di un appuntamento (orario, cliente, servizio, barbiere, note)
 * @params  id (ObjectId della prenotazione)
 * @body    clientName, clientPhone, serviceId, workerId, dateStr, timeStr, notes
 */
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientPhone, serviceId, workerId, dateStr, timeStr, notes } = req.body;

    if (req.user?.role === 'staff' && workerId && String(workerId) !== String(req.user.workerId)) {
      return res.status(403).json({ error: 'Puoi assegnare appuntamenti solo alla tua postazione.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Appuntamento non trovato.' });

    let startTime = booking.startTime;
    let endTime = booking.endTime;
    let finalServiceId = booking.serviceId;
    let finalPrice = booking.price;

    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (!service) return res.status(404).json({ error: 'Servizio non trovato.' });
      finalServiceId = service._id;
      finalPrice = service.price;
      endTime = new Date(new Date(startTime).getTime() + service.durationMinutes * 60 * 1000);
    }

    if (req.body.datetime) {
          // Usa l'UTC forzato unificato (trucco della Z) in arrivo dall'Admin Panel
          startTime = new Date(req.body.datetime);
          const service = await Service.findById(finalServiceId);
          endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);
        }
    const finalWorkerId = workerId !== undefined ? workerId : booking.workerId;

    if (finalWorkerId) {
      const conflict = await Booking.findOne({
        _id: { $ne: id },
        workerId: finalWorkerId,
        status: { $in: ['confirmed', 'completed'] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      });
      if (conflict) {
        return res.status(409).json({ error: 'Conflitto orario con un altro appuntamento.' });
      }
    }

    // Blocchi orari: soltanto cancellazione definitiva, MAI modifica campi
    if (booking.type === 'block') {
      return res.status(409).json({
        error: 'Impossibile modificare un blocco orario. I blocchi possono essere eliminati SOLamente tramite "Elimina definitivamente".'
      });
    }

    booking.clientName = clientName !== undefined ? clientName : booking.clientName;
    booking.clientPhone = clientPhone !== undefined ? clientPhone : booking.clientPhone;
    booking.serviceId = serviceId !== undefined ? finalServiceId : booking.serviceId;
    booking.price = serviceId !== undefined ? finalPrice : booking.price;
    booking.workerId = workerId !== undefined ? finalWorkerId : booking.workerId;
    booking.startTime = dateStr && timeStr ? startTime : booking.startTime;
    booking.endTime = dateStr && timeStr ? endTime : booking.endTime;
    if (notes !== undefined) booking.notes = notes;

    await booking.save();
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Errore updateBooking:', error);
    res.status(500).json({ error: 'Errore modifica appuntamento.' });
  }
};

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    Eliminazione definitiva dal database di una prenotazione
 * @params  id (ObjectId della prenotazione)
 */
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Appuntamento non trovato.' });
    res.json({ success: true, message: 'Appuntamento eliminato con successo.' });
  } catch (error) {
    console.error('Errore deleteBooking:', error);
    res.status(500).json({ error: 'Errore eliminazione appuntamento.' });
  }
};

/**
 * @route   PATCH /api/admin/bookings/:id/status
 * @desc    Cambio stato manuale ('confirmed', 'completed', 'no-show', 'cancelled')
 *          Vincolo: 'no-show' e 'cancelled' impostabili solo entro le 23:59 del giorno dell'appuntamento
 * @params  id (ObjectId della prenotazione)
 * @body    status (stringa tra gli stati ammessi)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['confirmed', 'completed', 'no-show', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Stato non valido.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Appuntamento non trovato.' });

    if (status === 'no-show' || status === 'cancelled') {
      const endOfDay = new Date(booking.startTime);
      endOfDay.setHours(23, 59, 59, 999);
      if (Date.now() > endOfDay.getTime()) {
        return res.status(400).json({
          error: "Modifica in 'no-show' o 'cancelled' consentita solo entro fine giornata."
        });
      }
    }

    booking.status = status;
    if (status === 'completed') booking.completedAt = new Date();
    if (status === 'cancelled') booking.cancelledAt = new Date();

    await booking.save();
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Errore updateBookingStatus:', error);
    res.status(500).json({ error: 'Errore aggiornamento stato.' });
  }
};


// GET /api/admin/bookings/:id/reminder-link (Genera il link wa.me)
export const getBookingReminderLink = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('serviceId');
    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Impossibile inviare un promemoria per un appuntamento annullato.' });
    }

// Forza la formattazione testuale in UTC puro per ignorare fusi orari server
    const formattedDate = new Date(booking.startTime).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });

    const formattedTime = new Date(booking.startTime).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });

    const reminderUrl = generateWhatsAppLinks.staffReminder({
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.serviceId?.name || 'Servizio Salone',
      date: formattedDate,
      time: formattedTime,
      cancellationCode: booking.cancellationCode,
      clientUrl: req.get('origin') || businessConfig.business.websiteUrl
    });

    res.json({
      success: true,
      reminderUrl,
      whatsappReminderSent: !!booking.whatsappReminderSent,
      reminderSentAt: booking.reminderSentAt || null
    });
  } catch (error) {
    console.error('Errore getBookingReminderLink:', error);
    res.status(500).json({ error: 'Errore durante la generazione del link promemoria.' });
  }
};

// POST /api/admin/bookings/:id/reminder-status (Conferma o annulla stato invio)
export const updateReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Permette sia di confermare l'invio ({ sent: true }) sia di resettarlo ({ sent: false })
    const { sent = true } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        whatsappReminderSent: sent,
        reminderSentAt: sent ? new Date() : null
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata.' });
    }

    res.json({
      success: true,
      whatsappReminderSent: booking.whatsappReminderSent,
      reminderSentAt: booking.reminderSentAt
    });
  } catch (error) {
    console.error('Errore updateReminderStatus:', error);
    res.status(500).json({ error: 'Errore aggiornamento stato promemoria.' });
  }
};



export const createTimeBlock = async (req, res) => {
  try {
    const { workerId, startDate, endDate, reason } = req.body;

    if (!workerId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Operatore, data inizio e data fine sono obbligatori.' });
    }

    // startDate/endDate provengono da <input type="datetime-local">, che
    // restituisce un valore in orario business locale (Europe/Rome, senza
    // offset UTC). Le convertiamo esplicitamente in un istante UTC vero
    // prima di salvarle nel database, altrimenti il "navegador locale"
    // del server produce istanti errati.
    const start = businessDateTimeLocalToUtcDate(startDate);
    const end = businessDateTimeLocalToUtcDate(endDate);

    if (start >= end) {
      return res.status(400).json({ error: 'La data di inizio deve precedere la data di fine.' });
    }

    const worker = await Worker.findOne({ _id: workerId, isDeleted: false });
    if (!worker) {
      return res.status(404).json({ error: 'Operatore non trovato.' });
    }

    // Controllo sovrapposizione con tagli già confermati
    const conflictingBookings = await Booking.find({
      workerId,
      status: 'confirmed',
      type: 'appointment',
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (conflictingBookings.length > 0) {
      return res.status(409).json({
        error: `Impossibile bloccare: ci sono ${conflictingBookings.length} prenotazioni cliente in questo intervallo.`,
        conflicts: conflictingBookings
      });
    }

    // Usa il motivo inserito dall'utente, altrimenti fallback a "Assenza"
    const blockReason = reason?.trim() || 'Assenza';

    const block = await Booking.create({
      workerId,
      startTime: start,
      endTime: end,
      type: 'block', // etichetta generica per qualsiasi blocco/assenza
      status: 'confirmed',
      clientName: `[BLOCCO] ${blockReason}`,
      clientPhone: '',
      notes: blockReason,
    });

    res.status(201).json({
      success: true,
      message: 'Assenza registrata con successo.',
      block
    });
  } catch (error) {
    console.error('Errore createTimeBlock:', error);
    res.status(500).json({ error: 'Errore durante la registrazione dell\'assenza.' });
  }
};