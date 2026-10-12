// Tipos de datos de diseño (lo que en Unity eran ScriptableObjects).
// Son de SOLO LECTURA en partida: lo que cambia vive en CardInstance.

export type CardType = 'monster' | 'spell' | 'equip' | 'trap' | 'ritual';

// Los 4 rumbos. Ventaja cíclica: sol > viento > agua > tierra > sol
export type CardAttribute = 'sol' | 'viento' | 'agua' | 'tierra';

export const CARD_TAGS = [
  'jaguar', 'guerrero', 'bestia', 'serpiente', 'deidad', 'ave',
  'agua', 'muerte', 'sol', 'fuego', 'viento',
] as const;
export type CardTag = (typeof CARD_TAGS)[number];

/** Rareza: N normal · R rara · SR súper rara · UR ultra rara. */
export const RARITIES = ['N', 'R', 'SR', 'UR'] as const;
export type CardRarity = (typeof RARITIES)[number];
export const RARITY_LABEL: Record<CardRarity, string> = { N: 'Normal', R: 'Rara', SR: 'Súper rara', UR: 'Ultra rara' };

export interface CardDef {
  readonly id: number;          // único, > 0. Es lo único que viaja por red / BD
  readonly name: string;
  readonly description: string;
  readonly type: CardType;
  readonly attribute: CardAttribute;
  readonly tags: readonly CardTag[];  // para las reglas genéricas de fusión
  readonly atk: number;
  readonly def: number;
  readonly art?: string;        // ruta de la imagen (public/cards/...)
  readonly rarity?: CardRarity; // si falta, cuenta como N
  readonly effects?: readonly EffectDef[];
}

// ---------------------------------------------------------------- efectos (datos)

/** Cuándo se activa un efecto. */
export const EFFECT_TRIGGERS = [
  'onSummon',        // al quedar boca arriba en el campo (normal o por fusión)
  'onFusionSummon',  // solo si salió por fusión
  'onAttack',        // al declarar un ataque (antes de calcular el daño)
  'onDestroyed',     // al ser destruido
  'onTurnStart',     // al empezar el turno de su dueño, si está en el campo
  'continuous',      // mientras esté boca arriba en el campo (auras)
  'onActivate',      // mágicas y equipos: al jugarlas
  'onOpponentAttack', // trampas: cuando el rival declara un ataque contra ti
] as const;
export type EffectTrigger = (typeof EFFECT_TRIGGERS)[number];

/** A quién afecta. Siempre relativo al dueño de la carta con el efecto. */
export const EFFECT_TARGETS = [
  'self', 'equipTarget', 'allAllies', 'otherAllies', 'alliesWithTag', 'otherAlliesWithTag',
  'allEnemies', 'highestAtkEnemy', 'lowestAtkEnemy', 'attacker',
] as const;
export type EffectTarget = (typeof EFFECT_TARGETS)[number];

export type EffectCondition =
  | { type: 'isNight' }
  | { type: 'isDay' }
  | { type: 'lifeBelow'; amount: number }               // la vida del dueño es menor a
  | { type: 'hasTagOnField'; tag: CardTag }             // el dueño tiene otro monstruo con esa etiqueta
  | { type: 'opponentHasMoreMonsters' };

export type EffectAction =
  | { type: 'modifyAtk'; amount: number; target: EffectTarget; tag?: CardTag; untilEndOfTurn?: boolean }
  | { type: 'modifyDef'; amount: number; target: EffectTarget; tag?: CardTag; untilEndOfTurn?: boolean }
  | { type: 'damage'; amount: number; who: 'opponent' | 'self' }
  | { type: 'heal'; amount: number }
  | { type: 'draw'; amount: number }
  | { type: 'destroy'; target: EffectTarget; tag?: CardTag }
  | { type: 'revive'; tag?: CardTag }                   // el más fuerte de tu Mictlán (con esa etiqueta) vuelve al campo
  | { type: 'negateAttack' };                           // trampas: el ataque no sucede

export interface EffectDef {
  readonly trigger: EffectTrigger;
  readonly conditions?: readonly EffectCondition[];
  readonly actions: readonly EffectAction[];
}

/** Mágicas, equipos y trampas: van en la fila de apoyo (◈). */
export const isSupportCard = (card: CardDef): boolean => card.type === 'spell' || card.type === 'equip' || card.type === 'trap';

export const needsEquipTarget = (card: CardDef): boolean =>
  card.type === 'equip' ||
  (card.effects ?? []).some(e => e.actions.some(a => 'target' in a && a.target === 'equipTarget'));

export interface DeckDef {
  readonly id: string;
  readonly name: string;
  readonly cards: readonly number[];  // IDs de carta
}

export const DECK_SIZE = 40;   // igual que YGOFM
export const MAX_COPIES = 3;
export const HAND_SIZE = 5;
export const START_LIFE = 8000;

export const rarityOf = (card: CardDef): CardRarity => card.rarity ?? 'N';

export const hasTag = (card: CardDef, tag: CardTag): boolean => card.tags.includes(tag);
