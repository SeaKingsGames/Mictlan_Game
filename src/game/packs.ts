import packsJson from '../data/packs.json';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { RARITIES, rarityOf, type CardAttribute, type CardDef, type CardRarity, type CardTag } from '../data/types.ts';
import type { Rng } from '../core/rng.ts';

/**
 * Sobres de la tienda. Cada sobre es temático: en vez de una lista fija de cartas usa un FILTRO
 * (etiquetas y atributos), así las cartas nuevas que agregues en el editor entran solas.
 *   - monsters: monstruos con alguna de esas etiquetas O alguno de esos atributos
 *   - support:  mágicas, equipos y trampas de esos atributos
 *   - include / exclude: ids que quieres meter o sacar a mano (las 5 cimas 96-100 están fuera: solo por fusión)
 * Las cartas que solo salen por ASCENSIÓN nunca vienen en sobres.
 */
export interface PackDef {
  id: string;
  name: string;
  glyph: string;
  color: string;
  description: string;
  price: number;                       // en jade
  monsters: { tags: CardTag[]; attributes: CardAttribute[] };
  support: CardAttribute[];
  include: number[];
  exclude: number[];
}

export const packs: readonly PackDef[] = packsJson as PackDef[];
export const getPack = (id: string): PackDef | undefined => packs.find(p => p.id === id);

export const PACK_SIZE = 5;
/** Probabilidad de cada carta del sobre (en %). */
export const PACK_ODDS: Record<CardRarity, number> = { N: 60, R: 28, SR: 10, UR: 2 };
/** Si abres este número de sobres seguidos sin UR, el último trae una UR segura. */
export const PACK_PITY = 10;
/** Jade con el que empieza una cuenta nueva (= 2 sobres de 150). */
export const START_JADE = 300;
/** Se pueden abrir de 1 en 1 o de 10 en 10. */
export const PACK_COUNTS = [1, 10] as const;

/** Cartas que pueden salir en un sobre, agrupadas por rareza. */
export function packPool(pack: PackDef, db: CardDatabase): Record<CardRarity, CardDef[]> {
  const ascensionOnly = new Set(db.all().map(c => c.ascendsTo).filter((x): x is number => !!x));
  const pool: Record<CardRarity, CardDef[]> = { N: [], R: [], SR: [], UR: [] };
  for (const c of db.all()) {
    if (ascensionOnly.has(c.id) || pack.exclude.includes(c.id)) continue;
    const fits = pack.include.includes(c.id) || (c.type === 'monster'
      ? c.tags.some(t => pack.monsters.tags.includes(t)) || pack.monsters.attributes.includes(c.attribute)
      : pack.support.includes(c.attribute));
    if (fits) pool[rarityOf(c)].push(c);
  }
  return pool;
}

/** Probabilidad real por rareza de un sobre (si no tiene cartas de una rareza, su parte pasa a la rareza de abajo). */
export function packOdds(pool: Record<CardRarity, CardDef[]>): Record<CardRarity, number> {
  const out: Record<CardRarity, number> = { N: 0, R: 0, SR: 0, UR: 0 };
  for (const r of RARITIES) {
    const target = fallbackRarity(pool, r);
    if (target) out[target] += PACK_ODDS[r];
  }
  return out;
}

function fallbackRarity(pool: Record<CardRarity, CardDef[]>, wanted: CardRarity): CardRarity | null {
  const order = [...RARITIES];
  for (let i = order.indexOf(wanted); i >= 0; i--) if (pool[order[i]].length) return order[i];
  for (const r of order) if (pool[r].length) return r;
  return null;
}

function rollRarity(rng: Rng): CardRarity {
  let x = rng() * 100;
  for (const r of [...RARITIES].reverse()) {
    x -= PACK_ODDS[r];
    if (x < 0) return r;
  }
  return 'N';
}

export interface PackOpening {
  cards: number[];      // de la menos rara a la más rara (para revelarlas en ese orden)
  sinceUr: number;      // sobres seguidos sin UR después de este
  pity: boolean;        // la UR vino por la garantía
}

/**
 * Abre UN sobre. `sinceUr` = sobres seguidos sin UR antes de este.
 * Misma semilla + mismo sinceUr = mismo resultado (el servidor elige la semilla).
 */
export function openPack(pack: PackDef, db: CardDatabase, rng: Rng, sinceUr: number): PackOpening {
  const pool = packPool(pack, db);
  const pick = (r: CardRarity): CardDef | null => {
    const target = fallbackRarity(pool, r);
    if (!target) return null;
    const list = pool[target];
    return list[Math.floor(rng() * list.length)];
  };
  const cards: CardDef[] = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const c = pick(rollRarity(rng));
    if (c) cards.push(c);
  }
  let pity = false;
  const hasUr = () => cards.some(c => rarityOf(c) === 'UR');
  if (!hasUr() && sinceUr + 1 >= PACK_PITY && pool.UR.length) {
    // Garantía: la carta más baja se cambia por una UR
    cards.sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)));
    cards[0] = pool.UR[Math.floor(rng() * pool.UR.length)];
    pity = true;
  }
  const got = hasUr();
  cards.sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)) || a.id - b.id);
  return { cards: cards.map(c => c.id), sinceUr: got ? 0 : sinceUr + 1, pity };
}

/** Abre varios sobres seguidos (la garantía cuenta a lo largo de todos). */
export function openPacks(pack: PackDef, db: CardDatabase, rng: Rng, sinceUr: number, count: number): { packs: PackOpening[]; sinceUr: number } {
  const out: PackOpening[] = [];
  let since = sinceUr;
  for (let i = 0; i < count; i++) {
    const o = openPack(pack, db, rng, since);
    out.push(o);
    since = o.sinceUr;
  }
  return { packs: out, sinceUr: since };
}

/** En qué sobres puede salir una carta. */
export function packsWithCard(cardId: number, db: CardDatabase): PackDef[] {
  return packs.filter(p => Object.values(packPool(p, db)).some(list => list.some(c => c.id === cardId)));
}
