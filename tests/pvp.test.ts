import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent, PlayerIndex } from '../src/core/DuelState.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { newProfile } from '../src/game/profile.ts';
import { createPvpDuel, pvpFirstPlayer, replayPvp, type PvpSetup } from '../src/game/replay.ts';
import { checkPvpDeck, pvpMove, pvpTurnOf, roomCode, type PvpMatchData } from '../src/server/rules.ts';

const deck = newProfile().deck;
const setup = (seed: number): PvpSetup => ({ seed, decks: [deck, deck], levels: [{ 2: 3 }, {}] });

/** Dos "jugadores" (la IA en ambos lados) juegan y se guardan TODAS las jugadas aceptadas. */
function playPvp(seed: number) {
  const engine = createPvpDuel(setup(seed), cardDb, fusionDb);
  engine.start();
  const intents: Intent[] = [];
  for (let guard = 0; engine.state.winner === null && guard < 5000; guard++) {
    const p = engine.state.turnPlayer;
    let it: Intent = nextAiIntent(engine.state, p, fusionDb);
    let r = engine.apply(it);
    if (!r.ok) { it = { type: 'endTurn', player: p }; r = engine.apply(it); }
    if (r.ok) intents.push(it);
  }
  return { intents, winner: engine.state.winner };
}

const match = (seed: number, intents: unknown[] = []): PvpMatchData => ({
  seed, host_deck: deck, guest_deck: deck, host_levels: { 2: 3 }, guest_levels: {}, intents,
});

describe('multijugador', () => {
  it('quién empieza depende de la semilla (ambos casos existen)', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => pvpFirstPlayer(i * 7919)));
    expect(firsts).toEqual(new Set([0, 1]));
  });

  it('la repetición da el mismo ganador, jugada por jugada', () => {
    for (const seed of [11, 222, 3333]) {
      const game = playPvp(seed);
      const r = replayPvp(setup(seed), JSON.parse(JSON.stringify(game.intents)), cardDb, fusionDb);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.winner).toBe(game.winner);
    }
  });

  it('el servidor acepta jugadas una por una y detecta al ganador', () => {
    const seed = 222;
    const game = playPvp(seed);
    let saved: unknown[] = [];
    let winner: PlayerIndex | null = null;
    for (const it of game.intents) {
      const r = pvpMove(match(seed, saved), it.player, it);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      saved = r.value.intents;
      winner = r.value.winner;
    }
    expect(winner).toBe(game.winner);
  });

  it('no puedes jugar por tu rival ni jugar fuera de tu turno', () => {
    const seed = 222;
    const first = pvpFirstPlayer(seed);
    const other: PlayerIndex = first === 0 ? 1 : 0;
    expect(pvpMove(match(seed), first, { type: 'endTurn', player: other }).ok).toBe(false);   // jugada a nombre del otro
    expect(pvpMove(match(seed), other, { type: 'endTurn', player: other }).ok).toBe(false);   // no es su turno
    expect(pvpMove(match(seed), first, { type: 'endTurn', player: first }).ok).toBe(true);
    expect(pvpMove(match(seed), other, { type: 'surrender', player: other }).ok).toBe(true);   // rendirse, cuando sea
    expect(pvpMove(match(seed), first, 'basura').ok).toBe(false);
  });

  it('turno actual (para el tiempo límite)', () => {
    const seed = 222;
    const first = pvpFirstPlayer(seed);
    expect(pvpTurnOf(match(seed))).toBe(first);
    expect(pvpTurnOf(match(seed, [{ type: 'endTurn', player: first }]))).toBe(first === 0 ? 1 : 0);
  });

  it('mazo y código de sala', () => {
    const p = newProfile();
    expect(checkPvpDeck(p.deck, p.collection).ok).toBe(true);
    expect(checkPvpDeck(p.deck.slice(0, 30), p.collection).ok).toBe(false);
    expect(roomCode(() => 0)).toBe('AAAAA');
    expect(roomCode()).toMatch(/^[A-HJ-NP-Z]{5}$/);
  });
});
