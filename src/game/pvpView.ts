import { CardInstance, type BattlePosition, type Zone } from '../core/CardInstance.ts';
import type { DuelEngine } from '../core/DuelEngine.ts';
import type { ApplyResult, DuelEvent, DuelState, Intent, Phase, PlayerIndex, PlayerState } from '../core/DuelState.ts';
import type { DaySign } from '../core/daySign.ts';
import type { FusionResolver } from '../core/fusion.ts';
import { createRng, shuffle } from '../core/rng.ts';
import type { CardDatabase } from '../data/cardDatabase.ts';
import type { CardDef, Keyword } from '../data/types.ts';
import { createPvpDuel, type PvpSetup } from './replay.ts';

/**
 * Multijugador con INFORMACIÓN OCULTA.
 * Solo el servidor tiene la semilla, los dos mazos y todas las jugadas. A cada jugador le manda su
 * VISTA: lo que vería sentado a la mesa (su mano, las cartas boca arriba, el Mictlán, cuántas cartas
 * tiene cada quien) pero nunca la mano del rival, sus cartas boca abajo ni el orden de los mazos.
 * Los números de las cartas también se disfrazan para que no se pueda adivinar nada con ellos.
 */

export interface CardView {
  i: number;            // número de la carta en este duelo (disfrazado)
  c: number;            // id de la carta (0 = oculta)
  o: PlayerIndex;       // dueño
  z: Zone;
  s: number;            // zona del campo (-1 si no está)
  p: BattlePosition;
  f: boolean;           // boca abajo
  n?: boolean;          // forma de noche (nahual)
  l?: number;           // nivel
  a?: number;           // ATK actual
  d?: number;           // DEF actual
  k?: Keyword[];
  t?: number;           // ataques este turno
  b?: number;           // banderas: 1 ya atacó · 2 cambió posición · 4 recién invocado · 8 inmunidad usada · 16 prestado
}
export interface PlayerView {
  life: number;
  deck: number;         // cuántas quedan
  hand: CardView[];
  field: (CardView | null)[];
  support: (CardView | null)[];
  mictlan: CardView[];
}
export interface PvpView {
  players: [PlayerView, PlayerView];
  turnPlayer: PlayerIndex;
  turn: number;
  phase: Phase;
  supportUsedThisTurn: boolean;
  monsterPlayedThisTurn: boolean;
  winner: PlayerIndex | null;
  daySign: DaySign | null;
  attackLockUntil: [number, number];
}
export interface PvpStep { events: DuelEvent[]; view: PvpView }

// ---------------------------------------------------------------- números disfrazados

const MASK_RANGE = 1024;
/** Cambia los números de instancia por otros (según la semilla secreta) para que no revelen el orden del mazo. */
export function idMask(seed: number): (iid: number) => number {
  const perm = shuffle(Array.from({ length: MASK_RANGE }, (_, i) => i + 1), createRng((seed ^ 0x1d5ea1) >>> 0));
  return iid => (iid >= 1 && iid <= MASK_RANGE ? perm[iid - 1] : iid + MASK_RANGE);
}

// ---------------------------------------------------------------- servidor: armar la vista

function cardView(c: CardInstance, visible: boolean, pub: (n: number) => number): CardView {
  const base: CardView = { i: pub(c.instanceId), c: 0, o: c.owner, z: c.zone, s: c.fieldSlot, p: c.position, f: c.faceDown };
  if (!visible) return base;
  const flags = (c.hasAttackedThisTurn ? 1 : 0) | (c.positionChangedThisTurn ? 2 : 0) | (c.summonedThisTurn ? 4 : 0) | (c.battleImmuneUsed ? 8 : 0) | (c.borrowed ? 16 : 0);
  const keywords = c.activeKeywords;
  return {
    ...base, c: c.def.id, a: c.atk, d: c.defense,
    ...(c.nightForm ? { n: true } : {}), ...(c.level > 1 ? { l: c.level } : {}),
    ...(keywords.length ? { k: keywords } : {}), ...(c.attacksThisTurn ? { t: c.attacksThisTurn } : {}), ...(flags ? { b: flags } : {}),
  };
}

