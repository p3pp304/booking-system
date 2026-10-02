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