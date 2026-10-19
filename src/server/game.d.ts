// Tipos de supabase/functions/_shared/game.js (lo copia 'npm run build:server'). Refleja src/server/rules.ts.
export type Check<T> = { ok: true; value: T } | { ok: false; error: string };
export interface Duelist { id: string; name: string; level: 1 | 2 | 3; signature: number }
export interface RewardPlan { cacao: number; jade: number; tickets: number; cards: { id: number; cacao: number; jade: number }[] }
export declare const DATA_VERSION: string;
export declare const MAX_INTENTS: number;
export declare function checkDuelStart(input: { duelistId: string; deck: readonly number[]; collection: Record<string, number>; defeated: readonly string[] }): Check<Duelist>;
export declare function newSeed(random?: () => number): number;
export declare function verifyDuel(input: { seed: number; deck: readonly number[]; duelistId: string; intents: unknown; levels?: Record<string, number> | null }): Check<{ won: boolean; turns: number }>;
export declare function planRewards(duelistId: string, seed: number, firstWin: boolean): RewardPlan;
export type UpgradeCheck = { ok: true; cost: number; result?: number } | { ok: false; error: string };
export declare function cleanLevels(raw: Record<string, number> | null | undefined): Record<number, number>;
export declare function deckLevels(deck: readonly number[], levels: Record<string, number>): Record<number, number>;
export declare function planAscend(cardId: number, haveBase: number, haveResult: (id: number) => number): UpgradeCheck;
export declare function planLevelUp(cardId: number, have: number, level: number, cacao: number): UpgradeCheck;
export declare function trimDeckToCollection(deck: readonly number[], owned: (id: number) => number): number[];
export declare const PVP_WIN_CACAO: number;
export declare const PVP_DAILY_REWARDED_WINS: number;
export declare const PVP_SAME_RIVAL_DAILY: number;
export declare const PVP_TURN_TIMEOUT_MS: number;
export interface PvpMatchData {
  seed: number; host_deck: number[]; guest_deck: number[];
  host_levels: Record<string, number> | null; guest_levels: Record<string, number> | null; intents: unknown[];
}
export declare function checkPvpDeck(deck: readonly number[], collection: Record<string, number>): Check<true>;
export declare function roomCode(random?: () => number): string;
export declare function pvpMove(m: PvpMatchData, player: 0 | 1, intent: unknown, masked?: boolean): Check<{ intents: unknown[]; winner: 0 | 1 | null; turnPlayer: 0 | 1 }>;
export declare function pvpTurnOf(m: PvpMatchData): 0 | 1 | null;
export declare const PACK_PITY: number;
export declare const PACK_SIZE: number;
export declare const START_JADE: number;
export interface PackPlan { price: number; sinceUr: number; packs: { cards: { id: number; cacao: number; jade: number }[]; pity: boolean }[] }
export declare function planPacks(packId: string, count: number, seed: number, sinceUr: number): Check<PackPlan>;
export declare const GOLD_TICKET_PRICE: number;
export declare const GOLD_BUY_COUNTS: readonly number[];
export declare const SHOP_REFRESH_TICKETS: number;
export declare const ROULETTE_PRIZES: readonly { id: string; kind: string; amount: number; weight: number; label: string; color: string }[];
export declare function shopDay(now?: number): string;
export interface ShopSlot { card: number; price: number; sold: boolean }
export interface SpinPlan { index: number; prize: { kind: string; amount: number; card: number | null; cacao: number; jade: number }; nextFeatured: number }
export declare function planFeatured(seed: number, previous?: number | null): number;
export declare function planSpin(seed: number, featured: number): Check<SpinPlan>;
export declare function planShop(seed: number): ShopSlot[];
export type PvpSnapshot = { ok: true; view: unknown; steps: { events: unknown[]; view: unknown }[]; index: number } | { ok: false; error: string; at: number };
export declare function pvpView(m: PvpMatchData, player: 0 | 1, since: number): PvpSnapshot;
