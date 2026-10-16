import type { CardAttribute, CardDef, CardTag } from '../data/types.ts';

/**
 * Reloj Solar: el día tiene 4 fases y cada una dura 2 turnos (uno de cada jugador).
 *   turnos 1-2 Alba · 3-4 Mediodía · 5-6 Ocaso · 7-8 Medianoche · 9-10 Alba otra vez…
 * Ocaso y Medianoche cuentan como NOCHE (para efectos "de noche" y para los nahuales).
 */
export const TIME_PHASES = ['alba', 'mediodia', 'ocaso', 'medianoche'] as const;
export type TimePhase = (typeof TIME_PHASES)[number];
export const TURNS_PER_PHASE = 2;

/** Bono de una fase: a quién (por atributo o etiqueta; si no dice, a todos) y cuánto. */
export interface PhaseBonus {
  readonly attribute?: CardAttribute;
  readonly tag?: CardTag;
  readonly atk: number;
}

export interface PhaseInfo {
  readonly name: string;
  readonly icon: string;
  readonly night: boolean;
  readonly bonuses: readonly PhaseBonus[];
}

export const PHASE_INFO: Record<TimePhase, PhaseInfo> = {
  alba:       { name: 'Alba',       icon: '🌅', night: false, bonuses: [{ attribute: 'tierra', atk: 200 }] },
  mediodia:   { name: 'Mediodía',   icon: '☀', night: false, bonuses: [{ attribute: 'sol', atk: 300 }] },
  ocaso:      { name: 'Ocaso',      icon: '🌇', night: true,  bonuses: [{ attribute: 'viento', atk: 200 }] },
  medianoche: { name: 'Medianoche', icon: '☾', night: true,  bonuses: [{ attribute: 'agua', atk: 300 }, { tag: 'muerte', atk: 300 }, { attribute: 'sol', atk: -200 }] },
};

export function phaseOf(turn: number): TimePhase {
  return TIME_PHASES[Math.floor((Math.max(1, turn) - 1) / TURNS_PER_PHASE) % TIME_PHASES.length];
}

export const isNightTurn = (turn: number): boolean => PHASE_INFO[phaseOf(turn)].night;

/** Turnos que faltan para que cambie la fase (1 = cambia al terminar este turno). */
export function turnsLeftInPhase(turn: number): number {
  return TURNS_PER_PHASE - ((Math.max(1, turn) - 1) % TURNS_PER_PHASE);
}

/** Cuánto ATK le da la fase a una carta (puede ser negativo). */
export function phaseAtkBonus(phase: TimePhase, card: CardDef): number {
  return PHASE_INFO[phase].bonuses.reduce((sum, b) => sum + (matches(card, b) ? b.atk : 0), 0);
}

function matches(card: CardDef, b: { attribute?: CardAttribute; tag?: CardTag }): boolean {
  if (b.attribute && card.attribute !== b.attribute) return false;
  if (b.tag && !card.tags.includes(b.tag)) return false;
  return true;
}

/** Texto corto de los bonos de una fase: "Sol +300 ATK". */
export function describePhase(phase: TimePhase): string {
  return PHASE_INFO[phase].bonuses.map(b => `${label(b)} ${b.atk > 0 ? '+' : ''}${b.atk} ATK`).join(' · ');
}

export function label(b: { attribute?: CardAttribute; tag?: CardTag }): string {
  const attr: Record<CardAttribute, string> = { sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra' };
  if (b.attribute) return attr[b.attribute];
  if (b.tag) return `cartas de ${b.tag}`;
  return 'todos';
}

export { matches as matchesFilter };
