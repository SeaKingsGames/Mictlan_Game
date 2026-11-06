// Multijugador con código de sala. POST { action, ... }
//   create { dataVersion }             → { matchId, code }
//   join   { code, dataVersion }       → { matchId }
//   view   { matchId, since }          → tu VISTA de la partida + las jugadas desde `since` (para animarlas)
//   move   { matchId, index, intent }  → igual que view, después de tu jugada   (index = cuántas jugadas había)
//   claim  { matchId }                 → reclamar victoria si el rival lleva 2 min sin jugar
//   leave  { matchId }                 → cancelar sala (si nadie entró) o rendirse
import {
  checkPvpDeck, DATA_VERSION, deckLevels, PVP_DAILY_REWARDED_WINS, PVP_SAME_RIVAL_DAILY, PVP_TURN_TIMEOUT_MS,
  PVP_WIN_CACAO, pvpMove, pvpProgress, pvpTurnOf, pvpView, roomCode, type PvpMatchData,
} from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import { recordProgress } from '../_shared/progress.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  const action = String(body.action ?? '');

  if (action === 'create' || action === 'join') {
    if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);
    const mine = await myDeck(db, user.id);
    if (!mine.ok) return json({ error: mine.error }, 400);

    if (action === 'create') {
      // Cierra salas viejas tuyas que nadie usó
      await db.from('pvp_matches').update({ status: 'cancelled' }).eq('host_id', user.id).eq('status', 'waiting');
      for (let i = 0; i < 5; i++) {
        const { data, error } = await db.from('pvp_matches').insert({
          code: roomCode(), host_id: user.id, host_name: mine.name, host_deck: mine.deck, host_levels: mine.levels, data_version: DATA_VERSION,
        }).select('id, code').single();
        if (!error) return json({ matchId: data.id, code: data.code });
        if (!String(error.message).includes('duplicate')) throw error;
      }
      return json({ error: 'No se pudo crear la sala, intenta otra vez' }, 503);
    }

    const code = String(body.code ?? '').trim().toUpperCase();
    const { data: m } = await db.from('pvp_matches').select('*').eq('code', code).eq('status', 'waiting').maybeSingle();
    if (!m) return json({ error: 'No hay ninguna sala abierta con ese código' }, 404);
    if (m.host_id === user.id) return json({ error: 'No puedes entrar a tu propia sala' }, 400);
    if (m.data_version !== DATA_VERSION) return json({ error: 'Tu rival tiene otra versión del juego. Recarguen los dos.' }, 409);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const { data: joined, error } = await db.from('pvp_matches')
      .update({ guest_id: user.id, guest_name: mine.name, guest_deck: mine.deck, guest_levels: mine.levels, seed, status: 'playing', last_move_at: new Date().toISOString() })
      .eq('id', m.id).eq('status', 'waiting').select('id').maybeSingle();
    if (error) throw error;
    if (!joined) return json({ error: 'Alguien más entró primero a esa sala' }, 409);
    return json({ matchId: m.id });
  }

  // --- acciones sobre una sala existente
  const { data: m, error } = await db.from('pvp_matches').select('*').eq('id', String(body.matchId ?? '')).maybeSingle();
  if (error) throw error;
  if (!m || (m.host_id !== user.id && m.guest_id !== user.id)) return json({ error: 'Sala no encontrada' }, 404);
  const me = m.host_id === user.id ? 0 : 1;

  if (action === 'leave') {
    if (m.status === 'waiting') {
      await db.from('pvp_matches').update({ status: 'cancelled' }).eq('id', m.id).eq('status', 'waiting');
      return json({ ok: true });
    }
    if (m.status !== 'playing') return json({ ok: true });
    return await applyMove(db, m, me, me, { type: 'surrender', player: me }, false);
  }

  if (action === 'view') {
    return json(snapshot(m, me, Number(body.since ?? m.intents.length)));
  }

  if (action === 'move') {
    if (m.status !== 'playing') return json({ error: 'La partida ya terminó', code: 'finished' }, 409);
    if (Number(body.index) !== m.intents.length) return json({ error: 'La partida cambió, sincronizando…', code: 'conflict' }, 409);
    return await applyMove(db, m, me, me, body.intent, true);
  }

  if (action === 'claim') {
    if (m.status !== 'playing') return json({ error: 'La partida ya terminó', code: 'finished' }, 409);
    const turn = pvpTurnOf(m as PvpMatchData);
    const idle = Date.now() - new Date(m.last_move_at).getTime();
    if (turn === null || turn === me) return json({ error: 'Es tu turno' }, 400);
    if (idle < PVP_TURN_TIMEOUT_MS) return json({ error: `Espera ${Math.ceil((PVP_TURN_TIMEOUT_MS - idle) / 1000)} s más` }, 400);
    return await applyMove(db, m, turn, me, { type: 'surrender', player: turn }, false);   // el que no jugó se rinde
  }

  return json({ error: 'Acción desconocida' }, 400);
}));

