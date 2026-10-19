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
  /** Nahual: de NOCHE (Ocaso y Medianoche) esta carta toma su forma animal en el campo. */
  readonly nahual?: NahualForm;
  /** Ascensión: con 3 copias de esta carta se hace un ritual y se convierten en 1 de esta otra (id). */
  readonly ascendsTo?: number;
  /** true = nunca sale como resultado de una fusión GENÉRICA (solo por receta, sobres o premios). */
  readonly noFusion?: boolean;
  /**
   * Recetas: parejas EXACTAS de cartas que, fusionadas, dan esta carta. Ej. [[15, 4]] = carta 15 + carta 4.
   * Se editan en el editor de cartas ("Cómo surge esta carta").
   */
  readonly recipes?: readonly (readonly [number, number])[];
}

export interface NahualForm {
  readonly name: string;
  readonly atk: number;
  readonly def: number;
  readonly description?: string;
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
  'onOpponentSummon', // trampas: cuando el rival invoca un monstruo boca arriba
  'onOpponentFusion', // trampas: cuando el rival invoca por fusión
  'onBattleDestroy',  // al destruir a un monstruo rival en batalla
  'onDirectDamage',   // al hacer daño con un ataque directo
  'onAttacked',       // al ser atacado (antes del combate)
  'onFusionMaterial', // al usarse como material de fusión
] as const;
export type EffectTrigger = (typeof EFFECT_TRIGGERS)[number];

/** A quién afecta. Siempre relativo al dueño de la carta con el efecto. */
export const EFFECT_TARGETS = [
  'self', 'equipTarget', 'allAllies', 'otherAllies', 'alliesWithTag', 'otherAlliesWithTag',
  'allEnemies', 'highestAtkEnemy', 'lowestAtkEnemy', 'attacker',
  'randomEnemy',   // un monstruo rival al azar
  'randomMonster', // cualquier monstruo del campo al azar (¡puede ser tuyo!)
  'allMonsters',   // TODOS los monstruos del campo (Agujero Negro)
  'summoned',      // trampas de invocación: el monstruo que el rival acaba de invocar
] as const;
export type EffectTarget = (typeof EFFECT_TARGETS)[number];

export type EffectCondition =
  | { type: 'isNight' }
  | { type: 'isDay' }
  | { type: 'isPhase'; phase: 'alba' | 'mediodia' | 'ocaso' | 'medianoche' }   // fase exacta del Reloj Solar
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
  | { type: 'negateAttack' }                            // trampas: el ataque no sucede
  // --- control del campo
  | { type: 'returnToHand'; target: EffectTarget; tag?: CardTag }        // regresa a la mano de su dueño
  | { type: 'forceDefense'; target: EffectTarget; tag?: CardTag }        // lo pone en defensa
  | { type: 'takeControl'; target: EffectTarget; tag?: CardTag }         // lo controlas hasta el final del turno
  | { type: 'preventAttack' }                                            // el rival no puede atacar en su siguiente turno
  // --- combate especial
  | { type: 'grantKeyword'; keyword: Keyword; target: EffectTarget; tag?: CardTag; untilEndOfTurn?: boolean }
  // --- campo, mazo y Mictlán
  | { type: 'destroySupport'; who: 'opponent' | 'all' }                  // destruye mágicas/trampas colocadas (Plumero)
  | { type: 'summonFromDeck'; maxAtk: number; tag?: CardTag; sameTag?: boolean };   // invoca de tu mazo un monstruo con ATK ≤ maxAtk

/** Habilidades de combate que un efecto puede dar. */
export const KEYWORDS = ['piercing', 'doubleAttack', 'directAttack', 'battleImmune'] as const;
export type Keyword = (typeof KEYWORDS)[number];

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
