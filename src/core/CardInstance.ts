import type { CardDef, Keyword } from '../data/types.ts';
import { clampLevel, levelBonus } from './progression.ts';

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
  /** Nivel de la carta en la colección de su dueño (1-5). Las fusiones nacen en nivel 1. */
  level = 1;
  /** Ataques hechos este turno (con "ataca dos veces" puede ser 2). */
  attacksThisTurn = 0;
  /** "No puede ser destruido en batalla (una vez)": ya se usó. */
  battleImmuneUsed = false;
  /** Robado con "tomar el control": regresa a su dueño al final del turno. */
  borrowed = false;

  private keywords: { keyword: Keyword; untilEndOfTurn: boolean; aura: boolean }[] = [];

  private modifiers: StatModifier[] = [];

  constructor(instanceId: number, owner: 0 | 1, def: CardDef) {
    this.instanceId = instanceId;
    this.owner = owner;
    this.def = def;
  }

  /** Stats base de la forma actual (de noche, la del nahual). */
  get baseAtk(): number { return (this.nightForm && this.def.nahual ? this.def.nahual.atk : this.def.atk) + this.levelStats; }
  get baseDef(): number { return (this.nightForm && this.def.nahual ? this.def.nahual.def : this.def.def) + this.levelStats; }
  /** +100 ATK/DEF por nivel arriba del 1 (solo monstruos). */
  get levelStats(): number { return this.def.type === 'monster' ? levelBonus(clampLevel(this.level)) : 0; }
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
    this.keywords = this.keywords.filter(k => !k.aura);
  }

  clearEndOfTurnModifiers(): void {
    this.modifiers = this.modifiers.filter(m => !m.untilEndOfTurn);
    this.keywords = this.keywords.filter(k => !k.untilEndOfTurn);
  }

  addKeyword(keyword: Keyword, untilEndOfTurn = false, aura = false): void {
    this.keywords.push({ keyword, untilEndOfTurn, aura });
  }

  hasKeyword(keyword: Keyword): boolean {
    return this.keywords.some(k => k.keyword === keyword);
  }

  get activeKeywords(): Keyword[] { return [...new Set(this.keywords.map(k => k.keyword))]; }

  /** Cuántas veces puede atacar por turno. */
  get maxAttacks(): number { return this.hasKeyword('doubleAttack') ? 2 : 1; }

  /** Al salir del campo pierde buffs y estado de batalla. */
  resetForZoneChange(): void {
    this.modifiers = [];
    this.keywords = [];
    this.attacksThisTurn = 0;
    this.battleImmuneUsed = false;
    this.borrowed = false;
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
