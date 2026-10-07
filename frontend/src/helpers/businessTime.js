export const BUSINESS_TIME_ZONE = 'Europe/Rome';

const getDateParts = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
};

export const toBusinessDateInputValue = (value) => {
  const parts = getDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
};

export const formatBusinessDateInput = (dateValue, options = {}) => {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: BUSINESS_TIME_ZONE,
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

export const formatBusinessDate = (value, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: BUSINESS_TIME_ZONE,
    ...options,
  }).format(date);
};

export const formatBusinessTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ora non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
