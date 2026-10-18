import { describe, expect, it } from 'vitest';
import fixtureCards from './fixtures/cards.json';
import fusionsJson from './fixtures/fusions.json';
import { DuelEngine } from '../src/core/DuelEngine.ts';
import type { DuelEvent, PlayerIndex } from '../src/core/DuelState.ts';
import { CardDatabase } from '../src/data/cardDatabase.ts';
import { FusionDatabase, type FusionData } from '../src/data/fusionDatabase.ts';
import { describeEffects } from '../src/data/effectText.ts';
import type { CardDef } from '../src/data/types.ts';

// Cartas de prueba (900+) además de la copia fija
const extra: CardDef[] = [
  { id: 901, name: 'Prueba material', description: '', type: 'monster', attribute: 'sol', tags: ['guerrero'], atk: 500, def: 500,
    effects: [{ trigger: 'onFusionMaterial', actions: [{ type: 'heal', amount: 500 }] }] },
  { id: 902, name: 'Prueba atacado', description: '', type: 'monster', attribute: 'sol', tags: ['bestia'], atk: 100, def: 2500,
    effects: [{ trigger: 'onAttacked', actions: [{ type: 'damage', amount: 300, who: 'opponent' }] }] },
  { id: 903, name: 'Prueba directo', description: '', type: 'monster', attribute: 'sol', tags: ['bestia'], atk: 1000, def: 1000,
    effects: [{ trigger: 'onDirectDamage', actions: [{ type: 'draw', amount: 1 }] }] },
  { id: 904, name: 'Muro', description: '', type: 'monster', attribute: 'sol', tags: [], atk: 0, def: 100 },
  { id: 905, name: 'Coloso', description: '', type: 'monster', attribute: 'sol', tags: [], atk: 3000, def: 3000 },
];
const db = new CardDatabase([...(fixtureCards as CardDef[]), ...extra]);
const fusion = new FusionDatabase(fusionsJson as FusionData, db);

function duel(deck0: number[], deck1: number[], seed = 7) {
  const e = new DuelEngine({ db, decks: [deck0, deck1], seed, firstPlayer: 0, fusion });
  e.start();
  return e;
}
const fill = (ids: number[], n = 30) => Array.from({ length: n }, (_, i) => ids[i % ids.length]);
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => { if (!r.ok) throw new Error(r.error); return r.events; };
/** Pone en la mano una carta del mazo (para no depender del barajeo). */
function give(e: DuelEngine, p: PlayerIndex, id: number) {
  const me = e.state.players[p];
  const c = me.deck.find(x => x.def.id === id) ?? me.hand.find(x => x.def.id === id);
  if (!c) throw new Error(`no hay ${id} en el mazo`);
  if (!me.hand.includes(c)) { me.deck.splice(me.deck.indexOf(c), 1); c.zone = 'hand'; me.hand.push(c); }
  return c;
}
const play = (e: DuelEngine, p: PlayerIndex, id: number, slot: number, position: 'attack' | 'defense' = 'attack') =>
  ok(e.apply({ type: 'play', player: p, handIds: [give(e, p, id).instanceId], slot, position }));
const cast = (e: DuelEngine, p: PlayerIndex, id: number, targetId?: number) =>
  ok(e.apply({ type: 'activate', player: p, handId: give(e, p, id).instanceId, targetId }));
const pass = (e: DuelEngine) => ok(e.apply({ type: 'endTurn', player: e.state.turnPlayer }));
const at = (e: DuelEngine, p: PlayerIndex, slot: number) => e.state.players[p].field[slot];
const attack = (e: DuelEngine, p: PlayerIndex, slot: number, target: number | null) =>
  e.apply({ type: 'attack', player: p, attackerId: at(e, p, slot)!.instanceId, targetId: target === null ? null : at(e, p === 0 ? 1 : 0, target)!.instanceId });

