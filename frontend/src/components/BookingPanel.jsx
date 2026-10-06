import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  Clock, 
  Check, 
  Calendar as CalendarPlus, 
  User, 
  Phone, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { 
  fetchServices, 
  fetchWorkers, 
  fetchAvailableSlots, 
  createBooking 
} from '../api/publicApi';
import { getUpcomingDays } from '../helpers/carouselDate';
import { saveActiveBooking } from '../helpers/bookingStorage';
import { cleanAndValidatePhone, validateFullName } from '../helpers/validators';

export default function BookingPanel({ isOpen, onClose }) {
  // ==========================================
  // 1. STATI (Tutti obbligatoriamente in cima!)
  // ==========================================
  const [step, setStep] = useState(1);
  const isPopStateRef = useRef(false);
  const dateInputRef = useRef(null);

  // Dati da API
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Loading & Errori
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selezione Utente (data locale corretta senza bug UTC)
  const [selectedService, setSelectedService] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Form Dati Cliente
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    notes: '',
  });
  const [touched, setTouched] = useState({ customerName: false, customerPhone: false });

  // Risultato Prenotazione Confermata
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  // ==========================================
  // 2. SINCRONIZZAZIONE BROWSER HISTORY & GESTURE
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      // Inserisce il primo record all'apertura
      window.history.pushState({ bookingStep: 1 }, '', '#prenota-step-1');
      setStep(1);
    }

    const handlePopState = (event) => {
      // Cattura lo swipe o la freccia indietro di Chrome / Android
      if (event.state && typeof event.state.bookingStep === 'number') {
        isPopStateRef.current = true;
        setStep(event.state.bookingStep);
      } else {
        // Nessun step nella history: chiudi il drawer
        if (onClose) onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  // Avanza di step creando un punto di ripristino per il tasto "indietro"
  const goToNextStep = (nextStep) => {
    window.history.pushState({ bookingStep: nextStep }, '', `#prenota-step-${nextStep}`);
    setStep(nextStep);
  };

  // Navigazione a ritroso (UI o Gesture)
  const handleBack = () => {
    window.history.back();
  };

  // Chiusura manuale (tasto X o backdrop)
  const handleResetAndClose = () => {
    if (window.location.hash.startsWith('#prenota')) {
      window.history.back();
    }
    setStep(1);
    setSelectedService(null);
    setSelectedWorker(null);
    setSelectedSlot(null);
    setBookingConfirmation(null);
    setFormData({ customerName: '', customerPhone: '', notes: '' });
    setTouched({ customerName: false, customerPhone: false });
    if (onClose) onClose();
  };

  // ==========================================
  // 3. FETCH DATI DA API
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      Promise.all([fetchServices(), fetchWorkers()])
        .then(([servicesData, workersData]) => {
          setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.services || []));
          setWorkers(Array.isArray(workersData) ? workersData : (workersData?.workers || []));
        })
        .catch((err) => {
          console.error(err);
          setError('Impossibile caricare i dati del salone. Riprova.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 3 && selectedService && selectedDate) {
      setSlotsLoading(true);
      setSelectedSlot(null);

      fetchAvailableSlots({
        date: selectedDate,
        serviceId: selectedService._id,
        workerId: selectedWorker ? selectedWorker._id : undefined,
      })
        .then((res) => {
          let list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.slots)) {
            list = res.slots;
          } else if (res && Array.isArray(res.availableSlots)) {
            list = res.availableSlots;
          }
          setAvailableSlots(list);
        })
        .catch((err) => {
          console.error('Errore fetchAvailableSlots:', err);
          setAvailableSlots([]);
        })
        .finally(() => setSlotsLoading(false));
    }
  }, [step, selectedDate, selectedService, selectedWorker]);

  const nameIsValid = validateFullName(formData.customerName);
  const phoneValidation = cleanAndValidatePhone(formData.customerPhone);

  // Submit Finale Prenotazione
  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    setTouched({ customerName: true, customerPhone: true });
    if (!nameIsValid || !phoneValidation.isValid) {
      setError(!nameIsValid
        ? 'Inserisci nome e cognome'
        : 'Inserisci un cellulare valido, con o senza prefisso +39.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        serviceId: selectedService._id,
        workerId: selectedWorker ? selectedWorker._id : (selectedSlot.workerId || null),
        dateStr: selectedDate,
        timeStr: selectedSlot.time || selectedSlot,
        clientName: formData.customerName.trim(),
        clientPhone: `+39${phoneValidation.cleanPhone}`,
        notes: formData.notes.trim(),
      };

      const result = await createBooking(payload);
      setBookingConfirmation(result);

      const booking = result?.booking || result;
      const code = booking?.cancellationCode;

    if (code) {
    saveActiveBooking({
        code,
        serviceName: booking?.serviceName || selectedService?.name,
        startTime: booking?.startTime,
    });
    }

      // Usa goToNextStep per aggiungere lo step 5 alla history!
      goToNextStep(5);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Errore durante la prenotazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. RENDERING CONDIZIONALE (Solo qui, dopo gli Hooks!)
  // ==========================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop scuro satinato */}
      <div 
        onClick={handleResetAndClose} 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Pannello / Bottom Sheet Mobile-First */}
      <div className="relative w-full max-w-lg bg-zinc-950 border-t sm:border border-zinc-900 rounded-t-3xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

        {/* Top Header del Drawer */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-900/80">
          <div className="flex items-center gap-3">
            {/* Tasto Indietro collegato a handleBack (History sync) */}
            {step > 1 && step < 5 && (
              <button 
                type="button"
                onClick={handleBack}
                className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Passo 0{step} di 05
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {step === 1 && 'Scegli il Trattamento'}
                {step === 2 && 'Seleziona il Barbiere'}
                {step === 3 && 'Data & Orario'}
                {step === 4 && 'I Tuoi Recapiti'}
                {step === 5 && 'Prenotazione Confermata'}
              </h2>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full border cursor-pointer border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifica Errore */}
        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-950/30 border border-red-900/50 flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

{/* Body a Scorrimento */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">

          {/* ================= STEP 1: SERVIZI ================= */}
          {step === 1 && (
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-16 rounded-xl bg-zinc-900/50 animate-pulse border border-zinc-900" />
                  ))}
                </div>
              ) : (
                services.map((service) => (
                  <div
                    key={service._id}
                    onClick={() => {
                      setSelectedService(service);
                      goToNextStep(2); // Sincronizzato con History / Gesture
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedService?._id === service._id
                        ? 'border-white bg-zinc-900'
                        : 'border-zinc-900 bg-zinc-900/30 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="pr-3">
                      <p className="font-medium text-sm text-zinc-200">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-zinc-500 font-light mt-0.5 line-clamp-1">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400 font-mono">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{service.durationMinutes} min</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-semibold text-white font-mono">
                        {Number(service.price).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ================= STEP 2: OPERATORE ================= */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Opzione "Qualsiasi Barbiere" */}
              <div
                onClick={() => {
                  setSelectedWorker(null);
                  goToNextStep(3); // Sincronizzato con History / Gesture
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedWorker === null
                    ? 'border-white bg-zinc-900'
                    : 'border-zinc-900 bg-zinc-900/30 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-zinc-100">Primo disponibile</p>
                    <p className="text-xs text-zinc-500">Massima flessibilità di orario</p>
                  </div>
                </div>
                {selectedWorker === null && <Check className="w-4 h-4 text-white" />}
              </div>

              <div className="pt-2 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  I Nostri Maestri Barbieri
                </span>
              </div>

              {workers.map((w) => (
                <div
                  key={w._id}
                  onClick={() => {
                    setSelectedWorker(w);
                    goToNextStep(3); // Sincronizzato con History / Gesture
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedWorker?._id === w._id
                      ? 'border-white bg-zinc-900'
                      : 'border-zinc-900 bg-zinc-900/30 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase"
                      style={{ backgroundColor: `${w.color || '#27272a'}25`, color: w.color || '#e4e4e7', border: `1px solid ${w.color || '#3f3f46'}` }}
                    >
                      {w.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-zinc-200">{w.name}</p>
                      <p className="text-xs text-zinc-500 font-light">Barber Specialist</p>
                    </div>
                  </div>
                  {selectedWorker?._id === w._id && <Check className="w-4 h-4 text-white" />}
                </div>
              ))}
            </div>
          )}

          {/* ================= STEP 3: DATA & ORARIO ================= */}
  {step === 3 && (
          <div className="space-y-5">
            {/* Selettore Giorno a Pillole Orizzontali */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                  Seleziona Giorno
                </label>

                {/* Opzione discreta per aprire il calendario nativo per date future */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Altra data</span>
                </button>
              </div>

              {/* Striscia Pillole Scrollabile Touch */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar scroll-smooth">
                {getUpcomingDays(21).map((day) => {
                  const isSelected = selectedDate === day.dateStr;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      disabled={day.isClosed}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`shrink-0 w-16 py-3 px-1.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border cursor-pointer ${
                        day.isClosed
                          ? 'opacity-25 border-zinc-900 bg-zinc-950/40 cursor-not-allowed text-zinc-600'
                          : isSelected
                          ? 'bg-white text-zinc-950 border-white shadow-lg shadow-white/10 scale-105 font-bold'
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 active:scale-95'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-mono tracking-tight ${isSelected ? 'text-zinc-700 font-semibold' : 'text-zinc-500'}`}>
                        {day.isToday ? 'Oggi' : day.isTomorrow ? 'Dom' : day.dayName}
                      </span>
                      <span className="text-base font-bold my-0.5 tracking-tight">
                        {day.dayNum}
                      </span>
                      <span className={`text-[9px] uppercase font-mono ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        {day.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Input date invisibile ma collegato al tasto 'Altra data' */}
              <input
                ref={dateInputRef}
                type="date"
                min={(() => {
                  const d = new Date();
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="sr-only"
              />
            </div>

            {/* Griglia Slot Orari Disponibili */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                  Orari Disponibili
                </label>
                {slotsLoading && <span className="text-[10px] font-mono text-zinc-500 animate-pulse">Ricerca slot...</span>}
              </div>

              {slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div key={n} className="h-10 rounded-lg bg-zinc-900 animate-pulse" />
                  ))}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 text-center border border-zinc-900 rounded-xl bg-zinc-900/20">
                  <p className="text-xs text-zinc-400">Nessuno slot disponibile per questa data.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Prova a selezionare un altro giorno o "Primo disponibile".</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                  {Array.isArray(availableSlots) && availableSlots.map((slot, idx) => {
                    const timeString = typeof slot === 'string' ? slot : slot.time;
                    const isSelected = selectedSlot === slot || selectedSlot?.time === timeString;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-2 cursor-pointer rounded-xl text-xs font-mono font-medium transition border ${
                          isSelected
                            ? 'bg-white text-zinc-950 border-white font-bold shadow-md shadow-white/5'
                            : 'bg-zinc-900/60 text-zinc-300 border-zinc-800/80 hover:border-zinc-700 active:scale-95'
                        }`}
                      >
                        {timeString}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Continua allo Step 4 */}
            {selectedSlot && (
              <button
                type="button"
                onClick={() => goToNextStep(4)}
                className="w-full mt-2 py-3 px-4 cursor-pointer bg-white hover:bg-zinc-200 active:scale-[0.98] text-zinc-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Continua con i Dati</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

          {/* ================= STEP 4: RECAPITI CLIENTE ================= */}
          {step === 4 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-900 text-xs space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Trattamento:</span>
                  <span className="font-medium text-white">{selectedService?.name} ({Number(selectedService?.price).toFixed(2)} €)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Operatore:</span>
                  <span className="font-medium text-white">{selectedWorker ? selectedWorker.name : 'Primo disponibile'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Orario:</span>
                  <span className="font-medium text-white font-mono">{selectedDate} alle {typeof selectedSlot === 'string' ? selectedSlot : selectedSlot?.time}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Nome e Cognome *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    aria-required="true"
                    aria-invalid={touched.customerName && !nameIsValid}
                    autoComplete="name"
                    placeholder="Mario Rossi"
                    value={formData.customerName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, customerName: e.target.value }));
                      setError(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, customerName: true }))}
                    className={`w-full bg-zinc-900 border ${touched.customerName ? (nameIsValid ? 'border-emerald-500/60' : 'border-rose-500/60') : 'border-zinc-800'} text-white pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-500`}
                  />
                </div>
                {touched.customerName && (
                  <p className={`mt-1.5 flex items-center gap-1 text-[11px] ${nameIsValid ? 'text-emerald-400' : 'text-rose-400'}`} aria-live="polite">
                    {nameIsValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {nameIsValid ? 'Nome e cognome riconosciuti' : 'Inserisci nome e cognome (almeno 2 lettere ciascuno)'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Cellulare (per promemoria WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    aria-required="true"
                    aria-invalid={touched.customerPhone && !phoneValidation.isValid}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+39 340 1234567"
                    value={formData.customerPhone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, customerPhone: e.target.value }));
                      setError(null);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, customerPhone: true }))}
                    className={`w-full bg-zinc-900 border ${touched.customerPhone ? (phoneValidation.isValid ? 'border-emerald-500/60' : 'border-rose-500/60') : 'border-zinc-800'} text-white pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-500`}
                  />
                </div>
                {touched.customerPhone ? (
                  <p className={`mt-1.5 flex items-center gap-1 text-[11px] ${phoneValidation.isValid ? 'text-emerald-400' : 'text-rose-400'}`} aria-live="polite">
                    {phoneValidation.isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {phoneValidation.isValid ? 'Numero cellulare valido' : 'Inserisci un cellulare italiano, con o senza +39'}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-zinc-500">Puoi inserire il numero con o senza prefisso +39.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Note speciali (facoltativo)
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Es. Richiesta sfumatura a pelle..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 cursor-pointer bg-white hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xl"
              >
                {loading ? 'Elaborazione...' : 'Conferma Appuntamento'}
              </button>
            </form>
          )}

          {/* ================= STEP 5: SUCCESSO ================= */}
          {step === 5 && bookingConfirmation && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-white text-zinc-950 flex items-center justify-center mx-auto shadow-xl">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Appuntamento Registrato!
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Ti aspettiamo in Atelier il <strong className="text-white">{selectedDate}</strong> alle <strong className="text-white font-mono">{typeof selectedSlot === 'string' ? selectedSlot : selectedSlot?.time}</strong>.
                </p>
              </div>

              {/* Box Codice con fallback sicuro */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/40 text-left space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block">
                  Codice Gestione & Disdetta
                </span>
                <p className="text-sm font-mono font-bold text-white tracking-wider break-all select-all">
                  {bookingConfirmation?.booking?.cancellationCode || bookingConfirmation?.cancellationCode || 'N/D'}
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Conserva questo codice: ti permetterà di annullare o verificare l'appuntamento in autonomia.
                </p>
              </div>

              {/* Notifica WhatsApp */}
              {(bookingConfirmation?.whatsappUrl || bookingConfirmation?.booking?.whatsappUrl) && (
                <a
                  href={bookingConfirmation.whatsappUrl || bookingConfirmation.booking?.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20"
                >
                  <span>Notifica il Salone su WhatsApp</span>
                </a>
              )}

              {/* Google Calendar */}
              {(bookingConfirmation?.googleCalendarUrl || bookingConfirmation?.booking?.googleCalendarUrl) && (
                <a
                  href={bookingConfirmation.googleCalendarUrl || bookingConfirmation.booking?.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs tracking-wide transition"
                >
                  <CalendarPlus className="w-4 h-4 text-zinc-400" />
                  <span>Aggiungi a Google Calendar</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Torna alla Home
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}