import Booking from '../models/Booking.js';
import Worker from '../models/Worker.js';
import businessConfig from '../config/business.config.js';

// Helper: converte stringa "HH:MM" in minuti trascorsi da inizio giornata (es. "09:30" -> 570)
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper: converte i minuti nel formato "HH:MM" (es. 570 -> "09:30")
const minutesToTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Calcola gli slot orari disponibili per una data e per la durata del servizio specificato
 * @param {Object} params
 * @param {string} params.dateStr - Data nel formato 'YYYY-MM-DD'
 * @param {number} params.durationMinutes - Durata del trattamento in minuti
 * @param {string|null} [params.workerId=null] - ID opzionale del barbiere
 * @returns {Promise<string[]>} Array di orari disponibili (es. ['09:00', '09:30', '10:00'])
 */
export const getAvailableSlots = async ({ dateStr, durationMinutes, workerId = null }) => {
  // 1. Controllo Chiusure Straordinarie / Festività
  if (businessConfig.specialClosures?.includes(dateStr)) {
    return [];
  }

  // 2. Determinazione orario di apertura del giorno
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  let schedule = null;
  if (Array.isArray(businessConfig.openingHours)) {
    schedule = businessConfig.openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  } else if (businessConfig.weeklySchedule) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    schedule = businessConfig.weeklySchedule[dayNames[dayOfWeek]];
  }

  const isOpen = schedule?.open ?? schedule?.isOpen ?? false;
  const intervals = schedule?.ranges ?? schedule?.intervals ?? [];

  if (!isOpen || intervals.length === 0) {
    return [];
  }

  // 3. Risoluzione Barbieri Eleggibili
  let eligibleWorkers = [];
  if (workerId) {
    const worker = await Worker.findOne({ _id: workerId, isActive: true, isDeleted: false }).select('_id');
    if (!worker) return [];
    eligibleWorkers = [worker._id.toString()];
  } else {
    const activeWorkers = await Worker.find({ isActive: true, isDeleted: false }).select('_id');
    if (activeWorkers.length === 0) return [];
    eligibleWorkers = activeWorkers.map((w) => w._id.toString());
  }

  // 4. Finestra temporale della giornata e preavviso minimo
  const now = new Date();
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const minNoticeHours = businessConfig.bookingRules?.minNoticeHours || 0;
  const minBookingTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

  // 5. Query prenotazioni e blocchi attivi per gli operatori eleggibili
  const existingBookings = await Booking.find({
    workerId: { $in: eligibleWorkers },
    status: { $in: ['confirmed', 'pending'] },
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay }
  })
    .select('startTime endTime workerId')
    .lean();

  const slotStep = businessConfig.bookingRules?.slotStepMinutes || businessConfig.bookingRules?.slotIntervalMinutes || 30;
  const availableSlotsSet = new Set();

  // 6. Generazione e verifica slot per ogni intervallo (mattina/pomeriggio)
  for (const interval of intervals) {
    const openTimeStr = interval.start || interval.open;
    const closeTimeStr = interval.end || interval.close;

    const openMinutes = timeToMinutes(openTimeStr);
    const closeMinutes = timeToMinutes(closeTimeStr);

    for (
      let currentMinute = openMinutes;
      currentMinute + durationMinutes <= closeMinutes;
      currentMinute += slotStep
    ) {
      const slotStartTime = new Date(
        year,
        month - 1,
        day,
        Math.floor(currentMinute / 60),
        currentMinute % 60,
        0,
        0
      );
      const slotEndTime = new Date(slotStartTime.getTime() + durationMinutes * 60 * 1000);

      // Scarta slot nel passato o che violano il preavviso
      if (slotStartTime < minBookingTime) {
        continue;
      }

      // 7. C'è almeno un barbiere libero per tutta la durata del trattamento?
      const isAnyWorkerFree = eligibleWorkers.some((wId) => {
        const hasConflict = existingBookings.some((b) => {
          const bookingWorkerId = b.workerId?.toString();
          if (!bookingWorkerId || bookingWorkerId !== wId) return false;

          const bStart = new Date(b.startTime);
          const bEnd = new Date(b.endTime);
          return slotStartTime < bEnd && slotEndTime > bStart;
        });

        return !hasConflict;
      });

      if (isAnyWorkerFree) {
        availableSlotsSet.add(minutesToTime(currentMinute));
      }
    }
  }

  return Array.from(availableSlotsSet).sort();
};