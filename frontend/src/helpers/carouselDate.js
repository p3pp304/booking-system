/**
 * Genera i prossimi N giorni per il carosello orizzontale
 * Calcola giorno della settimana, numero, mese e verifica le chiusure (Domenica e Lunedì)
 */
export const getUpcomingDays = (daysCount = 21) => {
  const days = [];
  const today = new Date();
  // Fissa mezzanotte locale per evitare salti o bug con ore serali e daylight saving
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    // Formato standard YYYY-MM-DD locale per le API
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayOfWeek = d.getDay(); 
    // 0 = Domenica, 1 = Lunedì (adatta in base ai vostri giorni effettivi di riposo)
    const isClosed = dayOfWeek === 0 || dayOfWeek === 1;

    const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '');
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');

    days.push({
      dateStr,
      dayName,
      dayNum,
      monthName,
      isClosed,
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return days;
};