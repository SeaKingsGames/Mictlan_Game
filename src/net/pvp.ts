import type { Intent } from '../core/DuelState.ts';
import { DATA_VERSION } from '../data/index.ts';
import type { PvpStep, PvpView } from '../game/pvpView.ts';
import type { RemoteDuel, RemoteSnapshot } from '../html/DuelView.ts';
import { invoke } from './cloud.ts';
import { supabase } from './supabase.ts';

/**
 * Multijugador con código de sala. El navegador NUNCA recibe la semilla, el mazo del rival ni la
 * lista de jugadas: la Edge Function "pvp" repite la partida y le manda a cada quien su vista.
 * Para enterarse de que el rival jugó se escucha una "señal" (tabla pvp_signals) y, por si Realtime
 * se corta, se revisa cada pocos segundos.
 */

export const PVP_TIMEOUT_MS = 120_000;   // igual que en el servidor
const POLL_MS = 3000;

/** Lo que el navegador puede leer de una sala (sin secretos). */
export interface PvpMatch {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  host_name: string | null;
  guest_name: string | null;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  winner: 0 | 1 | null;
  rewards: { paid_to: string; cacao: number; limit: 'daily' | 'same_rival' | null } | null;
  last_move_at: string;
  move_count: number;
}
const PUBLIC_COLUMNS = 'id, code, host_id, guest_id, host_name, guest_name, status, winner, rewards, last_move_at, move_count';

function db() {
  if (!supabase) throw new Error('El multijugador necesita cuenta (Supabase)');
  return supabase;
}

export const createRoom = () => invoke<{ matchId: string; code: string }>('pvp', { action: 'create', dataVersion: DATA_VERSION });
export const joinRoom = (code: string) => invoke<{ matchId: string }>('pvp', { action: 'join', code, dataVersion: DATA_VERSION });
export const leaveRoom = (matchId: string) => invoke<{ ok: true }>('pvp', { action: 'leave', matchId });

export async function getMatch(matchId: string): Promise<PvpMatch> {
  const { data, error } = await db().from('pvp_matches').select(PUBLIC_COLUMNS).eq('id', matchId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Sala no encontrada');
  return data as unknown as PvpMatch;
}

export async function myUserId(): Promise<string> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('Sin sesión');
  return data.user.id;
}

/** Escucha los cambios de una sala (estado, cuántas jugadas van). Llama `cb` con la sala. */
export function watchMatch(matchId: string, cb: (m: PvpMatch) => void): () => void {
  let last = '';
  const emit = (m: PvpMatch) => {
    const key = `${m.status}|${m.move_count}|${m.rewards ? 1 : 0}|${m.guest_id ?? ''}`;
    if (key === last) return;
    last = key;
    cb(m);
  };
  const refresh = () => { getMatch(matchId).then(emit).catch(() => { /* reintenta luego */ }); };
  const channel = db().channel(`pvp-${matchId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_signals', filter: `match_id=eq.${matchId}` }, refresh)
    .subscribe();
  const timer = setInterval(refresh, POLL_MS);   // respaldo por si Realtime se corta (redes móviles, etc.)
  return () => { clearInterval(timer); void db().removeChannel(channel); };
}

interface ServerSnapshot {
  status: PvpMatch['status']; winner: 0 | 1 | null; lastMoveAt: number; index: number; me: 0 | 1;
  view?: PvpView; steps?: PvpStep[]; error?: string;
}
const toSnapshot = (s: ServerSnapshot): RemoteSnapshot => {
  if (!s.view) throw new Error(s.error ?? 'La sala todavía no empieza');
  return { view: s.view, steps: s.steps ?? [], index: s.index, lastMoveAt: s.lastMoveAt };
};

/** Une la sala con el tablero: el tablero no sabe nada de Supabase. */
export function remoteFor(matchId: string, me: 0 | 1): RemoteDuel {
  return {
    me,
    timeoutMs: PVP_TIMEOUT_MS,
    load: async () => toSnapshot(await invoke<ServerSnapshot>('pvp', { action: 'view', matchId, since: 1e9 })),
    since: async index => toSnapshot(await invoke<ServerSnapshot>('pvp', { action: 'view', matchId, since: index })),
    send: async (intent: Intent, index: number) => toSnapshot(await invoke<ServerSnapshot>('pvp', { action: 'move', matchId, index, intent })),
    watch: cb => watchMatch(matchId, m => cb(m.move_count, Date.parse(m.last_move_at))),
    claim: async () => { await invoke('pvp', { action: 'claim', matchId }); },
  };
}

/** Espera a que la sala tenga el resultado guardado (premio incluido). */
export async function waitForResult(matchId: string, tries = 20): Promise<PvpMatch> {
  for (let i = 0; i < tries; i++) {
    const m = await getMatch(matchId);
    if (m.status === 'finished' && m.rewards) return m;
    await new Promise(r => setTimeout(r, 1000));
  }
  return getMatch(matchId);
}
