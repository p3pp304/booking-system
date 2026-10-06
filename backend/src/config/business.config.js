/**
 * File di configurazione centrale per personalizzare il sistema
 * per qualsiasi attività (Barbiere, Estetista, Parrucchiere, Spa, ecc.)
 */

export default {
  // --- INFORMAZIONI GENERALI E BRANDING VETRINA ---
  business: {
    name: "Barberia & Style",
    category: "barber", // 'barber' | 'beauty' | 'hairdresser'
    tagline: "L'arte della cura maschile e dello stile su misura",
    description: "Dal 2018 offriamo tagli moderni, rasature tradizionali con panno caldo e trattamenti barba curati al millimetro.",
    currency: "EUR",
    currencySymbol: "€",
    locale: "it-IT",
    timezone: "Europe/Rome",
    address: {
      street: "Via Roma 10",
      city: "Milano",
      zip: "20121",
      province: "MI",
      googleMapsUrl: "https://maps.google.com/?q=Via+Roma+10+Milano"
    },
    contact: {
      phone: "+390212345678",
      whatsappNumber: "+39 3402212050", // Numero mittente WhatsApp per clienti
      instagramHandle: "@barberia_style",
      websiteUrl: "https://barberiastyle.it"
    },
    // Palette e stile grafico (applicato automaticamente al sito vetrina)
    theme: {
      primaryColor: "#0f172a",   // Slate scuro
      accentColor: "#d97706",    // Oro ambrato vintage
      fontFamily: "Inter, sans-serif"
    }
  },

  // --- REGOLE DI PRENOTAZIONE E POLICY CANCELLAZIONI ---
  bookingRules: {
    // Passo di scansione della griglia oraria (in minuti: 15 o 30 sono i più equilibrati)
    slotIntervalMinutes: 15,

    // Con quanto anticipo minimo un cliente può prenotare (es. 2 ore prima)
    minNoticeHours: 2,

    // Fino a quante settimane o giorni nel futuro il calendario è aperto
    maxAdvanceDays: 30,

    defaultSeats: 3,

    // --- POLICY CANCELLAZIONI E SPOSTAMENTI ---
    cancellation: {
      allowClientCancellation: true,
      
      // Limite MINIMO di preavviso per cancellare autonomamente dal link
      // Es. 4 ore: se l'appuntamento è alle 15:00, può disdire solo entro le 11:00
      minNoticeHours: 4,

      // Messaggio generato dinamicamente
      tooLateMessage: (hours) => 
        `Il limite di preavviso (${hours} ore) è scaduto. Per disdette urgenti chiama direttamente in salone.`
    },

    // --- LIMITI ANTI-SPAM E ANTI-FURBI ---
    limits: {
      // Massimo numero di prenotazioni FUTURE attive contemporaneamente per lo stesso numero di telefono
      // Evita che un cliente prenoti 5 orari diversi per poi sceglierne uno
      maxActiveBookingsPerPhone: 2,
    },

    // Preferenze operatore
    allowWorkerSelection: true,         // Permette di scegliere il barbiere preferito
    defaultWorkerOptionLabel: "Chiunque disponibile (Prima disponibilità)"
  },

  // --- ORARI DI APERTURA SETTIMANALE DEL LOCALE ---
  // (Tutti i worker seguono questi orari, salvo blocchi ferie specifici)
  weeklySchedule: {
    monday: { isOpen: false, intervals: [] },
    tuesday: {
      isOpen: true,
      activeSeats:3,
      intervals: [
        { open: "09:00", close: "13:00" },
        { open: "15:00", close: "19:30" }
      ]
    },
    wednesday: {
      isOpen: true,
      activeSeats:3,
      intervals: [
        { open: "09:00", close: "13:00" },
        { open: "15:00", close: "19:30" }
      ]
    },
    thursday: {
      isOpen: true,
      activeSeats:3,
      intervals: [
        { open: "09:00", close: "13:00" },
        { open: "15:00", close: "19:30" }
      ]
    },
    friday: {
      isOpen: true,
      activeSeats:3,
      intervals: [
        { open: "09:00", close: "13:00" },
        { open: "15:00", close: "19:30" }
      ]
    },
    saturday: {
      isOpen: true,
      activeSeats:3,
      intervals: [
        { open: "08:30", close: "19:00" } // Orario continuato tipico
      ]
    },
    sunday: { isOpen: false, intervals: [] }
  },

  // --- VARIAZIONI STRAORDINARIE CAPIENZA ---
  // Date singole in cui il numero di postazioni cambia rispetto alla norma (es. malattia, ferie)
  capacityOverrides: [
    // { date: "2026-10-15", activeSeats: 2, reason: "Collaboratore con permesso" }
  ],

  // --- CHIUSURE STRAORDINARIE E FESTIVITÀ NAZIONALI ---
  // Date fisse in formato "YYYY-MM-DD" in cui il negozio è tassativamente chiuso
  specialClosures: [
    "2026-01-01", // Capodanno
    "2026-01-06", // Epifania
    "2026-04-05", // Pasqua
    "2026-04-06", // Pasquetta
    "2026-04-25", // Liberazione
    "2026-05-01", // Festa del Lavoro
    "2026-06-02", // Repubblica
    "2026-08-15", // Ferragosto
    "2026-11-01", // Ognissanti
    "2026-12-08", // Immacolata Concezione (Mancava)
    "2026-12-25", // Natale
    "2026-12-26"  // S. Stefano
  ],

  // --- CONFIGURAZIONE NOTIFICHE E WHATSAPP ---
  notifications: {
    whatsapp: {
      templates: {
        // 1. Inviato dal CLIENTE al Salone alla prenotazione
        clientBookingNotice: (data) =>
          `Ciao ${data.businessName}! 👋\n` +
          `Ho appena confermato la mia prenotazione dal sito:\n\n` +
          `👤 *Nome:* ${data.clientName}\n` +
          `💈 *Servizio:* ${data.serviceName}\n` +
          `📅 *Data:* ${data.date}\n` +
          `⏰ *Ora:* ${data.time}\n\n` +
          `🔗 *Link per gestire o disdire:*\n${data.cancellationLink}`,

        // 2. Inviato dallo STAFF al Cliente con un tap dalla Dashboard Admin
        staffReminder: (data) =>
          `Promemoria appuntamento ⏰\n` +
          `Ciao ${data.clientName}, ti ricordiamo il tuo appuntamento di *${data.date}* alle ore *${data.time}* presso *${data.businessName}* (*${data.serviceName}*).\n\n` +
          `📍 *Indirizzo:* ${data.address}\n\n` +
          `In caso di imprevisti puoi disdire entro ${data.minNoticeHours}h dall'orario qui:\n${data.cancellationLink}`,

        // 3. Inviato dal CLIENTE al Salone quando annulla online
        clientCancellationNotice: (data) =>
          `Ciao ${data.businessName}, ti avviso che ho annullato il mio appuntamento:\n\n` +
          `👤 *Cliente:* ${data.clientName}\n` +
          `💈 *Servizio:* ${data.serviceName}\n` +
          `📅 *Data:* ${data.date}\n` +
          `⏰ *Ora:* ${data.time}\n\n` +
          `Ci aggiorniamo per la prossima prenotazione!`
      }
    }
  }
};