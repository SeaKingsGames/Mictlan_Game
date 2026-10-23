import guerraFlorida from './guerra-florida.json';
import type { CardDef, CardTag } from '../types.ts';

/**
 * EXPANSIONES. Cada una es un archivo en esta carpeta con:
 *   cards     → sus cartas (con "set": "<id>")
 *   duelists  → sus duelistas (se agregan a la campaña después de los anteriores, como un capítulo nuevo)
 *   packs     → sus sobres temáticos (cada sobre lista sus cartas en "include")
 *   rules     → reglas de fusión por etiqueta nuevas (se suman a las de fusions.json)
 *
 * Las cartas de la expansión se juntan con tu cards.json: si una carta con el mismo número ya está
 * en cards.json (por ejemplo porque le pusiste arte en el editor y descargaste cards.json),
 * gana la de cards.json. Así puedes editar las cartas nuevas como cualquier otra.
 */
export interface SetDuelist {
  id: string; name: string; title: string; level: 1 | 2 | 3; glyph: string; intro: string;
  deck: number[]; signature: number; rewards: { card: number; weight: number }[];
}
export interface SetPack {
  id: string; name: string; glyph: string; color: string; description: string; price: number;
  monsters: { tags: CardTag[]; attributes: string[] }; support: string[]; include: number[]; exclude: number[];
}
export interface CardSet {
  id: string;
  name: string;          // "La Guerra Florida"
  chapter: number;       // capítulo de la campaña
  cards: CardDef[];
  duelists: SetDuelist[];
  packs: SetPack[];
  rules: { a: CardTag; b: CardTag; result: CardTag[] }[];
}

export const SETS: readonly CardSet[] = [guerraFlorida as unknown as CardSet];

/** Tus cartas + las de las expansiones que todavía no estén en tu cards.json. */
export function withSetCards(base: readonly CardDef[]): CardDef[] {
  const have = new Set(base.map(c => c.id));
  const out = [...base];
  for (const s of SETS) for (const c of s.cards) if (!have.has(c.id)) { out.push(c); have.add(c.id); }
  return out;
}

/** Reglas de fusión de fusions.json + las de las expansiones. */
export function withSetRules<T extends { rules: { a: CardTag; b: CardTag; result: CardTag[] }[] }>(data: T): T {
  return { ...data, rules: [...data.rules, ...SETS.flatMap(s => s.rules)] };
}

/** Nombre del capítulo de un duelista de expansión (o null si es de la campaña base). */
export function chapterOf(duelistId: string): { chapter: number; name: string } | null {
  const s = SETS.find(x => x.duelists.some(d => d.id === duelistId));
  return s ? { chapter: s.chapter, name: s.name } : null;
}

export function setName(id: string | undefined): string {
  return id ? SETS.find(s => s.id === id)?.name ?? id : 'Base';
}
