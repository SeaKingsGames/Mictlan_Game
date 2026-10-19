import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent, PlayerIndex } from '../src/core/DuelState.ts';
import { idMask, maskEvents, unmaskIntent, viewFor, ViewEngine, type PvpView } from '../src/game/pvpView.ts';
import { newProfile } from '../src/game/profile.ts';
import { createPvpDuel, type PvpSetup } from '../src/game/replay.ts';
import { pvpMove, pvpView, type PvpMatchData } from '../src/server/rules.ts';
import { testCards, testFusion } from './fixtures/index.ts';
import { cardDb } from '../src/data/index.ts';

const deck = newProfile().deck;
const setup = (seed: number): PvpSetup => ({ seed, decks: [deck, deck], levels: [{}, {}] });

/** Juega una partida IA contra IA y en CADA jugada revisa lo que ve cada jugador. */
function playChecking(seed: number, check: (view: PvpView, viewer: PlayerIndex, engine: ReturnType<typeof createPvpDuel>) => void) {
  const engine = createPvpDuel(setup(seed), testCards, testFusion);
  engine.start();
  const pub = idMask(seed);
  for (let guard = 0; engine.state.winner === null && guard < 3000; guard++) {
    const p = engine.state.turnPlayer;
    let r = engine.apply(nextAiIntent(engine.state, p, testFusion));
    if (!r.ok) r = engine.apply({ type: 'endTurn', player: p });
    for (const viewer of [0, 1] as const) check(viewFor(engine, viewer, pub), viewer, engine);
  }
  return engine;
}

describe('multijugador con información oculta', () => {
  it('nunca se ve la mano del rival, sus cartas boca abajo ni ningún mazo', () => {
    let checks = 0;
    for (const seed of [5, 77, 901]) {
      playChecking(seed, (view, viewer) => {
        const foe = view.players[viewer === 0 ? 1 : 0];
        const mine = view.players[viewer];
        expect(foe.hand.every(c => c.c === 0)).toBe(true);
        expect(foe.support.every(c => !c || c.c === 0)).toBe(true);
        expect(foe.field.every(c => !c || !c.f || c.c === 0)).toBe(true);
        expect(mine.hand.every(c => c.c > 0)).toBe(true);
        expect(typeof foe.deck).toBe('number');
        expect(JSON.stringify(view)).not.toMatch(/"deck":\[/);
        checks++;
      });
    }
    expect(checks).toBeGreaterThan(50);
  });

  it('el tablero del navegador (ViewEngine) muestra los mismos ATK/DEF que el servidor', () => {
    playChecking(42, (view, _viewer, engine) => {
      const v = new ViewEngine(testCards, view);
      const pub = idMask(42);
      for (const p of [0, 1] as const) {
        engine.state.players[p].field.forEach((real, slot) => {
          const seen = v.state.players[p].field[slot];
          expect(!!seen).toBe(!!real);
          if (!real || !seen) return;
          expect(seen.instanceId).toBe(pub(real.instanceId));
          if (seen.def.id !== 0) { expect(seen.atk).toBe(real.atk); expect(seen.defense).toBe(real.defense); }
        });
        expect(v.state.players[p].life).toBe(engine.state.players[p].life);
        expect(v.state.players[p].deck.length).toBe(engine.state.players[p].deck.length);
      }
    });
  });

  it('los números de carta van disfrazados y se traducen de vuelta', () => {
    const pub = idMask(1234);
    const values = Array.from({ length: 80 }, (_, i) => pub(i + 1));
    expect(new Set(values).size).toBe(80);
    expect(values.filter((x, i) => x === i + 1).length).toBeLessThan(10);   // casi ninguno queda igual
    const intent: Intent = { type: 'attack', player: 0, attackerId: 7, targetId: 33 };
    const masked: Intent = { type: 'attack', player: 0, attackerId: pub(7), targetId: pub(33) };
    expect(unmaskIntent(masked, pub)).toEqual(intent);
    expect(unmaskIntent({ type: 'play', player: 1, handIds: [pub(3), pub(2000)], slot: 0, position: 'attack' }, pub))
      .toEqual({ type: 'play', player: 1, handIds: [3, 2000], slot: 0, position: 'attack' });
  });

  it('los eventos no delatan cartas ocultas (sin ATK/DEF de cartas que no ves)', () => {
    playChecking(9, (view, viewer, engine) => {
      const hidden = new Set(view.players.flatMap(p => [...p.hand, ...p.field, ...p.support]).filter(c => c && c.c === 0).map(c => c!.i));
      const fake = [...hidden].map(i => ({ type: 'statChanged' as const, instanceId: i, atk: 1, def: 1 }));
      const pub = idMask(9);
      const unpub = (n: number) => { for (let k = 1; k <= 2000; k++) if (pub(k) === n) return k; return n; };
      const out = maskEvents(fake.map(e => ({ ...e, instanceId: unpub(e.instanceId) })), view, pub);
      expect(out).toEqual([]);
      void engine; void viewer;
    });
  });

  it('el servidor acepta jugadas con números disfrazados y manda la vista de quien juega', () => {
    const seed = 3131;
    const m: PvpMatchData = { seed, host_deck: deck, guest_deck: deck, host_levels: {}, guest_levels: {}, intents: [] };
    let intents: unknown[] = [];
    for (let i = 0; i < 40; i++) {
      const first = pvpView({ ...m, intents }, 0, intents.length);
      if (!first.ok) throw new Error(first.error);
      // El jugador que tiene el turno decide viendo SOLO su vista
      const turn = first.view.turnPlayer;
      const mineSnap = pvpView({ ...m, intents }, turn, intents.length);
      if (!mineSnap.ok) throw new Error(mineSnap.error);
      const v = new ViewEngine(cardDb, mineSnap.view as PvpView);
      const hand = v.state.players[turn].hand;
      const slot = v.state.players[turn].field.findIndex(c => !c);
      const monster = hand.find(c => c.def.type === 'monster');
      const intent: Intent = !v.state.monsterPlayedThisTurn && monster && slot >= 0
        ? { type: 'play', player: turn, handIds: [monster.instanceId], slot, position: 'attack' }
        : { type: 'endTurn', player: turn };
      const r = pvpMove({ ...m, intents }, turn, intent, true);
      expect(r.ok, r.ok ? '' : r.error).toBe(true);
      if (!r.ok) return;
      intents = r.value.intents;
      if (r.value.winner !== null) break;
    }
    expect(intents.length).toBe(40);
    // La jugada guardada tiene los números verdaderos, no los disfrazados
    const saved = intents.find(x => (x as Intent).type === 'play') as Extract<Intent, { type: 'play' }>;
    expect(saved.handIds[0]).toBeLessThanOrEqual(80);
  });
});
