import type { Intent } from '../core/DuelState.ts';
import { createRng } from '../core/rng.ts';
import { cardDb, fusionDb, DATA_VERSION } from '../data/index.ts';
import { rarityOf, type CardDef } from '../data/types.ts';
import { DUPLICATE_VALUE } from '../game/config.ts';
import { getDuelist, isUnlocked, type Duelist } from '../game/duelists.ts';
import { WIN_CACAO } from '../game/economy.ts';
import { validatePlayerDeck, type Profile } from '../game/profile.ts';
import { replayDuel, replayPvp, pvpFirstPlayer, type PvpSetup } from '../game/replay.ts';
import type { PlayerIndex } from '../core/DuelState.ts';
import { checkAscend, checkLevelUp, clampLevel, type UpgradeCheck } from '../core/progression.ts';
import { rollRewards } from '../game/rewards.ts';

/**
 * Reglas que corre el SERVIDOR (Edge Functions de Supabase).
 * Es TypeScript normal: se prueba con vitest y luego `npm run build:server`
 * lo empaqueta en supabase/functions/_shared/game.js.
 */

export { DATA_VERSION };
export const MAX_INTENTS = 4000;

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

/** ¿Puede empezar este duelo? (rival existe, está desbloqueado y el mazo es suyo y válido) */
export function checkDuelStart(input: {
  duelistId: string;
  deck: readonly number[];
  collection: Record<string, number>;
  defeated: readonly string[];
}): Check<Duelist> {
  const duelist = getDuelist(input.duelistId);
  if (!duelist) return { ok: false, error: 'Ese duelista no existe' };
  if (!isUnlocked(duelist.id, input.defeated)) return { ok: false, error: 'Ese duelista todavía está bloqueado' };
  const fake: Profile = { version: 1, collection: input.collection, deck: [...input.deck], defeated: [...input.defeated], wins: 0, losses: 0 };
  const errors = validatePlayerDeck(fake, input.deck, cardDb);
  if (errors.length) return { ok: false, error: errors[0] };
  return { ok: true, value: duelist };
}

/** Semilla nueva de 32 bits (en el servidor viene de crypto). */
export function newSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 0xffffffff) >>> 0;
}

/** Vuelve a jugar el duelo. Devuelve si el jugador ganó de verdad. */
export function verifyDuel(input: { seed: number; deck: readonly number[]; duelistId: string; intents: unknown; levels?: Record<string, number> | null }): Check<{ won: boolean; turns: number }> {
  const duelist = getDuelist(input.duelistId);
  if (!duelist) return { ok: false, error: 'Ese duelista no existe' };
  if (!Array.isArray(input.intents)) return { ok: false, error: 'Faltan las jugadas' };
  if (input.intents.length > MAX_INTENTS) return { ok: false, error: 'Demasiadas jugadas' };
  const levels = cleanLevels(input.levels);
  const result = replayDuel({ seed: input.seed, playerDeck: input.deck, opponent: duelist, intents: input.intents as Intent[], levels }, cardDb, fusionDb);
  if (!result.ok) return result;
  if (result.winner === null) return { ok: false, error: 'El duelo no terminó' };
  return { ok: true, value: { won: result.winner === 0, turns: result.turns } };
}

export interface RewardPlan {
  cacao: number;
  jade: number;
  /** Cartas ganadas y cuánto valen si ya tienes 3 copias (la base de datos decide). */
  cards: { id: number; cacao: number; jade: number }[];
}

/** Premio por ganar. Usa una semilla derivada del duelo: el mismo duelo siempre da lo mismo. */
export function planRewards(duelistId: string, seed: number, firstWin: boolean): RewardPlan {
  const duelist = getDuelist(duelistId);
  if (!duelist) return { cacao: 0, jade: 0, cards: [] };
  const cards = rollRewards(duelist, firstWin, createRng((seed ^ 0x9e3779b9) >>> 0));
  return {
    cacao: WIN_CACAO[duelist.level],
    jade: 0,
    cards: cards.map(id => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id) as CardDef)] })),
  };
}

