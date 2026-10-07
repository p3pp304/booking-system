import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  User,
  Scissors,
  Loader2,
  Lock,
  X
} from 'lucide-react';
import {
  fetchAdminBookings,
  fetchAdminProfile,
  fetchAllWorkers,
  fetchAllServicesAdmin,
  fetchBookingReminderLink,
  createManualBooking,
  createBlockBooking,
  updateBookingDetails,
  updateBookingStatus,
  deleteBookingDefinitive
} from '../api/adminApi';
import { getUpcomingDays } from '../helpers/carouselDate';
import RevenueAnalytics from './RevenueAnalytics';

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeBooking = (booking) => {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const worker = booking.workerId;
  const service = booking.serviceId;

  // ESTRAZIONE STRICT UTC (Il trucco della Z in lettura)
  const year = start.getUTCFullYear();
  const month = String(start.getUTCMonth() + 1).padStart(2, '0');
  const day = String(start.getUTCDate()).padStart(2, '0');
  const hours = String(start.getUTCHours()).padStart(2, '0');
  const minutes = String(start.getUTCMinutes()).padStart(2, '0');

  return {
    ...booking,
    id: String(booking._id || booking.id),
    date: `${year}-${month}-${day}`, // Data esatta UTC
    time: `${hours}:${minutes}`,     // Ora esatta UTC
    duration: Math.max(0, Math.round((end - start) / 60000)),
    price: booking.price ?? service?.price ?? null,
    clientName: booking.clientName || booking.customerName || '',
    clientPhone: booking.clientPhone || booking.customerPhone || '',
    serviceId: service?._id || service || '',
    serviceName: service?.name || '',
    workerId: worker?._id || worker || '',
    workerName: worker?.name || '',
  };
};

