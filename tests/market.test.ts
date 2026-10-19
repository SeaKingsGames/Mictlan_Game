import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import { cardDb } from '../src/data/index.ts';
import { rarityOf } from '../src/data/types.ts';
import { rollShop, SHOP_PRICES, SHOP_SLOTS, shopDay, shopPool } from '../src/game/cardShop.ts';
import { featuredPool, pickFeatured, ROULETTE_PRIZES, spinIndex } from '../src/game/roulette.ts';
import { WIN_CACAO, WIN_TICKETS } from '../src/game/economy.ts';
import { planRewards, planShop, planSpin } from '../src/server/rules.ts';
import { duelists } from '../src/game/duelists.ts';

describe('ruleta', () => {
  it('los premios suman 100% y salen más o menos con su probabilidad', () => {
    expect(ROULETTE_PRIZES.reduce((n, p) => n + p.weight, 0)).toBe(100);
    const rng = createRng(1);
    const n = new Array(ROULETTE_PRIZES.length).fill(0);
    const N = 20000;
    for (let i = 0; i < N; i++) n[spinIndex(rng)]++;
    ROULETTE_PRIZES.forEach((p, i) => expect(Math.abs(n[i] / N * 100 - p.weight)).toBeLessThan(1.5));
  });

  it('la carta a la vista es R o SR, nunca de ascensión, y cambia después de girar', () => {
    const ascension = new Set(cardDb.all().map(c => c.ascendsTo).filter(Boolean));
    const pool = featuredPool(cardDb);
    expect(pool.length).toBeGreaterThan(5);
    for (const c of pool) {
      expect(['R', 'SR']).toContain(rarityOf(c));
      expect(ascension.has(c.id)).toBe(false);
    }
    const first = pickFeatured(cardDb, createRng(3));
    for (let s = 0; s < 50; s++) {
      const r = planSpin(s, first);
      expect(r.ok && r.value.nextFeatured).not.toBe(first);
    }
  });

  it('si sale "la carta", el premio es la carta a la vista', () => {
    const featured = pickFeatured(cardDb, createRng(8));
    let found = false;
    for (let s = 0; s < 3000 && !found; s++) {
      const r = planSpin(s, featured);
      if (r.ok && r.value.prize.kind === 'card') { expect(r.value.prize.card).toBe(featured); found = true; }
    }
    expect(found).toBe(true);
  });
});

describe('mercado de cartas', () => {
  it('6 cartas distintas, con el precio de su rareza y sin cartas de ascensión', () => {
    const ascension = new Set(cardDb.all().map(c => c.ascendsTo).filter(Boolean));
    for (let s = 0; s < 200; s++) {
      const slots = planShop(s);
      expect(slots).toHaveLength(SHOP_SLOTS);
      expect(new Set(slots.map(x => x.card)).size).toBe(SHOP_SLOTS);
      for (const x of slots) {
        expect(x.price).toBe(SHOP_PRICES[rarityOf(cardDb.get(x.card))]);
        expect(ascension.has(x.card)).toBe(false);
        expect(x.sold).toBe(false);
      }
    }
  });

  it('la UR no siempre aparece (más o menos 1 de cada 6 mercados)', () => {
    if (!shopPool(cardDb).UR.length) return;
    const rng = createRng(77);
    let withUr = 0;
    for (let i = 0; i < 3000; i++) if (rollShop(cardDb, rng).some(x => rarityOf(cardDb.get(x.card)) === 'UR')) withUr++;
    expect(withUr / 3000).toBeGreaterThan(0.1);
    expect(withUr / 3000).toBeLessThan(0.25);
  });

  it('el día del mercado cambia a la medianoche de México (UTC−6)', () => {
    expect(shopDay(Date.parse('2026-10-20T05:59:00Z'))).toBe('2026-10-19');
    expect(shopDay(Date.parse('2026-10-20T06:00:00Z'))).toBe('2026-10-20');
  });
});

describe('economía', () => {
  it('ganar da 10 de cacao y 1 ticket, contra cualquier rival', () => {
    expect(Object.values(WIN_CACAO)).toEqual([10, 10, 10]);
    for (const d of duelists) {
      const plan = planRewards(d.id, 123, false);
      expect(plan.cacao).toBe(10);
      expect(plan.tickets).toBe(WIN_TICKETS);
    }
  });
});
