import type { CardDatabase } from '../data/cardDatabase.ts';
import {
  HAND_SIZE, START_LIFE, isSupportCard, needsEquipTarget,
  type EffectAction, type EffectCondition, type EffectTarget, type EffectTrigger, type CardTag, type CardDef,
} from '../data/types.ts';
import { CardInstance } from './CardInstance.ts';
import { InstanceIdCounter, buildShuffledDeck } from './deck.ts';
import {
  FIELD_SLOTS, isNightTurn, opponentOf,
  type ApplyResult, type DuelEvent, type DuelState, type Intent, type PlayerIndex, type PlayerState,
} from './DuelState.ts';
import { signRules, signTotal, type DaySign } from './daySign.ts';
import { noFusions, planChain, type FusionResolver } from './fusion.ts';
import { scaleEffectAmount } from './progression.ts';
import { createRng } from './rng.ts';
import { matchesFilter, phaseAtkBonus, phaseOf, PHASE_INFO } from './time.ts';

/** Fuentes "del ambiente" para los modificadores (no son cartas). */
const SOURCE_ENVIRONMENT = -1;
const SOURCE_FUSION_SIGN = -2;

/** Si el primer jugador puede atacar en el turno 1. */
export const FIRST_TURN_CAN_ATTACK = false;

export interface DuelOptions {
  db: CardDatabase;
  decks: [readonly number[], readonly number[]];   // IDs de carta de cada jugador
  seed: number;
  firstPlayer?: PlayerIndex;
  fusion?: FusionResolver;
  /** Signos del día posibles. Si se pasan, el duelo elige uno con la semilla. */
  signs?: readonly DaySign[];
  /** Nivel de cada carta (id → nivel) para cada jugador. Si falta, todas son nivel 1. */
  levels?: [Readonly<Record<number, number>>?, Readonly<Record<number, number>>?];
}

/** Elige el signo del día con la semilla (sin tocar el orden de las barajas). */
export function pickDaySign(seed: number, signs: readonly DaySign[] | undefined): DaySign | null {
  if (!signs || signs.length === 0) return null;
  const rng = createRng((seed ^ 0x51a7e5) >>> 0);
  return signs[Math.floor(rng() * signs.length)] ?? null;
}

/**
 * El motor del duelo. TypeScript puro: lo usan el tablero HTML, la IA,
 * los tests y (Fase 4) la Edge Function de Supabase.
 * Regla: el estado SOLO cambia dentro de apply().
 */
/** Cartas que pueden ir en la cadena de fusión para equipar al monstruo (equipos y mágicas de "monstruo equipado"). */
export const isChainEquip = (def: CardDef): boolean => def.type !== 'trap' && def.type !== 'monster' && needsEquipTarget(def);

export class DuelEngine {
  readonly state: DuelState;
  private readonly db: CardDatabase;
  private readonly fusion: FusionResolver;
  private readonly ids = new InstanceIdCounter();
  private readonly cards = new Map<number, CardInstance>();
  private started = false;
  private effectDepth = 0;          // evita cadenas infinitas de efectos
  private attackNegated = false;
  /** Azar de los efectos ("al azar"): sale de la semilla, así el servidor lo repite igual. */
  private readonly effectRng: () => number;

  constructor(opts: DuelOptions) {
    this.db = opts.db;
    this.fusion = opts.fusion ?? noFusions;
    const rng = createRng(opts.seed);
    this.effectRng = createRng((opts.seed ^ 0x0a11ce5) >>> 0);
    const daySign = pickDaySign(opts.seed, opts.signs);
    const startLife = signRules(daySign, 'startLife').at(-1)?.amount ?? START_LIFE;
    const makePlayer = (p: PlayerIndex): PlayerState => {
      const deck = buildShuffledDeck(opts.decks[p], p, this.db, this.ids, rng);
      const levels = opts.levels?.[p];
      deck.forEach(c => { this.cards.set(c.instanceId, c); c.level = levels?.[c.def.id] ?? 1; });
      return { life: startLife, deck, hand: [], field: Array(FIELD_SLOTS).fill(null), support: Array(FIELD_SLOTS).fill(null), mictlan: [] };
    };
    this.state = {
      players: [makePlayer(0), makePlayer(1)],
      turnPlayer: opts.firstPlayer ?? 0,
      turn: 1,
      phase: 'main',
      supportUsedThisTurn: false,
      monsterPlayedThisTurn: false,
      winner: null,
      daySign,
      attackLockUntil: [0, 0],
    };
  }

