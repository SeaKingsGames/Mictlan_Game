import { describe, expect, it } from 'vitest';
import { DuelEngine } from '../src/core/DuelEngine.ts';
import { isNightTurn, type DuelEvent, type PlayerIndex } from '../src/core/DuelState.ts';
import { CardDatabase } from '../src/data/cardDatabase.ts';
import { cardDb } from '../src/data/index.ts';
import { START_LIFE, type CardDef } from '../src/data/types.ts';

// 3 Guerrero Jaguar · 5 Xiuhcóatl · 6 Tláloc · 7 Mictlantecuhtli · 8 Quetzalcóatl · 9 Colibrí
// 10 Serpiente de lago · 11 Xoloitzcuintle · 13 Cipactli · 18 Temazcal · 22 Macuahuitl

function duel(deck0: number[], deck1: number[]) {
  const e = new DuelEngine({ db: cardDb, decks: [deck0, deck1], seed: 7, firstPlayer: 0 });
  e.start();
  return e;
}
const many = (id: number, n = 20) => Array<number>(n).fill(id);
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => { if (!r.ok) throw new Error(r.error); return r.events; };
const inHand = (e: DuelEngine, p: PlayerIndex, cardId: number) => e.state.players[p].hand.find(c => c.def.id === cardId)!;
const play = (e: DuelEngine, p: PlayerIndex, cardId: number, slot: number) =>
  ok(e.apply({ type: 'play', player: p, handIds: [inHand(e, p, cardId).instanceId], slot, position: 'attack' }));
const pass = (e: DuelEngine) => ok(e.apply({ type: 'endTurn', player: e.state.turnPlayer }));
const field = (e: DuelEngine, p: PlayerIndex, slot: number) => e.state.players[p].field[slot]!;

describe('Día y noche', () => {
  it('turnos 1-2 de día, 3-4 de noche, 5-6 de día', () => {
    expect([1, 2, 3, 4, 5, 6].map(isNightTurn)).toEqual([false, false, true, true, false, false]);
  });
  it('avisa cuando cambia', () => {
    const e = duel(many(9), many(9));
    pass(e);
    const events = pass(e);   // empieza el turno 3
    expect(events).toContainEqual({ type: 'timeChanged', night: true });
  });
});

describe('efectos de monstruos', () => {
  it('Xiuhcóatl hace 500 de daño al ser invocada', () => {
    const e = duel(many(5), many(9));
    play(e, 0, 5, 0);
    expect(e.state.players[1].life).toBe(START_LIFE - 500);
  });

  it('boca abajo no activa el efecto de invocación', () => {
    const e = duel(many(5), many(9));
    ok(e.apply({ type: 'play', player: 0, handIds: [inHand(e, 0, 5).instanceId], slot: 0, position: 'defense', faceDown: true }));
    expect(e.state.players[1].life).toBe(START_LIFE);
  });

  it('Tláloc da +300 ATK a tus OTROS monstruos de agua, y se quita si Tláloc se va', () => {
    const e = duel([6, 10, 6, 10, 6, 10, 6, 10, 6, 10, 6, 10], many(8));
    play(e, 0, 6, 0);
    pass(e); pass(e);
    play(e, 0, 10, 1);
    expect(field(e, 0, 1).atk).toBe(700 + 300);
    expect(field(e, 0, 0).atk).toBe(2600);
    pass(e);
    // Quetzalcóatl (3000) del rival destruye a Tláloc
    ok(e.apply({ type: 'play', player: 1, handIds: [inHand(e, 1, 8).instanceId], slot: 0, position: 'attack' }));
    ok(e.apply({ type: 'attack', player: 1, attackerId: field(e, 1, 0).instanceId, targetId: field(e, 0, 0).instanceId }));
    expect(e.state.players[0].field[0]).toBeNull();
    expect(field(e, 0, 1).atk).toBe(700);
  });

  it('Guerrero Jaguar gana +300 al atacar de noche, solo ese turno', () => {
    const e = duel(many(3), many(13));
    play(e, 0, 3, 0);
    pass(e);
    play(e, 1, 13, 0);
    pass(e);                                   // turno 3: noche
    ok(e.apply({ type: 'attack', player: 0, attackerId: field(e, 0, 0).instanceId, targetId: field(e, 1, 0).instanceId }));
    expect(e.state.players[1].life).toBe(START_LIFE - (1800 + 300 - 1500));
    pass(e);
    expect(field(e, 0, 0).atk).toBe(1800);
  });

  it('Mictlantecuhtli al ser destruido revive al monstruo de muerte más fuerte de tu Mictlán', () => {
    const e = duel([11, 7, 11, 7, 11, 7, 11, 7, 11, 7], many(8));
    // Xolo + Mictlantecuhtli no fusionan: Xolo se va al Mictlán y queda Mictlantecuhtli
    const xolo = inHand(e, 0, 11), mict = inHand(e, 0, 7);
    ok(e.apply({ type: 'play', player: 0, handIds: [xolo.instanceId, mict.instanceId], slot: 2, position: 'attack' }));
    pass(e);
    play(e, 1, 8, 0);
    const events = ok(e.apply({ type: 'attack', player: 1, attackerId: field(e, 1, 0).instanceId, targetId: mict.instanceId }));
    expect(events.some(ev => ev.type === 'revived' && ev.instanceId === xolo.instanceId)).toBe(true);
    expect(e.state.players[0].field.some(c => c?.instanceId === xolo.instanceId)).toBe(true);
  });
});

