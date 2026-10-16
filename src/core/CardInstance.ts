import type { CardDef } from '../data/types.ts';

export type Zone = 'deck' | 'hand' | 'field' | 'mictlan'; // mictlan = cementerio
export type BattlePosition = 'attack' | 'defense';

/** Modificador de estadísticas (lo aplican efectos y equipos). */
export interface StatModifier {
  readonly atk: number;
  readonly def: number;
  readonly sourceId: number;        // instancia que lo causó (para quitarlo si se va)
  readonly untilEndOfTurn: boolean;
  readonly aura?: boolean;          // de un efecto continuo: se recalcula siempre
}

/**
 * Una carta concreta dentro de un duelo. TypeScript puro: sin DOM ni Supabase.
 * La definición nunca se modifica; todo cambio vive aquí.
 */
export class CardInstance {
  readonly instanceId: number;
  readonly owner: 0 | 1;
  readonly def: CardDef;

  zone: Zone = 'deck';
  fieldSlot = -1;                   // 0-4 cuando está en el campo
  position: BattlePosition = 'attack';
  faceDown = false;
  hasAttackedThisTurn = false;
  positionChangedThisTurn = false;
  summonedThisTurn = false;
  /** Nahual en forma de noche (lo decide el motor según el Reloj Solar). */
  nightForm = false;

  private modifiers: StatModifier[] = [];

  constructor(instanceId: number, owner: 0 | 1, def: CardDef) {
    this.instanceId = instanceId;
    this.owner = owner;
    this.def = def;
  }

  /** Stats base de la forma actual (de noche, la del nahual). */
  get baseAtk(): number { return this.nightForm && this.def.nahual ? this.def.nahual.atk : this.def.atk; }
  get baseDef(): number { return this.nightForm && this.def.nahual ? this.def.nahual.def : this.def.def; }
  /** Nombre que se ve (de noche, el del nahual). */
  get name(): string { return this.nightForm && this.def.nahual ? this.def.nahual.name : this.def.name; }

  get atk(): number {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.atk, this.baseAtk));
  }

  get defense(): number {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.def, this.baseDef));
  }

  get activeModifiers(): readonly StatModifier[] { return this.modifiers; }

  addModifier(mod: StatModifier): void { this.modifiers.push(mod); }

  removeModifiersFrom(sourceId: number): void {
    this.modifiers = this.modifiers.filter(m => m.sourceId !== sourceId);
  }

  clearAuraModifiers(): void {
    this.modifiers = this.modifiers.filter(m => !m.aura);
  }

  clearEndOfTurnModifiers(): void {
    this.modifiers = this.modifiers.filter(m => !m.untilEndOfTurn);
  }

  /** Al salir del campo pierde buffs y estado de batalla. */
  resetForZoneChange(): void {
    this.modifiers = [];
    this.fieldSlot = -1;
    this.faceDown = false;
    this.hasAttackedThisTurn = false;
    this.positionChangedThisTurn = false;
    this.summonedThisTurn = false;
    this.nightForm = false;
    this.position = 'attack';
  }

  toString(): string {
    return `#${this.instanceId} ${this.name} ${this.atk}/${this.defense} [${this.zone}]`;
  }
}
