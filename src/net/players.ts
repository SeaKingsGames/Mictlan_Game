import { supabase } from './supabase.ts';

/**
 * Contador de jugadores del menú ("+50 jugadores").
 * El número sale de la función SQL `player_count()` (cuentas que ya jugaron al menos un duelo),
 * redondeado hacia abajo a una cifra bonita. Se guarda unas horas en el navegador para no
 * preguntarle a Supabase cada vez que abres el menú.
 */
export const PLAYER_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const KEY = 'cartas.jugadores.v1';
const TTL = 3 * 60 * 60 * 1000;   // 3 horas

/** Redondea hacia abajo a la cifra bonita más cercana; con menos de 10 da 0. */
export function playerMilestone(n: number): number {
  let best = 0;
  for (const m of PLAYER_MILESTONES) if (m <= n) best = m;
  return best;
}

/** Texto para el menú, o null si todavía son menos de 10. */
export function playersLabel(n: number): string | null {
  const m = playerMilestone(n);
  return m > 0 ? `+${m.toLocaleString('es-MX')} jugadores` : null;
}

interface Cached { n: number; t: number }
function readCache(): Cached | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Cached | null;
    return c && typeof c.n === 'number' && typeof c.t === 'number' ? c : null;
  } catch { return null; }
}

/** El último número conocido (aunque esté viejito), para pintarlo al instante. */
export function cachedPlayerCount(): number | null {
  return readCache()?.n ?? null;
}

/** Pide el número a Supabase si el guardado ya tiene más de 3 horas. Sin internet o sin nube: null. */
export async function fetchPlayerCount(force = false): Promise<number | null> {
  if (!supabase) return null;
  const c = readCache();
  if (c && !force && Date.now() - c.t < TTL) return c.n;
  try {
    const { data, error } = await supabase.rpc('player_count');
    if (error || typeof data !== 'number') return c?.n ?? null;
    try { localStorage.setItem(KEY, JSON.stringify({ n: data, t: Date.now() })); } catch { /* sin espacio: no pasa nada */ }
    return data;
  } catch {
    return c?.n ?? null;
  }
}
