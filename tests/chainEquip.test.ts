import { describe, expect, it } from 'vitest';
import { DuelEngine } from '../src/core/DuelEngine.ts';
import type { DuelEvent } from '../src/core/DuelState.ts';
import { testCards, testFusion } from './fixtures/index.ts';

// Cartas fijas de tests/fixtures: 1 Ocelote 800 · 2 Macehual 900 · 16 Tecolote · 19 Juego de pelota (mágica)
// 20 Lluvia de obsidiana (800 de daño) · 21 Chimalli (+600 DEF) · 22 Macuahuitl (+500 ATK) · 24 Niebla (trampa)

/** Duelo cuya mano inicial del jugador 0 tiene TODAS esas cartas (busca una semilla que lo cumpla). */
function duelWithHand(want: number[], deck: number[]) {
  for (let seed = 1; seed < 5000; seed++) {
    const e = new DuelEngine({ db: testCards, decks: [deck, deck], seed, firstPlayer: 0, fusion: testFusion });
    e.start();
    const hand = e.state.players[0].hand;
    const pool = [...hand];
    const ids: number[] = [];
    let ok = true;
    for (const w of want) {
      const i = pool.findIndex(c => c.def.id === w);
      if (i < 0) { ok = false; break; }
      ids.push(pool[i].instanceId);
      pool.splice(i, 1);
    }
    if (ok) return { e, ids };
  }
  throw new Error('no se encontró semilla');
}
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => { if (!r.ok) throw new Error(r.error); return r.events; };
const deck = [1, 2, 2, 16, 19, 20, 21, 22, 22, 24, 1, 2, 16, 21, 22, 19, 20, 24, 2, 22];

describe('equipos dentro de la cadena de fusión', () => {
  it('monstruo + equipo + equipo = el monstruo con los dos equipos puestos', () => {
    const { e, ids } = duelWithHand([2, 22, 21], deck);
    const events = ok(e.apply({ type: 'play', player: 0, handIds: ids, slot: 0, position: 'attack' }));
    const m = e.state.players[0].field[0]!;
    expect(m.def.id).toBe(2);
    // Lo que pusieron los equipos (sin contar fase del día ni signo)
    const fromEquips = m.activeModifiers.filter(x => ids.slice(1).includes(x.sourceId));
    expect(fromEquips.reduce((n, x) => n + x.atk, 0)).toBe(500);
    expect(fromEquips.reduce((n, x) => n + x.def, 0)).toBe(600);
    expect(m.faceDown).toBe(false);
    expect(e.state.players[0].mictlan.map(c => c.def.id).sort()).toEqual([21, 22]);
    expect(events.filter(x => x.type === 'activated')).toHaveLength(2);
  });

  it('un monstruo equipado sale boca arriba aunque pidas boca abajo', () => {
    const { e, ids } = duelWithHand([2, 22], deck);
    ok(e.apply({ type: 'play', player: 0, handIds: ids, slot: 1, position: 'attack', faceDown: true }));
    expect(e.state.players[0].field[1]!.faceDown).toBe(false);
  });

  it('la cadena no puede empezar con un equipo', () => {
    const { e, ids } = duelWithHand([22, 2], deck);
    const r = e.apply({ type: 'play', player: 0, handIds: ids, slot: 0, position: 'attack' });
    expect(r.ok).toBe(false);
  });

  it('las mágicas que no son equipo no van en la cadena', () => {
    const { e, ids } = duelWithHand([2, 20], deck);
    expect(e.apply({ type: 'play', player: 0, handIds: ids, slot: 0, position: 'attack' }).ok).toBe(false);
  });

  it('equipos sobre el monstruo que ya está en la zona: se queda donde está', () => {
    const { e, ids } = duelWithHand([2, 22], deck);
    ok(e.apply({ type: 'play', player: 0, handIds: [ids[0]], slot: 2, position: 'defense' }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    const m = e.state.players[0].field[2]!;
    ok(e.apply({ type: 'play', player: 0, handIds: [ids[1]], slot: 2, position: 'attack' }));
    expect(e.state.players[0].field[2]).toBe(m);
    expect(m.activeModifiers.filter(x => x.sourceId === ids[1]).reduce((n, x) => n + x.atk, 0)).toBe(500);
    expect(m.position).toBe('defense');
  });
});

describe('cartas boca abajo', () => {
  it('se puede bajar un monstruo en ATAQUE boca abajo', () => {
    const { e, ids } = duelWithHand([2], deck);
    ok(e.apply({ type: 'play', player: 0, handIds: ids, slot: 0, position: 'attack', faceDown: true }));
    const m = e.state.players[0].field[0]!;
    expect(m.position).toBe('attack');
    expect(m.faceDown).toBe(true);
  });

  it('una mágica se puede colocar boca abajo y activarse en otro turno', () => {
    const { e, ids } = duelWithHand([20], deck);
    const ev = ok(e.apply({ type: 'activate', player: 0, handId: ids[0], slot: 3, set: true }));
    expect(ev.some(x => x.type === 'trapSet')).toBe(true);
    const set = e.state.players[0].support[3]!;
    expect(set.faceDown).toBe(true);
    const lifeBefore = e.state.players[1].life;
    // mismo turno: ya usó su mágica/trampa del turno
    expect(e.apply({ type: 'activate', player: 0, handId: set.instanceId }).ok).toBe(false);
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    ok(e.apply({ type: 'activate', player: 0, handId: set.instanceId }));
    expect(e.state.players[1].life).toBe(lifeBefore - 800);
    expect(e.state.players[0].support[3]).toBeNull();
    expect(e.state.players[0].mictlan.some(c => c.instanceId === set.instanceId)).toBe(true);
  });

  it('una trampa colocada no se activa a mano', () => {
    const { e, ids } = duelWithHand([24], deck);
    ok(e.apply({ type: 'activate', player: 0, handId: ids[0], slot: 0 }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    const trap = e.state.players[0].support[0]!;
    expect(e.apply({ type: 'activate', player: 0, handId: trap.instanceId }).ok).toBe(false);
  });

  it('las mágicas colocadas no saltan como trampas cuando el rival ataca', () => {
    const { e, ids } = duelWithHand([19], deck);
    ok(e.apply({ type: 'activate', player: 0, handId: ids[0], slot: 0, set: true }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    const foeMon = e.state.players[1].hand.find(c => c.def.type === 'monster');
    if (!foeMon) return;
    ok(e.apply({ type: 'play', player: 1, handIds: [foeMon.instanceId], slot: 0, position: 'attack' }));
    const ev = ok(e.apply({ type: 'attack', player: 1, attackerId: foeMon.instanceId, targetId: null }));
    expect(ev.some(x => x.type === 'trapActivated')).toBe(false);
    expect(e.state.players[0].support[0]).not.toBeNull();
  });
});
