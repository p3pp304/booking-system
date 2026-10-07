import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Loader2, 
  ChevronDown, 
  User, 
  DollarSign, 
  Receipt 
} from 'lucide-react';
import { fetchAdminRevenueStats } from '../api/adminApi';

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function RevenueAnalytics({ selectedDate, onClose }) {
  const currentDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
  
  const [period, setPeriod] = useState('month'); // 'day' | 'month' | 'year'
  const [selectedYear, setSelectedYear] = useState(currentDateObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDateObj.getMonth() + 1); // 1-12
  
  const [startYear, setStartYear] = useState(currentDateObj.getFullYear());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Caricamento Dati Incassi al variare di periodo/anno/mese
  useEffect(() => {
    let isMounted = true;
    const loadRevenue = async () => {
      try {
        setLoading(true);
        const data = await fetchAdminRevenueStats({
          period,
          year: selectedYear,
          month: selectedMonth,
          date: selectedDate
        });
        if (isMounted) {
          setStats(data);
          if (data?.startYear) setStartYear(data.startYear);
        }
      } catch (err) {
        console.error('Errore nel recupero incassi:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRevenue();
    return () => { isMounted = false; };
  }, [period, selectedYear, selectedMonth, selectedDate]);

  // Genera dinamicamente la lista degli anni disponibili: dal primo booking fino all'anno attuale
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    const minYear = Math.min(startYear, currentYear);
    for (let y = currentYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [startYear]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        
        {/* Header Modale */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Report Incassi & Cassa</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Giorno / Mese / Anno */}
        <div className="flex p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setPeriod('day')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'day' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Giorno
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'month' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mese
          </button>
          <button
            type="button"
            onClick={() => setPeriod('year')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'year' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Anno
          </button>
        </div>

        {/* Selettori Anno e Mese (Mostrati solo per vista Mese o Anno) */}
        {period !== 'day' && (
          <div className="flex items-center gap-2">
            {/* Selettore Mese (visibile solo se period === 'month') */}
            {period === 'month' && (
              <div className="flex-1 relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Selettore Anno (sempre presente per Mese e Anno) */}
            <div className="w-28 relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono font-bold px-3 py-2 rounded-xl focus:outline-none"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Contenuto Statistiche */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            <span className="text-xs">Conteggio incassi in corso...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Scheda Totale Cassa */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                {period === 'day' ? `Giorno: ${selectedDate}` : period === 'month' ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : `Anno ${selectedYear}`}
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {Number(stats?.totalRevenue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-bold text-emerald-400">€</span>
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                {stats?.totalCount || 0} appuntamenti eseguiti
              </span>
              {stats?.unpricedCount > 0 && (
                <span className="mt-1 text-[11px] text-amber-400">
                  {stats.unpricedCount} appuntamenti esclusi: prezzo non salvato
                </span>
              )}
            </div>

            {/* Metriche Rapide */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Scontrino Medio</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {Number(stats?.pricedCount) > 0 ? `${Number(stats.averageTicket).toFixed(2)} €` : 'Non disponibile'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Stima Netta (70%)</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {(Number(stats?.totalRevenue || 0) * 0.7).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* Ripartizione per Operatore */}
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] font-semibold text-zinc-400">Incassi per Barbiere</span>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {!stats?.breakdown || stats.breakdown.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2 text-center">Nessun incasso in questo arco temporale.</p>
                ) : (
                  stats.breakdown.map((item) => (
                    <div key={item.name} className="p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 capitalize">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">{item.count} tagli</span>
                          <span className="font-mono font-bold text-white">{Number(item.total).toFixed(2)} €</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
        >
          Chiudi
        </button>

      </div>
    </div>
  );
}