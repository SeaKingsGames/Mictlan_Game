import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import { DuelEngine } from '../src/core/DuelEngine.ts';
import type { DuelEvent, PlayerIndex } from '../src/core/DuelState.ts';
import type { FusionResolver } from '../src/core/fusion.ts';
import { cardDb, fusionDb, getDeck } from '../src/data/index.ts';
import { START_LIFE } from '../src/data/types.ts';

// IDs del cards.json: 1 Ocelote 800/600 · 2 Macehual 900/700 · 3 Guerrero Jaguar 1800/1400
//                     7 Mictlantecuhtli 2800/2000 · 9 Colibrí 500/400 · 10 Serpiente de lago 700/900

/** Duelo donde cada mazo es una sola carta repetida, para controlar qué se roba. */
function duelWith(deck0: number[], deck1: number[], fusion?: FusionResolver) {
  const engine = new DuelEngine({ db: cardDb, decks: [deck0, deck1], seed: 1, firstPlayer: 0, fusion });
  engine.start();
  return engine;
}
const handIds = (e: DuelEngine, p: PlayerIndex) => e.state.players[p].hand.map(c => c.instanceId);
const fieldCard = (e: DuelEngine, p: PlayerIndex, slot: number) => e.state.players[p].field[slot]!;
const ok = (r: ReturnType<DuelEngine['apply']>): DuelEvent[] => {
  if (!r.ok) throw new Error(r.error);
  return r.events;
};
const many = (id: number, n = 20) => Array<number>(n).fill(id);

describe('inicio y turnos', () => {
  it('ambos empiezan con 5 cartas y 8000 PV', () => {
    const e = duelWith(many(1), many(2));
    for (const p of e.state.players) {
      expect(p.hand).toHaveLength(5);
      expect(p.life).toBe(START_LIFE);
    }
    expect(e.state.turnPlayer).toBe(0);
  });

  it('no puedes actuar en el turno del rival', () => {
    const e = duelWith(many(1), many(2));
    const r = e.apply({ type: 'endTurn', player: 1 });
    expect(r.ok).toBe(false);
  });

  it('solo una jugada por turno y al terminar se roba hasta 5', () => {
    const e = duelWith(many(1), many(2));
    ok(e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 0, position: 'attack' }));
    const second = e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 1, position: 'attack' });
    expect(second.ok).toBe(false);
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    expect(e.state.players[0].hand).toHaveLength(5);
  });

  it('no se ataca en el turno 1', () => {
    const e = duelWith(many(3), many(2));
    ok(e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 0, position: 'attack' }));
    const r = e.apply({ type: 'attack', player: 0, attackerId: fieldCard(e, 0, 0).instanceId, targetId: null });
    expect(r.ok).toBe(false);
  });
});

