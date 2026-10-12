import type { CardDatabase } from '../data/cardDatabase.ts';
import {
  HAND_SIZE, START_LIFE, needsEquipTarget,
  type EffectAction, type EffectCondition, type EffectTarget, type EffectTrigger, type CardTag,
} from '../data/types.ts';
import { CardInstance } from './CardInstance.ts';
import { InstanceIdCounter, buildShuffledDeck } from './deck.ts';
import {
  FIELD_SLOTS, isNightTurn, opponentOf,
  type ApplyResult, type DuelEvent, type DuelState, type Intent, type PlayerIndex, type PlayerState,
} from './DuelState.ts';
import { noFusions, planChain, type FusionResolver } from './fusion.ts';
import { createRng } from './rng.ts';

/** Si el primer jugador puede atacar en el turno 1. */
export const FIRST_TURN_CAN_ATTACK = false;

export interface DuelOptions {
  db: CardDatabase;
  decks: [readonly number[], readonly number[]];   // IDs de carta de cada jugador
  seed: number;
  firstPlayer?: PlayerIndex;
  fusion?: FusionResolver;
}

/**
 * El motor del duelo. TypeScript puro: lo usan el tablero HTML, la IA,
 * los tests y (Fase 4) la Edge Function de Supabase.
 * Regla: el estado SOLO cambia dentro de apply().
 */
export class DuelEngine {
  readonly state: DuelState;
  private readonly db: CardDatabase;
  private readonly fusion: FusionResolver;
  private readonly ids = new InstanceIdCounter();
  private readonly cards = new Map<number, CardInstance>();
  private started = false;
  private effectDepth = 0;          // evita cadenas infinitas de efectos

  constructor(opts: DuelOptions) {
    this.db = opts.db;
    this.fusion = opts.fusion ?? noFusions;
    const rng = createRng(opts.seed);
    const makePlayer = (p: PlayerIndex): PlayerState => {
      const deck = buildShuffledDeck(opts.decks[p], p, this.db, this.ids, rng);
      deck.forEach(c => this.cards.set(c.instanceId, c));
      return { life: START_LIFE, deck, hand: [], field: Array(FIELD_SLOTS).fill(null), mictlan: [] };
    };
    this.state = {
      players: [makePlayer(0), makePlayer(1)],
      turnPlayer: opts.firstPlayer ?? 0,
      turn: 1,
      phase: 'main',
      hasPlayedThisTurn: false,
      winner: null,
    };
  }

  /** Reparte las manos y empieza el turno 1. */
  start(): DuelEvent[] {
    if (this.started) return [];
    this.started = true;
    const events: DuelEvent[] = [];
    for (const p of [0, 1] as const) this.refillHand(p, events);
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
    if (s.hasPlayedThisTurn) return 'Ya jugaste una carta este turno';
    if (intent.handIds.length === 0) return 'Elige al menos una carta';
    if (new Set(intent.handIds).size !== intent.handIds.length) return 'Carta repetida en la cadena';
    if (!Number.isInteger(intent.slot) || intent.slot < 0 || intent.slot >= FIELD_SLOTS) return 'Zona inválida';

    const fromHand: CardInstance[] = [];
    for (const id of intent.handIds) {
      const card = me.hand.find(c => c.instanceId === id);
      if (!card) return 'Esa carta no está en tu mano';
      if (card.def.type !== 'monster') return 'Las mágicas y los equipos se activan; no van en la cadena de fusión';
      fromHand.push(card);
    }

    // Como en YGOFM: si la zona tiene un monstruo, ese es el primer material.
    const occupant = me.field[intent.slot];
    const chain = occupant ? [occupant, ...fromHand] : fromHand;
    const plan = planChain(this.fusion, chain.map(c => c.def), intent.fusionChoices ?? []);
    if (!plan.ok) return plan.error;

    // Validado: ahora sí se modifica el estado.
    s.hasPlayedThisTurn = true;
    me.hand = me.hand.filter(c => !fromHand.includes(c));
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
    current.faceDown = !fused && current !== occupant && (intent.faceDown ?? false);
    me.field[intent.slot] = current;
    events.push({
      type: 'cardPlayed', player: intent.player, instanceId: current.instanceId,
      slot: intent.slot, position: current.position, faceDown: current.faceDown,
    });
    if (!current.faceDown) {
      if (fused) this.runEffects(current, 'onFusionSummon', events);
      this.runEffects(current, 'onSummon', events);
    }
    return null;
  }

  // ---------------------------------------------------------------- mágicas y equipos