type Match = PvpMatchData & { id: string; host_id: string; intents: unknown[]; status: string; winner: 0 | 1 | null; rewards: unknown; last_move_at: string; guest_id: string | null };

/** Lo que ve `viewer`: nunca la mano del rival, sus cartas boca abajo ni la semilla. */
function snapshot(m: Match, viewer: 0 | 1, since: number) {
  const base = { status: m.status, winner: m.winner, rewards: m.rewards, lastMoveAt: Date.parse(m.last_move_at), me: viewer, index: m.intents.length };
  if (m.status === 'waiting' || m.status === 'cancelled' || !m.guest_id) return base;
  const v = pvpView(m, viewer, since);
  if (!v.ok) return { ...base, error: 'La partida guardada no cuadra' };
  return { ...base, view: v.view, steps: v.steps, index: v.index };
}

/** Revisa la jugada repitiendo la partida, la guarda (si nadie jugó antes) y paga si terminó. */
async function applyMove(db: SupabaseClient, m: Match, player: 0 | 1, viewer: 0 | 1, intent: unknown, masked: boolean): Promise<Response> {
  const r = pvpMove(m, player, intent, masked);
  if (!r.ok) return json({ error: r.error, code: 'rejected' }, 422);
  const { data: saved, error } = await db.rpc('pvp_append', {
    p_match: m.id, p_expected: m.intents.length, p_intents: r.value.intents, p_winner: r.value.winner,
  });
  if (error) throw error;
  if (!saved) return json({ error: 'La partida cambió, sincronizando…', code: 'conflict' }, 409);
  let rewards = null;
  if (r.value.winner !== null) {
    const { data, error: sErr } = await db.rpc('settle_pvp', {
      p_match: m.id, p_cacao: PVP_WIN_CACAO, p_daily: PVP_DAILY_REWARDED_WINS, p_same_rival: PVP_SAME_RIVAL_DAILY,
    });
    if (sErr) throw sErr;
    rewards = data;
    // Misiones de los dos jugadores
    const [hostP, guestP] = pvpProgress({ ...m, intents: r.value.intents } as PvpMatchData);
    await Promise.all([recordProgress(db, m.host_id, hostP), recordProgress(db, m.guest_id, guestP)]);
  }
  const after: Match = {
    ...m, intents: r.value.intents, winner: r.value.winner, rewards,
    status: r.value.winner === null ? m.status : 'finished', last_move_at: new Date().toISOString(),
  };
  return json({ ok: true, ...snapshot(after, viewer, m.intents.length) });
}

/** Tu mazo activo, revisado, con tus niveles y tu nombre. */
async function myDeck(db: SupabaseClient, userId: string) {
  const [deckRes, collRes, profRes] = await Promise.all([
    db.from('decks').select('cards').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    db.from('collection').select('card_id, count, level').eq('user_id', userId),
    db.from('profiles').select('username').eq('id', userId).single(),
  ]);
  if (deckRes.error || collRes.error || profRes.error) throw deckRes.error ?? collRes.error ?? profRes.error;
  const deck: number[] = deckRes.data?.cards ?? [];
  const collection: Record<string, number> = {};
  const levels: Record<string, number> = {};
  for (const r of collRes.data ?? []) { collection[r.card_id] = r.count; levels[r.card_id] = r.level; }
  const check = checkPvpDeck(deck, collection);
  if (!check.ok) return { ok: false as const, error: `Tu mazo no está listo: ${check.error}` };
  return { ok: true as const, deck, levels: deckLevels(deck, levels), name: profRes.data?.username ?? 'Jugador' };
}
