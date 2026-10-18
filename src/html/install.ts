/**
 * Instalar el juego (PWA): en Android y PC Chrome/Edge sale el botón "Instalar";
 * en iPhone se explica cómo agregarlo a la pantalla de inicio.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export function setupInstall(): void {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
  // El service worker solo en producción (en `npm run dev` estorba al recargar)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* sin SW igual se juega */ }); });
  }
}

/** Ya se está jugando como app instalada. */
export const isInstalled = (): boolean =>
  window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const canPromptInstall = (): boolean => deferred !== null;

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Abre el diálogo de instalación. Devuelve true si se instaló. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

/** Instrucciones cuando el navegador no tiene botón de instalar. */
export function installHelpText(): string {
  if (isIOS()) return 'En iPhone: abre esta página en Safari, toca Compartir (el cuadro con flecha ↑) y elige "Agregar a inicio".';
  if (/firefox/i.test(navigator.userAgent)) return 'Firefox no instala páginas. Ábrelo en Chrome o Edge y toca "Instalar".';
  return 'En el menú del navegador (⋮) elige "Instalar app" o "Agregar a pantalla de inicio".';
}
