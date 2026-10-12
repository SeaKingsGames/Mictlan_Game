import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent } from '../src/core/DuelState.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { duelists } from '../src/game/duelists.ts';
import { newProfile } from '../src/game/profile.ts';
import { aiStep, createDuel } from '../src/game/replay.ts';
import { checkDuelStart, newSeed, planRewards, verifyDuel } from '../src/server/rules.ts';

function play(seed: number) {
  const opponent = duelists[0];
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
    if (r.ok) intents.push(intent);
  }
  return { deck, intents, winner: engine.state.winner };
}

describe('reglas del servidor', () => {
  const starter = newProfile();

  it('el primer duelista está abierto con el mazo inicial; el segundo no', () => {
    expect(checkDuelStart({ duelistId: duelists[0].id, deck: starter.deck, collection: starter.collection, defeated: [] }).ok).toBe(true);
    expect(checkDuelStart({ duelistId: duelists[1].id, deck: starter.deck, collection: starter.collection, defeated: [] }).ok).toBe(false);
    expect(checkDuelStart({ duelistId: duelists[1].id, deck: starter.deck, collection: starter.collection, defeated: [duelists[0].id] }).ok).toBe(true);
  });

  it('no deja usar cartas que no tienes', () => {
    const deck = [...starter.deck.slice(0, 39), 60];
    const r = checkDuelStart({ duelistId: duelists[0].id, deck, collection: starter.collection, defeated: [] });
    expect(r.ok).toBe(false);
  });

  it('verifica un duelo que viajó como JSON (como por internet)', () => {
    const seed = newSeed(() => 0.123);
    const game = play(seed);
    const intents = JSON.parse(JSON.stringify(game.intents));
    const r = verifyDuel({ seed, deck: game.deck, duelistId: duelists[0].id, intents });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.won).toBe(game.winner === 0);
  });

  it('rechaza basura en vez de jugadas', () => {
    expect(verifyDuel({ seed: 1, deck: starter.deck, duelistId: duelists[0].id, intents: 'hola' }).ok).toBe(false);
    expect(verifyDuel({ seed: 1, deck: starter.deck, duelistId: duelists[0].id, intents: [{ type: 'endTurn', player: 1 }] }).ok).toBe(false);
  });

  it('el premio es el mismo para el mismo duelo y la primera victoria da la carta firma', () => {
    const d = duelists[0];
    expect(planRewards(d.id, 77, false)).toEqual(planRewards(d.id, 77, false));
    const first = planRewards(d.id, 77, true);
    expect(first.cards.map(c => c.id)).toContain(d.signature);
    expect(first.cacao).toBeGreaterThan(0);
  });
});

describe('paquete del servidor', () => {
  it('supabase/functions/_shared/game.js está al día (si falla: npm run build:server)', async () => {
    const { DATA_VERSION } = await import('../src/data/index.ts');
    const bundle = await import('../supabase/functions/_shared/game.js');
    expect(bundle.DATA_VERSION).toBe(DATA_VERSION);
  });
});