describe('batalla', () => {
  /** Turno 1: P0 juega `a`. Turno 2: P1 juega `b` en la posición dada. Turno 3: le toca a P0. */
  function setup(a: number, b: number, bPosition: 'attack' | 'defense' = 'attack') {
    const e = duelWith(many(a), many(b));
    ok(e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 0, position: 'attack' }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'play', player: 1, handIds: [handIds(e, 1)[0]], slot: 0, position: bPosition }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    return e;
  }
  const attack = (e: DuelEngine) =>
    ok(e.apply({ type: 'attack', player: 0, attackerId: fieldCard(e, 0, 0).instanceId, targetId: fieldCard(e, 1, 0).instanceId }));

  it('ATK mayor destruye y hace daño por la diferencia', () => {
    const e = setup(13, 2);          // Cipactli 1500 vs Macehual 900
    attack(e);
    expect(e.state.players[1].field[0]).toBeNull();
    expect(e.state.players[1].life).toBe(START_LIFE - 600);
    expect(e.state.players[1].mictlan).toHaveLength(1);
  });

  it('ATK menor: el atacante muere y su dueño recibe el daño', () => {
    const e = setup(2, 3);           // 900 vs 1800
    attack(e);
    expect(e.state.players[0].field[0]).toBeNull();
    expect(e.state.players[0].life).toBe(START_LIFE - 900);
  });

  it('ATK igual: ambos destruidos, sin daño', () => {
    const e = setup(2, 2);
    attack(e);
    expect(e.state.players[0].field[0]).toBeNull();
    expect(e.state.players[1].field[0]).toBeNull();
    expect(e.state.players[0].life).toBe(START_LIFE);
    expect(e.state.players[1].life).toBe(START_LIFE);
  });

  it('contra defensa: destruye sin daño, o rebota la diferencia', () => {
    const win = setup(3, 10, 'defense');   // 1800 vs DEF 900
    attack(win);
    expect(win.state.players[1].field[0]).toBeNull();
    expect(win.state.players[1].life).toBe(START_LIFE);

    const lose = setup(9, 10, 'defense');  // 500 vs DEF 900
    attack(lose);
    expect(lose.state.players[1].field[0]).not.toBeNull();
    expect(lose.state.players[0].life).toBe(START_LIFE - 400);
  });

  it('cada monstruo ataca una vez por turno', () => {
    const e = setup(3, 10, 'defense');
    attack(e);
    const again = e.apply({ type: 'attack', player: 0, attackerId: fieldCard(e, 0, 0).instanceId, targetId: null });
    expect(again.ok).toBe(false);
  });

  it('ataque directo solo con el campo rival vacío y llega a 0 PV = victoria', () => {
    const e = duelWith(many(7, 40), many(9, 40));  // 2800 ATK directo, 3 golpes
    ok(e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 0, position: 'attack' }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'endTurn', player: 1 }));
    for (let i = 0; i < 3; i++) {
      ok(e.apply({ type: 'attack', player: 0, attackerId: fieldCard(e, 0, 0).instanceId, targetId: null }));
      if (e.state.winner !== null) break;
      ok(e.apply({ type: 'endTurn', player: 0 }));
      ok(e.apply({ type: 'endTurn', player: 1 }));
    }
    expect(e.state.players[1].life).toBe(0);
    expect(e.state.winner).toBe(0);
    expect(e.apply({ type: 'endTurn', player: 0 }).ok).toBe(false);
  });
});

describe('cadena de fusión (con un resolver de prueba)', () => {
  // Ocelote + Macehual = Guerrero Jaguar; nada más fusiona.
  const testFusion: FusionResolver = {
    fusionOptions: (a, b) => {
      const ids = [a.id, b.id].sort().join('+');
      return ids === '1+2' ? [cardDb.get(3)] : [];
    },
  };

  it('fusión exitosa: materiales al Mictlán, resultado al campo', () => {
    const e = duelWith([1, 2, 1, 2, 1, 2, 1, 2, 1, 2], many(9), testFusion);
    const hand = e.state.players[0].hand;
    const oc = hand.find(c => c.def.id === 1)!;
    const ma = hand.find(c => c.def.id === 2)!;
    const events = ok(e.apply({ type: 'play', player: 0, handIds: [oc.instanceId, ma.instanceId], slot: 2, position: 'attack' }));
    expect(events.some(ev => ev.type === 'fusion')).toBe(true);
    expect(fieldCard(e, 0, 2).def.id).toBe(3);
    expect(e.state.players[0].mictlan.map(c => c.def.id).sort()).toEqual([1, 2]);
  });

  it('fusión fallida: el primero va al Mictlán y sigue el segundo', () => {
    const e = duelWith(many(9), many(9), testFusion);
    const [a, b] = handIds(e, 0);
    ok(e.apply({ type: 'play', player: 0, handIds: [a, b], slot: 0, position: 'attack' }));
    expect(fieldCard(e, 0, 0).instanceId).toBe(b);
    expect(e.state.players[0].mictlan.map(c => c.instanceId)).toEqual([a]);
  });
});