describe('mágicas y equipos', () => {
  it('Temazcal cura 1000, va al Mictlán y cuenta como tu jugada del turno', () => {
    const e = duel([18, 9, 18, 9, 18, 9, 18, 9], many(9));
    const temazcal = inHand(e, 0, 18);
    ok(e.apply({ type: 'activate', player: 0, handId: temazcal.instanceId }));
    expect(e.state.players[0].life).toBe(START_LIFE + 1000);
    expect(e.state.players[0].mictlan).toContain(temazcal);
    const again = e.apply({ type: 'play', player: 0, handIds: [inHand(e, 0, 9).instanceId], slot: 0, position: 'attack' });
    expect(again.ok).toBe(false);
  });

  it('Macuahuitl da +500 ATK permanente al monstruo equipado y pide objetivo', () => {
    const e = duel([13, 22, 13, 22, 13, 22, 13, 22, 13, 22], many(9));
    play(e, 0, 13, 0);
    pass(e); pass(e);
    const equip = inHand(e, 0, 22);
    expect(e.apply({ type: 'activate', player: 0, handId: equip.instanceId }).ok).toBe(false);
    ok(e.apply({ type: 'activate', player: 0, handId: equip.instanceId, targetId: field(e, 0, 0).instanceId }));
    expect(field(e, 0, 0).atk).toBe(1500 + 500);
    pass(e); pass(e);
    expect(field(e, 0, 0).atk).toBe(2000);
  });

  it('una mágica no entra a la cadena de fusión', () => {
    const e = duel([18, 9, 18, 9, 18, 9], many(9));
    const r = e.apply({ type: 'play', player: 0, handIds: [inHand(e, 0, 9).instanceId, inHand(e, 0, 18).instanceId], slot: 0, position: 'attack' });
    expect(r.ok).toBe(false);
  });
});

describe('validación de efectos en cards.json', () => {
  it('rechaza triggers o acciones inventadas', () => {
    const bad = { ...cardDb.get(1), effects: [{ trigger: 'alAmanecer', actions: [{ type: 'volar' }] }] } as unknown as CardDef;
    expect(() => new CardDatabase([bad])).toThrow(/desconocid/);
  });
  it('una mágica sin efecto onActivate es inválida', () => {
    const bad = { ...cardDb.get(18), effects: [] } as CardDef;
    expect(() => new CardDatabase([bad])).toThrow(/onActivate/);
  });
});
