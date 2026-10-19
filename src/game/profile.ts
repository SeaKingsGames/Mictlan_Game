import starterJson from '../data/starter.json';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { DECK_SIZE, MAX_COPIES, type CardDef } from '../data/types.ts';
import { ASCEND_COPIES, checkAscend, checkLevelUp, clampLevel, trimDeckToCollection } from '../core/progression.ts';

/**
 * Progreso del jugador: colección, mazo y campaña. Se guarda en el navegador
 * (más adelante en Supabase, para jugar desde cualquier dispositivo).
 */
export interface Profile {
  version: 1;
  collection: Record<string, number>;   // id de carta → copias que tienes
  deck: number[];                        // tu mazo (40 IDs)
  defeated: string[];                    // duelistas que ya venciste
  wins: number;
  losses: number;
  /** Solo con cuenta en la nube (Supabase). En modo local no existe. */
  account?: Account;
  /** Nivel de cada carta (id → 1-5). Si no aparece, es nivel 1. */
  levels?: Record<string, number>;
  /** Sobres seguidos sin UR (a los 10, UR segura). */
  packsSinceUr?: number;
  /** Solo modo local: ruleta y mercado (en la nube viven en Supabase). */
  market?: { featured: number; shop: { slots: { card: number; price: number; sold: boolean }[]; day: string } };
}

export interface Account {
  username: string | null;
  email: string | null;
  guest: boolean;
  cacao: number;
  jade: number;
  tickets: number;
  gold: number;
}

const KEY = 'cartas.perfil.v1';

export function newProfile(): Profile {
  const cards = (starterJson as { cards: number[] }).cards;
  const collection: Record<string, number> = {};
  for (const id of cards) collection[id] = (collection[id] ?? 0) + 1;
  return { version: 1, collection, deck: [...cards], defeated: [], wins: 0, losses: 0 };
}

export function loadProfile(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Profile {
  try {
    const raw = storage?.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      if (p.version === 1 && p.collection && Array.isArray(p.deck)) return p;
    }
  } catch { /* perfil dañado: empezar de nuevo */ }
  return newProfile();
}

export function saveProfile(p: Profile, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try { storage?.setItem(KEY, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
}

export function resetProfile(storage: Pick<Storage, 'removeItem'> | null = safeStorage()): Profile {
  try { storage?.removeItem(KEY); } catch { /* nada */ }
  return newProfile();
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export const owned = (p: Profile, cardId: number): number => p.collection[cardId] ?? 0;

export const levelOf = (p: Profile, cardId: number): number => clampLevel(p.levels?.[cardId]);

/** Niveles de las cartas de un mazo (lo que necesita el motor del duelo). */
export function levelsForDeck(p: Profile, deck: readonly number[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const id of new Set(deck)) { const lv = levelOf(p, id); if (lv > 1) out[id] = lv; }
  return out;
}

/** Modo local: ascender (3 copias → 1 de la carta resultado). Devuelve el error o null. */
export function ascendLocal(p: Profile, card: CardDef, db: CardDatabase): string | null {
  const result = card.ascendsTo ? db.tryGet(card.ascendsTo) : undefined;
  const check = checkAscend(card, result, owned(p, card.id), result ? owned(p, result.id) : 0);
  if (!check.ok) return check.error;
  p.collection[card.id] = owned(p, card.id) - ASCEND_COPIES;
  if (p.collection[card.id] <= 0) delete p.collection[card.id];
  p.collection[result!.id] = owned(p, result!.id) + 1;
  p.deck = trimDeckToCollection(p.deck, id => owned(p, id));
  return null;
}

/** Modo local: subir de nivel (sin cacao en modo local, es gratis para probar). */
export function levelUpLocal(p: Profile, card: CardDef): string | null {
  const check = checkLevelUp(card, owned(p, card.id), levelOf(p, card.id), Number.MAX_SAFE_INTEGER);
  if (!check.ok) return check.error;
  p.levels = { ...p.levels, [card.id]: levelOf(p, card.id) + 1 };
  return null;
}

export const countIn = (list: readonly number[], cardId: number): number => list.filter(x => x === cardId).length;

export function addCards(p: Profile, ids: readonly number[]): void {
  for (const id of ids) p.collection[id] = owned(p, id) + 1;
}

export function totalOwned(p: Profile): number {
  return Object.values(p.collection).reduce((a, b) => a + b, 0);
}

/** Problemas del mazo (vacío = se puede jugar). */
export function validatePlayerDeck(p: Profile, deck: readonly number[], db: CardDatabase): string[] {
  const errors: string[] = [];
  if (deck.length !== DECK_SIZE) errors.push(`El mazo debe tener ${DECK_SIZE} cartas (tiene ${deck.length})`);
  for (const id of new Set(deck)) {
    const card = db.tryGet(id);
    const n = countIn(deck, id);
    if (!card) { errors.push(`La carta ${id} no existe`); continue; }
    if (n > MAX_COPIES) errors.push(`Máximo ${MAX_COPIES} copias de ${card.name}`);
    if (n > owned(p, id)) errors.push(`Solo tienes ${owned(p, id)} de ${card.name}`);
  }
  return errors;
}
