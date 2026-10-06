// backend/src/utils/validators.js

/**
 * Valida che siano presenti almeno Nome e Cognome (minimo 2 parole di almeno 2 lettere).
 */
export const validateFullName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;
  return parts.every((part) => /^[\p{L}'-]{2,}$/u.test(part));
};

/**
 * Normalizza e valida numeri di cellulare italiani ed esteri (E.164).
 */
export const cleanAndValidatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, cleanPhone: '', isInternational: false };
  }

  // 1. Rigetta all'istante se contiene lettere
  if (/[a-zA-Z]/.test(phone)) {
    return { isValid: false, cleanPhone: '', isInternational: false };
  }

  // 2. Rimuove caratteri di separazione leciti
  let raw = phone.trim().replace(/[\s\-\(\)\/\.]/g, '');

  // 3. Normalizza 00 iniziale in '+' (es. 0049... -> +49...)
  if (raw.startsWith('00')) {
    raw = '+' + raw.slice(2);
  }

  // 4. Caso Italia esplicito (+39...)
  if (raw.startsWith('+39')) {
    const digits = raw.slice(3).replace(/\D/g, '');
    const isValid = /^3\d{8,9}$/.test(digits);
    return {
      isValid,
      cleanPhone: isValid ? digits : '', // solo cifre es. "3401234567"
      isInternational: false,
    };
  }

  // 5. Caso Estero esplicito (+XX...)
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    const isValid = /^[1-9]\d{6,14}$/.test(digits);
    return {
      isValid,
      cleanPhone: isValid ? `+${digits}` : '', // es. "+491701234567"
      isInternational: true,
    };
  }

  // 6. Caso senza prefisso (Default Italia)
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('39') && digits.length > 10) {
    digits = digits.slice(2);
  }

  const isValidItalian = /^3\d{8,9}$/.test(digits);

  return {
    isValid: isValidItalian,
    cleanPhone: isValidItalian ? digits : '',
    isInternational: false,
  };
};

/**
 * Genera il link WhatsApp senza il '+' o simboli
 */
export const formatPhoneForWhatsApp = (phoneValidation) => {
  if (!phoneValidation.isValid) return null;
  return phoneValidation.isInternational
    ? phoneValidation.cleanPhone.replace('+', '')
    : `39${phoneValidation.cleanPhone}`;
};