/** Niveles válidos (1-5) de las cartas de un mazo, como los guarda la base de datos. */
export function cleanLevels(raw: Record<string, number> | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [id, lv] of Object.entries(raw ?? {})) {
    const n = Number(id);
    if (Number.isInteger(n) && cardDb.tryGet(n)) out[n] = clampLevel(Number(lv));
  }
  return out;
}

/** Niveles de las cartas del mazo (para guardarlos con el duelo). */
export function deckLevels(deck: readonly number[], levels: Record<string, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const id of new Set(deck)) {
    const lv = clampLevel(levels[id]);
    if (lv > 1) out[id] = lv;
  }
  return out;
}

/** Ascender: devuelve el id de la carta resultado. */
export function planAscend(cardId: number, haveBase: number, haveResult: (id: number) => number): UpgradeCheck {
  const card = cardDb.tryGet(cardId);
  const result = card?.ascendsTo ? cardDb.tryGet(card.ascendsTo) : undefined;
  return checkAscend(card, result, haveBase, result ? haveResult(result.id) : 0);
}

/** Subir de nivel: devuelve el costo en cacao. */
export function planLevelUp(cardId: number, have: number, level: number, cacao: number): UpgradeCheck {
  return checkLevelUp(cardDb.tryGet(cardId), have, level, cacao);
}

export { trimDeckToCollection } from '../core/progression.ts';

// ---------------------------------------------------------------- multijugador

export const PVP_WIN_CACAO = 30;
export const PVP_DAILY_REWARDED_WINS = 5;        // victorias con premio por día
export const PVP_SAME_RIVAL_DAILY = 2;           // contra el mismo rival, por día (para que no se "farmeen")
export const PVP_TURN_TIMEOUT_MS = 120_000;      // si el rival no juega en 2 minutos, puedes reclamar la victoria
export { pvpFirstPlayer };

/** ¿Tu mazo activo sirve para una sala? (40 cartas tuyas). */
export function checkPvpDeck(deck: readonly number[], collection: Record<string, number>): Check<true> {
  const fake: Profile = { version: 1, collection, deck: [...deck], defeated: [], wins: 0, losses: 0 };
  const errors = validatePlayerDeck(fake, deck, cardDb);
  return errors.length ? { ok: false, error: errors[0] } : { ok: true, value: true };
}

/** Código de sala: 5 letras fáciles de dictar (sin O/0, I/1). */
export function roomCode(random: () => number = Math.random): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => abc[Math.floor(random() * abc.length)]).join('');
}

export interface PvpMatchData {
  seed: number;
  host_deck: number[]; guest_deck: number[];
  host_levels: Record<string, number> | null; guest_levels: Record<string, number> | null;
  intents: unknown[];
}

function setupOf(m: PvpMatchData): PvpSetup {
  return { seed: Number(m.seed), decks: [m.host_deck, m.guest_deck], levels: [cleanLevels(m.host_levels), cleanLevels(m.guest_levels)] };
}

/**
 * Revisa una jugada nueva de `player` (0 = anfitrión, 1 = invitado) repitiendo toda la partida.
 * Devuelve la lista nueva de jugadas y si alguien ganó.
 */
export function pvpMove(m: PvpMatchData, player: PlayerIndex, intent: unknown): Check<{ intents: unknown[]; winner: PlayerIndex | null; turnPlayer: PlayerIndex }> {
  if (!intent || typeof intent !== 'object') return { ok: false, error: 'Jugada inválida' };
  const it = intent as Intent;
  if (it.player !== player) return { ok: false, error: 'Esa jugada no es tuya' };
  if (m.intents.length >= MAX_INTENTS) return { ok: false, error: 'Demasiadas jugadas' };
  const all = [...m.intents, it] as Intent[];
  const r = replayPvp(setupOf(m), all, cardDb, fusionDb);
  if (!r.ok) return { ok: false, error: r.at === all.length - 1 ? r.error : 'La partida guardada no cuadra' };
  return { ok: true, value: { intents: all, winner: r.winner, turnPlayer: r.engine.state.turnPlayer } };
}

/** De quién es el turno ahora (para el tiempo límite). */
export function pvpTurnOf(m: PvpMatchData): PlayerIndex | null {
  const r = replayPvp(setupOf(m), m.intents as Intent[], cardDb, fusionDb);
  return r.ok && r.winner === null ? r.engine.state.turnPlayer : null;
}