/** ¿El jugador `viewer` puede ver esta carta? (`area` = dónde está en el tablero) */
function canSee(c: CardInstance, area: 'hand' | 'field' | 'support' | 'mictlan', holder: PlayerIndex, viewer: PlayerIndex): boolean {
  if (area === 'mictlan') return true;
  if (area === 'field') return !c.faceDown || holder === viewer;
  return holder === viewer;   // mano y trampas colocadas: solo su dueño
}

export function viewFor(engine: DuelEngine, viewer: PlayerIndex, pub: (n: number) => number): PvpView {
  const s = engine.state;
  const pv = (p: PlayerState, holder: PlayerIndex): PlayerView => ({
    life: p.life,
    deck: p.deck.length,
    hand: p.hand.map(c => cardView(c, canSee(c, 'hand', holder, viewer), pub)),
    field: p.field.map(c => (c ? cardView(c, canSee(c, 'field', holder, viewer), pub) : null)),
    support: p.support.map(c => (c ? cardView(c, canSee(c, 'support', holder, viewer), pub) : null)),
    mictlan: p.mictlan.map(c => cardView(c, true, pub)),
  });
  return {
    players: [pv(s.players[0], 0), pv(s.players[1], 1)],
    turnPlayer: s.turnPlayer, turn: s.turn, phase: s.phase,
    supportUsedThisTurn: s.supportUsedThisTurn, monsterPlayedThisTurn: s.monsterPlayedThisTurn,
    winner: s.winner, daySign: s.daySign, attackLockUntil: [...s.attackLockUntil] as [number, number],
  };
}

/** Cambia los números de las cartas en los eventos y quita lo que delataría una carta oculta. */
export function maskEvents(events: readonly DuelEvent[], view: PvpView, pub: (n: number) => number): DuelEvent[] {
  const hidden = new Set<number>();
  for (const p of view.players) {
    for (const c of [...p.hand, ...p.field, ...p.support]) if (c && c.c === 0) hidden.add(c.i);
  }
  const out: DuelEvent[] = [];
  for (const e of events) {
    const m = remapEvent(e, pub);
    if (m.type === 'statChanged' && hidden.has(m.instanceId)) continue;          // ATK/DEF de una carta que no ves
    if (m.type === 'effect' && hidden.has(m.instanceId)) continue;
    if (m.type === 'nahualShift') {
      const ids = m.instanceIds.filter(id => !hidden.has(id));
      if (!ids.length) continue;
      out.push({ ...m, instanceIds: ids });
      continue;
    }
    out.push(m);
  }
  return out;
}

function remapEvent(e: DuelEvent, pub: (n: number) => number): DuelEvent {
  const r = { ...e } as Record<string, unknown>;
  for (const key of ['instanceId', 'resultId', 'discardedId', 'attackerId']) {
    if (typeof r[key] === 'number') r[key] = pub(r[key] as number);
  }
  if (e.type === 'attackDeclared' || e.type === 'activated') {
    const t = (e as { targetId: number | null }).targetId;
    r.targetId = t === null ? null : pub(t);
  }
  if (Array.isArray(r.instanceIds)) r.instanceIds = (r.instanceIds as number[]).map(pub);
  if (Array.isArray(r.materialIds)) r.materialIds = (r.materialIds as number[]).map(pub);
  return r as DuelEvent;
}

/** Cambia los números disfrazados de una jugada que manda el navegador por los verdaderos. */
export function unmaskIntent(intent: Intent, pub: (n: number) => number): Intent {
  const back = new Map<number, number>();
  for (let i = 1; i <= MASK_RANGE; i++) back.set(pub(i), i);
  const real = (n: number) => (n >= 1 && n <= MASK_RANGE ? back.get(n)! : n > MASK_RANGE * 2 ? n - MASK_RANGE : -1);
  switch (intent.type) {
    case 'play': return { ...intent, handIds: intent.handIds.map(real) };
    case 'activate': return { ...intent, handId: real(intent.handId), ...(intent.targetId !== undefined ? { targetId: real(intent.targetId) } : {}) };
    case 'changePosition': return { ...intent, instanceId: real(intent.instanceId) };
    case 'attack': return { ...intent, attackerId: real(intent.attackerId), targetId: intent.targetId === null ? null : real(intent.targetId) };
    default: return intent;
  }
}

export type PvpSnapshot = { ok: true; view: PvpView; steps: PvpStep[]; index: number } | { ok: false; error: string; at: number };

