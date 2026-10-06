import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Lock, 
  Store, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Phone,
  Loader2 
} from 'lucide-react';
import { 
  fetchAdminProfile, 
  updateAdminProfile, 
  changeAdminPassword 
} from '../api/adminApi'; // Verifica il percorso del tuo file API

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'salon' | 'booking'
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. STATO PROFILO & SICUREZZA
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 2. STATO BRAND & ANAGRAFICA SALONE
  const [salonData, setSalonData] = useState({
    salonName: 'ATELIER // BARBER',
    tagline: 'Sartoria Tradizionale del Capello & Barba',
    address: 'Via Roma, 120, Napoli (NA)',
    mapsUrl: 'https://maps.google.com/?q=Atelier+Barber',
    publicPhone: '+39 081 1234567',
    instagram: '@atelierbarber_official'
  });

  // 3. STATO REGOLE BOOKING & ORARI
  const [bookingRules, setBookingRules] = useState({
    openTime: '09:00',
    closeTime: '19:30',
    slotDuration: '30',
    bufferMinutes: '5', // Pausa igienizzazione strumenti
    maxDaysInAdvance: '30', // Fino a quanti giorni prima prenotare
    minHoursNotice: '2', // Disdetta minima
    closedDays: ['Domenica', 'Lunedì']
  });

  const weekDays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  // Notifica temporizzata
  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const notifyError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // Caricamento Profilo Iniziale
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchAdminProfile();
      const user = res?.user || res || {};
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'Amministratore'
      });
    } catch (err) {
      console.error('Errore nel recupero profilo:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ==========================================
  // HANDLERS SEZIONE 1: PROFILO & SICUREZZA
  // ==========================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await updateAdminProfile({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });
      notifySuccess('Profilo amministratore aggiornato.');
    } catch (err) {
      notifyError('Errore durante l\'aggiornamento del profilo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notifyError('La nuova password e la conferma non coincidono.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      notifyError('La nuova password deve contenere almeno 6 caratteri.');
      return;
    }

    try {
      setIsSubmitting(true);
      await changeAdminPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notifySuccess('Password modificata con successo.');
    } catch (err) {
      notifyError('Password attuale errata o non valida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS SEZIONE 2: SALONE & RECAPITI
  // ==========================================
  const handleSaveSalon = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Salva nei tuoi settings o localStorage
    setTimeout(() => {
      setIsSubmitting(false);
      notifySuccess('Informazioni del salone salvate.');
    }, 400);
  };

  // ==========================================
  // HANDLERS SEZIONE 3: REGOLE BOOKING
  // ==========================================
  const toggleClosedDay = (day) => {
    setBookingRules((prev) => {
      const exists = prev.closedDays.includes(day);
      return {
        ...prev,
        closedDays: exists 
          ? prev.closedDays.filter((d) => d !== day) 
          : [...prev.closedDays, day]
      };
    });
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      notifySuccess('Regole di prenotazione e orari salvati.');
    }, 400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 pb-16">
      
      {/* Intestazione */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">Impostazioni</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Gestisci credenziali, brand del salone e parametri di prenotazione</p>
      </div>

      {/* Notifiche Toast in Pagina */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra Tab Mobile-First (Punti 1, 2, 3) */}
      <div className="flex p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">1. Profilo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('salon')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'salon'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span className="truncate">2. Brand & Sede</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'booking'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span className="truncate">3. Orari & Booking</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span className="text-xs font-medium">Caricamento impostazioni...</span>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* TAB 1: PROFILO AMMINISTRATORE & SICUREZZA */}
          {/* ========================================================= */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-6">
              {/* Form Dati Profilo */}
              <form onSubmit={handleUpdateProfile} className="p-4 md:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-300" />
                    <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-200">Dati Amministratore</h2>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold">
                    {profileData.role || 'Admin'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 font-medium">Nome Titolare / Account</label>
                    <input
                      type="text"
                      required
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-medium">Email di Accesso</label>
                    <input
                      type="email"
                      required
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="text-zinc-400 font-medium">Telefono Personale</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+39 340 0000000"
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-transform"
                  >
                    <Save className="w-4 h-4" />
                    Salva Profilo
                  </button>
                </div>
              </form>

              {/* Form Cambio Password */}
              <form onSubmit={handleChangePassword} className="p-4 md:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                  <Lock className="w-4 h-4 text-zinc-300" />
                  <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-200">Sicurezza & Password</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 font-medium">Password Attuale</label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-medium">Nuova Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-medium">Conferma Nuova Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Aggiorna Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ANAGRAFICA E BRAND DEL SALONE */}
          {/* ========================================================= */}
          {activeTab === 'salon' && (
            <form onSubmit={handleSaveSalon} className="p-4 md:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Store className="w-4 h-4 text-zinc-300" />
                <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-200">Brand & Contatti Salone</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 font-medium">Nome Salone Ufficiale</label>
                  <input
                    type="text"
                    required
                    value={salonData.salonName}
                    onChange={(e) => setSalonData({ ...salonData, salonName: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">Slogan / Payoff</label>
                  <input
                    type="text"
                    value={salonData.tagline}
                    onChange={(e) => setSalonData({ ...salonData, tagline: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="col-span-full">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    Indirizzo Sede
                  </label>
                  <input
                    type="text"
                    value={salonData.address}
                    onChange={(e) => setSalonData({ ...salonData, address: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    Telefono Salone (Per Clienti)
                  </label>
                  <input
                    type="tel"
                    value={salonData.publicPhone}
                    onChange={(e) => setSalonData({ ...salonData, publicPhone: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    Profilo Instagram
                  </label>
                  <input
                    type="text"
                    value={salonData.instagram}
                    onChange={(e) => setSalonData({ ...salonData, instagram: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-900">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" />
                  Salva Informazioni Salone
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: REGOLE BOOKING, SLOTS & CHIUSURE */}
          {/* ========================================================= */}
          {activeTab === 'booking' && (
            <form onSubmit={handleSaveRules} className="p-4 md:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-900 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Clock className="w-4 h-4 text-zinc-300" />
                <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-200">Orari e Motore Booking</h2>
              </div>

              {/* Orari Inizio e Fine */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-zinc-400 font-medium">Apertura</label>
                  <input
                    type="time"
                    value={bookingRules.openTime}
                    onChange={(e) => setBookingRules({ ...bookingRules, openTime: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Chiusura</label>
                  <input
                    type="time"
                    value={bookingRules.closeTime}
                    onChange={(e) => setBookingRules({ ...bookingRules, closeTime: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Durata Minima Slot</label>
                  <select
                    value={bookingRules.slotDuration}
                    onChange={(e) => setBookingRules({ ...bookingRules, slotDuration: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="15">15 Min</option>
                    <option value="30">30 Min</option>
                    <option value="45">45 Min</option>
                    <option value="60">60 Min</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Pausa Tecnica Buffer</label>
                  <select
                    value={bookingRules.bufferMinutes}
                    onChange={(e) => setBookingRules({ ...bookingRules, bufferMinutes: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="0">0 Min</option>
                    <option value="5">5 Min (Igienizzazione)</option>
                    <option value="10">10 Min</option>
                  </select>
                </div>
              </div>

              {/* Anticipo & Disdette */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="text-zinc-400 font-medium">Finestra massima prenotazione (Giorni)</label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={bookingRules.maxDaysInAdvance}
                    onChange={(e) => setBookingRules({ ...bookingRules, maxDaysInAdvance: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">I clienti possono prenotare al massimo entro questi giorni futuri.</p>
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Preavviso minimo di disdetta (Ore)</label>
                  <input
                    type="number"
                    min="0"
                    max="48"
                    value={bookingRules.minHoursNotice}
                    onChange={(e) => setBookingRules({ ...bookingRules, minHoursNotice: e.target.value })}
                    className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Sotto questa soglia l'annullamento online è bloccato.</p>
                </div>
              </div>

              {/* Giorni di Chiusura Settimanale */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900">
                <span className="text-xs text-zinc-400 font-medium">Giorni di Chiusura Regolari</span>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => {
                    const isClosed = bookingRules.closedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleClosedDay(day)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          isClosed
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 shadow-sm'
                            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/70 hover:text-white'
                        }`}
                      >
                        {day} {isClosed ? '✕' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-900">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" />
                  Salva Regole Booking
                </button>
              </div>
            </form>
          )}
        </>
      )}

    </div>
  );
}