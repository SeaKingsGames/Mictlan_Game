import { describe, expect, it } from 'vitest';
import cardsJson from '../src/data/cards.json';
import { cardDb } from '../src/data/index.ts';
import { rarityOf, type CardDef } from '../src/data/types.ts';
import { duelists, isChapterBoss } from '../src/game/duelists.ts';
import { SETS } from '../src/data/sets/index.ts';

const rar = (id: number) => rarityOf(cardDb.get(id));
const chapter1 = duelists.slice(0, duelists.length - SETS.reduce((n, s) => n + s.duelists.length, 0));

describe('botín de los duelistas', () => {
  it('ningún duelista da UR (ni en su botín ni como carta firma)', () => {
    for (const d of duelists) {
      expect(d.rewards.filter(r => rar(r.card) === 'UR').map(r => r.card), d.id).toEqual([]);
      expect(rar(d.signature), `${d.id} firma`).not.toBe('UR');
    }
  });

  it('la carta firma también sale en su botín', () => {
    for (const d of duelists) expect(d.rewards.map(r => r.card), d.id).toContain(d.signature);
  });

  it('todas las cartas base que no son UR se pueden ganar contra los primeros 5 duelistas', () => {
    expect(chapter1.map(d => d.id)).toEqual(['tianguis', 'chalchiuhtlicue', 'jaguar', 'xiuhtecuhtli', 'mictlantecuhtli']);
    const drops = new Set(chapter1.flatMap(d => d.rewards.map(r => r.card)));
    const missing = (cardsJson as CardDef[]).filter(c => rarityOf(c) !== 'UR' && !drops.has(c.id)).map(c => c.id);
    expect(missing).toEqual([]);
  });

  it('mismo peso por rareza en todos: N 6 · R 3 · SR 1', () => {
    const W = { N: 6, R: 3, SR: 1 } as const;
    for (const d of duelists) for (const r of d.rewards) expect(r.weight, `${d.id} carta ${r.card}`).toBe(W[rar(r.card) as keyof typeof W]);
  });

  it('cada duelista suelta las cartas de su mazo (menos las UR)', () => {
    for (const d of chapter1) {
      const drops = new Set(d.rewards.map(r => r.card));
      expect([...new Set(d.deck)].filter(id => rar(id) !== 'UR' && !drops.has(id)), d.id).toEqual([]);
    }
  });
});

describe('música de jefe', () => {
  it('suena contra el último duelista de cada capítulo', () => {
    expect(duelists.filter(d => isChapterBoss(d.id)).map(d => d.id)).toEqual(['mictlantecuhtli', 'tlamacazqui']);
  });
});