describe('destrucción total', () => {
  it('Tormenta de Tláloc destruye todos los monstruos rivales (Raigeki)', () => {
    const e = duel(fill([83, 2]), fill([13, 905]));
    pass(e); play(e, 1, 13, 0); pass(e);
    pass(e); play(e, 1, 905, 1); pass(e);
    play(e, 0, 2, 0);
    pass(e); pass(e);
    cast(e, 0, 83);
    expect(e.state.players[1].field.every(c => c === null)).toBe(true);
    expect(at(e, 0, 0)).not.toBeNull();
  });

  it('Fauces de Tlaltecuhtli destruye TODOS los monstruos (Agujero Negro)', () => {
    const e = duel(fill([85, 2]), fill([13]));
    play(e, 0, 2, 0); pass(e); play(e, 1, 13, 0); pass(e);
    cast(e, 0, 85);
    expect([...e.state.players[0].field, ...e.state.players[1].field].every(c => c === null)).toBe(true);
  });

  it('Soplo de Ehécatl destruye las trampas colocadas del rival (Plumero)', () => {
    const e = duel(fill([84, 2]), fill([89, 13]));
    pass(e); cast(e, 1, 89); pass(e);
    expect(e.state.players[1].support.some(Boolean)).toBe(true);
    cast(e, 0, 84);
    expect(e.state.players[1].support.every(c => c === null)).toBe(true);
  });
});

describe('control del campo', () => {
  it('Hechizo de Malinalxóchitl: tomas el monstruo más fuerte y regresa al final del turno', () => {
    const e = duel(fill([86, 904]), fill([905, 13]));
    pass(e); play(e, 1, 905, 0); pass(e);
    play(e, 0, 904, 0, 'defense');
    pass(e); pass(e);
    const colosus = at(e, 1, 0)!;
    cast(e, 0, 86);
    expect(e.state.players[0].field.includes(colosus)).toBe(true);
    expect(colosus.borrowed).toBe(true);
    ok(e.apply({ type: 'attack', player: 0, attackerId: colosus.instanceId, targetId: null }));   // ataca directo con él
    expect(e.state.players[1].life).toBeLessThan(8000);
    const events = pass(e);
    expect(events.some(ev => ev.type === 'controlChanged' && ev.player === 1)).toBe(true);
    expect(e.state.players[1].field.includes(colosus)).toBe(true);
  });

  it('Grito de la Llorona: detiene el ataque, pone al atacante en defensa y el rival no ataca su siguiente turno', () => {
    const e = duel(fill([89, 904]), fill([905]));
    cast(e, 0, 89); play(e, 0, 904, 0, 'defense'); pass(e);
    play(e, 1, 905, 0);
    pass(e); pass(e);                                       // turno 4 (rival), ya puede atacar
    ok(attack(e, 1, 0, 0));
    const col = at(e, 1, 0)!;
    expect(col.position).toBe('defense');
    expect(at(e, 0, 0)).not.toBeNull();                     // el ataque no pasó
    pass(e); pass(e);                                       // turno 6 del rival: sigue bloqueado
    ok(e.apply({ type: 'changePosition', player: 1, instanceId: col.instanceId }));
    expect(attack(e, 1, 0, 0).ok).toBe(false);
  });
});

describe('trampas de invocación', () => {
  it('Aliento del Mictlán regresa a la mano al monstruo que el rival invoca', () => {
    const e = duel(fill([87, 2]), fill([13]));
    cast(e, 0, 87); pass(e);
    const card = give(e, 1, 13);
    play(e, 1, 13, 0);
    expect(at(e, 1, 0)).toBeNull();
    expect(e.state.players[1].hand.includes(card)).toBe(true);
  });

  it('Red de obsidiana solo responde a fusiones', () => {
    const e = duel(fill([88, 2]), fill([2, 1]));
    cast(e, 0, 88); pass(e);
    play(e, 1, 2, 0);                                       // invocación normal: la trampa sigue
    expect(e.state.players[0].support.some(Boolean)).toBe(true);
    pass(e); pass(e);
    const a = give(e, 1, 2), b = give(e, 1, 1);
    ok(e.apply({ type: 'play', player: 1, handIds: [a.instanceId, b.instanceId], slot: 1, position: 'attack' }));
    expect(at(e, 1, 1)).toBeNull();                         // la fusión fue destruida
    expect(e.state.players[0].support.every(c => c === null)).toBe(true);
  });
});

