import type { Intent } from '../core/DuelState.ts';
import { createRng } from '../core/rng.ts';
import { cardDb, fusionDb, DATA_VERSION } from '../data/index.ts';
import { rarityOf, type CardDef } from '../data/types.ts';
import { DUPLICATE_VALUE } from '../game/config.ts';
import { getDuelist, isUnlocked, type Duelist } from '../game/duelists.ts';
import { WIN_CACAO, WIN_TICKETS } from '../game/economy.ts';
import { GOLD_TICKET_PRICE, GOLD_BUY_COUNTS, pickFeatured, ROULETTE_PRIZES, spinIndex } from '../game/roulette.ts';
import { rollShop, SHOP_REFRESH_TICKETS, shopDay, type ShopSlot } from '../game/cardShop.ts';
import { validatePlayerDeck, type Profile } from '../game/profile.ts';
import { replayDuel, replayPvp, pvpFirstPlayer, type PvpSetup } from '../game/replay.ts';
import type { PlayerIndex } from '../core/DuelState.ts';
import { checkAscend, checkLevelUp, clampLevel, type UpgradeCheck } from '../core/progression.ts';
import { rollRewards } from '../game/rewards.ts';
import { getPack, openPacks, PACK_COUNTS } from '../game/packs.ts';
import { CURRENCY_CODE, FIRST_PURCHASE_MULTIPLIER, getJadePackage, JADE_PACKAGES, newGiftCode, normalizeCode, isPlausibleCode, pickUrs, type Grant } from '../game/jadeStore.ts';
import { idMask, pvpSnapshotFor, unmaskIntent, type PvpSnapshot } from '../game/pvpView.ts';

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
  tickets: number;
  /** Cartas ganadas y cuánto valen si ya tienes 3 copias (la base de datos decide). */
  cards: { id: number; cacao: number; jade: number }[];
}

/** Premio por ganar. Usa una semilla derivada del duelo: el mismo duelo siempre da lo mismo. */
export function planRewards(duelistId: string, seed: number, firstWin: boolean): RewardPlan {
  const duelist = getDuelist(duelistId);
  if (!duelist) return { cacao: 0, jade: 0, tickets: 0, cards: [] };
  const cards = rollRewards(duelist, firstWin, createRng((seed ^ 0x9e3779b9) >>> 0));
  return {
    cacao: WIN_CACAO[duelist.level],
    jade: 0,
    tickets: WIN_TICKETS,
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
export function pvpMove(m: PvpMatchData, player: PlayerIndex, intent: unknown, masked = false): Check<{ intents: unknown[]; winner: PlayerIndex | null; turnPlayer: PlayerIndex }> {
  if (!intent || typeof intent !== 'object') return { ok: false, error: 'Jugada inválida' };
  // El navegador manda los números disfrazados que ve; aquí se traducen a los verdaderos
  const it = masked ? unmaskIntent(intent as Intent, idMask(Number(m.seed))) : intent as Intent;
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

// ---------------------------------------------------------------- sobres (tienda)

export { PACK_PITY, PACK_SIZE, START_JADE } from '../game/packs.ts';

export interface PackPlan {
  price: number;
  sinceUr: number;
  /** Cada sobre: sus cartas (con lo que valen si ya tienes 3) y si la UR vino por la garantía. */
  packs: { cards: { id: number; cacao: number; jade: number }[]; pity: boolean }[];
}

/** Qué sale al abrir `count` sobres. El servidor pone la semilla; el cobro lo hace la base de datos. */
export function planPacks(packId: string, count: number, seed: number, sinceUr: number): Check<PackPlan> {
  const pack = getPack(packId);
  if (!pack) return { ok: false, error: 'Ese sobre no existe' };
  if (!(PACK_COUNTS as readonly number[]).includes(count)) return { ok: false, error: 'Cantidad de sobres inválida' };
  const r = openPacks(pack, cardDb, createRng((seed ^ 0x5eb4ac) >>> 0), Math.max(0, Math.floor(sinceUr) || 0), count);
  return {
    ok: true,
    value: {
      price: pack.price * count,
      sinceUr: r.sinceUr,
      packs: r.packs.map(o => ({ pity: o.pity, cards: o.cards.map(id => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] })) })),
    },
  };
}

