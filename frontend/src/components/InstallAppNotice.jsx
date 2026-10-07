import { useEffect, useState } from 'react';
import { Download, Share, X, Scissors, Calendar } from 'lucide-react';

const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

export default function InstallAppNotice() {
  // Determina se ci troviamo sul Gestionale o sull'App Clienti
  const isAdmin =
    import.meta.env.VITE_APP_MODE === 'admin' ||
    window.location.pathname.startsWith('/admin') ||
    window.location.hostname.includes('admin');

  const appName = isAdmin ? 'Atelier Gestionale' : 'Atelier Barber';
  const storageKey = isAdmin ? 'install_prompt_dismissed_admin' : 'install_prompt_dismissed_client';

  const [platform, setPlatform] = useState('other');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(storageKey) === 'true';
  });

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

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(storageKey, 'true');
  };

  if (installed || dismissed) return null;

  const isIOS = platform === 'ios';
  const canPrompt = Boolean(installPrompt);

  return (
    <aside
      className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur-md"
      aria-label={`Installa ${appName}`}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        {/* Icona contestuale: forbici per gestionale, calendario per clienti */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-inner">
          {isAdmin ? (
            <Scissors className="h-4 w-4 text-emerald-400" />
          ) : isIOS ? (
            <Share className="h-4 w-4 text-zinc-200" />
          ) : (
            <Calendar className="h-4 w-4 text-zinc-200" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-100">
            Aggiungi {appName} alla schermata Home
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
            {isIOS ? (
              <>
                Tocca <strong className="text-zinc-200">Condividi</strong> in Safari e seleziona{' '}
                <strong className="text-zinc-200">“Aggiungi alla schermata Home”</strong> per avviare il gestionale a schermo intero.
              </>
            ) : canPrompt ? (
              `Installa l'app gestionale per accedere direttamente all'agenda senza barra del browser.`
            ) : (
              'In Chrome: apri il menu ⋮ e seleziona “Installa app” o “Aggiungi a schermata Home”.'
            )}
          </p>
        </div>

        {canPrompt && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1.5 shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Installa</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Chiudi avviso installazione"
          className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}