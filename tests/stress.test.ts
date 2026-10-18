import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent } from '../src/core/DuelState.ts';
import { createRng } from '../src/core/rng.ts';
import { createPvpDuel, replayPvp, type PvpSetup } from '../src/game/replay.ts';
import { testCards, testFusion } from './fixtures/index.ts';

/** Mazos al azar con muchas cartas de efecto: la IA juega contra sí misma y el servidor lo repite. */
describe('prueba de estrés: duelos completos con todos los efectos', () => {
  it('60 duelos sin errores y la repetición siempre da lo mismo', () => {
    const pool = testCards.all().filter(c => c.type !== 'ritual').map(c => c.id);
    const effectCards = pool.filter(id => (testCards.get(id).effects ?? []).length > 0);
    for (let seed = 1; seed <= 60; seed++) {
      const rng = createRng(seed * 97);
      const deck = () => Array.from({ length: 40 }, (_, i) => (i % 2 ? effectCards : pool)[Math.floor(rng() * (i % 2 ? effectCards : pool).length)]);
      const setup: PvpSetup = { seed, decks: [deck(), deck()], levels: [{}, {}] };
      const engine = createPvpDuel(setup, testCards, testFusion);
      engine.start();
      const intents: Intent[] = [];
      for (let guard = 0; engine.state.winner === null && guard < 3000; guard++) {
        const p = engine.state.turnPlayer;
        let it: Intent = nextAiIntent(engine.state, p, testFusion);
        let r = engine.apply(it);
        if (!r.ok) { it = { type: 'endTurn', player: p }; r = engine.apply(it); }
        expect(r.ok, `semilla ${seed}`).toBe(true);
        intents.push(it);
      }
      const replay = replayPvp(setup, JSON.parse(JSON.stringify(intents)), testCards, testFusion);
      expect(replay.ok, `semilla ${seed}`).toBe(true);
      if (replay.ok) expect(replay.winner, `semilla ${seed}`).toBe(engine.state.winner);
      // ningún monstruo puede estar en dos lugares a la vez
      const onField = engine.state.players.flatMap(pl => pl.field).filter(Boolean);
      expect(new Set(onField).size).toBe(onField.length);
    }
  });
});