describe('combate especial', () => {
  it('Jaguar de obsidiana: daño perforante contra defensa', () => {
    const e = duel(fill([90]), fill([904]));
    play(e, 0, 90, 0); pass(e); play(e, 1, 904, 0, 'defense'); pass(e);
    const atk = at(e, 0, 0)!.atk;
    ok(attack(e, 0, 0, 0));
    expect(e.state.players[1].life).toBe(8000 - (atk - 100));
  });

  it('Guerrero águila veloz ataca dos veces y no tres', () => {
    const e = duel(fill([91]), fill([904]));
    play(e, 0, 91, 0); pass(e); pass(e);
    ok(attack(e, 0, 0, null));
    ok(attack(e, 0, 0, null));
    expect(attack(e, 0, 0, null).ok).toBe(false);
    expect(e.apply({ type: 'changePosition', player: 0, instanceId: at(e, 0, 0)!.instanceId }).ok).toBe(false);
  });

  it('Mensajero de la noche ataca directo aunque haya monstruos, pero solo de noche', () => {
    const e = duel(fill([94]), fill([905]));
    play(e, 0, 94, 0); pass(e); play(e, 1, 905, 0, 'defense'); pass(e);
    expect(attack(e, 0, 0, null).ok).toBe(false);           // turno 3: Mediodía
    pass(e); pass(e);                                       // turno 5: Ocaso (noche)
    ok(attack(e, 0, 0, null));
    expect(e.state.players[1].life).toBeLessThan(8000);
  });

  it('Escudo de Chimalli resiste una vez en batalla', () => {
    const e = duel(fill([95]), fill([905]));
    play(e, 0, 95, 0, 'defense'); pass(e); play(e, 1, 905, 0); pass(e); pass(e);
    const events = ok(attack(e, 1, 0, 0));
    expect(events.some(ev => ev.type === 'battleSaved')).toBe(true);
    expect(at(e, 0, 0)).not.toBeNull();
    pass(e); pass(e);
    ok(attack(e, 1, 0, 0));
    expect(at(e, 0, 0)).toBeNull();
  });
});

describe('azar y mazo', () => {
  it('Tzitzimitl destruye un monstruo rival al azar, siempre igual con la misma semilla', () => {
    const run = (seed: number) => {
      const e = duel(fill([92]), fill([13, 905, 2]), seed);
      pass(e); play(e, 1, 13, 0); pass(e); pass(e); play(e, 1, 905, 1); pass(e); pass(e); play(e, 1, 2, 2); pass(e);
      play(e, 0, 92, 0);
      return e.state.players[1].field.map(c => c?.def.id ?? null);
    };
    const a = run(11);
    expect(a.filter(x => x === null)).toHaveLength(3);      // 3 zonas vacías de 5 → quitó uno de los 3
    expect(run(11)).toEqual(a);
  });

  it('Madre serpiente: al ser destruida invoca del mazo una serpiente con 1500 ATK o menos', () => {
    const e = duel(fill([93, 10]), fill([905]));
    play(e, 0, 93, 0); pass(e); play(e, 1, 905, 0); pass(e); pass(e);
    const events = ok(attack(e, 1, 0, 0));
    const ss = events.find(ev => ev.type === 'specialSummoned');
    expect(ss).toBeDefined();
    expect(at(e, 0, 0)?.def.id).toBe(10);
  });
});

describe('disparadores nuevos', () => {
  it('al usarse como material de fusión', () => {
    const e = duel(fill([901, 1]), fill([904]));
    const a = give(e, 0, 901), b = give(e, 0, 1);
    ok(e.apply({ type: 'play', player: 0, handIds: [a.instanceId, b.instanceId], slot: 0, position: 'attack' }));
    expect(e.state.players[0].life).toBe(8000 + 500);
  });

  it('al ser atacado', () => {
    const e = duel(fill([902]), fill([905]));
    play(e, 0, 902, 0, 'defense'); pass(e); play(e, 1, 905, 0); pass(e); pass(e);
    ok(attack(e, 1, 0, 0));
    expect(e.state.players[1].life).toBe(8000 - 300);
  });

  it('al hacer daño directo', () => {
    const e = duel(fill([903]), fill([904]));
    play(e, 0, 903, 0); pass(e); pass(e);
    const hand = e.state.players[0].hand.length;
    ok(attack(e, 0, 0, null));
    expect(e.state.players[0].hand.length).toBe(hand + 1);
  });
});

describe('textos', () => {
  it('todas las cartas nuevas tienen texto legible', () => {
    for (const id of [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95]) {
      const t = describeEffects(db.get(id).effects);
      expect(t.length, `#${id}`).toBeGreaterThan(10);
      expect(t, `#${id}`).not.toContain('undefined');
    }
  });
});
