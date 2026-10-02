import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Worker from '../models/Worker.js';
import Service from '../models/Service.js';
import { getAvailableSlots } from '../services/availability.service.js';
import businessConfig from '../config/business.config.js';
import { generateWhatsAppLinks } from '../services/whatsapp.service.js';

// GET /api/bookings/available-slots (Pubblico)
export const getSlots = async (req, res) => {
  try {
    const { date, serviceId, workerId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ error: 'Parametri date e serviceId obbligatori.' });
    }

    // 1. Validazione formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Formato data non valido. Usa YYYY-MM-DD.' });
    }

    // 2. Controllo finestra temporale (no passato, maxAdvanceDays)
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    const maxDays = businessConfig.bookingRules?.maxAdvanceDays || 30;
    maxDate.setDate(today.getDate() + maxDays);

    if (targetDate < today) {
      return res.status(400).json({ error: 'Non è possibile visualizzare slot per date passate.' });
    }

    if (targetDate > maxDate) {
      return res.status(400).json({ 
        error: `Il calendario è aperto per un massimo di ${maxDays} giorni futuri.` 
      });
    }

    // 3. Recupero del servizio
    const service = await Service.findById(serviceId).lean();
    if (!service) {
      return res.status(404).json({ error: 'Servizio selezionato non trovato.' });
    }

    // 4. Calcolo effettivo disponibilità
    const slots = await getAvailableSlots({
      dateStr: date,
      durationMinutes: service.durationMinutes,
      workerId: workerId || null
    });

    res.json({ date, slots });
  } catch (error) {
    console.error('Errore getSlots:', error);
    res.status(500).json({ error: 'Errore durante il calcolo degli slot disponibili.' });
  }
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// POST /api/bookings (Pubblico - Salva prenotazione)
export const createBooking = async (req, res) => {
  try {
    const { clientName, clientPhone, serviceId, workerId, dateStr, timeStr } = req.body;

    if (!clientName || !clientPhone || !serviceId || !dateStr || !timeStr) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Servizio non valido.' });
    }

    // 1. Limite Anti-Spam: max prenotazioni attive future per numero di telefono
    const activeBookings = await Booking.countDocuments({
      clientPhone,
      status: 'confirmed',
      startTime: { $gte: new Date() }
    });

    if (activeBookings >= businessConfig.bookingRules.limits.maxActiveBookingsPerPhone) {
      return res.status(409).json({
        error: 'Hai già un appuntamento attivo in programma. Disdici il precedente se desideri cambiare data.'
      });
    }

    // 2. Calcolo orari di inizio e fine
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const startTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // Verifica che la prenotazione non sia nel passato o violi il preavviso minimo
    const minNoticeHours = businessConfig.bookingRules?.minNoticeHours || 0;
    const minBookingTime = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);
    if (startTime < minBookingTime) {
      return res.status(400).json({
        error: `È richiesto un preavviso minimo di ${minNoticeHours} ore per prenotare.`
      });
    }

    // 3. Risoluzione Capienza e Anti-Race Condition Check
    const targetDate = new Date(year, month - 1, day);
    const dayKey = dayNames[targetDate.getDay()];
    const schedule = businessConfig.weeklySchedule?.[dayKey];

    let assignedWorkerId = workerId || null;

    if (workerId) {
      // Caso A: Il cliente ha richiesto un operatore specifico
      const isOccupied = await Booking.findOne({
        workerId,
        status: 'confirmed',
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      });

      if (isOccupied) {
        return res.status(409).json({
          error: "L'operatore selezionato è stato appena prenotato da un altro cliente."
        });
      }
    } else {
      // Caso B: "Qualsiasi operatore" -> Verifica capienza globale del giorno
      const dailyOverride = businessConfig.capacityOverrides?.find((o) => o.date === dateStr);
      const maxCapacity =
        dailyOverride?.activeSeats ||
        schedule?.activeSeats ||
        businessConfig.bookingRules?.defaultSeats ||
        1;

      // Recupera tutte le prenotazioni in conflitto in questa fascia oraria
      const conflictingBookings = await Booking.find({
        status: 'confirmed',
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }).select('workerId');

      if (conflictingBookings.length >= maxCapacity) {
        return res.status(409).json({
          error: 'Tutte le postazioni disponibili per questo orario sono state occupate.'
        });
      }

      // Assegnazione automatica del primo operatore libero (se hai il modello Worker)
      const busyWorkerIds = conflictingBookings
        .map((b) => b.workerId?.toString())
        .filter(Boolean);

      const availableWorker = await Worker.findOne({
        _id: { $nin: busyWorkerIds },
        isActive: true,
        isDeleted: false // <-- Fondamentale
      });

      if (!availableWorker) {
        return res.status(409).json({
          error: 'Tutti gli operatori sono occupati in questo orario.'
        });
      }
      assignedWorkerId = availableWorker._id;
    }

    // 4. Generazione codice univoco per disdetta
    const cancellationCode = crypto.randomBytes(8).toString('hex');

    // 5. Salvataggio della prenotazione
    const newBooking = await Booking.create({
      clientName,
      clientPhone,
      serviceId,
      workerId: assignedWorkerId,
      startTime,
      endTime,
      cancellationCode,
      status: 'confirmed'
    });

    // Formatta data e ora leggibili per il testo WhatsApp
    const formattedDate = startTime.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
    });
    const formattedTime = startTime.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
    });

    // Genera l'URL wa.me con il template 1 (Client -> Salone)
    const whatsappUrl = generateWhatsAppLinks.clientBookingNotice({
    clientName: newBooking.clientName,
    serviceName: service.name,
    date: formattedDate,
    time: formattedTime,
    cancellationCode: newBooking.cancellationCode,
    clientUrl: req.get('origin') // o l'URL base del tuo frontend PWA
    });

    res.status(201).json({
    success: true,
    booking: {
        id: newBooking._id,
        clientName: newBooking.clientName,
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
        cancellationCode: newBooking.cancellationCode
    },
    whatsappUrl // <-- Il frontend apre semplicemente window.open(whatsappUrl, '_blank')
    });
  } catch (error) {
    console.error('Errore createBooking:', error);
    res.status(500).json({ error: 'Impossibile completare la prenotazione.' });
  }
};

