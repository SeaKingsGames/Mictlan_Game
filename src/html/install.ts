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
    // El juego abre con la versión guardada; si el service worker bajó una nueva, se ofrece actualizar
    navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'update-ready') showUpdateBanner(); });
  }
  // Si falta un archivo de una versión vieja, recargar trae la nueva
  window.addEventListener('vite:preloadError', () => location.reload());
}

/** Aviso abajo: "Hay una versión nueva · Actualizar". (En la app instalada no hay botón de recargar.) */
export function showUpdateBanner(required = false): void {
  if (document.querySelector('.update-banner')) return;
  const bar = document.createElement('div');
  bar.className = 'update-banner';
  bar.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = required ? 'El juego se actualizó. Toca para cargar la versión nueva.' : 'Hay una versión nueva del juego.';
  const btn = document.createElement('button');
  btn.textContent = 'Actualizar';
  btn.addEventListener('click', () => location.reload());
  bar.append(text, btn);
  if (!required) {
    const later = document.createElement('button');
    later.className = 'update-banner__later';
    later.textContent = 'Luego';
    later.addEventListener('click', () => bar.remove());
    bar.append(later);
  }
  document.body.append(bar);
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
