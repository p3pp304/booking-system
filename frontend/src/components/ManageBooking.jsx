import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ArrowLeft,
  Trash2,
  X,
} from 'lucide-react';
import { getBookingByCode, cancelBookingByCode } from '../api/publicApi';
import { removeBookingCode } from '../helpers/bookingStorage';
import { formatBusinessDate, formatBusinessTime } from '../helpers/businessTime';
import ForgotCodeFallback from './ForgotCodeFallback';

export default function ManageBookingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [savedBookings, setSavedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [businessContact, setBusinessContact] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelledSuccess, setCancelledSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [waCancelNoticeUrl, setWaCancelNoticeUrl] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 1. Estrazione del codice all'avvio (SOLO GET di sola lettura)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    const legacyCode = localStorage.getItem('my_booking_code');
    let storedBookings = [];

    try {
      const parsedBookings = JSON.parse(localStorage.getItem('my_active_bookings') || '[]');
      storedBookings = Array.isArray(parsedBookings)
        ? parsedBookings.filter((booking) => typeof booking?.code === 'string' && booking.code)
        : [];
    } catch {
      storedBookings = [];
    }

    setSavedBookings(storedBookings);

    const targetCode = urlCode || legacyCode || storedBookings[0]?.code;
    if (targetCode) {
      setCode(targetCode);
      fetchDetails(targetCode);
    }
  }, []);

  const fetchDetails = async (targetCode) => {
    const cleanCode = targetCode?.trim().toUpperCase();
    if (!cleanCode) return;

    setCode(cleanCode);
    setLoading(true);
    setErrorMsg('');
    setBookingData(null);
    setPolicy(null);
    setBusinessContact(null);
    setCancelledSuccess(false);
    setWaCancelNoticeUrl('');
    setShowConfirmDialog(false);
    try {
      // Chiamata di PURA LETTURA GET
      const res = await getBookingByCode(cleanCode);
      setBookingData(res.booking);
      setPolicy(res.policy);
      setBusinessContact(res.businessContact);
    } catch (err) {
      setErrorMsg(err.message || 'Appuntamento non trovato. Verifica il codice inserito.');
      setBookingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode) {
      navigate(`/disdici?code=${encodeURIComponent(cleanCode)}`, { replace: true });
      fetchDetails(cleanCode);
    }
  };

  // Eseguito SOLO quando l'utente preme il bottone di conferma annullamento
    const handleExecuteCancel = async () => {
        const code = bookingData?.cancellationCode;
        if (!code) return;

        setCancelling(true);
        setErrorMsg('');

        try {
        const result = await cancelBookingByCode(code);
        
        // 1. Link WhatsApp di cortesia (gestisce sia result diretto che annidato)
        const waUrl = result?.whatsappUrl || result?.data?.whatsappUrl;
        if (waUrl) {
            setWaCancelNoticeUrl(waUrl);
        }
        
        // 2. Rimuove il codice dall'array di prenotazioni attive
        removeBookingCode(code);
        setSavedBookings((bookings) => bookings.filter((booking) => booking.code !== code));

        // 3. Pulizia legacy (se presenti vecchie chiavi singole)
        if (localStorage.getItem('my_booking_code') === code) {
            localStorage.removeItem('my_booking_code');
            localStorage.removeItem('my_booking_summary');
        }
        
        // 4. Aggiorna lo stato visivo della pagina
        setShowConfirmDialog(false);
        setCancelledSuccess(true);
        setBookingData((prev) => (prev ? { ...prev, status: 'cancelled' } : null));

        } catch (err) {
        console.error('Errore annullamento prenotazione:', err);
        setErrorMsg(err.message || "Errore durante l'annullamento.");
        } finally {
        setCancelling(false);
        }
    };

  const formattedDate = bookingData?.startTime
    ? formatBusinessDate(bookingData.startTime, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const formattedTime = bookingData?.startTime
    ? formatBusinessTime(bookingData.startTime)
    : '';

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-6 shadow-2xl relative">
        
        {/* Tasto Torna alla Home */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla Home</span>
        </button>

        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          Gestione Prenotazione
        </h1>
        <p className="text-xs text-zinc-400 mb-6">
          Verifica lo stato o annulla il tuo appuntamento in salone.
        </p>

        {savedBookings.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2">
              Prenotazioni salvate
            </p>
            <div className="divide-y divide-zinc-800 border-y border-zinc-800">
              {savedBookings.map((booking) => (
                <button
                  key={booking.code}
                  type="button"
                  onClick={() => fetchDetails(booking.code)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between gap-3 py-2.5 text-left transition hover:bg-zinc-900/70 disabled:opacity-50 ${
                    booking.code === code ? 'text-white' : 'text-zinc-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {booking.serviceName || 'Appuntamento'}
                    </span>
                    <span className="block font-mono text-[10px] text-zinc-500">#{booking.code}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-zinc-500">
                    {booking.code === code && bookingData ? 'Selezionata' : 'Controlla'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleManualSearch} className="mb-5 space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block mb-1.5">
                Controlla con codice
              </label>
              <input
                type="text"
                placeholder="Inserisci il codice prenotazione"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 cursor-pointer bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Ricerca in corso...' : 'Controlla prenotazione'}
            </button>
        </form>
        {errorMsg && <p className="mb-4 text-xs text-rose-400">{errorMsg}</p>}

        {/* Quando non c'è nessun codice trovato in memoria o URL */}
        {!bookingData && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 space-y-4">
            {/* Box di Fallback */}
            <ForgotCodeFallback />
        </div>
        )}

        {/* Dettagli Appuntamento */}
        {bookingData && (
          <div className="space-y-5">
            {/* Scheda Riepilogo */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-zinc-500">#{bookingData.cancellationCode}</span>
                <span
                  className={`shrink-0 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                    bookingData.status === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {bookingData.status === 'confirmed' ? 'Confermato' : 'Annullato'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Scissors className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="font-semibold text-white">{bookingData.serviceName}</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>Ore {formattedTime}</span>
              </div>
              {bookingData.workerName && (
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <User className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>Operatore: {bookingData.workerName}</span>
                </div>
              )}
              {!cancelledSuccess && bookingData.status === 'confirmed' && policy?.canCancel && (
                <div className="border-t border-zinc-800 pt-3">
                  <div className="flex flex-col items-end gap-3">
                    {!showConfirmDialog ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmDialog(true)}
                        className="inline-flex w-fit max-w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-600/10 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-600/20 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Annulla Appuntamento</span>
                      </button>
                    ) : (
                      <div className="w-full max-w-sm p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs text-rose-200 text-center font-medium">
                          Confermi di voler annullare definitivamente la prenotazione?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={handleExecuteCancel}
                            disabled={cancelling}
                            className="py-2.5 px-3 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                            {cancelling ? 'Annullamento...' : 'Sì, Annulla'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={cancelling}
                            className="py-2.5 px-3 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition"
                        >
                            Indietro
                        </button>
                        </div>
                      </div>
                    )}
                    {/* CASO 2: Appuntamento già annullato precedentemente */}
                    {!cancelledSuccess && bookingData.status === 'cancelled' && (
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-400">
                        Questo appuntamento risulta già annullato.
                    </div>
                    )}

                    {/* CASO 4: Confermato ma FUORI TEMPO MASSIMO (< minNoticeHours) */}
                    {!cancelledSuccess && bookingData.status === 'confirmed' && !policy?.canCancel && (
                    <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl space-y-3">
                        <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200/90 leading-relaxed">
                            Il limite di disdetta autonoma ({policy?.minNoticeHours} ore di preavviso) è trascorso.
                        </p>
                        </div>
                        {businessContact?.phone && (
                        <a
                            href={`tel:${businessContact.phone.replace(/\s+/g, '')}`}
                            className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Contatta il Salone ({businessContact.phone})</span>
                        </a>
                        )}
                    </div>
                    )}

                    {errorMsg && <p className="text-xs text-rose-400 text-center">{errorMsg}</p>}
                    <p className="w-full text-center text-[11px] text-zinc-500">
                      Puoi annullare gratuitamente online fino a {policy.minNoticeHours} ore prima.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}