import { nextAiIntent } from '../ai/aiPlayer.ts';
import { DuelEngine } from '../core/DuelEngine.ts';
import type { Intent, PlayerIndex } from '../core/DuelState.ts';
import type { FusionResolver } from '../core/fusion.ts';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { daySigns } from '../data/index.ts';
import type { Duelist } from './duelists.ts';

/**
 * Repetir un duelo contra la IA para comprobar quién ganó.
 *
 * El servidor da la semilla; el cliente juega y guarda SOLO sus jugadas (las que el motor aceptó).
 * El servidor vuelve a jugar el duelo con el mismo motor, la misma IA y la misma semilla:
 * si las jugadas no encajan o el resultado no es una victoria real, no hay recompensa.
 * Así nadie puede darse premios editando el navegador.
 */
export interface ReplayInput {
  seed: number;
  playerDeck: readonly number[];
  opponent: Duelist;
  intents: readonly Intent[];
}

export type ReplayResult =
  | { ok: true; winner: PlayerIndex | null; turns: number }
  | { ok: false; error: string };

const HUMAN: PlayerIndex = 0;
const AI: PlayerIndex = 1;

/** La IA que usa un duelista (cliente y servidor DEBEN usar esta misma función). */
export function aiFusionFor(opponent: Duelist, fusion: FusionResolver): FusionResolver | undefined {
  return opponent.level >= 2 ? fusion : undefined;
}

/** Un paso de la IA: si su jugada no es válida, termina su turno (nunca se atora). */
export function aiStep(engine: DuelEngine, opponent: Duelist, fusion: FusionResolver) {
  let result = engine.apply(nextAiIntent(engine.state, AI, aiFusionFor(opponent, fusion)));
  if (!result.ok) result = engine.apply({ type: 'endTurn', player: AI });
  return result;
}

export function createDuel(seed: number, playerDeck: readonly number[], opponent: Duelist, db: CardDatabase, fusion: FusionResolver): DuelEngine {
  return new DuelEngine({ db, decks: [playerDeck, opponent.deck], seed, firstPlayer: HUMAN, fusion, signs: daySigns });
}

export function replayDuel(input: ReplayInput, db: CardDatabase, fusion: FusionResolver): ReplayResult {
  // Rendirse siempre es derrota (y puede pasar en el turno del rival): no hace falta repetir nada.
  if (input.intents.some(i => i?.type === 'surrender')) return { ok: true, winner: AI, turns: 0 };
  const engine = createDuel(input.seed, input.playerDeck, input.opponent, db, fusion);
  engine.start();
  let next = 0;
  let guard = 0;
  while (engine.state.winner === null && guard++ < 20000) {
    if (engine.state.turnPlayer === AI) {
      aiStep(engine, input.opponent, fusion);
      continue;
    }
    const intent = input.intents[next];
    if (!intent) break;                      // el jugador dejó de jugar: duelo sin terminar
    next++;
    if (intent.player !== HUMAN) return { ok: false, error: `La jugada ${next} no es del jugador` };
    const result = engine.apply(intent);
    if (!result.ok) return { ok: false, error: `La jugada ${next} no es válida: ${result.error}` };
  }
  // Jugadas de sobra después del final = algo raro (excepto que no haya ninguna)
  if (engine.state.winner !== null && next < input.intents.length) {
    return { ok: false, error: 'Hay jugadas después de que terminó el duelo' };
  }
  return { ok: true, winner: engine.state.winner, turns: engine.state.turn };
}
