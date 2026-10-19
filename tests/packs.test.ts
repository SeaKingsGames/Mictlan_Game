import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import { cardDb } from '../src/data/index.ts';
import { rarityOf } from '../src/data/types.ts';
import { openPack, openPacks, packOdds, packPool, packs, PACK_PITY, PACK_SIZE, packsWithCard } from '../src/game/packs.ts';
import { planPacks } from '../src/server/rules.ts';
import { testCards } from './fixtures/index.ts';

const pack = packs[0];

describe('sobres', () => {
  it('cada sobre de tus datos tiene cartas y nunca incluye cartas de ascensión', () => {
    const ascension = new Set(cardDb.all().map(c => c.ascendsTo).filter(Boolean));
    for (const p of packs) {
      const pool = packPool(p, cardDb);
      const all = Object.values(pool).flat();
      expect(all.length, p.id).toBeGreaterThan(0);
      expect(all.some(c => ascension.has(c.id)), p.id).toBe(false);
    }
  });

  it('las probabilidades por rareza suman 100', () => {
    for (const p of packs) {
      const odds = packOdds(packPool(p, cardDb));
      expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it('un sobre trae 5 cartas del sobre, ordenadas de menos a más rara', () => {
    const pool = new Set(Object.values(packPool(pack, testCards)).flat().map(c => c.id));
    const o = openPack(pack, testCards, createRng(7), 0);
    expect(o.cards).toHaveLength(PACK_SIZE);
    for (const id of o.cards) expect(pool.has(id)).toBe(true);
    const order = o.cards.map(id => ['N', 'R', 'SR', 'UR'].indexOf(rarityOf(testCards.get(id))));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('misma semilla = mismo resultado', () => {
    expect(openPack(pack, testCards, createRng(99), 3)).toEqual(openPack(pack, testCards, createRng(99), 3));
  });

  it('garantía: el sobre número 10 sin UR trae una UR', () => {
    for (let seed = 0; seed < 200; seed++) {
      const o = openPack(pack, testCards, createRng(seed), PACK_PITY - 1);
      expect(o.cards.some(id => rarityOf(testCards.get(id)) === 'UR')).toBe(true);
      expect(o.sinceUr).toBe(0);
    }
  });

  it('nunca pasan más de 10 sobres sin UR', () => {
    const r = openPacks(pack, testCards, createRng(5), 0, 300);
    let streak = 0;
    for (const p of r.packs) {
      const ur = p.cards.some(id => rarityOf(testCards.get(id)) === 'UR');
      streak = ur ? 0 : streak + 1;
      expect(streak).toBeLessThan(PACK_PITY);
    }
  });

  it('la rareza sale más o menos con 60/28/10/2 por carta', () => {
    const r = openPacks(pack, testCards, createRng(1), 0, 4000);
    const n = { N: 0, R: 0, SR: 0, UR: 0 };
    for (const p of r.packs) for (const id of p.cards) n[rarityOf(testCards.get(id))]++;
    const total = 4000 * PACK_SIZE;
    expect(n.N / total).toBeGreaterThan(0.55);
    expect(n.R / total).toBeGreaterThan(0.24);
    expect(n.SR / total).toBeGreaterThan(0.08);
    expect(n.UR / total).toBeGreaterThan(0.015);
  });

  it('packsWithCard encuentra en qué sobre sale una carta', () => {
    const id = Object.values(packPool(pack, cardDb)).flat()[0].id;
    expect(packsWithCard(id, cardDb).map(p => p.id)).toContain(pack.id);
  });

  it('el servidor cobra precio × cantidad y rechaza cantidades raras', () => {
    const r = planPacks(pack.id, 10, 1234, 0);
    expect(r.ok && r.value.price).toBe(pack.price * 10);
    expect(r.ok && r.value.packs.length).toBe(10);
    expect(planPacks(pack.id, 3, 1, 0).ok).toBe(false);
    expect(planPacks('nada', 1, 1, 0).ok).toBe(false);
  });
});
