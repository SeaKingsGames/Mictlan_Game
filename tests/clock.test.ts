import { describe, expect, it } from 'vitest';
import type { DaySign } from '../src/core/daySign.ts';
import { DuelEngine, pickDaySign } from '../src/core/DuelEngine.ts';
import type { DuelEvent, PlayerIndex } from '../src/core/DuelState.ts';
import { phaseOf, turnsLeftInPhase } from '../src/core/time.ts';
import { cardDb, daySigns, fusionDb } from '../src/data/index.ts';
import { START_LIFE } from '../src/data/types.ts';

// 1 Ocelote joven (tierra 800) · 2 Macehual (tierra 900) · 13 Cipactli (agua 1500)
// 76 Brujo nahualli (tierra 1200/1500 → Jaguar nahual 2300/900)

const sign = (...rules: DaySign['rules']): DaySign => ({ id: 't', name: 'Test', meaning: '', glyph: '', text: '', rules });
function duel(deck0: number[], deck1: number[], signs?: DaySign[]) {
  const e = new DuelEngine({ db: cardDb, decks: [deck0, deck1], seed: 7, firstPlayer: 0, fusion: fusionDb, signs });
  e.start();
  return e;
}
const many = (id: number, n = 20) => Array<number>(n).fill(id);
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => { if (!r.ok) throw new Error(r.error); return r.events; };
const inHand = (e: DuelEngine, p: PlayerIndex, id: number) => e.state.players[p].hand.find(c => c.def.id === id)!;
const play = (e: DuelEngine, p: PlayerIndex, id: number, slot: number, position: 'attack' | 'defense' = 'attack') =>
  ok(e.apply({ type: 'play', player: p, handIds: [inHand(e, p, id).instanceId], slot, position }));
const pass = (e: DuelEngine) => ok(e.apply({ type: 'endTurn', player: e.state.turnPlayer }));
const field = (e: DuelEngine, p: PlayerIndex, slot: number) => e.state.players[p].field[slot]!;

describe('Reloj Solar', () => {
  it('fases y turnos restantes', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(phaseOf)).toEqual(['alba', 'alba', 'mediodia', 'mediodia', 'ocaso', 'ocaso', 'medianoche', 'medianoche', 'alba']);
    expect([1, 2, 3].map(turnsLeftInPhase)).toEqual([2, 1, 2]);
  });

  it('Alba da +200 a Tierra; en Mediodía se le quita', () => {
    const e = duel(many(2), many(13));
    play(e, 0, 2, 0);
    expect(field(e, 0, 0).atk).toBe(900 + 200);
    pass(e); pass(e);                          // turno 3: Mediodía
    expect(field(e, 0, 0).atk).toBe(900);
  });

  it('Medianoche: Agua +300', () => {
    const e = duel(many(2), many(13));
    pass(e);
    play(e, 1, 13, 0);
    for (let i = 0; i < 5; i++) pass(e);       // turno 7
    expect(phaseOf(e.state.turn)).toBe('medianoche');
    expect(field(e, 1, 0).atk).toBe(1500 + 300);
  });
});

describe('Nahuales', () => {
  it('de noche toma su forma animal y de día regresa', () => {
    const e = duel(many(76), many(13));
    play(e, 0, 76, 0, 'defense');
    const brujo = field(e, 0, 0);
    expect(brujo.name).toBe('Brujo nahualli');
    expect(brujo.defense).toBe(1500);
    pass(e); pass(e); pass(e);
    const events = pass(e);                    // turno 5: Ocaso
    expect(events).toContainEqual({ type: 'nahualShift', instanceIds: [brujo.instanceId], night: true });
    expect(brujo.name).toBe('Jaguar nahual');
    expect(brujo.atk).toBe(2300);
    expect(brujo.defense).toBe(900);
    for (let i = 0; i < 4; i++) pass(e);       // turno 9: Alba
    expect(brujo.name).toBe('Brujo nahualli');
    expect(brujo.atk).toBe(1200 + 200);        // + bono de Tierra del Alba
  });

  it('al salir del campo pierde la forma de noche', () => {
    const e = duel(many(76), many(13));
    pass(e); pass(e); pass(e); pass(e);        // turno 5
    play(e, 0, 76, 0);
    const c = field(e, 0, 0);
    expect(c.nightForm).toBe(true);
    c.resetForZoneChange();
    expect(c.name).toBe('Brujo nahualli');
  });

  it('no aparece como resultado de las fusiones genéricas', () => {
    const r = fusionDb.fusionOptions(cardDb.get(2), cardDb.get(1));
    expect(r.some(c => c.nahual)).toBe(false);
  });
});

describe('Signo del día', () => {
  it('se elige con la semilla, siempre el mismo', () => {
    expect(pickDaySign(42, daySigns)).toBe(pickDaySign(42, daySigns));
    expect(pickDaySign(42, [])).toBeNull();
    const seen = new Set(Array.from({ length: 200 }, (_, i) => pickDaySign(i, daySigns)!.id));
    expect(seen.size).toBeGreaterThan(15);
  });

  it('los 20 signos son válidos', () => {
    expect(daySigns).toHaveLength(20);
    expect(new Set(daySigns.map(s => s.id)).size).toBe(20);
    for (const s of daySigns) expect(s.rules.length, s.id).toBeGreaterThan(0);
  });

  it('Malinalli: vida inicial 6000', () => {
    const e = duel(many(2), many(13), [sign({ kind: 'startLife', amount: 6000 })]);
    expect(e.state.players[0].life).toBe(6000);
  });

  it('Cuetzpalin: 1 carta extra al empezar', () => {
    const e = duel(many(2), many(13), [sign({ kind: 'extraDraw', amount: 1 })]);
    expect(e.state.players[0].hand).toHaveLength(6);
  });

  it('Calli/Ollin: bonos de stats', () => {
    const e = duel(many(13), many(2), [sign({ kind: 'stat', atk: 300, def: -300 })]);
    play(e, 0, 13, 0);
    expect(field(e, 0, 0).atk).toBe(1500 + 300);
    expect(field(e, 0, 0).defense).toBe(1200 - 300);
  });

  it('Ácatl (directo +400), Miquiztli (daño al destruir) y Cozcacuauhtli (vida al destruir)', () => {
    const e = duel(many(13), many(1), [sign({ kind: 'directBonus', amount: 400 }, { kind: 'destroyBurn', amount: 300 }, { kind: 'destroyHeal', amount: 300 })]);
    play(e, 0, 13, 0);
    pass(e);
    play(e, 1, 1, 0);                          // Ocelote 800 (+200 Alba)
    pass(e);
    ok(e.apply({ type: 'attack', player: 0, attackerId: field(e, 0, 0).instanceId, targetId: field(e, 1, 0).instanceId }));
    // 1500 - 800 = 700 de batalla + 300 de Miquiztli; tú recuperas 300
    expect(e.state.players[1].life).toBe(START_LIFE - 700 - 300);
    expect(e.state.players[0].life).toBe(START_LIFE + 300);
    pass(e); pass(e);
    ok(e.apply({ type: 'attack', player: 0, attackerId: field(e, 0, 0).instanceId, targetId: null }));
    expect(e.state.players[1].life).toBe(START_LIFE - 1000 - (1500 + 400));
  });

  it('Tochtli: recuperas vida al empezar tu turno', () => {
    const e = duel(many(2), many(13), [sign({ kind: 'turnHeal', amount: 200 })]);
    pass(e);
    expect(e.state.players[1].life).toBe(START_LIFE + 200);
  });
});
