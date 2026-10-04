import React, { useEffect, useState, useRef } from 'react';
import { 
  Scissors, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { fetchServices } from '../api/publicApi';

// Foto autentiche di lavoro reale in salone (tonalità neutre e desaturate)
const SALON_GALLERY = [
  {
    url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800',
    caption: 'L\'Atelier'
  },
  {
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
    caption: 'Postazione & Tradizione'
  },
  {
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800',
    caption: 'Rasoio Tradizionale'
  },
  {
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800',
    caption: 'Dettagli di Stile'
  }
];

export default function HomePage({ onOpenBooking }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const galleryRef = useRef(null);

  useEffect(() => {
    fetchServices()
      .then((data) => setServices(data))
      .catch((err) => console.error('Errore caricamento servizi:', err))
      .finally(() => setLoading(false));
  }, []);

  // Aggiorna l'indicatore delle foto durante lo swipe
  const handleScroll = () => {
    if (galleryRef.current) {
      const { scrollLeft, offsetWidth } = galleryRef.current;
      const index = Math.round(scrollLeft / offsetWidth);
      setActivePhotoIndex(index);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none pb-28">
      
      {/* 1. HEADER MINIMALE */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-white">
            ATELIER // BARBER
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
            Aperto
          </span>
        </div>
      </header>

      {/* 2. GALLERIA TOUCH ORIZZONTALE (FOTO CHE SCORRONO) */}
      <section className="pt-4 pb-2">
        <div 
          ref={galleryRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 gap-3.5 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SALON_GALLERY.map((photo, i) => (
            <div 
              key={i} 
              className="snap-center shrink-0 w-[82vw] sm:w-[380px] h-[360px] relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80"
            >
              <img 
                src={photo.url} 
                alt={photo.caption} 
                className="w-full h-full object-cover grayscale contrast-[1.15] hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-semibold text-zinc-200">
                  {photo.caption}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  0{i + 1} / 0{SALON_GALLERY.length}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Barre indicatore swipe */}
        <div className="flex justify-center gap-1.5 mt-3">
          {SALON_GALLERY.map((_, i) => (
            <div 
              key={i} 
              className={`h-0.5 rounded-full transition-all duration-300 ${
                activePhotoIndex === i ? 'w-6 bg-white' : 'w-2 bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 3. HEADLINE IDENTITARIA */}
      <section className="px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
          Barberia Tradizionale & Cura Maschile
        </p>
        <h1 className="text-2xl font-light text-white tracking-tight mt-1 leading-snug">
          Precisione nel taglio, <br />
          <span className="font-semibold text-zinc-300">rituale d’altri tempi.</span>
        </h1>
      </section>

      {/* 4. LISTINO SERVIZI MINIMAL & MATERICO */}
      <section className="px-5 py-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-zinc-400">
            Listino Trattamenti
          </h2>
          <span className="text-[10px] font-mono text-zinc-600">PREZZI & DURATA</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 rounded-xl bg-zinc-900/40 animate-pulse border border-zinc-900" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-900/80">
            {services.map((service) => (
              <div
                key={service._id}
                onClick={onOpenBooking}
                className="py-4 flex items-center justify-between cursor-pointer group active:opacity-60 transition"
              >
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-zinc-200 group-hover:text-white transition">
                      {service.name}
                    </h3>
                  </div>
                  {service.description && (
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-light">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500 font-mono">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-zinc-100 font-mono">
                    {Number(service.price).toFixed(2)} €
                  </span>
                  <div className="w-7 h-7 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:border-zinc-600 group-hover:text-white transition">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. INFORMAZIONI ESSENZIALI & CONTATTO */}
      <section className="px-5 py-6">
        <div className="rounded-2xl border border-zinc-900 p-5 bg-zinc-900/10 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Atelier</p>
              <p className="text-xs text-zinc-300 mt-0.5">Via Roma 124, Andria (BT)</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Orari</p>
              <p className="text-xs text-zinc-300 mt-0.5">Mar — Sab: 08:30 / 13:00 — 15:30 / 20:00</p>
              <p className="text-[10px] text-zinc-500">Domenica e Lunedì riposo</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Recapito Diretto</p>
              <a href="tel:+390883123456" className="text-xs text-zinc-300 hover:text-white transition mt-0.5 inline-flex items-center gap-1">
                <span>+39 0883 123456</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM BAR NATIVA PER PWA (Pulsante Bianco ad Alto Contrasto) */}
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-900 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block">Agenda Live</span>
          <span className="text-xs font-medium text-zinc-300">Prenota il tuo appuntamento</span>
        </div>
        <button
          onClick={onOpenBooking}
          className="py-3 px-5 bg-white hover:bg-zinc-200 active:scale-[0.97] text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-white/5 flex items-center gap-2 transition"
        >
          <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Prenota Ora</span>
        </button>
      </div>

    </div>
  );
}