import type { Rng } from '../core/rng.ts';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { RARITIES, rarityOf, type CardDef, type CardRarity } from '../data/types.ts';
import { packs } from './packs.ts';

/**
 * Mercado de cartas: 6 cartas al azar que se compran con cacao (cada una una sola vez).
 * Se renueva GRATIS cada día; si quieres otras antes, cuesta 25 tickets estándar.
 * La UR no siempre aparece: cada lugar tiene 3% de ser UR.
 */
export const SHOP_SLOTS = 6;
export const SHOP_ODDS: Record<CardRarity, number> = { N: 50, R: 33, SR: 14, UR: 3 };
export const SHOP_PRICES: Record<CardRarity, number> = { N: 300, R: 800, SR: 2000, UR: 10000 };
export const SHOP_REFRESH_TICKETS = 25;

export interface ShopSlot { card: number; price: number; sold: boolean }

/** Cartas que se pueden vender: todas menos las de ascensión y las que ningún sobre trae a propósito (las 5 cimas). */
export function shopPool(db: CardDatabase): Record<CardRarity, CardDef[]> {
  const ascensionOnly = new Set(db.all().map(c => c.ascendsTo).filter((x): x is number => !!x));
  const banned = new Set(packs.length ? packs.map(p => p.exclude).reduce((a, b) => a.filter(x => b.includes(x))) : []);
  const pool: Record<CardRarity, CardDef[]> = { N: [], R: [], SR: [], UR: [] };
  for (const c of db.all()) if (!ascensionOnly.has(c.id) && !banned.has(c.id)) pool[rarityOf(c)].push(c);
  return pool;
}

function rollRarity(rng: Rng): CardRarity {
  let x = rng() * 100;
  for (const r of [...RARITIES].reverse()) {
    x -= SHOP_ODDS[r];
    if (x < 0) return r;
  }
  return 'N';
}

/** 6 cartas distintas (si alcanzan), de la menos rara a la más rara. */
export function rollShop(db: CardDatabase, rng: Rng): ShopSlot[] {
  const pool = shopPool(db);
  const chosen: CardDef[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    let r = rollRarity(rng);
    while (!pool[r].length && r !== 'N') r = RARITIES[RARITIES.indexOf(r) - 1];
    const options = pool[r].filter(c => !chosen.includes(c));
    const list = options.length ? options : pool[r];
    if (!list.length) continue;
    chosen.push(list[Math.floor(rng() * list.length)]);
  }
  return chosen
    .sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)) || a.id - b.id)
    .map(c => ({ card: c.id, price: SHOP_PRICES[rarityOf(c)], sold: false }));
}

/** Día del mercado (hora del centro de México, UTC−6): cambia a medianoche. */
export function shopDay(now: number = Date.now()): string {
  return new Date(now - 6 * 3600_000).toISOString().slice(0, 10);
}

/** Milisegundos para la siguiente renovación gratis. */
export function msToNextDay(now: number = Date.now()): number {
  const shifted = now - 6 * 3600_000;
  return 86_400_000 - (shifted % 86_400_000);
}