/**
 * Repite la partida y arma lo que ve `viewer`: la vista final y, para cada jugada desde `since`,
 * sus eventos y la vista después de esa jugada (para animarlas una por una).
 * Las jugadas guardadas tienen los números VERDADEROS.
 */
export function pvpSnapshotFor(setup: PvpSetup, intents: readonly Intent[], viewer: PlayerIndex, since: number, db: CardDatabase, fusion: FusionResolver): PvpSnapshot {
  const pub = idMask(setup.seed);
  const engine = createPvpDuel(setup, db, fusion);
  engine.start();
  const steps: PvpStep[] = [];
  const from = Math.max(0, Math.min(since, intents.length));
  for (let i = 0; i < intents.length; i++) {
    const r = engine.apply(intents[i]);
    if (!r.ok) return { ok: false, error: r.error, at: i };
    if (i >= from) {
      const view = viewFor(engine, viewer, pub);
      steps.push({ events: maskEvents(r.events, view, pub), view });
    }
  }
  return { ok: true, view: viewFor(engine, viewer, pub), steps, index: intents.length };
}

// ---------------------------------------------------------------- navegador: tablero a partir de la vista

/** Carta que no se puede ver (mano del rival, boca abajo, mazo). */
export const HIDDEN_CARD: CardDef = Object.freeze({
  id: 0, name: 'Carta boca abajo', description: '', type: 'monster', attribute: 'tierra', tags: [], atk: 0, def: 0,
}) as CardDef;

/**
 * "Motor" del navegador en multijugador: no calcula nada, solo arma el tablero con la vista que
 * mandó el servidor. Tiene lo mismo que usa el tablero (state, getCard), así el dibujo no cambia.
 */
export class ViewEngine {
  state!: DuelState;
  private readonly cards = new Map<number, CardInstance>();
  private readonly db: CardDatabase;
  constructor(db: CardDatabase, view: PvpView) { this.db = db; this.load(view); }

  load(view: PvpView): void {
    this.cards.clear();
    const make = (v: CardView): CardInstance => {
      const def = v.c ? (this.db.tryGet(v.c) ?? HIDDEN_CARD) : HIDDEN_CARD;
      const c = new CardInstance(v.i, v.o, def);
      c.zone = v.z; c.fieldSlot = v.s; c.position = v.p; c.faceDown = v.f;
      c.nightForm = !!v.n; c.level = v.l ?? 1; c.attacksThisTurn = v.t ?? 0;
      const b = v.b ?? 0;
      c.hasAttackedThisTurn = !!(b & 1); c.positionChangedThisTurn = !!(b & 2); c.summonedThisTurn = !!(b & 4);
      c.battleImmuneUsed = !!(b & 8); c.borrowed = !!(b & 16);
      if (v.c) {
        const da = (v.a ?? c.atk) - c.atk, dd = (v.d ?? c.defense) - c.defense;
        if (da || dd) c.addModifier({ atk: da, def: dd, sourceId: -1, untilEndOfTurn: false });
        for (const k of v.k ?? []) c.addKeyword(k);
      }
      this.cards.set(c.instanceId, c);
      return c;
    };
    let fake = -1;
    const player = (p: PlayerView, owner: PlayerIndex): PlayerState => ({
      life: p.life,
      deck: Array.from({ length: p.deck }, () => { const c = new CardInstance(fake--, owner, HIDDEN_CARD); c.zone = 'deck'; return c; }),
      hand: p.hand.map(make),
      field: p.field.map(v => (v ? make(v) : null)),
      support: p.support.map(v => (v ? make(v) : null)),
      mictlan: p.mictlan.map(make),
    });
    this.state = {
      players: [player(view.players[0], 0), player(view.players[1], 1)],
      turnPlayer: view.turnPlayer, turn: view.turn, phase: view.phase,
      supportUsedThisTurn: view.supportUsedThisTurn, monsterPlayedThisTurn: view.monsterPlayedThisTurn,
      winner: view.winner, daySign: view.daySign, attackLockUntil: [...view.attackLockUntil] as [number, number],
    };
  }

  getCard(instanceId: number): CardInstance | undefined { return this.cards.get(instanceId); }
  start(): DuelEvent[] { return []; }
  apply(_intent: Intent): ApplyResult { return { ok: false, error: 'En multijugador las jugadas las revisa el servidor' }; }
}
