import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import { cardDb } from '../src/data/index.ts';
import { rarityOf } from '../src/data/types.ts';
import {
  FIRST_PURCHASE_MULTIPLIER, giftableUrs, JADE_PACKAGES, newGiftCode, normalizeCode, isPlausibleCode, packageGrant, pickUrs,
} from '../src/game/jadeStore.ts';
import { packsWithCard } from '../src/game/packs.ts';
import { jadePackage, planGrant } from '../src/server/rules.ts';

describe('paquetes de jade', () => {
  it('ids únicos, precios y jade suben, tope de 5 UR y 10 tickets oro', () => {
    expect(new Set(JADE_PACKAGES.map(p => p.id)).size).toBe(JADE_PACKAGES.length);
    for (let i = 1; i < JADE_PACKAGES.length; i++) {
      const [a, b] = [JADE_PACKAGES[i - 1], JADE_PACKAGES[i]];
      expect(b.price).toBeGreaterThan(a.price);
      // más jade por peso entre más grande
      expect(b.jade / b.price).toBeGreaterThanOrEqual(a.jade / a.price);
      expect(b.ur).toBeGreaterThanOrEqual(a.ur);
    }
    expect(Math.max(...JADE_PACKAGES.map(p => p.ur))).toBe(5);
    expect(Math.max(...JADE_PACKAGES.map(p => p.gold))).toBe(10);
  });

  it('la primera compra da doble jade', () => {
    const p = JADE_PACKAGES[0];
    expect(packageGrant(p, true).jade).toBe(p.jade * FIRST_PURCHASE_MULTIPLIER);
    expect(packageGrant(p, false).jade).toBe(p.jade);
  });

  it('el servidor ve los mismos paquetes', () => {
    expect(jadePackage('quinto-sol')?.price).toBe(1499);
    expect(jadePackage('no-existe')).toBeNull();
  });
});

describe('UR de regalo', () => {
  const urs = giftableUrs(cardDb);

  it('solo UR que salen en sobres (nunca las cimas de fusión ni las de ascensión)', () => {
    expect(urs.length).toBeGreaterThan(5);
    for (const id of urs) {
      expect(rarityOf(cardDb.get(id))).toBe('UR');
      expect(packsWithCard(id, cardDb).length).toBeGreaterThan(0);
    }
    for (const id of [96, 97, 98, 99, 100]) expect(urs).not.toContain(id);
  });

  it('da UR distintas y primero las que no tienes', () => {
    const owned: Record<number, number> = {};
    for (const id of urs.slice(0, urs.length - 2)) owned[id] = 1;
    const got = pickUrs(cardDb, id => owned[id] ?? 0, 5, createRng(7));
    expect(new Set(got).size).toBe(5);
    expect(got.slice(0, 2).sort()).toEqual(urs.slice(-2).sort());
  });

  it('planGrant arma las cartas con su valor de repetida y respeta el tope', () => {
    const plan = planGrant({ jade: 22000, ur: 5, gold: 10 }, 123, {});
    expect(plan.cards).toHaveLength(5);
    expect(plan.cards.every(c => c.jade > 0)).toBe(true);
    expect(planGrant({ jade: -5, ur: 99, gold: 1.7 }, 1, {}).cards.length).toBeLessThanOrEqual(10);
    expect(planGrant({ jade: -5, ur: 0, gold: 1.7 }, 1, {})).toEqual({ jade: 0, gold: 1, cards: [] });
  });
});

describe('códigos', () => {
  it('formato QS-XXXX-XXXX sin letras confusas', () => {
    let s = 1;
    const code = newGiftCode(() => (s = (s * 16807) % 2147483647) / 2147483647);
    expect(code).toMatch(/^QS-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(code.slice(3)).not.toMatch(/[O0I1LS5]/);
    expect(isPlausibleCode(code)).toBe(true);
  });

  it('normaliza lo que escribe el jugador', () => {
    expect(normalizeCode('  qs-ab cd-ef2h ')).toBe('QS-ABCD-EF2H');
    expect(normalizeCode('tiktok_50')).toBe('TIKTOK50');
    expect(isPlausibleCode('a')).toBe(false);
    expect(isPlausibleCode("x'; drop")).toBe(false);
  });
});
