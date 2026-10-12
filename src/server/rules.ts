import type { Intent } from '../core/DuelState.ts';
import { createRng } from '../core/rng.ts';
import { cardDb, fusionDb, DATA_VERSION } from '../data/index.ts';
import { rarityOf, type CardDef } from '../data/types.ts';
import { DUPLICATE_VALUE } from '../game/config.ts';
import { getDuelist, isUnlocked, type Duelist } from '../game/duelists.ts';
import { WIN_CACAO } from '../game/economy.ts';
import { validatePlayerDeck, type Profile } from '../game/profile.ts';
import { replayDuel } from '../game/replay.ts';
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
export function verifyDuel(input: { seed: number; deck: readonly number[]; duelistId: string; intents: unknown }): Check<{ won: boolean; turns: number }> {
  const duelist = getDuelist(input.duelistId);
  if (!duelist) return { ok: false, error: 'Ese duelista no existe' };
  if (!Array.isArray(input.intents)) return { ok: false, error: 'Faltan las jugadas' };
  if (input.intents.length > MAX_INTENTS) return { ok: false, error: 'Demasiadas jugadas' };
  const result = replayDuel({ seed: input.seed, playerDeck: input.deck, opponent: duelist, intents: input.intents as Intent[] }, cardDb, fusionDb);
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