// ---------------------------------------------------------------- ruleta y mercado

export { GOLD_TICKET_PRICE, GOLD_BUY_COUNTS, ROULETTE_PRIZES, SHOP_REFRESH_TICKETS, shopDay };
export type { ShopSlot };

/** Una carta "a la vista" para la ruleta (distinta a la anterior). */
export function planFeatured(seed: number, previous?: number | null): number {
  return pickFeatured(cardDb, createRng((seed ^ 0xfea7) >>> 0), previous ?? undefined);
}

export interface SpinPlan {
  index: number;                       // gajo de la ruleta que salió
  prize: { kind: string; amount: number; card: number | null; cacao: number; jade: number };
  nextFeatured: number;
}

/** Un giro: qué premio sale y cuál será la siguiente carta a la vista. */
export function planSpin(seed: number, featured: number): Check<SpinPlan> {
  const card = cardDb.tryGet(featured);
  if (!card) return { ok: false, error: 'La carta a la vista ya no existe' };
  const rng = createRng((seed ^ 0x5b1e) >>> 0);
  const index = spinIndex(rng);
  const p = ROULETTE_PRIZES[index];
  const dup = DUPLICATE_VALUE[rarityOf(card)];
  return {
    ok: true,
    value: {
      index,
      prize: { kind: p.kind, amount: p.amount, card: p.kind === 'card' ? featured : null, cacao: p.kind === 'card' ? dup.cacao : 0, jade: p.kind === 'card' ? dup.jade : 0 },
      nextFeatured: pickFeatured(cardDb, rng, featured),
    },
  };
}

/** Las 6 cartas nuevas del mercado. */
export function planShop(seed: number): ShopSlot[] {
  return rollShop(cardDb, createRng((seed ^ 0x5409) >>> 0));
}

/**
 * Lo que ve `player` de la partida: la vista actual y, desde la jugada `since`, cada jugada con sus
 * eventos (para animarlas). Nunca incluye la mano del rival ni sus cartas boca abajo.
 */
export function pvpView(m: PvpMatchData, player: PlayerIndex, since: number): PvpSnapshot {
  return pvpSnapshotFor(setupOf(m), m.intents as Intent[], player, since, cardDb, fusionDb);
}

// ---------------------------------------------------------------- tienda de jade (dinero real)

export { CURRENCY_CODE, FIRST_PURCHASE_MULTIPLIER, JADE_PACKAGES, newGiftCode, normalizeCode, isPlausibleCode };

export interface GrantPlan {
  jade: number;
  gold: number;
  /** UR de regalo y lo que valen si ya tienes 3. */
  cards: { id: number; cacao: number; jade: number }[];
}

/** Paquete por id (precio en MXN). */
export function jadePackage(id: string): { id: string; name: string; price: number; jade: number; ur: number; gold: number } | null {
  const p = getJadePackage(id);
  return p ? { id: p.id, name: p.name, price: p.price, jade: p.jade, ur: p.ur, gold: p.gold } : null;
}

/** Qué UR entrega un paquete o código, según lo que ya tiene el jugador. */
export function planGrant(grant: Grant, seed: number, collection: Record<string, number>): GrantPlan {
  const ur = Math.max(0, Math.min(10, Math.floor(grant.ur) || 0));
  const ids = pickUrs(cardDb, id => collection[id] ?? 0, ur, createRng((seed ^ 0x7ade) >>> 0));
  return {
    jade: Math.max(0, Math.floor(grant.jade) || 0),
    gold: Math.max(0, Math.floor(grant.gold) || 0),
    cards: ids.map(id => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] })),
  };
}