  private activate(intent: Extract<Intent, { type: 'activate' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== 'main') return 'Solo puedes activar cartas en la fase principal';
    if (s.hasPlayedThisTurn) return 'Ya jugaste una carta este turno';
    const card = me.hand.find(c => c.instanceId === intent.handId);
    if (!card) return 'Esa carta no está en tu mano';
    if (card.def.type !== 'spell' && card.def.type !== 'equip') return 'Solo las mágicas y los equipos se activan';

    let target: CardInstance | undefined;
    if (needsEquipTarget(card.def)) {
      target = me.field.find((c): c is CardInstance => c !== null && c.instanceId === intent.targetId);
      if (!target) return 'Elige uno de tus monstruos para equiparlo';
    }

    // Validado.
    s.hasPlayedThisTurn = true;
    me.hand = me.hand.filter(c => c !== card);
    events.push({ type: 'activated', player: intent.player, instanceId: card.instanceId, targetId: target?.instanceId ?? null });
    this.runEffects(card, 'onActivate', events, target);
    this.sendToMictlan(card, 'used', events);
    return null;
  }

  // ---------------------------------------------------------------- batalla

  private attack(intent: Extract<Intent, { type: 'attack' }>, events: DuelEvent[]): string | null {
    const s = this.state;
    const me = s.players[intent.player];
    const foePlayer = opponentOf(intent.player);
    const foe = s.players[foePlayer];

    if (s.turn === 1 && !FIRST_TURN_CAN_ATTACK) return 'No se puede atacar en el primer turno';
    const attacker = me.field.find(c => c?.instanceId === intent.attackerId);
    if (!attacker) return 'Ese monstruo no está en tu campo';
    if (attacker.position !== 'attack') return 'Solo atacan los monstruos en posición de ataque';
    if (attacker.hasAttackedThisTurn) return 'Ese monstruo ya atacó este turno';

    const foeMonsters = foe.field.filter((c): c is CardInstance => c !== null);
    let target: CardInstance | null = null;
    if (intent.targetId === null) {
      if (foeMonsters.length > 0) return 'No puedes atacar directo si el rival tiene monstruos';
    } else {
      target = foeMonsters.find(c => c.instanceId === intent.targetId) ?? null;
      if (!target) return 'Ese objetivo no está en el campo rival';
    }

    // Validado.
    if (s.phase !== 'battle') {
      s.phase = 'battle';
      events.push({ type: 'phaseChanged', phase: 'battle' });
    }
    attacker.hasAttackedThisTurn = true;
    events.push({ type: 'attackDeclared', attackerId: attacker.instanceId, targetId: target?.instanceId ?? null });

    if (attacker.faceDown) { attacker.faceDown = false; events.push({ type: 'flipped', instanceId: attacker.instanceId }); }

    // Efectos al atacar (pueden subir el ATK o incluso quitar al objetivo)
    this.runEffects(attacker, 'onAttack', events);
    this.recomputeAuras();
    if (s.winner !== null || attacker.zone !== 'field') return null;
    if (target && target.zone !== 'field') return null;   // el objetivo ya no está: el ataque se pierde

    if (!target) {
      this.damage(foePlayer, attacker.atk, events);
      return null;
    }

    if (target.faceDown) {
      target.faceDown = false;
      events.push({ type: 'flipped', instanceId: target.instanceId });
      this.recomputeAuras();
    }

    if (target.position === 'attack') {
      const diff = attacker.atk - target.atk;
      if (diff > 0) {
        this.destroy(target, events);
        this.damage(foePlayer, diff, events);
      } else if (diff < 0) {
        this.destroy(attacker, events);
        this.damage(intent.player, -diff, events);
      } else {
        this.destroy(attacker, events);
        this.destroy(target, events);
      }
    } else {
      const diff = attacker.atk - target.defense;
      if (diff > 0) this.destroy(target, events);
      else if (diff < 0) this.damage(intent.player, -diff, events);
    }
    return null;
  }

  // ---------------------------------------------------------------- turnos

  private endTurn(events: DuelEvent[]): string | null {
    const s = this.state;
    const wasNight = isNightTurn(s.turn);
    for (const p of s.players) {
      for (const c of p.field) {
        if (!c) continue;
        c.clearEndOfTurnModifiers();
        c.hasAttackedThisTurn = false;
      }
    }
    s.turnPlayer = opponentOf(s.turnPlayer);
    s.turn += 1;
    s.phase = 'main';
    s.hasPlayedThisTurn = false;
    events.push({ type: 'turnStarted', player: s.turnPlayer, turn: s.turn });
    if (isNightTurn(s.turn) !== wasNight) events.push({ type: 'timeChanged', night: isNightTurn(s.turn) });
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
    const owner = this.state.players[card.owner];
    const slot = owner.field.indexOf(card);
    if (slot >= 0) owner.field[slot] = null;
    const wasFaceUp = !card.faceDown;
    this.sendToMictlan(card, reason, events);
    if (wasFaceUp) this.runEffects(card, 'onDestroyed', events);
  }

