import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true;

export default function InstallAppNotice() {
  const [platform, setPlatform] = useState('other');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setPlatform(isAppleMobile() ? 'ios' : 'other');

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setPlatform('chrome');
    };
    const handleInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  if (installed || dismissed) return null;

  const isIOS = platform === 'ios';
  const canPrompt = Boolean(installPrompt);

  return (
    <aside className="border-b border-zinc-800 bg-zinc-900/70 px-5 py-3" aria-label="Installa Atelier Barber">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200">
          {isIOS ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-100">Aggiungi Atelier alla schermata Home</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
            {isIOS
              ? 'Su iPhone/iPad apri il sito in Safari: Condividi → Aggiungi alla schermata Home. Avvia l’icona per aprire l’app senza la barra del browser.'
              : canPrompt
                ? 'Installa l’app per aprirla dalla schermata Home senza la barra del browser.'
                : 'In Chrome: menu ⋮ → “Installa app” o “Aggiungi a schermata Home”. In Safari: Condividi → “Aggiungi alla schermata Home”.'}
          </p>
        </div>
        {canPrompt && (
          <button type="button" onClick={install} className="shrink-0 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-zinc-950 hover:bg-zinc-200">
            Installa
          </button>
        )}
        <button type="button" onClick={() => setDismissed(true)} aria-label="Chiudi avviso installazione" className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}