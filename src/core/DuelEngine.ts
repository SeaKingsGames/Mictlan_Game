import type { CardDatabase } from '../data/cardDatabase.ts';
import { HAND_SIZE, START_LIFE } from '../data/types.ts';
import { CardInstance } from './CardInstance.ts';
import { InstanceIdCounter, buildShuffledDeck } from './deck.ts';
import {
  FIELD_SLOTS, opponentOf,
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
    let error: string | null;
    switch (intent.type) {
      case 'play': error = this.play(intent, events); break;
      case 'attack': error = this.attack(intent, events); break;
      case 'endTurn': error = this.endTurn(events); break;
    }
    return error ? fail(error) : { ok: true, events };
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
      if (card.def.type !== 'monster') return 'Por ahora solo se pueden jugar monstruos';
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

    if (!target) {
      this.damage(foePlayer, attacker.atk, events);
      return null;
    }

    if (target.faceDown) { target.faceDown = false; events.push({ type: 'flipped', instanceId: target.instanceId }); }

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
    this.refillHand(s.turnPlayer, events);
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

  private destroy(card: CardInstance, events: DuelEvent[]): void {
    const owner = this.state.players[card.owner];
    const slot = owner.field.indexOf(card);
    if (slot >= 0) owner.field[slot] = null;
    this.sendToMictlan(card, 'battle', events);
  }

  private sendToMictlan(card: CardInstance, reason: 'battle' | 'fusionFailed' | 'material', events: DuelEvent[]): void {
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

  private finish(winner: PlayerIndex, reason: 'life' | 'deckOut' | 'surrender', events: DuelEvent[]): void {
    if (this.state.winner !== null) return;
    this.state.winner = winner;
    this.state.phase = 'ended';
    events.push({ type: 'gameOver', winner, reason });
  }
}

const fail = (error: string): ApplyResult => ({ ok: false, error });
