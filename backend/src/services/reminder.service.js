import businessConfig from '../config/business.config.js';

/**
 * Pulisce il numero rimuovendo spazi, trattini, parentesi e il carattere '+'
 * Es: "+39 340 123 4567" -> "393401234567"
 */
export const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
};

/**
 * Genera il link wa.me a partire da destinatario e testo
 */
export const buildWhatsAppUrl = (rawPhone, messageText) => {
  const cleanPhone = sanitizePhoneNumber(rawPhone);
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

/**
 * Generatore dei 3 link previsti dai template
 */
export const generateWhatsAppLinks = {
  // 1. Link che il CLIENTE apre per inviare la notifica di conferma al SALONE
  clientBookingNotice: ({ clientName, serviceName, date, time, cancellationCode, clientUrl }) => {
    const templateFn = businessConfig.notifications.whatsapp.templates.clientBookingNotice;
    const businessPhone = businessConfig.business.contact.whatsappNumber;

    const cancellationLink = `${clientUrl || businessConfig.business.websiteUrl}/disdici?code=${cancellationCode}`;

    const text = templateFn({
      businessName: businessConfig.business.name,
      clientName,
      serviceName,
      date,
      time,
      cancellationLink
    });

    return buildWhatsAppUrl(businessPhone, text);
  },

  // 2. Link che lo STAFF apre dalla dashboard per inviare il promemoria al CLIENTE
  staffReminder: ({ clientName, clientPhone, serviceName, date, time, cancellationCode, clientUrl }) => {
    const templateFn = businessConfig.notifications.whatsapp.templates.staffReminder;

    const cancellationLink = `${clientUrl || businessConfig.business.websiteUrl}/disdici?code=${cancellationCode}`;
    const fullAddress = `${businessConfig.business.address.street}, ${businessConfig.business.address.city}`;

    const text = templateFn({
      businessName: businessConfig.business.name,
      clientName,
      serviceName,
      date,
      time,
      address: fullAddress,
      minNoticeHours: businessConfig.bookingRules.cancellation.minNoticeHours,
      cancellationLink
    });

    return buildWhatsAppUrl(clientPhone, text);
  },

  // 3. Link che il CLIENTE usa se decide di avvisare il salone dell'annullamento
  clientCancellationNotice: ({ clientName, serviceName, date, time }) => {
    const templateFn = businessConfig.notifications.whatsapp.templates.clientCancellationNotice;
    const businessPhone = businessConfig.business.contact.whatsappNumber;

    const text = templateFn({
      businessName: businessConfig.business.name,
      clientName,
      serviceName,
      date,
      time
    });

    return buildWhatsAppUrl(businessPhone, text);
  }
};

//Genera link Google Calendar
export const createGoogleCalendarUrl = ({
  serviceName = "Appuntamento",
  clientName,
  startTime,
  endTime,
  cancellationCode,
}) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 45 * 60000);

  // Controllo di sicurezza contro RangeError
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error("createGoogleCalendarUrl: startTime o endTime non validi:", { startTime, endTime });
    return "";
  }

  // Formatta in UTC compatto: YYYYMMDDTHHmmssZ
  const formatGCalDate = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

  const businessName = businessConfig.business.name;
  const address = `${businessConfig.business.address.street}, ${businessConfig.business.address.city}`;

  const title = encodeURIComponent(`${serviceName} @ ${businessName}`);

  let detailsText = `Appuntamento per ${clientName || "Cliente"}\nServizio: ${serviceName}`;
  if (cancellationCode) detailsText += `\nCodice gestione/disdetta: ${cancellationCode}`;

  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(address);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGCalDate(start)}/${formatGCalDate(end)}&details=${details}&location=${location}`;
};

/**
 * Genera e fa partire il download di un file .ics compatibile con Apple Calendar
 */
export const downloadIcsFile = ({
  serviceName = "Appuntamento",
  businessName = "Atelier",
  address = "",
  startTime,
  endTime,
  cancellationCode,
}) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 45 * 60000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error("Date non valide per il file .ics");
    return;
  }

  // Formatta in UTC: YYYYMMDDTHHmmssZ
  const formatIcsDate = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

  const summary = `${serviceName} @ ${businessName}`;
  let description = `Appuntamento per ${serviceName}\\n`;
  if (cancellationCode) description += `Codice gestione: ${cancellationCode}\\n`;

  // Contenuto conforme alle specifiche RFC 5545
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atelier Booking//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${cancellationCode || Date.now()}@booking`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${address}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  // Crea un Blob e avvia il download/apertura su iOS/macOS
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `appuntamento-${cancellationCode || "booking"}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};