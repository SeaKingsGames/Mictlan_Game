import { CARD_TAGS, DECK_SIZE, EFFECT_TARGETS, EFFECT_TRIGGERS, MAX_COPIES, type CardDef, type DeckDef } from './types.ts';

/**
 * Registro de todas las cartas. Por red y en la base de datos solo viaja el ID;
 * aquí se traduce de vuelta a la definición.
 */
export class CardDatabase {
  private readonly byId = new Map<number, CardDef>();

  constructor(cards: readonly CardDef[]) {
    for (const raw of cards) {
      const problems = validateCard(raw);
      if (problems.length) throw new Error(`Carta inválida "${raw.name}" (id ${raw.id}): ${problems.join('; ')}`);
      if (this.byId.has(raw.id)) {
        throw new Error(`ID duplicado ${raw.id}: "${raw.name}" y "${this.byId.get(raw.id)!.name}"`);
      }
      // freeze = nadie puede modificar la definición en runtime por accidente
      this.byId.set(raw.id, Object.freeze({ ...raw, tags: Object.freeze([...raw.tags]), effects: raw.effects ? Object.freeze([...raw.effects]) : undefined }));
    }
  }

  get size(): number { return this.byId.size; }

  all(): CardDef[] { return [...this.byId.values()].sort((a, b) => a.id - b.id); }

  tryGet(id: number): CardDef | undefined { return this.byId.get(id); }

  get(id: number): CardDef {
    const card = this.byId.get(id);
    if (!card) throw new Error(`No existe la carta con id ${id}`);
    return card;
  }

  /** Lista de problemas del mazo (vacía = mazo válido). */
  validateDeck(deck: DeckDef): string[] {
    const errors: string[] = [];
    if (deck.cards.length > DECK_SIZE) errors.push(`tiene ${deck.cards.length} cartas (máximo ${DECK_SIZE})`);
    const counts = new Map<number, number>();
    for (const id of deck.cards) {
      if (!this.byId.has(id)) errors.push(`id ${id} no existe`);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, n] of counts) {
      if (n > MAX_COPIES) errors.push(`${n} copias de "${this.tryGet(id)?.name ?? id}" (máximo ${MAX_COPIES})`);
    }
    return errors;
  }
}

function validateCard(c: CardDef): string[] {
  const p: string[] = [];
  if (!Number.isInteger(c.id) || c.id <= 0) p.push('id debe ser entero > 0');
  if (!c.name?.trim()) p.push('falta nombre');
  if (c.atk < 0 || c.def < 0) p.push('ATK/DEF no pueden ser negativos');
  for (const t of c.tags) if (!CARD_TAGS.includes(t)) p.push(`etiqueta desconocida "${t}"`);
  const actionTypes = ['modifyAtk', 'modifyDef', 'damage', 'heal', 'draw', 'destroy', 'revive', 'negateAttack'];
  const conditionTypes = ['isNight', 'isDay', 'lifeBelow', 'hasTagOnField', 'opponentHasMoreMonsters'];
  for (const e of c.effects ?? []) {
    if (!EFFECT_TRIGGERS.includes(e.trigger)) p.push(`efecto con trigger desconocido "${e.trigger}"`);
    if (!Array.isArray(e.actions) || e.actions.length === 0) p.push('efecto sin acciones');
    for (const cond of e.conditions ?? []) if (!conditionTypes.includes(cond.type)) p.push(`condición desconocida "${cond.type}"`);
    for (const a of e.actions ?? []) {
      if (!actionTypes.includes(a.type)) p.push(`acción desconocida "${a.type}"`);
      if ('target' in a && !EFFECT_TARGETS.includes(a.target)) p.push(`objetivo desconocido "${a.target}"`);
      if ('tag' in a && a.tag && !CARD_TAGS.includes(a.tag)) p.push(`etiqueta desconocida "${a.tag}" en un efecto`);
    }
    if (e.trigger === 'onActivate' && c.type === 'monster') p.push('un monstruo no puede tener efecto onActivate');
  }
  if ((c.type === 'spell' || c.type === 'equip') && !(c.effects ?? []).some(e => e.trigger === 'onActivate')) {
    p.push('las mágicas y equipos necesitan un efecto onActivate');
  }
  if (c.type === 'trap' && !(c.effects ?? []).some(e => e.trigger === 'onOpponentAttack')) {
    p.push('las trampas necesitan un efecto onOpponentAttack');
  }
  return p;
}
