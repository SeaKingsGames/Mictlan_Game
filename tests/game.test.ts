import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import { cardDb } from '../src/data/index.ts';
import { DECK_SIZE, MAX_COPIES } from '../src/data/types.ts';
import { duelists, isUnlocked } from '../src/game/duelists.ts';
import { addCards, loadProfile, newProfile, owned, saveProfile, validatePlayerDeck } from '../src/game/profile.ts';
import { rollRewards } from '../src/game/rewards.ts';

describe('perfil', () => {
  it('el mazo inicial es válido y usa solo cartas de la colección inicial', () => {
    const p = newProfile();
    expect(validatePlayerDeck(p, p.deck, cardDb)).toEqual([]);
  });

  it('no deja usar más copias de las que tienes', () => {
    const p = newProfile();
    const deck = [...p.deck];
    deck[0] = 7;   // Mictlantecuhtli: no lo tienes al empezar
    expect(validatePlayerDeck(p, deck, cardDb).join(' ')).toMatch(/Solo tienes 0/);
    addCards(p, [7]);
    expect(validatePlayerDeck(p, deck, cardDb)).toEqual([]);
  });

  it('exige 40 cartas exactas', () => {
    const p = newProfile();
    expect(validatePlayerDeck(p, p.deck.slice(1), cardDb).join(' ')).toMatch(/40/);
  });

  it('se guarda y se vuelve a cargar', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const p = newProfile();
    addCards(p, [6]);
    p.wins = 3;
    saveProfile(p, storage);
    const again = loadProfile(storage);
    expect(again.wins).toBe(3);
    expect(owned(again, 6)).toBe(1);
  });
});

describe('duelistas', () => {
  it('cada mazo tiene 40 cartas válidas, máximo 3 copias', () => {
    for (const d of duelists) {
      expect(d.deck, d.id).toHaveLength(DECK_SIZE);
      expect(cardDb.validateDeck({ id: d.id, name: d.name, cards: d.deck }), d.id).toEqual([]);
      for (const id of new Set(d.deck)) expect(d.deck.filter(x => x === id).length).toBeLessThanOrEqual(MAX_COPIES);
      for (const r of [...d.rewards.map(x => x.card), d.signature]) expect(cardDb.tryGet(r), `${d.id} premio ${r}`).toBeDefined();
    }
  });

  it('se desbloquean en orden', () => {
    expect(isUnlocked(duelists[0].id, [])).toBe(true);
    expect(isUnlocked(duelists[1].id, [])).toBe(false);
    expect(isUnlocked(duelists[1].id, [duelists[0].id])).toBe(true);
  });

  it('la primera victoria da también la carta firma', () => {
    const d = duelists[0];
    expect(rollRewards(d, true, createRng(1))).toHaveLength(2);
    expect(rollRewards(d, true, createRng(1))[1]).toBe(d.signature);
    expect(rollRewards(d, false, createRng(1))).toHaveLength(1);
  });

  it('las cartas comunes salen más que las raras', () => {
    const d = duelists[0];
    const rng = createRng(99);
    const counts = new Map<number, number>();
    for (let i = 0; i < 2000; i++) { const [c] = rollRewards(d, false, rng); counts.set(c, (counts.get(c) ?? 0) + 1); }
    expect(counts.get(1)!).toBeGreaterThan(counts.get(3) ?? 0);
  });
});
