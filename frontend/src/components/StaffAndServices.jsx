import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Scissors,
  Plus,
  Phone,
  Clock,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import {
  fetchAllWorkers,
  createWorker,
  updateWorker,
  toggleWorkerActive,
  deleteWorker,
  fetchAllServicesAdmin,
  createService,
  updateService,
  deleteService
} from '../api/adminApi'; // Aggiorna il percorso al tuo file api

export default function StaffAndServicesPage() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'services'
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Stati Modali Staff
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // Stati Modali Servizi
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Caricamento Dati
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const [workersRes, servicesRes] = await Promise.all([
        fetchAllWorkers(),
        fetchAllServicesAdmin()
      ]);
      setWorkers(Array.isArray(workersRes) ? workersRes : workersRes?.workers || []);
      setServices(Array.isArray(servicesRes) ? servicesRes : servicesRes?.services || []);
    } catch (err) {
      console.error('Errore nel caricamento dati:', err);
      setLoadError(err.message || 'Impossibile caricare operatori e servizi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // OPERAZIONI CRUD STAFF
  // ==========================================
  const handleToggleWorker = async (id) => {
    try {
      const result = await toggleWorkerActive(id);
      setWorkers((prev) =>
        prev.map((worker) => (
          String(worker._id || worker.id) === String(id)
            ? result?.worker || { ...worker, isActive: !worker.isActive }
            : worker
        ))
      );
    } catch (err) {
      alert(err.message || 'Errore nel cambio stato operatore');
    }
  };

  const handleDeleteWorker = async (id, name) => {
    if (!window.confirm(`Sei sicuro di voler eliminare ${name}?`)) return;
    try {
      await deleteWorker(id);
      setWorkers((prev) => prev.filter((w) => (w.id || w._id) !== id));
    } catch (err) {
      alert(err.message || 'Errore durante l\'eliminazione del collaboratore');
    }
  };

  const handleSaveWorker = async (formData) => {
    try {
      if (editingWorker) {
        const id = editingWorker.id || editingWorker._id;
        await updateWorker(id, formData);
      } else {
        await createWorker(formData);
      }
      await loadData();
      setWorkerModalOpen(false);
      setEditingWorker(null);
    } catch (err) {
      alert(err.message || 'Errore nel salvataggio operatore');
    }
  };

  // ==========================================
  // OPERAZIONI CRUD SERVIZI
  // ==========================================
  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il servizio "${name}"?`)) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => (s.id || s._id) !== id));
    } catch (err) {
      alert(err.message || 'Errore durante l\'eliminazione del servizio');
    }
  };

  const handleSaveService = async (formData) => {
    try {
      if (editingService) {
        const id = editingService.id || editingService._id;
        await updateService(id, formData);
      } else {
        await createService(formData);
      }
      await loadData();
      setServiceModalOpen(false);
      setEditingService(null);
    } catch (err) {
      alert(err.message || 'Errore nel salvataggio del servizio');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 pb-12">
      
      {/* 1. Header con Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">Staff & Servizi</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Gestisci l'organico barbieri e il listino prezzi</p>
        </div>

        {/* Bottone Aggiungi Dinamico */}
        <button
          onClick={() => {
            if (activeTab === 'staff') {
              setEditingWorker(null);
              setWorkerModalOpen(true);
            } else {
              setEditingService(null);
              setServiceModalOpen(true);
            }
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'staff' ? 'Nuovo Collaboratore' : 'Nuovo Servizio'}</span>
        </button>
      </div>

      {/* 2. Barra Tab Mobile-First */}
      {loadError && <p role="alert" className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">{loadError}</p>}
      <div className="flex p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'staff'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff ({workers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'services'
              ? 'bg-zinc-100 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Listino Servizi ({services.length})</span>
        </button>
      </div>

      {/* 3. Contenuto Tab */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span className="text-xs font-medium">Caricamento in corso...</span>
        </div>
      ) : activeTab === 'staff' ? (
        
        /* LISTA STAFF */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {workers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-500 border border-zinc-900 rounded-2xl bg-zinc-950/40">
              Nessun collaboratore registrato. Crea il primo profilo.
            </div>
          ) : (
            workers.map((worker) => {
              const workerId = worker.id || worker._id;
              return (
                <div
                  key={workerId}
                  className={`p-4 rounded-3xl border flex flex-col justify-between gap-3.5 transition-all ${
                    worker.isActive
                      ? 'bg-zinc-950 border-zinc-900'
                      : 'bg-zinc-950/40 border-zinc-900/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200">
                        <Scissors className="w-4 h-4 text-zinc-300" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                            worker.isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white capitalize">{worker.name}</h3>
                        <span className="text-[11px] text-zinc-400">{worker.isActive ? 'Prenotabile' : 'Non prenotabile'}</span>
                      </div>
                    </div>

                    {/* Toggle Attivo */}
                    <button
                      type="button"
                      onClick={() => handleToggleWorker(workerId)}
                      title={worker.isActive ? 'Disattiva' : 'Attiva'}
                      className={`p-2 rounded-xl border text-xs transition-colors ${
                        worker.isActive
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {worker.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Recap Telefono & Turno */}
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-900 bg-zinc-900/50 p-2 text-[11px] text-zinc-300">
                    <span>{worker.isActive ? 'Attivo e prenotabile' : 'Non disponibile alle prenotazioni'}</span>
                    <span className="h-4 w-4 shrink-0 rounded border border-zinc-700" style={{ backgroundColor: worker.color || '#2563eb' }} aria-label="Colore agenda" />
                  </div>

                  {/* Azioni Modifica / Elimina */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWorker(worker);
                        setWorkerModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifica
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorker(workerId, worker.name)}
                      className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        
        /* LISTA SERVIZI */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {services.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-500 border border-zinc-900 rounded-2xl bg-zinc-950/40">
              Nessun servizio nel listino. Creane uno per iniziare a ricevere booking.
            </div>
          ) : (
            services.map((service) => {
              const serviceId = service.id || service._id;
              return (
                <div
                  key={serviceId}
                  className="p-4 rounded-3xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white capitalize truncate">{service.name}</h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        {service.description || 'Nessuna descrizione specificata'}
                      </p>
                    </div>

                    {/* Prezzo Badge */}
                  {service.price !== null && service.price !== undefined && Number.isFinite(Number(service.price)) && (
                    <span className="font-mono font-bold text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-xl shrink-0">
                      {Number(service.price).toFixed(2)} €
                    </span>
                  )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs text-zinc-400">
                    {service.durationMinutes !== null &&
                      service.durationMinutes !== undefined &&
                      Number.isFinite(Number(service.durationMinutes)) && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {service.durationMinutes} min
                        </span>
                      )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(service);
                          setServiceModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(serviceId, service.name)}
                        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. MODALE COLLABORATORE (Crea/Modifica) */}
      {workerModalOpen && (
        <WorkerModal
          worker={editingWorker}
          onClose={() => {
            setWorkerModalOpen(false);
            setEditingWorker(null);
          }}
          onSave={handleSaveWorker}
        />
      )}

      {/* 5. MODALE SERVIZIO (Crea/Modifica) */}
      {serviceModalOpen && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setServiceModalOpen(false);
            setEditingService(null);
          }}
          onSave={handleSaveService}
        />
      )}

    </div>
  );
}

// ==========================================
// SUB-COMPONENT: MODALE STAFF
// ==========================================
function WorkerModal({ worker, onClose, onSave }) {
  const [name, setName] = useState(worker?.name || '');
  const [color, setColor] = useState(worker?.color || '#2563eb');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(worker
        ? { name: name.trim(), color }
        : { name: name.trim(), color, email: email.trim().toLowerCase(), password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {worker ? 'Modifica Collaboratore' : 'Nuovo Collaboratore'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="text-zinc-400 font-medium">Nome e Cognome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Antonio Esposito"
              className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
            Colore agenda
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" />
          </label>

          {!worker && (
            <>
              <div>
                <label className="text-zinc-400 font-medium">Email accesso staff</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@salone.it" className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700" />
              </div>
              <div>
                <label className="text-zinc-400 font-medium">Password iniziale</label>
                <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-zinc-400 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
            >
              {submitting ? 'Salvataggio...' : 'Conferma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: MODALE SERVIZI
// ==========================================
function ServiceModal({ service, onClose, onSave }) {
  const [name, setName] = useState(service?.name || '');
  const [price, setPrice] = useState(service?.price === undefined || service?.price === null ? '' : String(service.price));
  const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes === undefined || service?.durationMinutes === null ? '' : String(service.durationMinutes));
  const [description, setDescription] = useState(service?.description || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave({
      name,
      price: Number(price),
      durationMinutes: Number.parseInt(durationMinutes, 10),
      description
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {service ? 'Modifica Servizio' : 'Nuovo Servizio'}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="text-zinc-400 font-medium">Nome Servizio</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Rasatura Tradizionale con Panno Caldo"
              className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 font-medium">Prezzo (€)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25.00"
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="text-zinc-400 font-medium">Durata (Minuti)</label>
              <select
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700"
              >
                <option value="">Seleziona durata</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-zinc-400 font-medium">Descrizione (Opzionale)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve spiegazione del trattamento..."
              className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-700 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-zinc-400 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
            >
              {submitting ? 'Salvataggio...' : 'Conferma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}