  private sendToMictlan(card: CardInstance, reason: 'battle' | 'fusionFailed' | 'material' | 'effect' | 'used', events: DuelEvent[]): void {
    card.resetForZoneChange();
    card.zone = 'mictlan';
    this.state.players[card.owner].mictlan.push(card);
    events.push({ type: 'sentToMictlan', instanceId: card.instanceId, reason });
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
  private runEffects(card: CardInstance, trigger: EffectTrigger, events: DuelEvent[], equipTarget?: CardInstance): void {
    const effects = (card.def.effects ?? []).filter(e => e.trigger === trigger);
    if (effects.length === 0 || this.state.winner !== null || this.effectDepth > 8) return;
    this.effectDepth++;
    try {
      for (const effect of effects) {
        if (!this.conditionsMet(card, effect.conditions ?? [])) continue;
        events.push({ type: 'effect', instanceId: card.instanceId, trigger });
        for (const action of effect.actions) {
          if (this.state.winner !== null) return;
          this.runAction(card, action, events, equipTarget);
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
        case 'lifeBelow': return me.life < c.amount;
        case 'hasTagOnField': return me.field.some(o => o && o !== card && !o.faceDown && o.def.tags.includes(c.tag));
        case 'opponentHasMoreMonsters': return count(foe.field) > count(me.field);
      }
    });
  }

  private resolveTargets(card: CardInstance, target: EffectTarget, tag: CardTag | undefined, equipTarget?: CardInstance): CardInstance[] {
    const mine = this.state.players[card.owner].field.filter((c): c is CardInstance => c !== null);
    const theirs = this.state.players[opponentOf(card.owner)].field.filter((c): c is CardInstance => c !== null);
    const withTag = (list: CardInstance[]) => (tag ? list.filter(c => c.def.tags.includes(tag)) : list);
    const byAtk = [...theirs].sort((a, b) => b.atk - a.atk);
    switch (target) {
      case 'self': return card.zone === 'field' ? [card] : [];
      case 'equipTarget': return equipTarget && equipTarget.zone === 'field' ? [equipTarget] : [];
      case 'allAllies': return withTag(mine);
      case 'otherAllies': return withTag(mine.filter(c => c !== card));
      case 'alliesWithTag': return withTag(mine);
      case 'otherAlliesWithTag': return withTag(mine.filter(c => c !== card));
      case 'allEnemies': return withTag(theirs);
      case 'highestAtkEnemy': return byAtk.slice(0, 1);
      case 'lowestAtkEnemy': return byAtk.slice(-1);
    }
  }

  private runAction(card: CardInstance, a: EffectAction, events: DuelEvent[], equipTarget?: CardInstance): void {
    const owner = card.owner;
    const me = this.state.players[owner];
    switch (a.type) {
      case 'modifyAtk':
      case 'modifyDef': {
        for (const t of this.resolveTargets(card, a.target, a.tag, equipTarget)) {
          t.addModifier({
            atk: a.type === 'modifyAtk' ? a.amount : 0,
            def: a.type === 'modifyDef' ? a.amount : 0,
            sourceId: card.instanceId,
            untilEndOfTurn: a.untilEndOfTurn ?? false,
          });
          events.push({ type: 'statChanged', instanceId: t.instanceId, atk: t.atk, def: t.defense });
        }
        return;
      }
      case 'damage':
        this.damage(a.who === 'self' ? owner : opponentOf(owner), a.amount, events);
        return;
      case 'heal':
        me.life += a.amount;
        events.push({ type: 'healed', player: owner, amount: a.amount, lifeAfter: me.life });
        return;
      case 'draw': {
        const drawn = me.deck.splice(0, Math.max(0, a.amount));   // por efecto no se pierde si el mazo se acaba
        for (const c of drawn) { c.zone = 'hand'; me.hand.push(c); }
        if (drawn.length) events.push({ type: 'cardsDrawn', player: owner, instanceIds: drawn.map(c => c.instanceId) });
        return;
      }
      case 'destroy':
        for (const t of this.resolveTargets(card, a.target, a.tag, equipTarget)) this.destroy(t, events, 'effect');
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
    }
  }

  /** Recalcula los efectos continuos (auras) de todo el campo. Se llama después de cada cambio. */
  private recomputeAuras(): void {
    const field = this.state.players.flatMap(p => p.field).filter((c): c is CardInstance => c !== null);
    field.forEach(c => c.clearAuraModifiers());
    for (const source of field) {
      if (source.faceDown) continue;
      for (const effect of source.def.effects ?? []) {
        if (effect.trigger !== 'continuous' || !this.conditionsMet(source, effect.conditions ?? [])) continue;
        for (const a of effect.actions) {
          if (a.type !== 'modifyAtk' && a.type !== 'modifyDef') continue;
          for (const t of this.resolveTargets(source, a.target, a.tag)) {
            t.addModifier({
              atk: a.type === 'modifyAtk' ? a.amount : 0,
              def: a.type === 'modifyDef' ? a.amount : 0,
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
