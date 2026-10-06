import Booking from '../models/Booking.js';
import Worker from '../models/Worker.js';
import Service from '../models/Service.js';
import { getAvailableSlots } from '../services/availability.service.js';
import businessConfig from '../config/business.config.js';
import { cleanAndValidatePhone, validateFullName } from '../utils/validators.js';
import { generateWhatsAppLinks, createGoogleCalendarUrl } from '../services/reminder.service.js';

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
    const { 
      clientName, 
      clientPhone, 
      serviceId, 
      workerId, 
      dateStr, 
      timeStr, 
      notes // <-- 1. Estratto dal body
    } = req.body;

    // --- BLINDO LIVELLO 2: Validazione Dati Cliente ---
    if (!validateFullName(clientName)) {
      return res.status(400).json({ 
        error: 'Nome e cognome obbligatori (almeno due parole di minimo 2 lettere).' 
      });
    }

    // Validazione e Normalizzazione Cellulare
    const phoneCheck = cleanAndValidatePhone(clientPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ 
        error: 'Numero di cellulare non valido. Inserisci un cellulare italiano (es. 340 1234567) o un numero estero con prefisso internazionale (+XX).' 
      });
    }

    // Normalizziamo il nome togliendo spazi doppi
    const normalizedName = clientName.trim().split(/\s+/).join(' ');
    
    // Nel DB salviamo il numero GIÀ PULITO e verificato!
    // (es. "3401234567" se italiano, o "+491701234567" se estero)
    const normalizedPhone = phoneCheck.cleanPhone;

    if (!clientName || !clientPhone || !serviceId || !dateStr || !timeStr) {
      return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
    }

    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Servizio non valido.' });
    }

    // 1. Limite Anti-Spam: max prenotazioni attive future per numero di telefono
    const activeBookings = await Booking.countDocuments({
      clientPhone: normalizedPhone,
      status: 'confirmed',
      startTime: { $gte: new Date() }
    });

    if (activeBookings > businessConfig.bookingRules.limits.maxActiveBookingsPerPhone) {
      return res.status(409).json({
        error: 'Hai già un appuntamento attivo in programma. Disdici il precedente se desideri cambiare data.'
      });
    }

    // 2. Calcolo orari di inizio e fine
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const startTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // Verifica preavviso minimo
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
      // Caso A: Operatore specifico
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

      // Assegnazione automatica del primo operatore libero
      const busyWorkerIds = conflictingBookings
        .map((b) => b.workerId?.toString())
        .filter(Boolean);

      const availableWorker = await Worker.findOne({
        _id: { $nin: busyWorkerIds },
        isActive: true,
        isDeleted: false
      });

      if (!availableWorker) {
        return res.status(409).json({
          error: 'Tutti gli operatori sono occupati in questo orario.'
        });
      }
      assignedWorkerId = availableWorker._id;
    }

    // 4. Generazione codice univoco per disdetta
    const cancellationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sanitizedNotes = notes ? notes.trim() : '';

    // 5. Salvataggio della prenotazione
    const newBooking = await Booking.create({
      clientName: normalizedName,
      clientPhone: normalizedPhone,
      serviceId,
      workerId: assignedWorkerId,
      startTime,
      endTime,
      notes: sanitizedNotes, // <-- 2. Salvato a database
      cancellationCode,
      status: 'confirmed'
    });

    // Formattazione data e ora per WhatsApp
    const formattedDate = startTime.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = startTime.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generazione URL wa.me
    const whatsappUrl = generateWhatsAppLinks.clientBookingNotice({
      clientName: newBooking.clientName,
      serviceName: service.name,
      date: formattedDate,
      time: formattedTime,
      notes: newBooking.notes, // <-- 3. Passato al generatore WhatsApp
      cancellationCode: newBooking.cancellationCode,
      clientUrl: req.get('origin')
    });

    const googleCalendarUrl = createGoogleCalendarUrl({
          serviceName: service?.name || "Taglio / Trattamento", // la variabile service recuperata prima della create
          clientName: newBooking.clientName,
          startTime: newBooking.startTime,
          endTime: newBooking.endTime,
          cancellationCode: newBooking.cancellationCode,
        });

    return res.status(201).json({
      success: true,
      booking: newBooking,
      whatsappUrl,
      googleCalendarUrl
    });
  } catch (error) {
    console.error('Errore createBooking:', error);
    return res.status(500).json({ error: 'Impossibile completare la prenotazione.' });
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

    const booking = await Booking.findOne({ cancellationCode: code })
      .populate('serviceId', 'name price duration')
      .populate('workerId', 'name');

    if (!booking) {
      return res.status(404).json({ error: 'Appuntamento non trovato.' });
    }

    // Calcolo preavviso
    const minHours = businessConfig.bookingRules?.cancellation?.minNoticeHours || 4;
    const now = new Date();
    const apptTime = new Date(booking.startTime);
    const diffHours = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Può disdire solo se lo stato attuale nel DB è 'confirmed' ED è nei tempi
    const canCancel = booking.status === 'confirmed' && diffHours >= minHours;

    return res.json({
      success: true,
      booking: {
        id: booking._id,
        cancellationCode: booking.cancellationCode,
        clientName: booking.clientName,
        serviceName: booking.serviceId?.name || 'Trattamento',
        workerName: booking.workerId?.name,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status, // Deve essere quello del DB ('confirmed')
      },
      policy: {
        canCancel,
        minNoticeHours: minHours,
        diffHours: Math.round(diffHours * 10) / 10,
      },
      businessContact: {
        phone: businessConfig.business.contact.phone,
        whatsappNumber: businessConfig.business.contact.whatsappNumber,
      }
    });
  } catch (error) {
    console.error('Errore getBookingForManagement:', error);
    return res.status(500).json({ error: 'Errore nel recupero della prenotazione.' });
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

    const booking = await Booking.findOne({ cancellationCode: code, status: 'confirmed' })
      .populate('serviceId', 'name');

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

    const timezone = businessConfig.business.timezone || 'Europe/Rome';
    const formattedDate = booking.startTime.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: timezone
    });
    const formattedTime = booking.startTime.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
    const whatsappUrl = generateWhatsAppLinks.clientCancellationNotice({
      clientName: booking.clientName,
      serviceName: booking.serviceId?.name || 'Servizio',
      date: formattedDate,
      time: formattedTime
    });

    res.json({
      success: true,
      message: 'Prenotazione annullata con successo.',
      whatsappUrl
    });
  } catch (error) {
    console.error('Errore cancelBooking:', error);
    res.status(500).json({ error: "Errore durante l'annullamento." });
  }
};