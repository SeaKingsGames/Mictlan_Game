import type { BattlePosition, CardInstance } from './CardInstance.ts';

export type PlayerIndex = 0 | 1;
export type Phase = 'main' | 'battle' | 'ended';

export const FIELD_SLOTS = 5;

export interface PlayerState {
  life: number;
  deck: CardInstance[];
  hand: CardInstance[];
  field: (CardInstance | null)[];   // 5 zonas de monstruo
  mictlan: CardInstance[];          // cementerio
}

export interface DuelState {
  players: [PlayerState, PlayerState];
  turnPlayer: PlayerIndex;
  turn: number;                     // 1, 2, 3... (contando ambos jugadores)
  phase: Phase;
  hasPlayedThisTurn: boolean;       // como YGOFM: una jugada (carta o fusión) por turno
  winner: PlayerIndex | null;
}

/** Lo que un jugador QUIERE hacer. El motor decide si se puede. */
export type Intent =
  | {
      type: 'play';
      player: PlayerIndex;
      handIds: number[];            // en orden: cadena de fusión (1 = carta sola)
      slot: number;                 // 0-4; si está ocupada, ese monstruo es el primer material
      position: BattlePosition;
      faceDown?: boolean;
    }
  | { type: 'attack'; player: PlayerIndex; attackerId: number; targetId: number | null }
  | { type: 'endTurn'; player: PlayerIndex }
  | { type: 'surrender'; player: PlayerIndex };   // se puede en cualquier turno

/** Lo que pasó. La UI anima esto en orden; por red viaja esta lista. */
export type DuelEvent =
  | { type: 'turnStarted'; player: PlayerIndex; turn: number }
  | { type: 'cardsDrawn'; player: PlayerIndex; instanceIds: number[] }
  | { type: 'cardPlayed'; player: PlayerIndex; instanceId: number; slot: number; position: BattlePosition; faceDown: boolean }
  | { type: 'fusion'; player: PlayerIndex; materialIds: [number, number]; resultId: number }
  | { type: 'fusionFailed'; player: PlayerIndex; discardedId: number }
  | { type: 'sentToMictlan'; instanceId: number; reason: 'battle' | 'fusionFailed' | 'material' }
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'attackDeclared'; attackerId: number; targetId: number | null }
  | { type: 'flipped'; instanceId: number }
  | { type: 'damage'; player: PlayerIndex; amount: number; lifeAfter: number }
  | { type: 'gameOver'; winner: PlayerIndex; reason: 'life' | 'deckOut' | 'surrender' };

export type ApplyResult = { ok: true; events: DuelEvent[] } | { ok: false; error: string };

export const opponentOf = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);