describe('fusión con varias opciones', () => {
  // Macehual (guerrero) + Tecolote (ave, muerte): guerrero+ave → Guerrero Águila, guerrero+muerte → Guerrero del Mictlán
  const setup = () => {
    const e = duelWith([2, 16, 2, 16, 2, 16, 2, 16], many(9), fusionDb);
    const hand = e.state.players[0].hand;
    return { e, ma: hand.find(c => c.def.id === 2)!, te: hand.find(c => c.def.id === 16)! };
  };

  it('sin elegir, sale la de más ATK', () => {
    const { e, ma, te } = setup();
    ok(e.apply({ type: 'play', player: 0, handIds: [ma.instanceId, te.instanceId], slot: 0, position: 'attack' }));
    expect(fieldCard(e, 0, 0).def.id).toBe(17);
  });

  it('el jugador puede elegir otra opción válida', () => {
    const { e, ma, te } = setup();
    ok(e.apply({ type: 'play', player: 0, handIds: [ma.instanceId, te.instanceId], slot: 0, position: 'attack', fusionChoices: [4] }));
    expect(fieldCard(e, 0, 0).def.id).toBe(4);
  });

  it('una elección imposible se rechaza sin cambiar nada', () => {
    const { e, ma, te } = setup();
    const r = e.apply({ type: 'play', player: 0, handIds: [ma.instanceId, te.instanceId], slot: 0, position: 'attack', fusionChoices: [8] });
    expect(r.ok).toBe(false);
    expect(e.state.players[0].hand).toHaveLength(5);
    expect(e.state.hasPlayedThisTurn).toBe(false);
  });
});

describe('mazo vacío', () => {
  it('quien no puede robar pierde', () => {
    const e = duelWith(many(9, 5), many(9, 5));   // solo la mano inicial
    ok(e.apply({ type: 'play', player: 0, handIds: [handIds(e, 0)[0]], slot: 0, position: 'attack' }));
    ok(e.apply({ type: 'endTurn', player: 0 }));
    ok(e.apply({ type: 'play', player: 1, handIds: [handIds(e, 1)[0]], slot: 0, position: 'attack' }));
    ok(e.apply({ type: 'endTurn', player: 1 }));   // P0 necesita robar 1 y no tiene
    expect(e.state.winner).toBe(1);
  });
});

describe('IA', () => {
  it('con fusiones también termina duelos y sí fusiona', () => {
    let fusions = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const deck = getDeck('prueba').cards;
      const e = new DuelEngine({ db: cardDb, decks: [deck, deck], seed, fusion: fusionDb });
      e.start();
      let steps = 0;
      while (e.state.winner === null && steps < 3000) {
        const r = e.apply(nextAiIntent(e.state, e.state.turnPlayer, fusionDb));
        expect(r.ok, r.ok ? '' : r.error).toBe(true);
        if (r.ok) fusions += r.events.filter(ev => ev.type === 'fusion').length;
        steps++;
      }
      expect(e.state.winner, `semilla ${seed}`).not.toBeNull();
    }
    expect(fusions).toBeGreaterThan(0);
  });

  it('dos IAs terminan un duelo sin errores', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const deck = getDeck('prueba').cards;
      const e = new DuelEngine({ db: cardDb, decks: [deck, deck], seed });
      e.start();
      let steps = 0;
      while (e.state.winner === null && steps < 2000) {
        const r = e.apply(nextAiIntent(e.state, e.state.turnPlayer));
        if (!r.ok) e.apply({ type: 'endTurn', player: e.state.turnPlayer });
        steps++;
      }
      expect(e.state.winner, `semilla ${seed}`).not.toBeNull();
    }
  });
});

describe('rendirse', () => {
  it('se puede en el turno del rival y gana el otro', () => {
    const e = duelWith(many(1), many(2));
    ok(e.apply({ type: 'surrender', player: 1 }));
    expect(e.state.winner).toBe(0);
  });
});
