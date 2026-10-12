import type { Rng } from '../core/rng.ts';
import type { Duelist } from './duelists.ts';

/**
 * Cartas que ganas al vencer a un duelista:
 *  - 1 carta al azar de su botín (las de más peso salen más seguido)
 *  - su carta firma, solo la primera vez que lo vences
 */
export function rollRewards(duelist: Duelist, firstWin: boolean, rng: Rng): number[] {
  const total = duelist.rewards.reduce((n, r) => n + r.weight, 0);
  let pick = rng() * total;
  let card = duelist.rewards[0].card;
  for (const r of duelist.rewards) {
    pick -= r.weight;
    if (pick < 0) { card = r.card; break; }
  }
  return firstWin ? [card, duelist.signature] : [card];
}
