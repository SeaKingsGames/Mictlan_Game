import { allAssets } from './assets.ts';

/**
 * "Descargar recursos" (en Opciones): guarda en el teléfono el arte de todas las cartas, los retratos,
 * las imágenes del menú, los sonidos y la música. Así el juego abre rápido y no se queda cargando
 * con mala señal.
 *
 * Se guarda en la caché "quinto-sol-recursos", la misma que usa public/sw.js para responder sin internet.
 * Cada archivo va con su huella (?v=…): si cambias una imagen, la nueva tiene otra dirección y la vieja
 * se borra sola con cleanupResources().
 */
export const RESOURCE_CACHE = 'quinto-sol-recursos';
const WANTED_KEY = 'cartas.recursos';           // "si": el jugador pidió tener todo descargado

export interface ResourceStatus {
  supported: boolean;
  files: number;        // cuántos archivos tiene el juego
  bytes: number;        // cuánto pesan en total
  have: number;         // cuántos ya están guardados
  haveBytes: number;
  wanted: boolean;      // el jugador pidió descargarlos
}

export interface DownloadProgress { done: number; files: number; bytes: number; totalBytes: number }

export const resourcesSupported = (): boolean => typeof caches !== 'undefined';

function wanted(): boolean {
  try { return localStorage.getItem(WANTED_KEY) === 'si'; } catch { return false; }
}
function setWanted(on: boolean): void {
  try { if (on) localStorage.setItem(WANTED_KEY, 'si'); else localStorage.removeItem(WANTED_KEY); } catch { /* sin almacenamiento */ }
}

/** Direcciones guardadas, sin el dominio ("/cards/1.webp?v=…"). */
async function savedUrls(cache: Cache): Promise<Set<string>> {
  const keys = await cache.keys();
  return new Set(keys.map(r => { const u = new URL(r.url); return u.pathname + u.search; }));
}

export async function resourceStatus(): Promise<ResourceStatus> {
  const list = allAssets();
  const base = { supported: resourcesSupported(), files: list.length, bytes: list.reduce((n, [, s]) => n + s, 0), have: 0, haveBytes: 0, wanted: wanted() };
  if (!base.supported) return base;
  const saved = await savedUrls(await caches.open(RESOURCE_CACHE));
  for (const [url, size] of list) if (saved.has(url)) { base.have += 1; base.haveBytes += size; }
  return base;
}

/**
 * Baja lo que falte (6 archivos a la vez). Si algo falla, lo ya bajado se queda y al reintentar
 * solo baja lo que faltó.
 */
export async function downloadResources(onProgress: (p: DownloadProgress) => void, signal?: AbortSignal): Promise<void> {
  if (!resourcesSupported()) throw new Error('Este navegador no deja guardar archivos.');
  setWanted(true);
  void navigator.storage?.persist?.().catch(() => false);   // pide que el teléfono no lo borre para hacer espacio
  const cache = await caches.open(RESOURCE_CACHE);
  const saved = await savedUrls(cache);
  const list = allAssets();
  const totalBytes = list.reduce((n, [, s]) => n + s, 0);
  let bytes = 0;
  let done = 0;
  const todo: [string, number][] = [];
  for (const item of list) {
    if (saved.has(item[0])) { bytes += item[1]; done += 1; } else todo.push(item);
  }
  onProgress({ done, files: list.length, bytes, totalBytes });

  let failed = 0;
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      if (signal?.aborted) return;
      const [url, size] = todo[next++];
      try {
        const res = await fetch(url, { cache: 'no-cache', signal });
        if (!res.ok || res.status !== 200) throw new Error(String(res.status));
        await cache.put(url, res);
        bytes += size; done += 1;
        onProgress({ done, files: list.length, bytes, totalBytes });
      } catch {
        if (signal?.aborted) return;
        failed += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (signal?.aborted) throw new Error('Descarga detenida. Lo que ya se bajó se queda guardado.');
  if (failed) throw new Error(`No se pudieron bajar ${failed} archivo${failed === 1 ? '' : 's'}. Revisa tu conexión y vuelve a intentar: solo bajará lo que faltó.`);
}

/** Borra todo lo descargado (el juego lo vuelve a bajar poco a poco mientras juegas). */
export async function clearResources(): Promise<void> {
  setWanted(false);
  if (resourcesSupported()) await caches.delete(RESOURCE_CACHE);
}

/**
 * Al abrir el juego (con calma, unos segundos después):
 *  - borra archivos viejos que ya no usa (por ejemplo, el arte anterior de una carta que cambiaste);
 *  - si el jugador pidió tener todo descargado, baja en silencio lo nuevo (cartas de una expansión nueva).
 */
export function cleanupResources(): void {
  if (!resourcesSupported()) return;
  setTimeout(() => {
    void (async () => {
      if (!(await caches.has(RESOURCE_CACHE))) return;
      const cache = await caches.open(RESOURCE_CACHE);
      const current = new Set(allAssets().map(([u]) => u));
      for (const req of await cache.keys()) {
        const u = new URL(req.url);
        if (!current.has(u.pathname + u.search)) await cache.delete(req);
      }
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (wanted() && navigator.onLine && !conn?.saveData) await downloadResources(() => { /* en silencio */ }).catch(() => { /* otro día */ });
    })().catch(() => { /* no pasa nada */ });
  }, 6000);
}

/** "23.4 MB" */
export function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: bytes < 10 * 1024 * 1024 ? 1 : 0 })} MB`;
}