/**
 * @route   GET /api/bookings/manage/:code
 * @desc    Recupera i dettagli dell'appuntamento e calcola se è disdicibile
 * @params  code (cancellationCode univoco)
 */
export const getBookingForManagement = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Codice prenotazione obbligatorio.' });
    }

    const booking = await Booking.findOne({ cancellationCode: code })
      .populate('serviceId', 'name durationMinutes price')
      .populate('workerId', 'name');

    if (!booking) {
      return res.status(404).json({ error: 'Appuntamento non trovato o codice non valido.' });
    }

    if (booking.status === 'cancelled') {
      return res.json({
        success: true,
        status: 'cancelled',
        message: 'Questo appuntamento risulta già annullato.',
        booking: {
          clientName: booking.clientName,
          serviceName: booking.serviceId?.name || 'Servizio',
          startTime: booking.startTime
        },
        cancellationPolicy: {
          canCancel: false
        }
      });
    }

    const now = Date.now();
    const apptTime = new Date(booking.startTime).getTime();
    const hoursRemaining = (apptTime - now) / (1000 * 60 * 60);

    const minNoticeHours = businessConfig.bookingRules?.cancellation?.minNoticeHours ?? 4;
    const allowClientCancellation = businessConfig.bookingRules?.cancellation?.allowClientCancellation ?? true;

    const canCancel = allowClientCancellation && hoursRemaining >= minNoticeHours && hoursRemaining > 0;

    const timezone = businessConfig.business.timezone || 'Europe/Rome';
    const formattedDate = new Date(booking.startTime).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: timezone
    });

    const formattedStartTime = new Date(booking.startTime).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });

    const formattedEndTime = new Date(booking.endTime).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });

    res.json({
      success: true,
      status: booking.status,
      booking: {
        id: booking._id,
        clientName: booking.clientName,
        service: {
          name: booking.serviceId?.name || 'Servizio',
          durationMinutes: booking.serviceId?.durationMinutes,
          price: booking.serviceId?.price
        },
        workerName: booking.workerId?.name || 'Qualsiasi operatore disponibile',
        dateText: formattedDate,
        timeWindowText: `${formattedStartTime} - ${formattedEndTime}`,
        startTime: booking.startTime,
        endTime: booking.endTime
      },
      cancellationPolicy: {
        canCancel,
        minNoticeHours,
        hoursRemaining: Math.max(0, Number(hoursRemaining.toFixed(1))),
        salonPhone: businessConfig.business.contact.phone || businessConfig.business.contact.whatsappNumber,
        noticeMessage: canCancel
          ? `Puoi annullare gratuitamente fino a ${minNoticeHours} ore prima dell'inizio.`
          : businessConfig.bookingRules.cancellation.tooLateMessage(minNoticeHours)
      }
    });
  } catch (error) {
    console.error('Errore getBookingForManagement:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei dettagli della prenotazione.' });
  }
};

/**
 * @route   POST /api/bookings/cancel/:code
 * @desc    Conferma la cancellazione della prenotazione da parte del cliente
 * @params  code (cancellationCode univoco)
 */
export const cancelBooking = async (req, res) => {
  try {
    const { code } = req.params;

    const cancellationRules = businessConfig.bookingRules?.cancellation;
    if (!cancellationRules?.allowClientCancellation) {
      return res.status(403).json({
        error: 'Le disdette online sono temporaneamente disabilitate. Contatta direttamente il salone.'
      });
    }

    const booking = await Booking.findOne({ cancellationCode: code, status: 'confirmed' });

    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata o già annullata.' });
    }

    const now = Date.now();
    const apptTime = new Date(booking.startTime).getTime();
    const hoursNotice = (apptTime - now) / (1000 * 60 * 60);

    const minNoticeHours = cancellationRules.minNoticeHours || 0;

    if (hoursNotice < minNoticeHours) {
      return res.status(400).json({
        error: cancellationRules.tooLateMessage(minNoticeHours)
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Prenotazione annullata con successo.'
    });
  } catch (error) {
    console.error('Errore cancelBooking:', error);
    res.status(500).json({ error: "Errore durante l'annullamento." });
  }
};