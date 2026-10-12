import type { BattlePosition, CardInstance } from './CardInstance.ts';

export type PlayerIndex = 0 | 1;
export type Phase = 'main' | 'battle' | 'ended';

export const FIELD_SLOTS = 5;

export interface PlayerState {
  life: number;
  deck: CardInstance[];
  hand: CardInstance[];
  field: (CardInstance | null)[];   // 5 zonas de monstruo
  support: (CardInstance | null)[]; // 5 zonas de apoyo (trampas boca abajo)
  mictlan: CardInstance[];          // cementerio
}

export interface DuelState {
  players: [PlayerState, PlayerState];
  turnPlayer: PlayerIndex;
  turn: number;                     // 1, 2, 3... (contando ambos jugadores)
  phase: Phase;
  /** Por turno: primero (opcional) UNA mágica/equipo/trampa, y luego UN monstruo o fusión. */
  supportUsedThisTurn: boolean;
  monsterPlayedThisTurn: boolean;   // después de bajar monstruo ya no se usan mágicas ni trampas
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
      fusionChoices?: number[];     // IDs de carta elegidos cuando una fusión tiene varias opciones
    }
  | { type: 'activate'; player: PlayerIndex; handId: number; targetId?: number; slot?: number }  // mágica, equipo o trampa
  | { type: 'changePosition'; player: PlayerIndex; instanceId: number }
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
  | { type: 'sentToMictlan'; instanceId: number; reason: 'battle' | 'fusionFailed' | 'material' | 'effect' | 'used' }
  | { type: 'activated'; player: PlayerIndex; instanceId: number; targetId: number | null }
  | { type: 'effect'; instanceId: number; trigger: string }
  | { type: 'statChanged'; instanceId: number; atk: number; def: number }
  | { type: 'healed'; player: PlayerIndex; amount: number; lifeAfter: number }
  | { type: 'revived'; instanceId: number; slot: number }
  | { type: 'timeChanged'; night: boolean }
  | { type: 'trapSet'; player: PlayerIndex; slot: number; instanceId: number }   // la UI la oculta al rival
  | { type: 'trapActivated'; player: PlayerIndex; instanceId: number; attackerId: number }
  | { type: 'attackNegated'; attackerId: number }
  | { type: 'positionChanged'; instanceId: number; position: BattlePosition; flipped: boolean }
  | { type: 'phaseChanged'; phase: Phase }
  | { type: 'attackDeclared'; attackerId: number; targetId: number | null }
  | { type: 'flipped'; instanceId: number }
  | { type: 'damage'; player: PlayerIndex; amount: number; lifeAfter: number }
  | { type: 'gameOver'; winner: PlayerIndex; reason: 'life' | 'deckOut' | 'surrender' };

export type ApplyResult = { ok: true; events: DuelEvent[] } | { ok: false; error: string };

export const opponentOf = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);

/** Ciclo Día/Noche: cambia cada 2 turnos (turnos 1-2 día, 3-4 noche, 5-6 día...). */
export const isNightTurn = (turn: number): boolean => Math.floor((turn - 1) / 2) % 2 === 1;
