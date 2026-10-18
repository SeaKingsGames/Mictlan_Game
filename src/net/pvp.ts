import type { Intent } from '../core/DuelState.ts';
import { cardDb, DATA_VERSION, fusionDb } from '../data/index.ts';
import { createPvpDuel } from '../game/replay.ts';
import type { RemoteDuel } from '../html/DuelView.ts';
import { invoke } from './cloud.ts';
import { supabase } from './supabase.ts';

/**
 * Multijugador con código de sala. El servidor (Edge Function "pvp") revisa cada jugada;
 * aquí solo se llama y se escuchan los cambios de la sala (Realtime + revisión cada pocos segundos).
 */

export const PVP_TIMEOUT_MS = 120_000;   // igual que en el servidor
const POLL_MS = 3000;

export interface PvpMatch {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  host_name: string | null;
  guest_name: string | null;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  seed: number | null;
  host_deck: number[];
  guest_deck: number[] | null;
  host_levels: Record<string, number> | null;
  guest_levels: Record<string, number> | null;
  intents: Intent[];
  winner: 0 | 1 | null;
  rewards: { paid_to: string; cacao: number; limit: 'daily' | 'same_rival' | null } | null;
  last_move_at: string;
}

function db() {
  if (!supabase) throw new Error('El multijugador necesita cuenta (Supabase)');
  return supabase;
}

export const createRoom = () => invoke<{ matchId: string; code: string }>('pvp', { action: 'create', dataVersion: DATA_VERSION });
export const joinRoom = (code: string) => invoke<{ matchId: string }>('pvp', { action: 'join', code, dataVersion: DATA_VERSION });
export const leaveRoom = (matchId: string) => invoke<{ ok: true }>('pvp', { action: 'leave', matchId });

export async function getMatch(matchId: string): Promise<PvpMatch> {
  const { data, error } = await db().from('pvp_matches').select('*').eq('id', matchId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Sala no encontrada');
  return data as PvpMatch;
}

export async function myUserId(): Promise<string> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('Sin sesión');
  return data.user.id;
}

/** Escucha los cambios de una sala. Llama `cb` con la sala completa. */
export function watchMatch(matchId: string, cb: (m: PvpMatch) => void): () => void {
  let last = '';
  const emit = (m: PvpMatch) => {
    const key = `${m.status}|${m.intents?.length}|${m.rewards ? 1 : 0}|${m.guest_id ?? ''}`;
    if (key === last) return;
    last = key;
    cb(m);
  };
  const channel = db().channel(`pvp-${matchId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pvp_matches', filter: `id=eq.${matchId}` },
      payload => emit(payload.new as PvpMatch))
    .subscribe();
  // Respaldo por si Realtime se corta (redes móviles, etc.)
  const timer = setInterval(() => { getMatch(matchId).then(emit).catch(() => { /* reintenta luego */ }); }, POLL_MS);
  return () => { clearInterval(timer); void db().removeChannel(channel); };
}

/** Une la sala con el tablero: el tablero no sabe nada de Supabase. */
export function remoteFor(match: PvpMatch, me: 0 | 1): RemoteDuel {
  const setup = {
    seed: Number(match.seed),
    decks: [match.host_deck, match.guest_deck ?? []] as [number[], number[]],
    levels: [match.host_levels ?? {}, match.guest_levels ?? {}] as [Record<number, number>, Record<number, number>],
  };
  return {
    me,
    timeoutMs: PVP_TIMEOUT_MS,
    createEngine: () => createPvpDuel(setup, cardDb, fusionDb),
    send: async (intent, index) => { await invoke('pvp', { action: 'move', matchId: match.id, index, intent }); },
    fetch: async () => {
      const m = await getMatch(match.id);
      return { intents: m.intents ?? [], lastMoveAt: Date.parse(m.last_move_at) };
    },
    watch: cb => watchMatch(match.id, m => cb(m.intents ?? [], Date.parse(m.last_move_at))),
    claim: async () => { await invoke('pvp', { action: 'claim', matchId: match.id }); },
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