export default function StaffScheduleDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedSchedule, setHasLoadedSchedule] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const nextBookingRef = useRef(null);
  const currentTimeMarkerRef = useRef(null);
  const didAutoScrollRef = useRef(false);
  const [isRevenueModalOpen,setIsRevenueModalOpen] = useState(false);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetchAdminProfile();
        setUser(res?.user || res);
      } catch (err) {
        console.error('Errore recupero utente loggato:', err);
      }
    };
    loadCurrentUser();
  }, []);
  
    const isAdmin = user?.role === 'admin';

    // 2. Controllo se l'utente può toccare un dato appuntamento
  const canTouchBooking = useCallback((booking) => {
    if (isAdmin) return true;
    if (!user || !booking) return false;

    const myWorkerId = String(user.workerId || user.id || user._id || '');
    const bookingWorkerId = String(booking.workerId?._id || booking.workerId || '');

    if (myWorkerId && bookingWorkerId) {
      return myWorkerId === bookingWorkerId;
    }

    // Fallback sul nome se non ci sono gli ObjectId
    return Boolean(
      user.name && 
      booking.workerName && 
      user.name.trim().toLowerCase() === booking.workerName.trim().toLowerCase()
    );
  }, [isAdmin, user]);
  const visibleWorkers = isAdmin
    ? workers
    : workers.filter((worker) => String(worker._id) === String(user?.workerId || ''));
  const manageableWorkers = isAdmin ? workers : visibleWorkers;

  // Stati Modali
  const [activeBooking, setActiveBooking] = useState(null); // Per dettaglio/edit
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Caricamento Dati
  const loadSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasLoadedSchedule(false);
      setLoadError('');
      const workerParam = selectedWorkerId === 'all' ? null : selectedWorkerId;
      const data = await fetchAdminBookings(selectedDate, workerParam);
      const records = Array.isArray(data) ? data : data?.bookings || [];
      setBookings(records.map(normalizeBooking));
    } catch (err) {
      console.error('Errore nel recupero degli appuntamenti:', err);
      setLoadError(err.message || 'Impossibile caricare gli appuntamenti.');
    } finally {
      setIsLoading(false);
      setHasLoadedSchedule(true);
    }
  }, [selectedDate, selectedWorkerId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    Promise.all([fetchAllWorkers(), fetchAllServicesAdmin()])
      .then(([workerData, serviceData]) => {
        setWorkers(Array.isArray(workerData) ? workerData : workerData?.workers || []);
        setServices(Array.isArray(serviceData) ? serviceData : serviceData?.services || []);
      })
      .catch((err) => setLoadError(err.message || 'Impossibile caricare operatori e servizi.'));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

    // 2. Calcolo automatico incasso giornaliero (esclude annullati e blocchi orario)
    const dailyTotalRevenue = useMemo(() => {
    return bookings
        .filter((b) => (b.status === 'confirmed' || b.status === 'confermato') && b.type !== 'block')
        .reduce((sum, b) => sum + (Number(b.price) || 25), 0); // fallback a 25 se price non è valorizzato
    }, [bookings]);


  // Funzione Invio WhatsApp
  const handleSendWhatsAppReminder = async (booking) => {
    if (!booking?.clientPhone) {
      alert('Numero di telefono cliente non disponibile.');
      return;
    }
    try {
      const result = await fetchBookingReminderLink(booking.id);
      if (!result?.reminderUrl) throw new Error('Link promemoria non disponibile.');
      window.open(result.reminderUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.message || 'Impossibile generare il promemoria WhatsApp.');
    }
  };

  // Cambio Stato Rapido (PATCH)
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateBookingStatus(id, newStatus);
      setBookings((prev) => 
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      if (activeBooking?.id === id) {
        setActiveBooking((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setLoadError(err.message || 'Impossibile aggiornare lo stato dell’appuntamento.');
    }
  };

  // Cancellazione Definitiva (DELETE)
  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Vuoi davvero eliminare definitivamente questo appuntamento?')) return;
    try {
      await deleteBookingDefinitive(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setActiveBooking(null);
    } catch (err) {
      setLoadError(err.message || 'Errore durante la cancellazione.');
    }
  };

  // Configurazione Badge Stato
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'confermato':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" /> Confermato
          </span>
        );
      case 'cancelled':
      case 'annullato':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
            <XCircle className="w-3 h-3" /> Annullato
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Lock className="w-3 h-3" /> Blocco Slot
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <AlertCircle className="w-3 h-3" /> In Attesa
          </span>
        );
    }
  };

  // Ordinamento per orario di inizio
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [bookings]);
  const isSelectedToday = selectedDate === toDateInputValue(currentTime);
  const currentTimeLabel = currentTime.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nearestBooking = sortedBookings.find((booking) =>
    booking.type !== 'block' &&
    booking.status === 'confirmed' &&
    (!isSelectedToday || new Date(booking.startTime) >= currentTime)
  ) || [...sortedBookings].reverse().find((booking) => booking.type !== 'block') || sortedBookings[0];
  const firstUpcomingIndex = sortedBookings.findIndex((booking) => booking.time >= currentTimeLabel);

  useEffect(() => {
    didAutoScrollRef.current = false;
  }, [selectedDate, selectedWorkerId]);

  useEffect(() => {
    if (
      isLoading ||
      !hasLoadedSchedule ||
      didAutoScrollRef.current ||
      (!nearestBooking && !isSelectedToday)
    ) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const target = isSelectedToday ? currentTimeMarkerRef.current : nextBookingRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      didAutoScrollRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasLoadedSchedule, isLoading, isSelectedToday, nearestBooking?.id]);

  const currentTimeMarker = (
    <div ref={currentTimeMarkerRef} className="scroll-mt-20 flex items-center gap-3 my-2 select-none" aria-label={`Ora attuale ${currentTimeLabel}`}>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-mono font-bold text-rose-400">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
        ADESSO ({currentTimeLabel})
      </span>
      <div className="h-px flex-1 bg-linear-to-r from-rose-500/70 via-rose-500/30 to-transparent" />
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pb-12">
      
     {/* 1. SELEZIONE DATA & OPERATORI MOBILE-FIRST */}
    <section className="bg-zinc-950/80 border border-zinc-900 rounded-3xl p-4 flex flex-col gap-4 shadow-xl">
        
        {/* Intestazione Mese / Data Attiva */}
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
                })}
            </span>
            </div>

            {/* Selettore rapido calendario nativo */}
            <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-xl focus:outline-none focus:border-zinc-600"
            />
        </div>

        {/* Striscia Pillole Date Scrollabile Orizzontale */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none scroll-smooth">
            {getUpcomingDays(21).map((day) => {
            const isSelected = selectedDate === day.dateStr;

            return (
                <button
                key={day.dateStr}
                type="button"
                disabled={day.isClosed}
                onClick={(e) => {
                    e.preventDefault();
                    setSelectedDate(day.dateStr);
                }}
                className={`shrink-0 w-16 py-3 px-1.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border cursor-pointer select-none ${
                    day.isClosed
                    ? 'opacity-25 border-zinc-900 bg-zinc-950/40 cursor-not-allowed text-zinc-600'
                    : isSelected
                    ? 'bg-white text-zinc-950 border-white shadow-lg shadow-white/10 scale-105 font-bold'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 active:scale-95'
                }`}
                >
                <span className={`text-[10px] uppercase font-mono tracking-tight ${isSelected ? 'text-zinc-700 font-semibold' : 'text-zinc-500'}`}>
                    {day.isToday ? 'Oggi' : day.isTomorrow ? 'Domani' : day.dayName}
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

        {/* Divisore sottile */}
        <div className="h-px bg-zinc-900 w-full" />

        {/* Striscia Operatori Scrollabile Orizzontale */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {/* Tasto "Tutti gli Operatori" sempre presente */}
            <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                setSelectedWorkerId('all');
            }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border select-none ${
                String(selectedWorkerId) === 'all'
                ? 'bg-zinc-100 text-black border-zinc-100 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/70 hover:bg-zinc-900'
            }`}
            >
            Tutti
            </button>

            {visibleWorkers.map((worker) => {
            // Supporta sia .id che ._id del backend
            const workerKey = worker.id || worker._id;
            const isSelected = String(selectedWorkerId) === String(workerKey);

            return (
                <button
                key={workerKey}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setSelectedWorkerId(workerKey);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border select-none ${
                    isSelected
                    ? 'bg-zinc-100 text-black border-zinc-100 shadow-sm scale-102'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/70 hover:bg-zinc-900'
                }`}
                >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{worker.name}</span>
                </button>
            );
            })}
        </div>
      </section>

      {/* 3. TASTI AZIONE RAPIDA: NUOVO BOOKING */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-zinc-400 font-medium">
          {sortedBookings.length} {sortedBookings.length === 1 ? 'appuntamento' : 'appuntamenti'}
        </span>
        {/* Mostra badge incasso SOLO se admin */}
        {isAdmin && (
            <button
            type="button"
            onClick={() => setIsRevenueModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-mono font-bold hover:bg-emerald-900/50 transition-colors"
            >
                <span>{dailyTotalRevenue.toFixed(0)} €</span>
                <span className="text-[10px] text-emerald-600 font-sans font-normal">dettagli ›</span>
            </button>
        )}

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Slot</span>
        </button>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          <span>{loadError}</span>
          <button type="button" onClick={() => setLoadError('')} aria-label="Chiudi errore" className="shrink-0 text-rose-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4. TIMELINE APPUNTAMENTI */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="text-xs font-medium">Caricamento agenda...</span>
          </div>
        ) : sortedBookings.length === 0 ? (
        <div>
            {isSelectedToday && currentTimeMarker}
            <div className="flex flex-col items-center justify-center py-16 bg-zinc-950/40 border border-zinc-900 rounded-2xl text-center p-6">
                <Scissors className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-400">Nessun appuntamento per questo giorno</p>
                <p className="text-xs text-zinc-600 mt-1">Usa "Nuovo Slot" per inserire una prenotazione o bloccare un orario.</p>
                
            </div>
          </div>
        ) : (
          <>
            {/* Calcolo dell'ora attuale in formato HH:MM */}
            {(() => {
            return (
                <div className="flex flex-col gap-3">
                {sortedBookings.map((b, index) => {
                    const isMine = canTouchBooking(b);
                    const isCancelled = b.status === 'cancelled';
                const showCurrentTimeLine = isSelectedToday && index === firstUpcomingIndex;

                    return (
                    <React.Fragment key={b.id || b._id || `booking-${index}`}>
                        
                        {/* LINEA APPUNTAMENTI IN ARRIVO (ADESSO) */}
                        {showCurrentTimeLine && currentTimeMarker}

                        {/* CARD APPUNTAMENTO */}
                        <div
                        ref={b.id === nearestBooking?.id ? nextBookingRef : undefined}
                        onClick={() =>{if (isMine){
                            setActiveBooking(b)}
                        }} 
                        className={`group flex flex-col p-4 border rounded-3xl gap-3.5 transition-all ${
                                isMine ? 'cursor-pointer hover:border-zinc-800' : 'cursor-default'
                            } ${
                                isCancelled
                                ? 'bg-zinc-950/40 border-zinc-900/80 opacity-55'
                                : isMine
                                ? 'bg-zinc-950 border-zinc-900'
                                : 'bg-zinc-950/80 border-zinc-900/60'
                            }`}
                        >
                        {/* ZONA SUPERIORE: ORA + INFO + PREZZO */}
                        <div className="flex items-center gap-4">
                            
                            {/* 1. BOX ORARIO INGRANDITO */}
                            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900/90 border border-zinc-800 shrink-0 shadow-inner">
                            <Clock className="w-4 h-4 text-zinc-400 mb-1" />
                            <span className="text-base font-black text-white tracking-tight leading-none">
                                {b.time}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono mt-1">
                                {b.duration || 30} min
                            </span>
                            </div>

                            {/* 2. INFORMAZIONI DETTAGLIATE */}
                            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                            {/* Nome Cliente + Badge Stato */}
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-base font-bold truncate capitalize ${isCancelled ? 'text-zinc-400 line-through' : 'text-zinc-100'}`}>
                                {b.clientName || 'Slot Riservato'}
                                </span>
                                {getStatusBadge(b.status)}
                            </div>

                            {/* Servizio Richiesto */}
                            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium truncate">
                                <Scissors className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate">{b.serviceName || 'Rasatura Barba Tradizionale'}</span>
                            </div>

                            {/* Operatore Assegnato + PREZZO */}
                            <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                                <div className="flex items-center gap-1.5 truncate">
                                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate">{b.workerName || 'Staff'}</span>
                                </div>

                                {/* Prezzo Servizio */}
                                <span className="font-mono font-bold text-emerald-400 text-xs shrink-0 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
                                {b.price ? `${b.price} €` : '25.00 €'}
                                </span>
                            </div>
                            </div>
                        </div>

        {/* 3. BOTTONI AZIONE SOTTO (Layout Touch Orizzontale a 3 Colonne) */}
        <div 
        className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900"
        onClick={(e) => e.stopPropagation()} // Previene apertura modale cliccando i bottoni
        >
        {/* Tasto Chiama: disponibile per tutti (utile per il bancone/cassa) */}
        <a
            href={b.clientPhone ? `tel:${b.clientPhone.replace(/\s+/g, '')}` : '#'}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
            b.clientPhone
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-white'
                : 'opacity-30 border-zinc-900 bg-zinc-950 cursor-not-allowed text-zinc-600 pointer-events-none'
            }`}
            title="Chiama cliente"
        >
            <Phone className="w-3.5 h-3.5" />
            <span>Chiama</span>
        </a>

        {isMine ? (
            <>
            {/* Tasto WhatsApp (Solo Titolare o Admin) */}
            <button
                type="button"
                disabled={!b.clientPhone || isCancelled}
                onClick={() => handleSendWhatsAppReminder(b)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                b.clientPhone && !isCancelled
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border-emerald-800/40 active:scale-95'
                    : 'opacity-30 border-zinc-900 bg-zinc-950 cursor-not-allowed text-zinc-600'
                }`}
                title="Invia promemoria WhatsApp"
            >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
            </button>

            {/* Tasto Stato Rapido: Conferma o Annulla */}
            {isCancelled ? (
                <button
                type="button"
                onClick={() => handleStatusChange(b.id || b._id, 'confirmed')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 text-xs font-semibold active:scale-95 transition-all"
                >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ripristina</span>
                </button>
            ) : (
                <button
                type="button"
                onClick={() => handleStatusChange(b.id || b._id, 'cancelled')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/30 text-rose-400 hover:border-rose-900/50 border border-zinc-800 text-xs font-semibold active:scale-95 transition-all"
                >
                <XCircle className="w-3.5 h-3.5" />
                <span>Annulla</span>
                </button>
            )}
            </>
        ) : (
            /* Placeholder protetto che occupa le restanti 2 colonne */
            <div className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900/30 border border-zinc-900 text-zinc-500 text-[11px] font-mono select-none">
            <Lock className="w-3.5 h-3.5 text-zinc-600" />
            <span className="truncate">Sedia di {b.workerName || 'Staff'}</span>
            </div>
        )}
        </div>
                        </div>
                    </React.Fragment>
                    );
                })}
                {isSelectedToday && firstUpcomingIndex === -1 && currentTimeMarker}
                </div>
            );
            })()}
          </>
        )}
      </div>

      {/* 5. MODALE DETTAGLIO / MODIFICA / ANNULLA */}
      {activeBooking && (
        <BookingDetailModal
          booking={activeBooking}
          workers={manageableWorkers}
          services={services}
          isAdmin={isAdmin}
          onClose={() => setActiveBooking(null)}
          onStatusChange={handleStatusChange}
          onUpdateDetails={async (updatedData) => {
            await updateBookingDetails(activeBooking.id, updatedData);
            loadSchedule();
            setActiveBooking(null);
          }}
          onDelete={() => handleDeleteBooking(activeBooking.id)}
          onWhatsApp={() => handleSendWhatsAppReminder(activeBooking)}
        />
      )}

            {/* MODALE DETTAGLIO INCASSI */}
        {isRevenueModalOpen && (
        <RevenueAnalytics
            bookings={bookings}
            selectedDate={selectedDate}
            totalRevenue={dailyTotalRevenue}
            onClose={() => setIsRevenueModalOpen(false)}
        />
        )}

      {/* 6. MODALE CREA BOOKING / BLOCCO SLOT */}
      {isCreateOpen && (
        <CreateBookingModal
          defaultDate={selectedDate}
          workers={manageableWorkers}
          services={services}
          onClose={() => setIsCreateOpen(false)}
          onCreateManual={async (payload) => {
            await createManualBooking(payload);
            loadSchedule();
            setIsCreateOpen(false);
          }}
          onCreateBlock={async (payload) => {
            await createBlockBooking(payload);
            loadSchedule();
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function BookingDetailModal({ booking, workers, services, isAdmin, onClose, onStatusChange, onUpdateDetails, onDelete, onWhatsApp }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    serviceId: booking.serviceId,
    workerId: booking.workerId,
    dateStr: booking.date,
    timeStr: booking.time,
    notes: booking.notes || '',
  });
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

        const handleSubmit = async (event) => {
            event.preventDefault();
            setIsSaving(true);
            setError('');
            try {
            // Uniamo la data e l'ora modificate forzando l'UTC
            const utcDateTimeString = `${form.dateStr}T${form.timeStr}:00.000Z`;
            
            const payload = {
                ...form,
                datetime: utcDateTimeString // Passiamo il campo unificato al backend
            };

            await onUpdateDetails(payload);
            } catch (err) {
            setError(err.message || 'Impossibile aggiornare l’appuntamento.');
            } finally {
            setIsSaving(false);
            }
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{booking.type === 'block' ? 'Blocco orario' : 'Appuntamento'}</p>
            <h2 id="booking-detail-title" className="mt-1 text-base font-semibold text-white">{booking.clientName || 'Slot riservato'}</h2>
            <p className="mt-1 text-xs text-zinc-400">{booking.date} · {booking.time} · {booking.serviceName || 'Assenza'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <p role="alert" className="mb-3 text-xs text-rose-400">{error}</p>}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs text-zinc-400">Cliente
              <input required value={form.clientName} onChange={(event) => updateField('clientName', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
            </label>
            <label className="block text-xs text-zinc-400">Telefono
              <input required type="tel" value={form.clientPhone} onChange={(event) => updateField('clientPhone', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-400">Servizio
                <select required value={form.serviceId} onChange={(event) => updateField('serviceId', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white">
                  {services.map((service) => <option key={service._id} value={service._id}>{service.name}</option>)}
                </select>
              </label>
              <label className="block text-xs text-zinc-400">Operatore
                <select required value={form.workerId} onChange={(event) => updateField('workerId', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white">
                  {workers.map((worker) => <option key={worker._id} value={worker._id}>{worker.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-400">Data
                <input required type="date" value={form.dateStr} onChange={(event) => updateField('dateStr', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-xs text-zinc-400">Ora
                <input required type="time" value={form.timeStr} onChange={(event) => updateField('timeStr', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </label>
            </div>
            <label className="block text-xs text-zinc-400">Note
              <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={2} className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">Indietro</button>
              <button type="submit" disabled={isSaving || !services.length || !workers.length} className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-50">{isSaving ? 'Salvataggio...' : 'Salva modifiche'}</button>
            </div>
          </form>
        ) : (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="block text-zinc-500">Operatore</span>
                <span className="mt-1 block text-zinc-200">{booking.workerName || 'Non assegnato'}</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="block text-zinc-500">Telefono</span>
                <span className="mt-1 block text-zinc-200">{booking.clientPhone || 'Non disponibile'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
              {booking.type !== 'block' && (
                <>
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(true)} 
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                  >
                    Modifica
                  </button>

                  {/* Pulsante Chiamata Rapida */}
                  {booking.clientPhone && booking.status !== 'cancelled' &&(
                    <a
                      href={`tel:${booking.clientPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-800/60 bg-sky-950/20 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-950/40 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Chiama
                    </a>
                  )}
                  
                  {/* Pulsante WhatsApp */}
                  {booking.clientPhone && booking.status !== 'cancelled' && (
                    <button 
                      type="button" 
                      onClick={onWhatsApp} 
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Promemoria
                    </button>
                  )}

                  {booking.status === 'confirmed' && (
                    <button 
                      type="button" 
                      onClick={() => onStatusChange(booking.id, 'cancelled')} 
                      className="rounded-lg border border-rose-900/70 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40"
                    >
                      Annulla
                    </button>
                  )}

                  {booking.status === 'cancelled' && (
                    <button 
                      type="button" 
                      onClick={() => onStatusChange(booking.id, 'confirmed')} 
                      className="rounded-lg border border-emerald-900/70 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/40"
                    >
                      Conferma
                    </button>
                  )}
                </>
              )}

              {isAdmin && (
                <button 
                  type="button" 
                  onClick={onDelete} 
                  className="ml-auto rounded-lg border border-rose-900/70 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40"
                >
                  Elimina definitivamente
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CreateBookingModal({ defaultDate, workers, services, onClose, onCreateManual, onCreateBlock }) {
  const [mode, setMode] = useState('appointment');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    workerId: '',
    dateStr: defaultDate,
    timeStr: '09:00',
    notes: '',
    startDate: `${defaultDate}T09:00`,
    endDate: `${defaultDate}T10:00`,
    reason: '',
  });
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (mode === 'appointment') {
        // Appuntamento normale: uniamo e forziamo UTC
        const utcDateTimeString = `${form.dateStr}T${form.timeStr}:00.000Z`;
        
        await onCreateManual({
          clientName: form.clientName.trim(),
          clientPhone: form.clientPhone.trim(),
          serviceId: form.serviceId,
          workerId: form.workerId,
          dateStr: form.dateStr,
          timeStr: form.timeStr,
          datetime: utcDateTimeString, // Il nuovo campo che salva la vita
          notes: form.notes.trim(),
        });
      } else {
        // Blocco orario (Ferie/Pausa): form.startDate è nel formato "YYYY-MM-DDTHH:mm"
        // Basta aggiungere i secondi e la Z per renderlo UTC assoluto
        await onCreateBlock({
          workerId: form.workerId,
          startDate: `${form.startDate}:00.000Z`, 
          endDate: `${form.endDate}:00.000Z`,
          reason: form.reason.trim(),
        });
      }
    } catch (err) {
      setError(err.message || 'Impossibile salvare i dati.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-booking-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="create-booking-title" className="text-base font-semibold text-white">Nuova voce agenda</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-4 grid grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button type="button" onClick={() => setMode('appointment')} className={`rounded-md px-3 py-2 text-xs ${mode === 'appointment' ? 'bg-white font-semibold text-black' : 'text-zinc-400'}`}>Appuntamento</button>
          <button type="button" onClick={() => setMode('block')} className={`rounded-md px-3 py-2 text-xs ${mode === 'block' ? 'bg-white font-semibold text-black' : 'text-zinc-400'}`}>Blocco orario</button>
        </div>
        {error && <p role="alert" className="mb-3 text-xs text-rose-400">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs text-zinc-400">Operatore
            <select required value={form.workerId} onChange={(event) => updateField('workerId', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white">
              <option value="">Seleziona operatore</option>
              {workers.map((worker) => <option key={worker._id} value={worker._id}>{worker.name}</option>)}
            </select>
          </label>
          {mode === 'appointment' ? (
            <>
              <label className="block text-xs text-zinc-400">Cliente
                <input required value={form.clientName} onChange={(event) => updateField('clientName', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-xs text-zinc-400">Telefono
                <input required type="tel" value={form.clientPhone} onChange={(event) => updateField('clientPhone', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-xs text-zinc-400">Servizio
                <select required value={form.serviceId} onChange={(event) => updateField('serviceId', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white">
                  <option value="">Seleziona servizio</option>
                  {services.map((service) => <option key={service._id} value={service._id}>{service.name} · {service.durationMinutes} min</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">Data<input required type="date" value={form.dateStr} onChange={(event) => updateField('dateStr', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
                <label className="block text-xs text-zinc-400">Ora<input required type="time" value={form.timeStr} onChange={(event) => updateField('timeStr', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
              </div>
              <label className="block text-xs text-zinc-400">Note<textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={2} className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
            </>
          ) : (
            <>
              <label className="block text-xs text-zinc-400">Motivo
                <input value={form.reason} onChange={(event) => updateField('reason', event.target.value)} placeholder="Es. pausa, ferie" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-400">Inizio<input required type="datetime-local" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
                <label className="block text-xs text-zinc-400">Fine<input required type="datetime-local" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">Annulla</button>
            <button type="submit" disabled={isSaving || workers.length === 0 || (mode === 'appointment' && services.length === 0)} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{isSaving ? 'Salvataggio...' : 'Salva'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}