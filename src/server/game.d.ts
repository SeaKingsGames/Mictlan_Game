// Tipos de supabase/functions/_shared/game.js (lo copia 'npm run build:server'). Refleja src/server/rules.ts.
export type Check<T> = { ok: true; value: T } | { ok: false; error: string };
export interface Duelist { id: string; name: string; level: 1 | 2 | 3; signature: number }
export interface RewardPlan { cacao: number; jade: number; cards: { id: number; cacao: number; jade: number }[] }
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