  /** Reparte las manos y empieza el turno 1. */
  start(): DuelEvent[] {
    if (this.started) return [];
    this.started = true;
    const events: DuelEvent[] = [];
    for (const p of [0, 1] as const) this.refillHand(p, events);
    const extra = signTotal(this.state.daySign, 'extraDraw');
    if (extra > 0) for (const p of [0, 1] as const) this.drawCards(p, extra, events);
    events.push({ type: 'turnStarted', player: this.state.turnPlayer, turn: 1 });
    this.recomputeAuras();
    return events;
  }

  getCard(instanceId: number): CardInstance | undefined {
    return this.cards.get(instanceId);
  }

  apply(intent: Intent): ApplyResult {
    const s = this.state;
    if (!this.started) return fail('El duelo no ha empezado');
    if (s.winner !== null) return fail('El duelo ya terminó');
    if (intent.type === 'surrender') {
      const events: DuelEvent[] = [];
      this.finish(opponentOf(intent.player), 'surrender', events);
      return { ok: true, events };
    }
    if (intent.player !== s.turnPlayer) return fail('No es tu turno');

    const events: DuelEvent[] = [];
    let error: string | null = null;
    switch (intent.type) {
      case 'play': error = this.play(intent, events); break;
      case 'activate': error = this.activate(intent, events); break;
      case 'changePosition': error = this.changePosition(intent, events); break;
      case 'attack': error = this.attack(intent, events); break;
      case 'endTurn': error = this.endTurn(events); break;
    }
    if (error) return fail(error);
    this.recomputeAuras();
    return { ok: true, events };
  }

  // ---------------------------------------------------------------- jugar cartas

  private play(intent: Extract<Intent, { type: 'play' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== 'main') return 'Solo puedes jugar cartas en la fase principal';
    if (s.monsterPlayedThisTurn) return 'Ya bajaste un monstruo este turno';
    if (intent.handIds.length === 0) return 'Elige al menos una carta';
    if (new Set(intent.handIds).size !== intent.handIds.length) return 'Carta repetida en la cadena';
    if (!Number.isInteger(intent.slot) || intent.slot < 0 || intent.slot >= FIELD_SLOTS) return 'Zona inválida';

    const fromHand: CardInstance[] = [];
    const equips: CardInstance[] = [];
    for (const id of intent.handIds) {
      const card = me.hand.find(c => c.instanceId === id);
      if (!card) return 'Esa carta no está en tu mano';
      if (card.def.type === 'monster') fromHand.push(card);
      else if (isChainEquip(card.def)) equips.push(card);
      else return 'Solo monstruos y equipos van en la cadena de fusión; las mágicas y trampas van en tu fila de apoyo';
    }

    // Como en YGOFM: si la zona tiene un monstruo, ese es el primer material.
    const occupant = me.field[intent.slot];
    const firstHand = me.hand.find(c => c.instanceId === intent.handIds[0]);
    if (!occupant && firstHand && firstHand.def.type !== 'monster') return 'La cadena empieza con un monstruo; los equipos van después';
    if (!occupant && fromHand.length === 0) return 'Elige un monstruo para equiparlo';
    const chain = occupant ? [occupant, ...fromHand] : fromHand;
    const plan = planChain(this.fusion, chain.map(c => c.def), intent.fusionChoices ?? []);
    if (!plan.ok) return plan.error;

    // Validado: ahora sí se modifica el estado.
    s.monsterPlayedThisTurn = true;
    me.hand = me.hand.filter(c => !fromHand.includes(c) && !equips.includes(c));

    // Solo equipos sobre el monstruo que ya está en la zona: se queda donde está, con sus equipos
    if (occupant && fromHand.length === 0) {
      this.equipFromChain(occupant, equips, intent.player, events);
      return null;
    }
    me.field[intent.slot] = null;

    let current = chain[0];
    let fused = false;
    plan.steps.forEach((step, i) => {
      const next = chain[i + 1];
      if (step.result) {
        const fusedCard = new CardInstance(this.ids.take(), intent.player, step.result);
        this.cards.set(fusedCard.instanceId, fusedCard);
        events.push({ type: 'fusion', player: intent.player, materialIds: [current.instanceId, next.instanceId], resultId: fusedCard.instanceId });
        this.sendToMictlan(current, 'material', events);
        this.sendToMictlan(next, 'material', events);
        this.runEffects(current, 'onFusionMaterial', events);
        this.runEffects(next, 'onFusionMaterial', events);
        current = fusedCard;
        fused = true;
      } else {
        events.push({ type: 'fusionFailed', player: intent.player, discardedId: current.instanceId });
        this.sendToMictlan(current, 'fusionFailed', events);
        current = next;
      }
    });

    if (current !== occupant) current.resetForZoneChange();
    current.zone = 'field';
    current.fieldSlot = intent.slot;
    current.position = intent.position;
    // Boca abajo solo lo que bajas tal cual: las fusiones y los monstruos equipados salen boca arriba
    current.faceDown = !fused && equips.length === 0 && current !== occupant && (intent.faceDown ?? false);
    current.summonedThisTurn = true;
    me.field[intent.slot] = current;
    events.push({
      type: 'cardPlayed', player: intent.player, instanceId: current.instanceId,
      slot: intent.slot, position: current.position, faceDown: current.faceDown,
    });
    const fusionBonus = signTotal(s.daySign, 'fusionBonus');
    if (fused && fusionBonus) current.addModifier({ atk: fusionBonus, def: 0, sourceId: SOURCE_FUSION_SIGN, untilEndOfTurn: false });
    this.equipFromChain(current, equips, intent.player, events);
    if (!current.faceDown) {
      if (fused) this.runEffects(current, 'onFusionSummon', events);
      this.runEffects(current, 'onSummon', events);
      // Trampas del rival que responden a una invocación (o a una fusión)
      if (current.zone === 'field' && s.winner === null) {
        this.springTrap(opponentOf(intent.player), fused ? ['onOpponentFusion', 'onOpponentSummon'] : ['onOpponentSummon'], { summoned: current }, current.instanceId, events);
      }
    }
    return null;
  }

