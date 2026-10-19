import { DUPLICATE_VALUE } from './config.ts';
import { MAX_COPIES, rarityOf, type CardDef } from '../data/types.ts';

/** Cacao por ganar un duelo (campaña o libre). Las repetidas dan además su cacao/jade. */
export const WIN_CACAO: Record<1 | 2 | 3, number> = { 1: 10, 2: 10, 3: 10 };
/** Tickets estándar por ganar un duelo (sirven para renovar el mercado de cartas). */
export const WIN_TICKETS = 1;

export interface CardGains {
  added: number[];                                          // cartas que entraron a tu colección
  converted: { cardId: number; cacao: number; jade: number }[];  // ya tenías 3: se volvieron recursos
  cacao: number;
  jade: number;
}

/**
 * Agrega cartas a una colección. Si ya tienes 3 copias, la carta se convierte en cacao y jade
 * según su rareza (N 1/0 · R 2/1 · SR 3/2 · UR 5/5). Modifica `collection`.
 */
export function applyCardGains(collection: Map<number, number>, cards: readonly number[], getCard: (id: number) => CardDef): CardGains {
  const out: CardGains = { added: [], converted: [], cacao: 0, jade: 0 };
  for (const id of cards) {
    const have = collection.get(id) ?? 0;
    if (have < MAX_COPIES) {
      collection.set(id, have + 1);
      out.added.push(id);
    } else {
      const value = DUPLICATE_VALUE[rarityOf(getCard(id))];
      out.converted.push({ cardId: id, ...value });
      out.cacao += value.cacao;
      out.jade += value.jade;
    }
  }
  return out;
}
