import type { Rng } from '../core/rng.ts';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { rarityOf, type CardDef } from '../data/types.ts';
import { packs } from './packs.ts';

/**
 * Ruleta de premios: cada giro gasta 1 TICKET ORO (se compra con 3000 de cacao).
 * Uno de los premios es una carta R o SR que se ve antes de girar ("carta a la vista");
 * después de cada giro sale otra carta a la vista.
 */
export const GOLD_TICKET_PRICE = 3000;   // cacao
export const GOLD_BUY_COUNTS = [1, 5] as const;

export type PrizeKind = 'cacao' | 'jade' | 'tickets' | 'gold' | 'card';
export interface Prize {
  id: string;
  kind: PrizeKind;
  amount: number;       // para 'card' es 1
  weight: number;       // probabilidad relativa (suman 100)
  label: string;
  color: string;        // color del gajo de la ruleta
}

export const ROULETTE_PRIZES: readonly Prize[] = [
  { id: 'cacao1000', kind: 'cacao', amount: 1000, weight: 26, label: '1000 cacao', color: '#8a5a26' },
  { id: 'jade50', kind: 'jade', amount: 50, weight: 18, label: '50 jade', color: '#2f8a66' },
  { id: 'tickets25', kind: 'tickets', amount: 25, weight: 16, label: '25 tickets', color: '#3a5f9a' },
  { id: 'cacao1500', kind: 'cacao', amount: 1500, weight: 14, label: '1500 cacao', color: '#b8702a' },
  { id: 'jade100', kind: 'jade', amount: 100, weight: 8, label: '100 jade', color: '#1fae7a' },
  { id: 'tickets50', kind: 'tickets', amount: 50, weight: 8, label: '50 tickets', color: '#4f7fd0' },
  { id: 'gold', kind: 'gold', amount: 1, weight: 6, label: 'Ticket oro', color: '#d9a21b' },
  { id: 'card', kind: 'card', amount: 1, weight: 4, label: 'La carta', color: '#7b2fd6' },
];

/** Cartas que pueden ser "la carta a la vista": R y SR que salen en sobres (nunca las de ascensión ni las 5 cimas). */
export function featuredPool(db: CardDatabase): CardDef[] {
  const ascensionOnly = new Set(db.all().map(c => c.ascendsTo).filter((x): x is number => !!x));
  const banned = new Set(packs.length ? packs.map(p => p.exclude).reduce((a, b) => a.filter(x => b.includes(x))) : []);
  return db.all().filter(c => (rarityOf(c) === 'R' || rarityOf(c) === 'SR') && !ascensionOnly.has(c.id) && !banned.has(c.id));
}

export function pickFeatured(db: CardDatabase, rng: Rng, avoid?: number): number {
  const pool = featuredPool(db).filter(c => c.id !== avoid);
  const list = pool.length ? pool : featuredPool(db);
  return list[Math.floor(rng() * list.length)].id;
}

/** Índice del premio que sale (según los pesos). */
export function spinIndex(rng: Rng): number {
  const total = ROULETTE_PRIZES.reduce((n, p) => n + p.weight, 0);
  let x = rng() * total;
  for (let i = 0; i < ROULETTE_PRIZES.length; i++) {
    x -= ROULETTE_PRIZES[i].weight;
    if (x < 0) return i;
  }
  return 0;
}
