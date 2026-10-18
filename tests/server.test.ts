import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent } from '../src/core/DuelState.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { testCards } from './fixtures/index.ts';
import { duelists } from '../src/game/duelists.ts';
import { applyCardGains } from '../src/game/economy.ts';
import { newProfile } from '../src/game/profile.ts';
import { aiStep, createDuel, replayDuel } from '../src/game/replay.ts';

/** Juega un duelo como lo haría el cliente: el "humano" también es una IA, y se guardan sus jugadas. */
function playRecorded(seed: number, opponentIndex = 0) {
  const opponent = duelists[opponentIndex];
  const deck = newProfile().deck;
  const engine = createDuel(seed, deck, opponent, cardDb, fusionDb);
  engine.start();
  const intents: Intent[] = [];
  let guard = 0;
  while (engine.state.winner === null && guard++ < 5000) {
    if (engine.state.turnPlayer === 1) { aiStep(engine, opponent, fusionDb); continue; }
    let intent: Intent = nextAiIntent(engine.state, 0, fusionDb);
    let r = engine.apply(intent);
    if (!r.ok) { intent = { type: 'endTurn', player: 0 }; r = engine.apply(intent); }
    if (r.ok) intents.push(intent);          // el cliente solo guarda jugadas aceptadas
  }
  return { opponent, deck, intents, winner: engine.state.winner };
}

describe('repetición del duelo en el servidor', () => {
  it('reproduce exactamente el mismo resultado', () => {
    for (const seed of [1, 7, 42, 99, 2024]) {
      const game = playRecorded(seed, seed % duelists.length);
      const replay = replayDuel({ seed, playerDeck: game.deck, opponent: game.opponent, intents: game.intents }, cardDb, fusionDb);
      expect(replay.ok, `semilla ${seed}`).toBe(true);
      if (replay.ok) expect(replay.winner, `semilla ${seed}`).toBe(game.winner);
    }
  });

  it('con otra semilla las jugadas ya no encajan (no se puede reusar un duelo ganado)', () => {
    const game = playRecorded(5);
    const replay = replayDuel({ seed: 6, playerDeck: game.deck, opponent: game.opponent, intents: game.intents }, cardDb, fusionDb);
    const sameWinner = replay.ok && replay.winner === game.winner;
    expect(!replay.ok || !sameWinner || replay.winner === null).toBe(true);
  });

  it('rechaza jugadas inventadas', () => {
    const game = playRecorded(3);
    const fake: Intent[] = [{ type: 'attack', player: 0, attackerId: 9999, targetId: null }, ...game.intents];
    const replay = replayDuel({ seed: 3, playerDeck: game.deck, opponent: game.opponent, intents: fake }, cardDb, fusionDb);
    expect(replay.ok).toBe(false);
  });

  it('un duelo a medias no tiene ganador', () => {
    const game = playRecorded(11);
    const replay = replayDuel({ seed: 11, playerDeck: game.deck, opponent: game.opponent, intents: game.intents.slice(0, 3) }, cardDb, fusionDb);
    expect(replay.ok && replay.winner).toBe(null);
  });

  it('rendirse cuenta como derrota', () => {
    const replay = replayDuel({ seed: 1, playerDeck: newProfile().deck, opponent: duelists[0], intents: [{ type: 'surrender', player: 0 }] }, cardDb, fusionDb);
    expect(replay.ok && replay.winner).toBe(1);
  });
});

describe('repetidas se vuelven recursos', () => {
  it('hasta 3 copias van a la colección; la cuarta se convierte según su rareza', () => {
    const coll = new Map<number, number>([[6, 3], [1, 2]]);   // Tláloc (UR) ya tienes 3; Ocelote (N) tienes 2
    const gains = applyCardGains(coll, [1, 1, 6], id => testCards.get(id));
    expect(gains.added).toEqual([1]);
    expect(coll.get(1)).toBe(3);
    expect(gains.cacao).toBe(1 + 5);   // Ocelote N → 1 · Tláloc UR → 5
    expect(gains.jade).toBe(0 + 5);
  });
});
