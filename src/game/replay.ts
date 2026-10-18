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
  /** Nivel de tus cartas al empezar el duelo (id → nivel). */
  levels?: Readonly<Record<number, number>>;
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

export function createDuel(
  seed: number, playerDeck: readonly number[], opponent: Duelist, db: CardDatabase, fusion: FusionResolver,
  levels?: Readonly<Record<number, number>>,
): DuelEngine {
  return new DuelEngine({ db, decks: [playerDeck, opponent.deck], seed, firstPlayer: HUMAN, fusion, signs: daySigns, levels: [levels] });
}

export function replayDuel(input: ReplayInput, db: CardDatabase, fusion: FusionResolver): ReplayResult {
  // Rendirse siempre es derrota (y puede pasar en el turno del rival): no hace falta repetir nada.
  if (input.intents.some(i => i?.type === 'surrender')) return { ok: true, winner: AI, turns: 0 };
  const engine = createDuel(input.seed, input.playerDeck, input.opponent, db, fusion, input.levels);
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

// ---------------------------------------------------------------- multijugador (jugador contra jugador)

export interface PvpSetup {
  seed: number;
  decks: [readonly number[], readonly number[]];          // 0 = quien creó la sala, 1 = quien se unió
  levels: [Readonly<Record<number, number>>?, Readonly<Record<number, number>>?];
}

/** Quién empieza: lo decide la semilla (así nadie elige). */
export const pvpFirstPlayer = (seed: number): PlayerIndex => ((seed >>> 3) & 1) as PlayerIndex;

/** Crea el duelo PvP. Ambos navegadores y el servidor lo crean igual. */
export function createPvpDuel(setup: PvpSetup, db: CardDatabase, fusion: FusionResolver): DuelEngine {
  return new DuelEngine({
    db, decks: setup.decks, seed: setup.seed, firstPlayer: pvpFirstPlayer(setup.seed),
    fusion, signs: daySigns, levels: setup.levels,
  });
}

export type PvpReplay =
  | { ok: true; engine: DuelEngine; winner: PlayerIndex | null }
  | { ok: false; error: string; at: number };

/** Repite todas las jugadas de una partida PvP. Si alguna no es válida, dice cuál. */
export function replayPvp(setup: PvpSetup, intents: readonly Intent[], db: CardDatabase, fusion: FusionResolver): PvpReplay {
  const engine = createPvpDuel(setup, db, fusion);
  engine.start();
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    if (engine.state.winner !== null) return { ok: false, error: 'El duelo ya terminó', at: i };
    if (!intent || (intent.player !== 0 && intent.player !== 1)) return { ok: false, error: 'Jugada inválida', at: i };
    const r = engine.apply(intent);
    if (!r.ok) return { ok: false, error: r.error, at: i };
  }
  return { ok: true, engine, winner: engine.state.winner };
}
