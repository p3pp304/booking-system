import { Phone, MessageCircle, HelpCircle } from 'lucide-react';

export default function ForgotCodeFallback({
  shopPhone = '393402212050', // Numero WhatsApp salone (con prefisso 39 senza '+')
  shopDisplayPhone = '+39 340 221 2050', // Numero formattato da mostrare
}) {
  // Messaggio precompilato per WhatsApp
  const waMessage = encodeURIComponent(
    "Ciao Atelier Barber! Non trovo più il mio codice di prenotazione per gestire il mio appuntamento. Potreste verificare se risulta a mio nome?"
  );
  const whatsappUrl = `https://wa.me/${shopPhone}?text=${waMessage}`;

  return (
    <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-zinc-950/80 border border-zinc-900 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
          <HelpCircle className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
          Hai smarrito il codice?
        </h4>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed mb-4">
        Se hai cambiato dispositivo o svuotato la cronologia, contattaci direttamente: verificheremo la prenotazione a tuo nome e la gestiremo al volo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Tasto WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Scrivici su WhatsApp</span>
        </a>

        {/* Tasto Chiamata */}
        <a
          href={`tel:+${shopPhone}`}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all active:scale-[0.98] cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Chiama in salone</span>
        </a>
      </div>

      <div className="mt-3 text-center">
        <span className="text-[10px] text-zinc-600 font-mono">
          Recapito salone: {shopDisplayPhone}
        </span>
      </div>
    </div>
  );
}