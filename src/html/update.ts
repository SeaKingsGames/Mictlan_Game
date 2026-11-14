import { APP_BUILD_ID } from '../version.ts';
import { RESOURCE_CACHE } from './resources.ts';

/**
 * Actualizaciones del juego (sobre todo en la app de Android, que guarda la versión para abrir rápido):
 *  - checkForUpdate(): pregunta a /version.json (sin caché) si el build publicado es otro.
 *  - applyUpdate(): borra lo guardado por el service worker y recarga → se baja la versión nueva.
 *  - watchForUpdates(): revisa al abrir y cada vez que vuelves a la app; si hay nueva, avisa.
 */
export type UpdateState = 'new' | 'same' | 'offline';

export async function checkForUpdate(): Promise<UpdateState> {
  if (import.meta.env.DEV) return 'same';
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'offline';
    const v = await res.json() as { build?: string };
    return v.build && v.build !== APP_BUILD_ID ? 'new' : 'same';
  } catch { return 'offline'; }
}

export async function applyUpdate(): Promise<void> {
  try {
    // Lo descargado en Opciones (arte, música) se queda: cada archivo trae su huella y lo viejo se limpia solo.
    if ('caches' in window) for (const k of await caches.keys()) if (k !== RESOURCE_CACHE) await caches.delete(k);
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch { /* igual se recarga */ }
  location.reload();
}

let lastCheck = 0;
export function watchForUpdates(onNew: () => void): void {
  if (import.meta.env.DEV) return;
  const check = () => {
    if (Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    void checkForUpdate().then(s => { if (s === 'new') onNew(); });
  };
  setTimeout(check, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}