  /** Equipos de la cadena de fusión: se le ponen al monstruo que quedó (X + equipo + equipo). */
  private equipFromChain(target: CardInstance, equips: readonly CardInstance[], player: PlayerIndex, events: DuelEvent[]): void {
    for (const eq of equips) {
      if (target.zone !== 'field' || this.state.winner !== null) { this.sendToMictlan(eq, 'used', events); continue; }
      events.push({ type: 'activated', player, instanceId: eq.instanceId, targetId: target.instanceId });
      this.runEffects(eq, 'onActivate', events, { equipTarget: target });
      this.sendToMictlan(eq, 'used', events);
    }
  }

  /** Activa la primera trampa boca abajo de `defender` que responda a alguno de esos disparadores. */
  private springTrap(defender: PlayerIndex, triggers: EffectTrigger[], ctx: EffectContext, againstId: number, events: DuelEvent[]): boolean {
    const side = this.state.players[defender];
    for (const trap of side.support) {
      if (!trap) continue;
      const trigger = triggers.find(t => (trap.def.effects ?? []).some(e => e.trigger === t && this.conditionsMet(trap, e.conditions ?? [])));
      if (!trigger) continue;
      side.support[side.support.indexOf(trap)] = null;
      trap.faceDown = false;
      events.push({ type: 'trapActivated', player: defender, instanceId: trap.instanceId, attackerId: againstId });
      this.runEffects(trap, trigger, events, ctx);
      this.sendToMictlan(trap, 'used', events);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- mágicas y equipos

  private activate(intent: Extract<Intent, { type: 'activate' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== 'main') return 'Solo puedes usar mágicas y trampas en la fase principal';
    if (s.monsterPlayedThisTurn) return 'Después de bajar un monstruo ya no puedes usar mágicas ni trampas';
    if (s.supportUsedThisTurn) return 'Ya usaste una mágica o trampa este turno';
    // Una mágica o equipo que colocaste boca abajo antes: ahora se activa desde el campo
    const setSlot = me.support.findIndex(c => c?.instanceId === intent.handId);
    const fromField = setSlot >= 0 ? me.support[setSlot]! : null;
    const card = fromField ?? me.hand.find(c => c.instanceId === intent.handId);
    if (!card) return 'Esa carta no está en tu mano';
    if (!isSupportCard(card.def)) return 'Los monstruos se invocan en tus zonas de monstruo';
    if (fromField && fromField.def.type === 'trap') return 'Las trampas se activan solas cuando el rival hace algo';
    if (fromField && intent.set) return 'Esa carta ya está colocada';

    // Trampa (o mágica que decides colocar): boca abajo en tu fila de apoyo.
    if (!fromField && (card.def.type === 'trap' || intent.set)) {
      const slot = intent.slot ?? me.support.findIndex(c => c === null);
      if (!Number.isInteger(slot) || slot < 0 || slot >= FIELD_SLOTS) return 'No tienes zonas de apoyo libres';
      if (me.support[slot]) return 'Esa zona ya tiene una carta';
      s.supportUsedThisTurn = true;
      me.hand = me.hand.filter(c => c !== card);
      card.zone = 'field';
      card.faceDown = true;
      card.fieldSlot = slot;
      me.support[slot] = card;
      events.push({ type: 'trapSet', player: intent.player, slot, instanceId: card.instanceId });
      return null;
    }

    let target: CardInstance | undefined;
    if (needsEquipTarget(card.def)) {
      target = me.field.find((c): c is CardInstance => c !== null && c.instanceId === intent.targetId);
      if (!target) return 'Elige uno de tus monstruos para equiparlo';
    }

    // Validado.
    s.supportUsedThisTurn = true;
    me.hand = me.hand.filter(c => c !== card);
    if (fromField) { me.support[setSlot] = null; card.faceDown = false; }
    events.push({ type: 'activated', player: intent.player, instanceId: card.instanceId, targetId: target?.instanceId ?? null });
    this.runEffects(card, 'onActivate', events, { equipTarget: target });
    this.sendToMictlan(card, 'used', events);
    return null;
  }

  // ---------------------------------------------------------------- posición

  private changePosition(intent: Extract<Intent, { type: 'changePosition' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const card = s.players[intent.player].field.find(c => c?.instanceId === intent.instanceId);
    if (!card) return 'Ese monstruo no está en tu campo';
    // Se puede cambiar las veces que quieras en tu turno, mientras ese monstruo no haya atacado.
    if (card.attacksThisTurn > 0) return 'Un monstruo que ya atacó no puede cambiar de posición';

    card.positionChangedThisTurn = true;
    card.position = card.position === 'attack' ? 'defense' : 'attack';
    const flipped = card.faceDown;
    card.faceDown = false;
    events.push({ type: 'positionChanged', instanceId: card.instanceId, position: card.position, flipped });
    if (flipped) this.runEffects(card, 'onSummon', events);   // voltearlo cuenta como invocarlo
    return null;
  }

  // ---------------------------------------------------------------- batalla

  private attack(intent: Extract<Intent, { type: 'attack' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const me = s.players[intent.player];
    const foePlayer = opponentOf(intent.player);
    const foe = s.players[foePlayer];

    if (s.turn === 1 && !FIRST_TURN_CAN_ATTACK) return 'No se puede atacar en el primer turno';
    if (s.turn <= s.attackLockUntil[intent.player]) return 'Un efecto te impide atacar este turno';
    const attacker = me.field.find(c => c?.instanceId === intent.attackerId);
    if (!attacker) return 'Ese monstruo no está en tu campo';
    if (attacker.position !== 'attack') return 'Solo atacan los monstruos en posición de ataque';
    if (attacker.attacksThisTurn >= attacker.maxAttacks) return 'Ese monstruo ya atacó este turno';

    const foeMonsters = foe.field.filter((c): c is CardInstance => c !== null);
    let target: CardInstance | null = null;
    if (intent.targetId === null) {
      if (foeMonsters.length > 0 && !attacker.hasKeyword('directAttack')) return 'No puedes atacar directo si el rival tiene monstruos';
    } else {
      target = foeMonsters.find(c => c.instanceId === intent.targetId) ?? null;
      if (!target) return 'Ese objetivo no está en el campo rival';
    }

    // Validado.
    if (s.phase !== 'battle') {
      s.phase = 'battle';
      events.push({ type: 'phaseChanged', phase: 'battle' });
    }
    attacker.attacksThisTurn += 1;
    attacker.hasAttackedThisTurn = attacker.attacksThisTurn >= attacker.maxAttacks;
    events.push({ type: 'attackDeclared', attackerId: attacker.instanceId, targetId: target?.instanceId ?? null });

    if (attacker.faceDown) { attacker.faceDown = false; events.push({ type: 'flipped', instanceId: attacker.instanceId }); }

    // Trampas del defensor: la primera que se pueda activar responde al ataque
    this.attackNegated = false;
    this.springTrap(foePlayer, ['onOpponentAttack'], { attacker }, attacker.instanceId, events);
    if (this.attackNegated) {
      events.push({ type: 'attackNegated', attackerId: attacker.instanceId });
      return null;
    }
    if (s.winner !== null || attacker.zone !== 'field') return null;

    // Efectos al atacar (pueden subir el ATK o incluso quitar al objetivo) y del atacado
    this.runEffects(attacker, 'onAttack', events);
    if (target && target.zone === 'field' && !target.faceDown && s.winner === null) this.runEffects(target, 'onAttacked', events, { attacker });
    this.recomputeAuras();
    if (s.winner !== null || attacker.zone !== 'field') return null;
    if (target && target.zone !== 'field') return null;   // el objetivo ya no está: el ataque se pierde

    if (!target) {
      this.damage(foePlayer, attacker.atk + signTotal(s.daySign, 'directBonus'), events);
      if (attacker.zone === 'field') this.runEffects(attacker, 'onDirectDamage', events);
      return null;
    }

    if (target.faceDown) {
      target.faceDown = false;
      events.push({ type: 'flipped', instanceId: target.instanceId });
      this.recomputeAuras();
    }

    let killed = false;
    if (target.position === 'attack') {
      const diff = attacker.atk - target.atk;
      if (diff > 0) {
        killed = this.battleDestroy(target, events);
        this.damage(foePlayer, diff, events);
      } else if (diff < 0) {
        this.battleDestroy(attacker, events);
        this.damage(intent.player, -diff, events);
      } else {
        this.battleDestroy(attacker, events);
        killed = this.battleDestroy(target, events);
      }
    } else {
      const diff = attacker.atk - target.defense;
      if (diff > 0) {
        killed = this.battleDestroy(target, events);
        if (attacker.hasKeyword('piercing')) this.damage(foePlayer, diff, events);   // perforante
      } else if (diff < 0) this.damage(intent.player, -diff, events);
    }
    if (killed && attacker.zone === 'field' && s.winner === null) this.runEffects(attacker, 'onBattleDestroy', events);
    return null;
  }

  /** Destruir en batalla, salvo que tenga "no puede ser destruido en batalla" sin usar. */
  private battleDestroy(card: CardInstance, events: DuelEvent[]): boolean {
    if (card.zone !== 'field') return false;
    if (card.hasKeyword('battleImmune') && !card.battleImmuneUsed) {
      card.battleImmuneUsed = true;
      events.push({ type: 'battleSaved', instanceId: card.instanceId });
      return false;
    }
    this.destroy(card, events);
    return true;
  }

  // ---------------------------------------------------------------- turnos

  private endTurn(events: DuelEvent[]): string | null {
    const s = this.state;
    const wasPhase = phaseOf(s.turn);
    this.returnBorrowed(events);
    for (const p of s.players) {
      for (const c of p.field) {
        if (!c) continue;
        c.clearEndOfTurnModifiers();
        c.hasAttackedThisTurn = false;
        c.attacksThisTurn = 0;
        c.positionChangedThisTurn = false;
        c.summonedThisTurn = false;
      }
    }
    s.turnPlayer = opponentOf(s.turnPlayer);
    s.turn += 1;
    s.phase = 'main';
    s.supportUsedThisTurn = false;
    s.monsterPlayedThisTurn = false;
    events.push({ type: 'turnStarted', player: s.turnPlayer, turn: s.turn });
    const phase = phaseOf(s.turn);
    if (phase !== wasPhase) {
      events.push({ type: 'timeChanged', phase, night: PHASE_INFO[phase].night });
      if (PHASE_INFO[phase].night !== PHASE_INFO[wasPhase].night) {
        const nahuales = s.players.flatMap(p => p.field).filter((c): c is CardInstance => !!c && !!c.def.nahual);
        if (nahuales.length) events.push({ type: 'nahualShift', instanceIds: nahuales.map(c => c.instanceId), night: PHASE_INFO[phase].night });
      }
    }
    const heal = signTotal(s.daySign, 'turnHeal');
    if (heal > 0) this.heal(s.turnPlayer, heal, events);
    this.refillHand(s.turnPlayer, events);
    for (const c of [...s.players[s.turnPlayer].field]) {
      if (c && !c.faceDown && c.zone === 'field') this.runEffects(c, 'onTurnStart', events);
    }
    return null;
  }

  /** Roba hasta tener 5 en mano. Si necesita robar y el mazo está vacío, pierde. */
  private refillHand(player: PlayerIndex, events: DuelEvent[]): void {
    const me = this.state.players[player];
    const need = HAND_SIZE - me.hand.length;
    if (need <= 0) return;
    if (me.deck.length === 0) {
      this.finish(opponentOf(player), 'deckOut', events);
      return;
    }
    const drawn = me.deck.splice(0, need);
    for (const c of drawn) { c.zone = 'hand'; me.hand.push(c); }
    events.push({ type: 'cardsDrawn', player, instanceIds: drawn.map(c => c.instanceId) });
  }

  // ---------------------------------------------------------------- utilidades

  private destroy(card: CardInstance, events: DuelEvent[], reason: 'battle' | 'effect' = 'battle'): void {
    if (card.zone !== 'field') return;
    this.removeFromField(card);
    const wasFaceUp = !card.faceDown;
    this.sendToMictlan(card, reason, events);
    if (wasFaceUp) this.runEffects(card, 'onDestroyed', events);
    // Signo del día: Miquiztli (daño al dueño) y Cozcacuauhtli (vida para el rival)
    const burn = signTotal(this.state.daySign, 'destroyBurn');
    if (burn > 0) this.damage(card.owner, burn, events);
    const heal = signTotal(this.state.daySign, 'destroyHeal');
    if (heal > 0 && this.state.winner === null) this.heal(opponentOf(card.owner), heal, events);
  }

  /** Quita una carta del campo de quien la controle (puede estar "prestada" al rival). */
  private removeFromField(card: CardInstance): void {
    for (const p of this.state.players) {
      const i = p.field.indexOf(card);
      if (i >= 0) p.field[i] = null;
      const j = p.support.indexOf(card);
      if (j >= 0) p.support[j] = null;
    }
  }

  /** Quién controla una carta del campo. */
  private controllerOf(card: CardInstance): PlayerIndex {
    return this.state.players[0].field.includes(card) ? 0 : this.state.players[1].field.includes(card) ? 1 : card.owner;
  }

  /** Al final del turno, los monstruos "prestados" regresan con su dueño (o al Mictlán si no caben). */
  private returnBorrowed(events: DuelEvent[]): void {
    for (const p of [0, 1] as const) {
      const field = this.state.players[p].field;
      field.forEach((c, i) => {
        if (!c || !c.borrowed) return;
        field[i] = null;
        c.borrowed = false;
        const home = this.state.players[c.owner].field;
        const slot = home.findIndex(x => x === null);
        if (slot < 0) { this.sendToMictlan(c, 'effect', events); return; }
        home[slot] = c;
        c.fieldSlot = slot;
        events.push({ type: 'controlChanged', instanceId: c.instanceId, player: c.owner, slot });
      });
    }
  }

  private sendToMictlan(card: CardInstance, reason: 'battle' | 'fusionFailed' | 'material' | 'effect' | 'used', events: DuelEvent[]): void {
    card.resetForZoneChange();
    card.zone = 'mictlan';
    this.state.players[card.owner].mictlan.push(card);
    events.push({ type: 'sentToMictlan', instanceId: card.instanceId, reason });
  }

  private heal(player: PlayerIndex, amount: number, events: DuelEvent[]): void {
    if (amount <= 0) return;
    const p = this.state.players[player];
    p.life += amount;
    events.push({ type: 'healed', player, amount, lifeAfter: p.life });
  }

  /** Robar por efecto: si el mazo se acaba no se pierde. */
  private drawCards(player: PlayerIndex, amount: number, events: DuelEvent[]): void {
    const me = this.state.players[player];
    const drawn = me.deck.splice(0, Math.max(0, amount));
    for (const c of drawn) { c.zone = 'hand'; me.hand.push(c); }
    if (drawn.length) events.push({ type: 'cardsDrawn', player, instanceIds: drawn.map(c => c.instanceId) });
  }

  private damage(player: PlayerIndex, amount: number, events: DuelEvent[]): void {
    if (amount <= 0) return;
    const p = this.state.players[player];
    p.life = Math.max(0, p.life - amount);
    events.push({ type: 'damage', player, amount, lifeAfter: p.life });
    if (p.life === 0) this.finish(opponentOf(player), 'life', events);
  }

  // ---------------------------------------------------------------- efectos

  /** Corre los efectos de `card` con ese trigger (si se cumplen sus condiciones). */
  private runEffects(card: CardInstance, trigger: EffectTrigger, events: DuelEvent[], ctx: EffectContext = {}): void {
    const effects = (card.def.effects ?? []).filter(e => e.trigger === trigger);
    if (effects.length === 0 || this.state.winner !== null || this.effectDepth > 8) return;
    this.effectDepth++;
    try {
      for (const effect of effects) {
        if (!this.conditionsMet(card, effect.conditions ?? [])) continue;
        events.push({ type: 'effect', instanceId: card.instanceId, trigger });
        for (const action of effect.actions) {
          if (this.state.winner !== null) return;
          this.runAction(card, action, events, ctx);
        }
      }
    } finally {
      this.effectDepth--;
    }
  }

  private conditionsMet(card: CardInstance, conditions: readonly EffectCondition[]): boolean {
    const s = this.state;
    const me = s.players[card.owner];
    const foe = s.players[opponentOf(card.owner)];
    const count = (field: (CardInstance | null)[]) => field.filter(c => c !== null).length;
    return conditions.every(c => {
      switch (c.type) {
        case 'isNight': return isNightTurn(s.turn);
        case 'isDay': return !isNightTurn(s.turn);
        case 'isPhase': return phaseOf(s.turn) === c.phase;
        case 'lifeBelow': return me.life < c.amount;
        case 'hasTagOnField': return me.field.some(o => o && o !== card && !o.faceDown && o.def.tags.includes(c.tag));
        case 'opponentHasMoreMonsters': return count(foe.field) > count(me.field);
      }
    });
  }

  private resolveTargets(card: CardInstance, target: EffectTarget, tag: CardTag | undefined, ctx: EffectContext = {}): CardInstance[] {
    const side = card.zone === 'field' ? this.controllerOf(card) : card.owner;
    const mine = this.state.players[side].field.filter((c): c is CardInstance => c !== null);
    const theirs = this.state.players[opponentOf(side)].field.filter((c): c is CardInstance => c !== null);
    const pick = (list: CardInstance[]) => (list.length ? [list[Math.floor(this.effectRng() * list.length)]] : []);
    const withTag = (list: CardInstance[]) => (tag ? list.filter(c => c.def.tags.includes(tag)) : list);
    const byAtk = [...theirs].sort((a, b) => b.atk - a.atk);
    switch (target) {
      case 'self': return card.zone === 'field' ? [card] : [];
      case 'equipTarget': return ctx.equipTarget && ctx.equipTarget.zone === 'field' ? [ctx.equipTarget] : [];
      case 'attacker': return ctx.attacker && ctx.attacker.zone === 'field' ? [ctx.attacker] : [];
      case 'allAllies': return withTag(mine);
      case 'otherAllies': return withTag(mine.filter(c => c !== card));
      case 'alliesWithTag': return withTag(mine);
      case 'otherAlliesWithTag': return withTag(mine.filter(c => c !== card));
      case 'allEnemies': return withTag(theirs);
      case 'highestAtkEnemy': return byAtk.slice(0, 1);
      case 'lowestAtkEnemy': return byAtk.slice(-1);
      case 'randomEnemy': return pick(withTag(theirs));
      case 'randomMonster': return pick(withTag([...mine, ...theirs]));
      case 'allMonsters': return withTag([...mine, ...theirs]);
      case 'summoned': return ctx.summoned && ctx.summoned.zone === 'field' ? [ctx.summoned] : [];
    }
  }

  private runAction(card: CardInstance, a: EffectAction, events: DuelEvent[], ctx: EffectContext): void {
    const owner = card.owner;
    const me = this.state.players[owner];
    switch (a.type) {
      case 'modifyAtk':
      case 'modifyDef': {
        const amount = scaleEffectAmount(a.amount, card.level);
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          t.addModifier({
            atk: a.type === 'modifyAtk' ? amount : 0,
            def: a.type === 'modifyDef' ? amount : 0,
            sourceId: card.instanceId,
            untilEndOfTurn: a.untilEndOfTurn ?? false,
          });
          events.push({ type: 'statChanged', instanceId: t.instanceId, atk: t.atk, def: t.defense });
        }
        return;
      }
      case 'damage':
        this.damage(a.who === 'self' ? owner : opponentOf(owner), scaleEffectAmount(a.amount, card.level), events);
        return;
      case 'heal':
        this.heal(owner, scaleEffectAmount(a.amount, card.level), events);
        return;
      case 'draw':
        this.drawCards(owner, a.amount, events);
        return;
      case 'destroy':
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) this.destroy(t, events, 'effect');
        return;
      case 'revive': {
        const slot = me.field.findIndex(c => c === null);
        const pick = me.mictlan
          .filter(c => c !== card && c.def.type === 'monster' && (!a.tag || c.def.tags.includes(a.tag)))
          .sort((x, y) => y.atk - x.atk)[0];
        if (slot < 0 || !pick) return;
        me.mictlan = me.mictlan.filter(c => c !== pick);
        pick.resetForZoneChange();
        pick.zone = 'field';
        pick.fieldSlot = slot;
        me.field[slot] = pick;
        events.push({ type: 'revived', instanceId: pick.instanceId, slot });
        return;
      }
      case 'negateAttack':
        this.attackNegated = true;
        return;
      case 'returnToHand':
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          this.removeFromField(t);
          t.resetForZoneChange();
          t.zone = 'hand';
          this.state.players[t.owner].hand.push(t);
          events.push({ type: 'returnedToHand', instanceId: t.instanceId, player: t.owner });
        }
        return;
      case 'forceDefense':
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          if (t.position === 'defense') continue;
          t.position = 'defense';
          events.push({ type: 'positionChanged', instanceId: t.instanceId, position: 'defense', flipped: false });
        }
        return;
      case 'takeControl': {
        const ctrl = card.zone === 'field' ? this.controllerOf(card) : owner;
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          if (this.controllerOf(t) === ctrl) continue;
          const mySide = this.state.players[ctrl].field;
          const slot = mySide.findIndex(x => x === null);
          if (slot < 0) return;
          this.removeFromField(t);
          mySide[slot] = t;
          t.fieldSlot = slot;
          t.borrowed = t.owner !== ctrl;
          t.attacksThisTurn = 0;
          t.hasAttackedThisTurn = false;
          events.push({ type: 'controlChanged', instanceId: t.instanceId, player: ctrl, slot });
        }
        return;
      }
      case 'preventAttack': {
        const foe = opponentOf(owner);
        const until = this.state.turnPlayer === foe ? this.state.turn + 2 : this.state.turn + 1;
        this.state.attackLockUntil[foe] = Math.max(this.state.attackLockUntil[foe], until);
        events.push({ type: 'attackLocked', player: foe, untilTurn: until });
        return;
      }
      case 'grantKeyword':
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) t.addKeyword(a.keyword, a.untilEndOfTurn ?? false);
        return;
      case 'destroySupport': {
        const sides = a.who === 'all' ? [0, 1] as const : [opponentOf(owner)];
        for (const p of sides) {
          for (const trap of [...this.state.players[p].support]) if (trap) { this.removeFromField(trap); this.sendToMictlan(trap, 'effect', events); }
        }
        return;
      }
      case 'summonFromDeck': {
        const slot = me.field.findIndex(c => c === null);
        if (slot < 0) return;
        const pickCard = me.deck
          .filter(c => c.def.type === 'monster' && c.def.atk <= a.maxAtk && c.def.id !== card.def.id)   // otra carta, no copias de sí misma
          .filter(c => !a.tag || c.def.tags.includes(a.tag))
          .filter(c => !a.sameTag || c.def.tags.some(t => card.def.tags.includes(t)))
          .sort((x, y) => y.def.atk - x.def.atk)[0];
        if (!pickCard) return;
        me.deck = me.deck.filter(c => c !== pickCard);
        pickCard.resetForZoneChange();
        pickCard.zone = 'field';
        pickCard.fieldSlot = slot;
        me.field[slot] = pickCard;
        events.push({ type: 'specialSummoned', instanceId: pickCard.instanceId, player: owner, slot, from: 'deck' });
        this.runEffects(pickCard, 'onSummon', events);
        return;
      }
    }
  }

  /** Recalcula los efectos continuos (auras) de todo el campo. Se llama después de cada cambio. */
  private recomputeAuras(): void {
    const field = this.state.players.flatMap(p => p.field).filter((c): c is CardInstance => c !== null);
    field.forEach(c => c.clearAuraModifiers());

    // Ambiente: forma de los nahuales, bono de la fase del Reloj Solar y signo del día
    const phase = phaseOf(this.state.turn);
    const night = PHASE_INFO[phase].night;
    for (const c of field) {
      c.nightForm = night && !!c.def.nahual;
      let atk = phaseAtkBonus(phase, c.def);
      let def = 0;
      for (const r of signRules(this.state.daySign, 'stat')) {
        if (!matchesFilter(c.def, r)) continue;
        atk += r.atk ?? 0;
        def += r.def ?? 0;
      }
      if (atk || def) c.addModifier({ atk, def, sourceId: SOURCE_ENVIRONMENT, untilEndOfTurn: false, aura: true });
    }

    for (const source of field) {
      if (source.faceDown) continue;
      for (const effect of source.def.effects ?? []) {
        if (effect.trigger !== 'continuous' || !this.conditionsMet(source, effect.conditions ?? [])) continue;
        for (const a of effect.actions) {
          if (a.type === 'grantKeyword') {
            for (const t of this.resolveTargets(source, a.target, a.tag)) t.addKeyword(a.keyword, false, true);
            continue;
          }
          if (a.type !== 'modifyAtk' && a.type !== 'modifyDef') continue;
          const amount = scaleEffectAmount(a.amount, source.level);
          for (const t of this.resolveTargets(source, a.target, a.tag)) {
            t.addModifier({
              atk: a.type === 'modifyAtk' ? amount : 0,
              def: a.type === 'modifyDef' ? amount : 0,
              sourceId: source.instanceId, untilEndOfTurn: false, aura: true,
            });
          }
        }
      }
    }
  }

  private finish(winner: PlayerIndex, reason: 'life' | 'deckOut' | 'surrender', events: DuelEvent[]): void {
    if (this.state.winner !== null) return;
    this.state.winner = winner;
    this.state.phase = 'ended';
    events.push({ type: 'gameOver', winner, reason });
  }
}

const fail = (error: string): ApplyResult => ({ ok: false, error });

interface EffectContext {
  equipTarget?: CardInstance;   // equipos: a quién se equipa
  attacker?: CardInstance;      // trampas y "al ser atacado": quién está atacando
  summoned?: CardInstance;      // trampas de invocación: el monstruo que se acaba de invocar
}
