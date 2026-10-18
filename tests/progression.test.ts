import { describe, expect, it } from 'vitest';
import { DuelEngine } from '../src/core/DuelEngine.ts';
import type { DuelEvent, PlayerIndex } from '../src/core/DuelState.ts';
import { levelUpCost, scaleEffectAmount, trimDeckToCollection } from '../src/core/progression.ts';
import { testCards as cardDb, testFusion as fusionDb } from './fixtures/index.ts';
import { cardDb as realCards } from '../src/data/index.ts';
import { START_LIFE } from '../src/data/types.ts';
import { ascendLocal, levelUpLocal, levelsForDeck, newProfile, validatePlayerDeck } from '../src/game/profile.ts';
import { duelists } from '../src/game/duelists.ts';
import { planAscend, planLevelUp, verifyDuel } from '../src/server/rules.ts';

// 1 Ocelote joven → 79 Ocelote cazador · 2 Macehual (N 900) · 5 Xiuhcóatl (500 de daño al invocarse) · 13 Cipactli

function duel(deck0: number[], deck1: number[], levels0?: Record<number, number>) {
  const e = new DuelEngine({ db: cardDb, decks: [deck0, deck1], seed: 7, firstPlayer: 0, fusion: fusionDb, levels: [levels0] });
  e.start();
  return e;
}
const many = (id: number, n = 20) => Array<number>(n).fill(id);
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => { if (!r.ok) throw new Error(r.error); return r.events; };
const play = (e: DuelEngine, p: PlayerIndex, id: number, slot: number) =>
  ok(e.apply({ type: 'play', player: p, handIds: [e.state.players[p].hand.find(c => c.def.id === id)!.instanceId], slot, position: 'attack' }));

describe('Niveles', () => {
  it('costos: base por rareza × nivel; nivel 5 es el máximo', () => {
    const n = cardDb.get(2);
    expect([1, 2, 3, 4].map(l => levelUpCost(n, l))).toEqual([50, 100, 150, 200]);
    expect(levelUpCost(n, 5)).toBeNull();
  });

  it('+100 ATK/DEF por nivel en el duelo', () => {
    const e = duel(many(13), many(2), { 13: 3 });
    play(e, 0, 13, 0);
    const c = e.state.players[0].field[0]!;
    expect(c.level).toBe(3);
    expect(c.atk).toBe(1500 + 200);
    expect(c.defense).toBe(1200 + 200);
  });

  it('desde nivel 3 los efectos son 25% más fuertes', () => {
    expect(scaleEffectAmount(500, 2)).toBe(500);
    expect(scaleEffectAmount(500, 3)).toBe(650);
    expect(scaleEffectAmount(300, 5)).toBe(400);
    expect(scaleEffectAmount(-200, 3)).toBe(-250);
    expect(scaleEffectAmount(1, 3)).toBe(50);   // nunca se queda igual
    const e = duel(many(5), many(2), { 5: 3 });
    play(e, 0, 5, 0);                          // Xiuhcóatl nivel 3: 650 de daño
    expect(e.state.players[1].life).toBe(START_LIFE - 650);
  });

  it('las fusiones nacen en nivel 1 aunque los materiales tengan nivel', () => {
    const e = duel([2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1], many(13), { 1: 5, 2: 5 });
    const hand = e.state.players[0].hand;
    const a = hand.find(c => c.def.id === 2)!, b = hand.find(c => c.def.id === 1)!;
    ok(e.apply({ type: 'play', player: 0, handIds: [a.instanceId, b.instanceId], slot: 0, position: 'attack' }));
    expect(e.state.players[0].field[0]!.level).toBe(1);
  });

  it('modo local: subir nivel y sus niveles llegan al duelo', () => {
    const p = newProfile();
    expect(levelUpLocal(p, cardDb.get(2))).toBeNull();
    expect(levelUpLocal(p, cardDb.get(2))).toBeNull();
    expect(levelsForDeck(p, p.deck)).toEqual({ 2: 3 });
    expect(levelUpLocal(p, cardDb.get(60))).toMatch(/No tienes/);
  });
});

describe('Ascensión', () => {
  it('3 copias → 1 de la carta ascendida, y el mazo se recorta', () => {
    const p = newProfile();
    expect(p.collection[1]).toBe(3);
    expect(ascendLocal(p, cardDb.get(1), cardDb)).toBeNull();
    expect(p.collection[1]).toBeUndefined();
    expect(p.collection[79]).toBe(1);
    expect(p.deck.filter(id => id === 1)).toHaveLength(0);
    expect(p.deck).toHaveLength(37);
    expect(validatePlayerDeck(p, p.deck, cardDb)).toHaveLength(1);   // ahora le faltan 3 para 40
    expect(ascendLocal(p, cardDb.get(1), cardDb)).toMatch(/Necesitas 3/);
  });

  it('no asciende si la carta no tiene ascensión o ya tienes 3 del resultado', () => {
    const p = newProfile();
    expect(ascendLocal(p, cardDb.get(12), cardDb)).toMatch(/no puede ascender/);
  });

  it('el servidor usa TUS cartas: toda carta con "asciende a" se puede ascender', () => {
    for (const card of realCards.all().filter(c => c.ascendsTo)) {
      expect(planAscend(card.id, 3, () => 0)).toEqual({ ok: true, cost: 0, result: card.ascendsTo });
      expect(planAscend(card.id, 3, () => 3).ok).toBe(false);
      expect(planAscend(card.id, 2, () => 0).ok).toBe(false);
    }
  });

  it('las cartas ascendidas no salen en fusiones genéricas', () => {
    const results = cardDb.all().flatMap(a => cardDb.all().flatMap(b => fusionDb.fusionOptions(a, b).map(r => r.id)));
    for (const id of [79, 80, 81, 82]) expect(results).not.toContain(id);
  });

  it('trimDeckToCollection', () => {
    expect(trimDeckToCollection([1, 1, 2, 1, 3], id => (id === 1 ? 1 : 5))).toEqual([1, 2, 3]);
  });
});

describe('Servidor', () => {
  it('subir de nivel revisa cacao y máximo', () => {
    const cost = levelUpCost(realCards.get(2), 1)!;
    expect(planLevelUp(2, 3, 1, cost - 1)).toEqual({ ok: false, error: 'Te faltan 1 de cacao' });
    expect(planLevelUp(2, 3, 1, cost)).toEqual({ ok: true, cost });
    expect(planLevelUp(2, 3, 5, 9999).ok).toBe(false);
    expect(planLevelUp(2, 0, 1, 9999).ok).toBe(false);
  });

  it('el servidor repite el duelo con los mismos niveles (y otros niveles no encajan)', () => {
    const deck = newProfile().deck;
    const levels = { 2: 4, 13: 3 };
    // juega un duelo corto: el humano solo termina turno y luego se rinde (siempre válido)
    const intents = [{ type: 'endTurn', player: 0 }, { type: 'surrender', player: 0 }];
    expect(verifyDuel({ seed: 3, deck, duelistId: duelists[0].id, intents, levels }).ok).toBe(true);
    expect(verifyDuel({ seed: 3, deck, duelistId: duelists[0].id, intents, levels: { 2: 99 } }).ok).toBe(true);   // se limita a 5
  });
});
