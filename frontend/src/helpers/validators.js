/**
 * Valida che siano presenti almeno Nome e Cognome (minimo 2 parole di almeno 2 lettere).
 */
export const validateFullName = (name) => {
  if (!name || typeof name !== 'string') return false;
  // Divide per spazi multipli
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return false;

  // Ogni parola deve avere almeno 2 caratteri alfabetici (supporta accenti, apostrofi, trattini)
  return parts.every((part) => /^[\p{L}'-]{2,}$/u.test(part));
};

/**
 * Normalizza e valida il numero di cellulare.
 * Rimuove spazi, trattini, parentesi e prefisso italiano +39/0039/39.
 * Restituisce { isValid, cleanPhone }.
 */
/**
 * Normalizza e valida numeri di cellulare italiani ed esteri (E.164).
 * - Se inserito con prefisso estero (+XX o 00XX): valida secondo lo standard internazionale E.164 (7-15 cifre).
 * - Se inserito senza prefisso o con +39/0039: valida come cellulare italiano (9 o 10 cifre che iniziano per 3).
 *
 * @param {string} phone
 * @returns {{ isValid: boolean, cleanPhone: string, isInternational: boolean }}
 */
export const cleanAndValidatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, cleanPhone: '', isInternational: false };
  }

  // 1. Rigetta all'istante se contiene lettere
  if (/[a-zA-Z]/.test(phone)) {
    return { isValid: false, cleanPhone: '', isInternational: false };
  }

  // 2. Rimuove caratteri di separazione leciti (spazi, trattini, parentesi, punti, slash)
  let raw = phone.trim().replace(/[\s\-\(\)\/\.]/g, '');

  // 3. Normalizza 00 iniziale in '+' (es. 0049... -> +49...)
  if (raw.startsWith('00')) {
    raw = '+' + raw.slice(2);
  }

  // 4. CASO ITALIA ESPLICITO (+39...)
  if (raw.startsWith('+39')) {
    const digits = raw.slice(3).replace(/\D/g, '');
    const isValid = /^3\d{8,9}$/.test(digits);
    return {
      isValid,
      cleanPhone: isValid ? digits : '', // "3401234567"
      isInternational: false,
    };
  }

  // 5. CASO ESTERO ESPLICITO (+ seguito da prefisso diverso da 39)
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    // Standard E.164: prefisso paese + numero nazionale da 7 a 15 cifre
    const isValid = /^[1-9]\d{6,14}$/.test(digits);
    return {
      isValid,
      cleanPhone: isValid ? `+${digits}` : '', // Conserva il '+' per l'estero (es. "+491701234567")
      isInternational: true,
    };
  }

  // 6. CASO SENZA PREFISSO (Default Italia)
  let digits = raw.replace(/\D/g, '');

  // Se l'utente ha scritto "39" davanti senza il "+" ma il numero totale è > 10 cifre
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