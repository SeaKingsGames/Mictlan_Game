import type { CardInstance } from '../core/CardInstance.ts';
import { type DuelEngine, FIRST_TURN_CAN_ATTACK, isChainEquip } from '../core/DuelEngine.ts';
import { type DuelEvent, type Intent, type PlayerIndex } from '../core/DuelState.ts';
import { describePhase, phaseOf, PHASE_INFO, TIME_PHASES, turnsLeftInPhase } from '../core/time.ts';
import { cardDb, fusionDb } from '../data/index.ts';
import type { Duelist } from '../game/duelists.ts';
import { aiStep, createDuel } from '../game/replay.ts';
import { HIDDEN_CARD, ViewEngine, type PvpStep, type PvpView } from '../game/pvpView.ts';
import { START_LIFE, isSupportCard, needsEquipTarget, type CardDef } from '../data/types.ts';
import { describeEffects, KEYWORD_TEXT } from '../data/effectText.ts';
import { createCardElement } from './cardElement.ts';
import { DuelFx } from './duelFx.ts';
import { muteButton, musicButton, sfx, type Sfx } from './sound.ts';

const AI_STEP_MS = 750;
const FUSION_SHOW_MS = 2200;
const CAST_SHOW_MS = 1700;      // arte de la mágica/trampa en medio de la pantalla

/** Lo que se muestra en grande en medio del tablero, uno tras otro. */
type ShowItem =
  | { kind: 'fusion'; player: PlayerIndex; a: CardDef; b: CardDef; r: CardDef }
  | { kind: 'cast'; player: PlayerIndex; card: CardDef; trap: boolean; target: string | null };

/** Cuánto esperar después de una jugada para que se vean sus animaciones grandes. */
const showDelay = (events: readonly DuelEvent[]): number =>
  events.filter(e => e.type === 'fusion').length * FUSION_SHOW_MS +
  events.filter(e => e.type === 'activated' || e.type === 'trapActivated').length * CAST_SHOW_MS;

/** Fusiones vistas en ESTE duelo (tuyas y del rival): "idA+idB>idResultado". Se reinicia cada duelo. */
const pairKey = (a: number, b: number) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const albumKey = (a: number, b: number, r: number) => `${pairKey(a, b)}>${r}`;

const ATTR: Record<string, string> = { sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra' };

export interface DuelResult {
  rewards: number[];      // cartas nuevas para mostrar
  notes: string[];        // avisos (cacao ganado, desbloqueos…)
  error?: string;         // si no se pudo guardar el resultado
  retry?: boolean;        // se puede volver a intentar guardar (falló la conexión)
}

/** Tiempo máximo para guardar el resultado antes de ofrecer "Reintentar". */
const SAVE_TIMEOUT_MS = 25_000;
const NO_RETRY = ['rejected', 'stale_data', 'already_settled'];

/** Lo que manda el servidor en multijugador: tu vista y, si hubo jugadas nuevas, cada una con sus eventos. */
export interface RemoteSnapshot {
  view: PvpView;
  steps: PvpStep[];
  index: number;          // cuántas jugadas lleva la partida
  lastMoveAt: number;
}

/**
 * Multijugador: el rival juega desde otro navegador. El SERVIDOR tiene el duelo completo y aquí solo
 * llega tu vista (sin la mano del rival ni sus cartas boca abajo).
 */
export interface RemoteDuel {
  me: PlayerIndex;
  /** Vista actual (al entrar o recargar). */
  load(): Promise<RemoteSnapshot>;
  /** Jugadas desde `index` (las del rival que todavía no ves). */
  since(index: number): Promise<RemoteSnapshot>;
  /** Manda tu jugada. `index` = cuántas jugadas había antes. Lanza error si el servidor la rechaza. */
  send(intent: Intent, index: number): Promise<RemoteSnapshot>;
  /** Avisa cuando cambia la sala (cuántas jugadas van). Devuelve la función para dejar de escuchar. */
  watch(cb: (moveCount: number, lastMoveAt: number) => void): () => void;
  /** Reclamar la victoria si el rival no juega a tiempo. */
  claim(): Promise<void>;
  timeoutMs: number;
}

/** Datos del rival que se muestran (un duelista de la campaña u otro jugador). */
export type Opponent = Duelist | { id: string; name: string; glyph: string };

export interface DuelSetup {
  playerDeck: number[];
  opponent: Opponent;
  /** Multijugador (si falta, el rival es la IA). */
  remote?: RemoteDuel;
  /** Nivel de tus cartas (id → nivel). */
  levels?: Record<number, number>;
  /** Semilla de cada duelo (en la nube la da el servidor, junto con tus niveles). Si falla, se muestra el error. */
  newSeed?: () => Promise<{ seed: number; levels?: Record<number, number> }>;
  /** Se llama una vez al terminar con tus jugadas aceptadas. Regresa lo que ganaste. */
  onFinish: (won: boolean, intents: readonly Intent[]) => DuelResult | Promise<DuelResult>;
  /** Volver al menú / campaña. */
  onExit: () => void;
}

/**
 * Tablero del duelo en HTML/CSS: escenario 16:9 que escala completo a la pantalla.
 * Solo DIBUJA el estado y manda intenciones al motor; nunca cambia el estado ella misma.
 */
export class DuelView {
  private engine!: DuelEngine | ViewEngine;
  private selectedHand: number[] = [];
  private selectedAttacker: number | null = null;
  private aiThinking = false;
  private log: string[] = [];
  private message = '';
  private inspected: CardInstance | null = null;
  private lastLife: [number, number] = [START_LIFE, START_LIFE];
  private showLog = false;
  private showAlbum = false;
  private fusionQueue: ShowItem[] = [];
  private fx!: DuelFx;
  private enterIds = new Set<number>();
  private lunging: { id: number; until: number } | null = null;   // el atacante va volando (su copia)   // cartas que acaban de entrar al campo (animación)
  private fusionShowing = false;
  private fusionTimer = 0;
  private readonly album = new Set<string>();
  private surrenderArmed = false;
  private surrenderTimer = 0;
  // Cómo se baja lo que elegiste (barra de arriba de la mano)
  private placePosition: 'attack' | 'defense' = 'attack';
  private placeFaceDown = false;
  private setSpell = false;                 // mágica/equipo: colocar boca abajo en vez de activar
  private armedSupport: number | null = null;   // mágica colocada que tocaste una vez (otra vez = activar)
  private fieldSpell: number | null = null;     // equipo colocado esperando a que toques a tu monstruo

  private readonly el: Record<
    'inspectorCard' | 'inspectorInfo' | 'status' | 'logPanel' | 'log' | 'turn' |
    'foeHand' | 'foeSupport' | 'foeField' | 'myField' | 'mySupport' | 'hand' |
    'me' | 'foe' | 'deck' | 'mictlan' | 'overlay' | 'placeBar' | 'mictlanView' | 'albumPanel' | 'album' | 'albumCount' | 'chooser' | 'fusionShow' | 'emblem' | 'toast' | 'timeBox' | 'signBox', HTMLElement>;
  private readonly btn: Record<'log' | 'album' | 'end' | 'surrender' | 'exit' | 'claim', HTMLButtonElement>;
  private readonly setup: DuelSetup;
  private finished: DuelResult | null = null;
  private finishing = false;
  private intents: Intent[] = [];   // tus jugadas aceptadas (el servidor las vuelve a jugar)
  private duelNo = 0;
  private readonly me: PlayerIndex;
  private readonly foe: PlayerIndex;
  // multijugador
  private applied = 0;              // jugadas del servidor ya aplicadas aquí
  private remoteSeen = 0;           // jugadas que la sala dice que hay
  private remoteBusy = false;
  private lastMoveAt = Date.now();
  private unwatch: (() => void) | null = null;
  private clock = 0;

  constructor(root: HTMLElement, setup: DuelSetup) {
    this.setup = setup;
    this.me = setup.remote?.me ?? 0;
    this.foe = this.me === 0 ? 1 : 0;
    root.innerHTML = `
      <div class="stage-wrap">
        <div class="stage">
          <div class="frame" aria-hidden="true"></div>

          <section class="inspector">
            <div class="inspector__card" data-ref="inspectorCard"></div>
            <div class="inspector__info" data-ref="inspectorInfo"></div>
            <div class="inspector__log" data-ref="logPanel" hidden>
              <h2>Registro</h2>
              <ol class="log" data-ref="log"></ol>
            </div>
            <div class="inspector__log" data-ref="albumPanel" hidden>
              <h2>Fusiones del duelo <small data-ref="albumCount"></small></h2>
              <ol class="log album" data-ref="album"></ol>
            </div>
            <p class="status" data-ref="status" role="status"></p>
          </section>

          <nav class="side-buttons">
            <button class="tag-btn" data-btn="log">Registro</button>
            <button class="tag-btn" data-btn="album">Fusiones</button>
            <button class="tag-btn" data-btn="exit">Salir</button>
            <button class="tag-btn tag-btn--claim" data-btn="claim" hidden>Reclamar victoria</button>
            <span class="turn-tag" data-ref="turn"></span>
            <div class="time-box" data-ref="timeBox"></div>
            <div class="sign-box" data-ref="signBox"></div>
          </nav>

          <div class="field-bg" aria-hidden="true"></div>
          <div class="foe-hand" data-ref="foeHand" aria-label="Mano del rival"></div>
          <div class="zones zones--support zones--foe" data-ref="foeSupport"></div>
          <div class="zones zones--monster zones--foe" data-ref="foeField"></div>

          <div class="lifebar">
            <div class="pl pl--me" data-ref="me"></div>
            <div class="emblem" data-ref="emblem"></div>
            <button class="pl pl--foe" data-ref="foe"></button>
          </div>

          <div class="zones zones--monster zones--mine" data-ref="myField"></div>
          <div class="zones zones--support zones--mine" data-ref="mySupport"></div>
          <div class="place-bar" data-ref="placeBar" hidden></div>
          <div class="hand" data-ref="hand"></div>

          <aside class="right">
            <div class="pile" data-ref="deck"></div>
            <div class="pile" data-ref="mictlan"></div>
            <button class="end-btn" data-btn="end">Fin turno</button>
            <button class="surrender-btn" data-btn="surrender">Rendirse</button>
          </aside>

          <div class="chooser" data-ref="chooser" hidden></div>
          <div class="mictlan-view" data-ref="mictlanView" hidden></div>
          <div class="toast" data-ref="toast" hidden></div>
          <div class="fusion-show" data-ref="fusionShow" hidden></div>
          <div class="overlay" data-ref="overlay" hidden></div>
        </div>
        <div class="rotate-hint">
          <p>Gira tu celular para jugar en horizontal</p>
          <button class="tag-btn" onclick="this.parentElement.remove()">Seguir así</button>
        </div>
      </div>`;

    this.fx = new DuelFx(root.querySelector<HTMLElement>('.stage')!);
    const ref = (name: string) => root.querySelector<HTMLElement>(`[data-ref="${name}"]`)!;
    const btn = (name: string) => root.querySelector<HTMLButtonElement>(`[data-btn="${name}"]`)!;
    this.el = {
      inspectorCard: ref('inspectorCard'), inspectorInfo: ref('inspectorInfo'), status: ref('status'),
      logPanel: ref('logPanel'), log: ref('log'), turn: ref('turn'),
      foeHand: ref('foeHand'), foeSupport: ref('foeSupport'), foeField: ref('foeField'),
      myField: ref('myField'), mySupport: ref('mySupport'), hand: ref('hand'), placeBar: ref('placeBar'), mictlanView: ref('mictlanView'),
      me: ref('me'), foe: ref('foe'), deck: ref('deck'), mictlan: ref('mictlan'), overlay: ref('overlay'),
      albumPanel: ref('albumPanel'), album: ref('album'), chooser: ref('chooser'), fusionShow: ref('fusionShow'), albumCount: ref('albumCount'), emblem: ref('emblem'), toast: ref('toast'), timeBox: ref('timeBox'), signBox: ref('signBox'),
    };
    this.btn = { log: btn('log'), album: btn('album'), end: btn('end'), surrender: btn('surrender'), exit: btn('exit'), claim: btn('claim') };
    root.querySelector('.side-buttons')!.append(muteButton('tag-btn'), musicButton('tag-btn'));
    this.btn.claim.addEventListener('click', () => {
      this.btn.claim.disabled = true;
      this.setup.remote?.claim().catch(e => { this.message = e instanceof Error ? e.message : String(e); this.render(); })
        .finally(() => { this.btn.claim.disabled = false; });
    });
    this.btn.exit.addEventListener('click', () => {
      if (!this.engine || this.engine.state.winner !== null) { this.setup.onExit(); return; }
      if (!confirm('¿Salir del duelo? Cuenta como derrota.')) return;
      this.submit({ type: 'surrender', player: this.me });
      if (!this.setup.remote) this.setup.onExit();   // en multijugador se sale al ver el resultado
    });


    this.btn.log.addEventListener('click', () => { this.showLog = !this.showLog; this.showAlbum = false; this.render(); });
    this.btn.album.addEventListener('click', () => { this.showAlbum = !this.showAlbum; this.showLog = false; this.render(); });
    this.btn.end.addEventListener('click', () => this.submit({ type: 'endTurn', player: this.me }));
    this.btn.surrender.addEventListener('click', () => this.onSurrender());
    this.el.foe.addEventListener('click', () => this.onDirectAttack());
    // Tocar el Mictlán (cementerio) abre la lista de cartas que ya se usaron, tuyas y del rival
    this.el.mictlan.addEventListener('click', () => { if (this.engine) void this.openMictlan(this.me); });

    void this.newDuel();
    // Solo en desarrollo (npm run dev): window.__duel para probar desde la consola
    if (import.meta.env.DEV) (window as unknown as { __duel: DuelView }).__duel = this;
  }

  /** Un sonido por tipo de cosa que pasó (sin amontonar repetidos). */
  private playSounds(events: DuelEvent[]): void {
    const played = new Set<Sfx>();
    const play = (s: Sfx) => { if (!played.has(s)) { played.add(s); sfx(s); } };
    for (const e of events) {
      switch (e.type) {
        case 'cardsDrawn': if (e.player === this.me && this.engine?.state.turn > 1) play('draw'); break;
        case 'cardPlayed': case 'specialSummoned': play('play'); break;
        case 'trapSet': play('setCard'); break;
        case 'positionChanged': if (!e.flipped) play('position'); break;
        case 'fusion': play('fusion'); break;
        case 'fusionFailed': play('fusionFail'); break;
        case 'activated': play('spell'); break;
        case 'trapActivated': play('trap'); break;
        case 'attackDeclared': play(e.targetId === null ? 'direct' : 'attack'); break;
        case 'sentToMictlan': if (e.reason === 'battle' || e.reason === 'effect') play('destroy'); break;
        case 'damage': play(e.amount >= 1000 ? 'hit' : 'damage'); break;
        case 'healed': play('heal'); break;
        case 'timeChanged': play(e.night ? 'night' : 'phase'); break;
        case 'gameOver': play(e.winner === this.me ? 'win' : 'lose'); break;
        default: break;
      }
    }
  }

  /** Deja de escuchar la sala (al salir de la pantalla). */
  destroy(): void {
    this.unwatch?.();
    this.unwatch = null;
    clearInterval(this.clock);
  }

  /** Para pruebas en desarrollo: el rival se rinde. */
  debugWin(): void {
    const r = this.engine.apply({ type: 'surrender', player: this.foe });
    if (r.ok) { this.record(r.events); this.render(); }
  }

  // ---------------------------------------------------------------- flujo

  private async newDuel(): Promise<void> {
    if (this.setup.remote) { await this.startRemote(); return; }
    const no = ++this.duelNo;
    let seed: number;
    let levels = this.setup.levels;
    try {
      if (this.setup.newSeed) {
        this.showOverlayMessage('Preparando el duelo…');
        const got = await this.setup.newSeed();
        seed = got.seed;
        levels = got.levels ?? levels;
      } else {
        seed = Math.floor(Math.random() * 2 ** 31);
      }
    } catch (e) {
      this.showOverlayMessage(e instanceof Error ? e.message : String(e), true);
      return;
    }
    if (no !== this.duelNo) return;
    this.el.overlay.replaceChildren();
    this.album.clear();
    this.finished = null;
    this.finishing = false;
    this.intents = [];
    this.engine = createDuel(seed, this.setup.playerDeck, this.setup.opponent as Duelist, cardDb, fusionDb, levels);   // igual que el servidor
    this.log = [];
    this.selectedHand = [];
    this.selectedAttacker = null;
    this.inspected = null;
    this.message = '';
    this.lastLife = [START_LIFE, START_LIFE];
    this.record(this.engine.start());
    const sign = this.engine.state.daySign;
    if (sign) this.toast(`Signo del día: ${sign.glyph} ${sign.name} — ${sign.text}`);
    this.render();
  }

  private submit(intent: Intent): void {
    if ((this.aiThinking || this.remoteBusy) && intent.type !== 'surrender') return;
    if (this.setup.remote) { void this.submitRemote(intent); return; }
    const result = this.engine.apply(intent);
    if (!result.ok) {
      sfx('error');
      this.message = result.error;
      this.render();
      return;
    }
    if (intent.player === this.me) this.intents.push(intent);
    this.message = '';
    this.selectedHand = [];
    this.resetPlacement();
    if (intent.type !== 'changePosition') this.selectedAttacker = null;   // tras cambiar posición sigue elegido
    this.record(result.events);
    this.render();
    if (this.engine.state.turnPlayer === this.foe && this.engine.state.winner === null && !this.aiThinking) this.runAiTurn();
  }

  // ---------------------------------------------------------------- multijugador

  private async startRemote(): Promise<void> {
    const remote = this.setup.remote!;
    this.showOverlayMessage('Conectando con la sala…');
    let snap: RemoteSnapshot;
    try { snap = await remote.load(); } catch (e) { this.showOverlayMessage(e instanceof Error ? e.message : String(e), true); return; }
    this.el.overlay.replaceChildren();
    this.el.overlay.hidden = true;
    this.album.clear();
    this.finished = null;
    this.finishing = false;
    this.log = [];
    this.engine = new ViewEngine(cardDb, snap.view);
    this.lastLife = [this.engine.state.players[0].life, this.engine.state.players[1].life];
    this.applied = snap.index;
    this.remoteSeen = snap.index;
    this.lastMoveAt = snap.lastMoveAt;
    const sign = this.engine.state.daySign;
    if (sign) this.toast(`Signo del día: ${sign.glyph} ${sign.name} — ${sign.text}`);
    this.unwatch?.();
    this.unwatch = remote.watch((count, lastMoveAt) => {
      this.lastMoveAt = lastMoveAt;
      this.remoteSeen = Math.max(this.remoteSeen, count);
      if (count > this.applied && !this.remoteBusy) void this.pullRemote();
    });
    clearInterval(this.clock);
    this.clock = window.setInterval(() => this.renderTimer(), 1000);
    this.render();
    if (this.engine.state.winner !== null) this.render();
  }

  /** Tu jugada en multijugador: la revisa el servidor y regresa tu vista nueva. */
  private async submitRemote(intent: Intent): Promise<void> {
    const remote = this.setup.remote!;
    this.remoteBusy = true;
    this.message = '';
    this.render();
    try {
      const snap = await remote.send(intent, this.applied);
      this.selectedHand = [];
      this.resetPlacement();
      if (intent.type !== 'changePosition') this.selectedAttacker = null;
      this.remoteBusy = false;
      await this.playSteps(snap);
    } catch (e) {
      this.remoteBusy = false;
      const code = (e as { code?: string })?.code;
      if (code === 'conflict') { void this.pullRemote(); return; }
      if (code !== 'finished') { sfx('error'); this.message = e instanceof Error ? e.message : String(e); }
      this.render();
    }
  }

  /** Trae las jugadas del rival que faltan y las anima una por una. */
  private async pullRemote(): Promise<void> {
    const remote = this.setup.remote;
    if (!remote || this.remoteBusy) return;
    this.remoteBusy = true;
    try {
      const snap = await remote.since(this.applied);
      this.remoteBusy = false;
      await this.playSteps(snap);
    } catch {
      this.remoteBusy = false;
      this.message = 'Sin conexión con la sala. Reintentando…';
      this.render();
      setTimeout(() => void this.pullRemote(), 3000);
      return;
    }
    if (this.remoteSeen > this.applied) void this.pullRemote();
  }

  /** Aplica cada jugada que mandó el servidor (vista + eventos), con pausa entre jugadas como la IA. */
  private async playSteps(snap: RemoteSnapshot): Promise<void> {
    const engine = this.engine as ViewEngine;
    this.remoteBusy = true;
    for (let i = 0; i < snap.steps.length; i++) {
      const step = snap.steps[i];
      engine.load(step.view);
      this.record(step.events);
      this.render();
      if (i < snap.steps.length - 1) await new Promise(r => setTimeout(r, AI_STEP_MS + showDelay(step.events)));
    }
    engine.load(snap.view);
    this.applied = snap.index;
    this.remoteSeen = Math.max(this.remoteSeen, snap.index);
    this.lastMoveAt = snap.lastMoveAt;
    this.remoteBusy = false;
    this.message = '';
    this.render();
  }

  /** Reloj del turno (multijugador): cuánto lleva el turno y botón para reclamar si el rival no juega. */
  private renderTimer(): void {
    const remote = this.setup.remote;
    if (!remote || !this.engine) return;
    const s = this.engine.state;
    if (s.winner !== null) { this.btn.claim.hidden = true; clearInterval(this.clock); return; }
    const left = Math.max(0, remote.timeoutMs - (Date.now() - this.lastMoveAt));
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    this.el.turn.textContent = `Turno ${s.turn} · ${mm}:${String(ss).padStart(2, '0')}`;
    this.el.turn.classList.toggle('turn-tag--hurry', left < 20000);
    this.btn.claim.hidden = !(s.turnPlayer === this.foe && left === 0 && !this.remoteBusy);
  }

  private runAiTurn(): void {
    this.aiThinking = true;
    this.render();
    const step = () => {
      const s = this.engine.state;
      if (s.winner !== null || s.turnPlayer !== this.foe) {
        this.aiThinking = false;
        this.render();
        return;
      }
      const result = aiStep(this.engine as DuelEngine, this.setup.opponent as Duelist, fusionDb);   // la misma IA que repite el servidor
      if (result.ok) this.record(result.events);
      this.render();
      // Si el rival fusionó, espera a que se vea la fusión antes de seguir.
      setTimeout(step, AI_STEP_MS + (result.ok ? showDelay(result.events) : 0));
    };
    setTimeout(step, AI_STEP_MS);
  }

  // ---------------------------------------------------------------- input

  private onHandCard(card: CardInstance): void {
    this.inspected = card;
    if (!this.isMyTurn()) { this.render(); return; }
    const i = this.selectedHand.indexOf(card.instanceId);
    const defs = this.selectedHand.map(id => this.handCard(id)?.def);
    const hasMonster = defs.some(d => d?.type === 'monster');
    const loneSpell = defs.length === 1 && defs[0]?.type !== 'monster';
    if (i >= 0) this.selectedHand.splice(i, 1);
    else if (card.def.type === 'monster') this.selectedHand = loneSpell ? [card.instanceId] : [...this.selectedHand, card.instanceId];
    // Equipos: si ya elegiste un monstruo, entran a la cadena (monstruo + equipo + equipo)
    else if (isChainEquip(card.def) && hasMonster) this.selectedHand.push(card.instanceId);
    else this.selectedHand = [card.instanceId];   // otras mágicas y trampas van solas
    this.selectedAttacker = null;
    this.armedSupport = null;
    this.fieldSpell = null;
    this.message = '';
    this.render();
  }

  private handCard(id: number): CardInstance | undefined {
    return this.engine.state.players[this.me].hand.find(c => c.instanceId === id);
  }

  /** La carta elegida si es mágica o equipo. */
  private selectedSpell(): CardInstance | undefined {
    const c = this.selectedHand.length === 1 ? this.handCard(this.selectedHand[0]) : undefined;
    return c && isSupportCard(c.def) ? c : undefined;
  }

  private onSupportSlot(slot: number): void {
    const own = this.engine.state.players[this.me].support[slot];
    if (own) { this.inspected = own; this.render(); }
    const spell = this.selectedSpell();
    if (!this.isMyTurn()) return;
    // Mágica o equipo que colocaste antes: tócala dos veces para activarla
    if (!spell && own && own.def.type !== 'trap' && this.selectedHand.length === 0) {
      if (this.armedSupport !== own.instanceId) {
        this.armedSupport = own.instanceId;
        this.message = `Toca otra vez ${own.def.name} para activarla.`;
        this.render();
        return;
      }
      this.armedSupport = null;
      if (needsEquipTarget(own.def)) {
        this.fieldSpell = own.instanceId;
        this.message = `Toca uno de tus monstruos para equiparle ${own.def.name}.`;
        this.render();
        return;
      }
      this.submit({ type: 'activate', player: this.me, handId: own.instanceId });
      return;
    }
    if (!spell) return;
    if (spell.def.type === 'trap' || this.setSpell) {
      this.submit({ type: 'activate', player: this.me, handId: spell.instanceId, slot, set: spell.def.type !== 'trap' });
      return;
    }
    if (needsEquipTarget(spell.def)) {
      this.message = 'Toca uno de tus monstruos para equiparlo.';
      this.render();
      return;
    }
    this.submit({ type: 'activate', player: this.me, handId: spell.instanceId });
  }

  private onMySlot(slot: number): void {
    const card = this.engine.state.players[this.me].field[slot];
    if (card) this.inspected = card;
    if (!this.isMyTurn()) { this.render(); return; }
    if (this.fieldSpell !== null && card) {
      const id = this.fieldSpell;
      this.fieldSpell = null;
      this.submit({ type: 'activate', player: this.me, handId: id, targetId: card.instanceId });
      return;
    }
    const spell = this.selectedSpell();
    if (spell) {
      if (needsEquipTarget(spell.def) && card) {
        this.submit({ type: 'activate', player: this.me, handId: spell.instanceId, targetId: card.instanceId });
      } else if (!needsEquipTarget(spell.def)) {
        this.message = 'Las mágicas y trampas van en tus zonas de abajo (◈).';
        this.render();
      }
      return;
    }
    if (this.selectedHand.length > 0) {
      void this.playSelected(slot);
      return;
    }
    // Tocar tu monstruo lo elige (y muestra la bolita). Tocarlo otra vez NO lo suelta, para no
    // esconder la bolita por accidente; para soltarlo toca una zona vacía.
    this.selectedAttacker = card ? card.instanceId : null;
    this.message = '';
    this.render();
  }

  private onFoeSlot(slot: number): void {
    const target = this.engine.state.players[this.foe].field[slot];
    if (target && !target.faceDown) this.inspected = target;
    if (!this.isMyTurn() || this.selectedAttacker === null || !target) { this.render(); return; }
    this.submit({ type: 'attack', player: this.me, attackerId: this.selectedAttacker, targetId: target.instanceId });
  }

  private onDirectAttack(): void {
    if (!this.isMyTurn() || this.selectedAttacker === null) return;
    this.submit({ type: 'attack', player: this.me, attackerId: this.selectedAttacker, targetId: null });
  }

  private onSurrender(): void {
    if (this.engine.state.winner !== null) return;
    if (!this.surrenderArmed) {
      this.surrenderArmed = true;
      this.render();
      clearTimeout(this.surrenderTimer);
      this.surrenderTimer = window.setTimeout(() => { this.surrenderArmed = false; this.render(); }, 3000);
      return;
    }
    this.surrenderArmed = false;
    this.submit({ type: 'surrender', player: this.me });
  }

  private isMyTurn(): boolean {
    const s = this.engine.state;
    return !this.aiThinking && !this.remoteBusy && s.winner === null && s.turnPlayer === this.me;
  }

  // ---------------------------------------------------------------- dibujo

  private render(): void {
    const s = this.engine.state;
    const me = s.players[this.me];
    const foe = s.players[this.foe];
    const myTurn = this.isMyTurn();
    const attackerSel = me.field.find(c => c?.instanceId === this.selectedAttacker);
    const canAttackNow = s.turn > 1 || FIRST_TURN_CAN_ATTACK;
    const canDirect = myTurn && canAttackNow && attackerSel?.position === 'attack' && !attackerSel.hasAttackedThisTurn
      && (foe.field.every(c => c === null) || attackerSel.hasKeyword('directAttack'));

    // Barra central
    this.el.me.replaceChildren(...this.playerBar('Tú', this.me, `Mano ${me.hand.length}`));
    this.el.foe.replaceChildren(...this.playerBar(this.setup.opponent.name, this.foe, `Mazo ${foe.deck.length} · Mictlán ${foe.mictlan.length}`));
    this.el.foe.classList.toggle('pl--target', canDirect);
    this.el.foe.title = canDirect ? 'Ataque directo' : '';
    this.el.me.classList.toggle('pl--active', s.turnPlayer === this.me && s.winner === null);
    this.el.foe.classList.toggle('pl--active', s.turnPlayer === this.foe && s.winner === null);
    this.lastLife = [me.life, foe.life];

    // Mano del rival
    this.el.foeHand.replaceChildren(...foe.hand.map(c => createCardElement(c, { hidden: true })));

    // Campos
    this.el.foeField.replaceChildren(...foe.field.map((card, i) => this.zone(card, false, () => this.onFoeSlot(i))));
    this.el.myField.replaceChildren(...me.field.map((card, i) => this.zone(card, true, () => this.onMySlot(i))));
    const spell = myTurn ? this.selectedSpell() : undefined;
    const equipping = !!spell && needsEquipTarget(spell.def);
    this.el.myField.classList.toggle('zones--placing', myTurn && this.selectedHand.length > 0 && !spell);
    this.el.myField.classList.toggle('zones--equipping', equipping);
    this.el.mySupport.replaceChildren(...me.support.map((c, i) => this.supportZone(c, true, i)));
    this.el.foeSupport.replaceChildren(...foe.support.map((c, i) => this.supportZone(c, false, i)));
    this.el.mySupport.classList.toggle('zones--placing', !!spell && !equipping);
    this.renderClock();
    this.el.foeField.classList.toggle('zones--targeting', myTurn && canAttackNow && attackerSel?.position === 'attack' && !attackerSel.hasAttackedThisTurn);

    // Mano propia
    this.el.hand.replaceChildren(...me.hand.map(card => {
      const order = this.selectedHand.indexOf(card.instanceId);
      const el = createCardElement(card, { selectionOrder: order >= 0 ? order + 1 : undefined });
      el.addEventListener('click', () => this.onHandCard(card));
      el.addEventListener('mouseenter', () => this.inspect(card));
      return el;
    }));

    // Mazo y Mictlán propios
    this.el.deck.replaceChildren(...this.pile('Mazo', me.deck.length, me.deck[0] ? createCardElement(me.deck[0], { hidden: true }) : null));
    const top = me.mictlan.at(-1);
    this.el.mictlan.replaceChildren(...this.pile('Mictlán', me.mictlan.length, top ? createCardElement(top) : null));

    // Botones
    this.btn.log.classList.toggle('tag-btn--on', this.showLog);
    this.btn.album.classList.toggle('tag-btn--on', this.showAlbum);
    this.btn.album.textContent = `Fusiones ${this.album.size}`;
    this.btn.end.disabled = !myTurn;
    this.btn.surrender.classList.toggle('surrender-btn--armed', this.surrenderArmed);
    this.btn.surrender.innerHTML = this.surrenderArmed ? 'Rendirse<small>toca de nuevo</small>' : 'Rendirse';
    this.el.turn.textContent = `Turno ${s.turn}`;
    this.renderTimer();

    this.renderPlaceBar(myTurn);
    this.enterIds.clear();
    this.el.status.textContent = this.message || this.statusMessage();
    this.el.status.classList.toggle('status--error', !!this.message);

    this.renderInspector();
    this.el.logPanel.hidden = !this.showLog;
    this.el.log.replaceChildren(...this.log.slice(-60).map(line => {
      const li = document.createElement('li');
      li.textContent = line;
      if (line.startsWith('—')) li.className = 'log__turn';
      return li;
    }));
    this.el.log.scrollTop = this.el.log.scrollHeight;
    this.el.albumPanel.hidden = !this.showAlbum;
    if (this.showAlbum) this.renderAlbum();

    this.renderOverlay();
  }

  private playerBar(name: string, player: PlayerIndex, detail: string): HTMLElement[] {
    const p = this.engine.state.players[player];
    const hit = this.lastLife[player] > p.life;
    const avatar = document.createElement('span');
    avatar.className = 'pl__avatar';
    avatar.textContent = player === this.me ? '☀' : this.setup.opponent.glyph;
    const text = document.createElement('span');
    text.className = 'pl__text';
    text.innerHTML = `<span class="pl__name"></span><span class="pl__life${hit ? ' pl__life--hit' : ''}"></span>
      <span class="pl__bar"><span style="width:${Math.max(0, Math.min(100, (p.life / START_LIFE) * 100))}%"></span></span>
      <span class="pl__detail"></span>`;
    text.querySelector('.pl__name')!.textContent = name;
    text.querySelector('.pl__life')!.textContent = String(p.life);
    text.querySelector('.pl__detail')!.textContent = detail;
    return player === this.me ? [text, avatar] : [avatar, text];
  }

  private pile(label: string, count: number, card: HTMLElement | null): HTMLElement[] {
    const slot = document.createElement('div');
    slot.className = 'pile__slot';
    if (card) slot.append(card);
    const badge = document.createElement('span');
    badge.className = 'pile__count';
    badge.textContent = String(count);
    const name = document.createElement('span');
    name.className = 'pile__label';
    name.textContent = label;
    slot.append(badge);
    return [slot, name];
  }

  private supportZone(card: CardInstance | null, mine: boolean, slot: number): HTMLElement {
    const zone = document.createElement(mine ? 'button' : 'div');
    zone.className = 'zone zone--support';
    if (mine) {
      (zone as HTMLButtonElement).type = 'button';
      zone.setAttribute('aria-label', card ? 'Tu trampa boca abajo' : 'Zona de mágicas y trampas');
      zone.addEventListener('click', () => this.onSupportSlot(slot));
    }
    if (card) {
      // Trampa boca abajo: el rival solo ve el dorso; tú la ves atenuada.
      const el = createCardElement(card, { hidden: !mine, faceDownOwn: mine });
      if (mine) el.addEventListener('mouseenter', () => this.inspect(card));
      zone.append(el);
    }
    return zone;
  }

  private zone(card: CardInstance | null, mine: boolean, onClick: () => void): HTMLElement {
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = 'zone';
    zone.addEventListener('click', onClick);
    if (!card) {
      zone.setAttribute('aria-label', mine ? 'Zona vacía propia' : 'Zona vacía del rival');
      return zone;
    }
    const hidden = !mine && card.faceDown;
    const el = createCardElement(card, {
      hidden,
      defense: card.position === 'defense',
      faceDownOwn: mine && card.faceDown,
      attacked: card.hasAttackedThisTurn,
      selected: card.instanceId === this.selectedAttacker,
    });
    if (!hidden) el.addEventListener('mouseenter', () => this.inspect(card));
    zone.append(el);
    if (this.enterIds.has(card.instanceId)) zone.classList.add('zone--enter');
    if (this.lunging && this.lunging.id === card.instanceId && Date.now() < this.lunging.until) el.classList.add('card--lunging');
    if (mine && card.instanceId === this.selectedAttacker && this.canChangePosition(card)) {
      const bubble = document.createElement('span');
      bubble.className = 'pos-bubble';
      bubble.setAttribute('role', 'button');
      bubble.title = card.position === 'attack' ? 'Pasar a defensa' : 'Pasar a ataque';
      bubble.textContent = card.position === 'attack' ? '⛨' : '⚔';
      bubble.addEventListener('click', ev => {
        ev.stopPropagation();
        this.submit({ type: 'changePosition', player: this.me, instanceId: card.instanceId });
      });
      zone.append(bubble);
    }
    return zone;
  }

  private canChangePosition(card: CardInstance): boolean {
    return this.isMyTurn() && card.attacksThisTurn === 0;
  }

  private inspect(card: CardInstance): void {
    if (this.inspected === card) return;
    this.inspected = card;
    this.renderInspector();
  }

  private renderInspector(): void {
    const card = this.inspected;
    if (!card || card.zone === 'deck') {
      this.el.inspectorCard.replaceChildren();
      this.el.inspectorInfo.innerHTML = '<p class="inspector__empty">Toca o pasa el mouse sobre una carta para verla aquí</p>';
      return;
    }
    this.el.inspectorCard.replaceChildren(createCardElement(card));
    const where = { hand: 'En tu mano', field: 'En el campo', mictlan: 'En el Mictlán', deck: '' }[card.zone];
    const pos = card.zone === 'field' ? ` · ${card.position === 'attack' ? 'Ataque' : 'Defensa'}${card.faceDown ? ' · boca abajo' : ''}` : '';
    this.el.inspectorInfo.innerHTML = `
      <h3 class="inspector__name"></h3>
      <p class="inspector__meta"></p>
      <p class="inspector__stats">${card.def.type === 'monster' ? `<b>ATK ${card.atk}</b><b>DEF ${card.defense}</b>` : `<b>${{ spell: 'Mágica', equip: 'Equipo', trap: 'Trampa', ritual: 'Ritual', monster: '' }[card.def.type]}</b>`}</p>
      <p class="inspector__desc"></p>
      <p class="inspector__effect"></p>
      <p class="inspector__where"></p>`;
    this.el.inspectorInfo.querySelector('.inspector__name')!.textContent = card.name;
    this.el.inspectorInfo.querySelector('.inspector__meta')!.textContent = [ATTR[card.def.attribute], ...card.def.tags].join(' · ');
    const nahual = card.def.nahual;
    this.el.inspectorInfo.querySelector('.inspector__desc')!.textContent = card.nightForm && nahual?.description ? nahual.description : card.def.description;
    const fx = describeEffects(card.def.effects);
    const nahualText = nahual
      ? (card.nightForm
        ? `🌙 Nahual. De día es ${card.def.name} (${card.def.atk}/${card.def.def}).`
        : `🌙 Nahual. De noche se vuelve ${nahual.name} (${nahual.atk}/${nahual.def}).`)
      : '';
    this.el.inspectorInfo.querySelector('.inspector__effect')!.textContent = [nahualText, fx ? `Efecto: ${fx}` : ''].filter(Boolean).join(' ');
    const kw = card.zone === 'field' ? card.activeKeywords.map(k => KEYWORD_TEXT[k]) : [];
    const extra = [card.borrowed ? 'controlado por el rival este turno' : '', ...kw].filter(Boolean);
    this.el.inspectorInfo.querySelector('.inspector__where')!.textContent = where + pos + (extra.length ? ` · ${extra.join(' · ')}` : '');
  }

  private renderOverlay(): void {
    const winner = this.engine.state.winner;
    this.el.overlay.hidden = winner === null;
    if (winner === null) return;
    const won = winner === this.me;
    if (!this.finishing) {                                          // una sola vez por duelo
      this.finishing = true;
      const engine = this.engine;
      // Si tarda, avisa; si se pasa del tiempo, ofrece reintentar (el servidor no paga dos veces).
      const slow = setTimeout(() => {
        const note = this.el.overlay.querySelector('.overlay__note');
        if (!this.finished && note) note.textContent = 'Guardando resultado… tarda más de lo normal, revisa tu conexión.';
      }, 8000);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('No se pudo guardar: sin conexión o el servidor no respondió.'), { code: 'timeout' })), SAVE_TIMEOUT_MS);
      });
      Promise.race([Promise.resolve().then(() => this.setup.onFinish(won, [...this.intents])), timeout])
        .catch((e: unknown): DuelResult => {
          const code = (e as { code?: string })?.code;
          const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
          const msg = offline ? 'No hay internet: no se pudo guardar el resultado.' : e instanceof Error ? e.message : String(e);
          return { rewards: [], notes: [], error: msg, retry: !NO_RETRY.includes(code ?? '') };
        })
        .then(result => {
          clearTimeout(slow); clearTimeout(timer);
          if (engine !== this.engine) return;                        // ya empezó otro duelo
          this.finished = result;
          this.el.overlay.replaceChildren();
          this.render();
        });
    }
    if (this.el.overlay.childElementCount) return;                  // ya está dibujado

    const box = document.createElement('div');
    box.className = 'overlay__box';
    const title = document.createElement('p');
    title.className = `overlay__title ${won ? 'win' : 'lose'}`;
    title.textContent = won ? '¡Victoria!' : 'Derrota';
    box.append(title);
    if (!this.finished) {
      const p = document.createElement('p');
      p.className = 'overlay__note';
      p.textContent = 'Guardando resultado…';
      box.append(p);
      this.el.overlay.replaceChildren(box);
      return;
    }
    if (this.finished.error) {
      const p = document.createElement('p');
      p.className = 'overlay__note overlay__note--error';
      p.textContent = this.finished.error;
      box.append(p);
    }
    if (this.finished.rewards.length) {
      const label = document.createElement('p');
      label.className = 'overlay__label';
      label.textContent = this.finished.rewards.length === 1 ? 'Ganaste esta carta:' : 'Ganaste estas cartas:';
      const row = document.createElement('div');
      row.className = 'overlay__rewards';
      for (const id of this.finished.rewards) {
        const c = cardDb.tryGet(id);
        if (c) row.append(createCardElement(c));
      }
      box.append(label, row);
    }
    for (const note of this.finished.notes) {
      const p = document.createElement('p');
      p.className = 'overlay__note';
      p.textContent = note;
      box.append(p);
    }
    const buttons = document.createElement('div');
    buttons.className = 'overlay__buttons';
    const again = document.createElement('button');
    again.className = 'tag-btn';
    again.textContent = 'Revancha';
    again.addEventListener('click', () => { this.el.overlay.replaceChildren(); void this.newDuel(); });
    const back = document.createElement('button');
    back.className = 'end-btn';
    back.textContent = 'Continuar';
    back.addEventListener('click', () => this.setup.onExit());
    if (this.setup.remote) { this.unwatch?.(); this.unwatch = null; clearInterval(this.clock); }
    const retry = document.createElement('button');
    retry.className = 'end-btn';
    retry.textContent = 'Reintentar guardar';
    retry.addEventListener('click', () => {
      this.finishing = false; this.finished = null;
      this.el.overlay.replaceChildren();
      this.render();
    });
    if (this.finished.retry) buttons.append(retry);
    buttons.append(...(this.setup.remote ? [back] : [again, back]));
    box.append(buttons);
    this.el.overlay.replaceChildren(box);
  }

  /** Mensaje a pantalla completa (preparando / error al empezar). */
  private showOverlayMessage(text: string, withExit = false): void {
    const box = document.createElement('div');
    box.className = 'overlay__box';
    const p = document.createElement('p');
    p.className = `overlay__note${withExit ? ' overlay__note--error' : ''}`;
    p.textContent = text;
    box.append(p);
    if (withExit) {
      const back = document.createElement('button');
      back.className = 'end-btn';
      back.textContent = 'Volver';
      back.addEventListener('click', () => this.setup.onExit());
      const row = document.createElement('div');
      row.className = 'overlay__buttons';
      row.append(back);
      box.append(row);
    }
    this.el.overlay.replaceChildren(box);
    this.el.overlay.hidden = false;
  }

  /** Reloj Solar (centro del tablero) y el panel de fase + signo del día. */
  private renderClock(): void {
    const s = this.engine.state;
    const phase = phaseOf(s.turn);
    const info = PHASE_INFO[phase];
    const left = turnsLeftInPhase(s.turn);
    const next = PHASE_INFO[TIME_PHASES[(TIME_PHASES.indexOf(phase) + 1) % TIME_PHASES.length]];
    // La aguja avanza un poco en el segundo turno de cada fase.
    const step = TIME_PHASES.indexOf(phase) * 2 + (left === 1 ? 1 : 0);
    const em = this.el.emblem;
    if (!em.firstElementChild) {
      em.innerHTML = '<div class="clock"><span class="clock__needle"></span><span class="clock__icon"></span></div>';
    }
    em.dataset.phase = phase;
    em.classList.toggle('emblem--night', info.night);
    (em.querySelector('.clock__needle') as HTMLElement).style.setProperty('--step', String(step));
    em.querySelector('.clock__icon')!.textContent = info.icon;
    em.title = `${info.name} · ${describePhase(phase)}`;

    const tb = this.el.timeBox;
    tb.dataset.phase = phase;
    tb.innerHTML = '<b class="time-box__name"></b><span class="time-box__bonus"></span><small class="time-box__next"></small>';
    tb.querySelector('.time-box__name')!.textContent = `${info.icon} ${info.name}`;
    tb.querySelector('.time-box__bonus')!.textContent = describePhase(phase);
    tb.querySelector('.time-box__next')!.textContent = left === 1 ? `Al acabar este turno: ${next.icon} ${next.name}` : `${next.icon} ${next.name} en ${left} turnos`;

    const sign = s.daySign;
    this.el.signBox.hidden = !sign;
    if (sign) {
      this.el.signBox.innerHTML = '<small>Signo del día</small><b class="sign-box__name"></b><span class="sign-box__text"></span>';
      this.el.signBox.querySelector('.sign-box__name')!.textContent = `${sign.glyph} ${sign.name}`;
      this.el.signBox.querySelector('.sign-box__text')!.textContent = sign.text;
      this.el.signBox.title = `${sign.name} (${sign.meaning}): ${sign.text}`;
    }
  }

  private renderAlbum(): void {
    const items = [...this.album].flatMap(key => {
      const [pair, r] = key.split('>');
      const [a, b] = pair.split('+').map(Number);
      const [ca, cb, cr] = [cardDb.tryGet(a), cardDb.tryGet(b), cardDb.tryGet(Number(r))];
      return ca && cb && cr ? [{ a: ca, b: cb, r: cr }] : [];
    }).sort((x, y) => y.r.atk - x.r.atk);
    this.el.albumCount.textContent = `${items.length} en este duelo`;
    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Aquí aparecen las fusiones de este duelo, tuyas y del rival.';
      this.el.album.replaceChildren(li);
      return;
    }
    const op = (txt: string) => { const s2 = document.createElement('span'); s2.className = 'album-row__op'; s2.textContent = txt; return s2; };
    this.el.album.replaceChildren(...items.map(({ a, b, r }) => {
      const li = document.createElement('li');
      li.className = 'album-row';
      li.title = `${a.name} + ${b.name} = ${r.name} (ATK ${r.atk})`;
      const result = createCardElement(r);
      result.classList.add('album-row__result');
      li.append(createCardElement(a), op('+'), createCardElement(b), op('='), result);
      return li;
    }));
  }

  /** Texto de la cadena elegida. Solo revela resultados ya descubiertos, como en YGOFM. */
  private chainPreview(): string {
    const hand = this.engine.state.players[this.me].hand;
    const all = this.selectedHand
      .map(id => hand.find(c => c.instanceId === id)?.def)
      .filter((d): d is CardDef => d !== undefined);
    const defs = all.filter(d => d.type === 'monster');
    const eq = all.filter(d => d.type !== 'monster');
    const eqText = eq.length ? ` + equipo${eq.length > 1 ? 's' : ''}: ${eq.map(d => d.name).join(', ')}` : '';
    if (defs.length === 1) return `${defs[0].name}${eqText}. Toca una zona para jugarla con sus equipos puestos.`;
    let current = defs[0];
    const parts = [current.name];
    for (const next of defs.slice(1)) {
      const options = fusionDb.fusionOptions(current, next);
      if (options.length > 1) return `${parts.join(' ')} + ${next.name} → ¡${options.length} opciones! Elegirás al jugarla.`;
      const result = options[0];
      const known = result && this.album.has(albumKey(current.id, next.id, result.id));
      parts.push(`+ ${next.name} → ${known ? result.name : '¿?'}`);
      if (!known) return parts.join(' ') + '. Juégala para descubrir el resultado.';
      current = result;
    }
    return `${parts.join(' ')} (ATK ${current.atk})${eqText}. Toca una zona para jugarla.`;
  }

  /**
   * Ventana del Mictlán: todas las cartas que ya se usaron o fueron destruidas, de la más reciente a la más vieja.
   * Con `pick` sirve para ELEGIR una (para cartas que resucitan); sin `pick`, solo para ver.
   */
  openMictlan(player: PlayerIndex, pick?: { title: string; filter?: (c: CardInstance) => boolean }): Promise<CardInstance | null> {
    return new Promise(resolve => {
      const box = this.el.mictlanView;
      let side = player;
      const finish = (c: CardInstance | null) => { box.hidden = true; box.replaceChildren(); resolve(c); };
      const paint = () => {
        const list = [...this.engine.state.players[side].mictlan].reverse();
        const tab = (p: PlayerIndex, label: string) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `tag-btn${side === p ? ' tag-btn--on' : ''}`;
          b.textContent = `${label} (${this.engine.state.players[p].mictlan.length})`;
          b.addEventListener('click', () => { sfx('click'); side = p; paint(); });
          return b;
        };
        const head = document.createElement('div');
        head.className = 'mictlan-view__head';
        const title = document.createElement('h2');
        title.textContent = pick?.title ?? '☠ Mictlán';
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'tag-btn';
        close.textContent = pick ? 'Cancelar' : 'Cerrar';
        close.addEventListener('click', () => { sfx('click'); finish(null); });
        head.append(title, ...(pick ? [] : [tab(this.me, 'Tuyo'), tab(this.foe, 'Del rival')]), close);
        const grid = document.createElement('div');
        grid.className = 'mictlan-view__grid';
        for (const c of list) {
          const usable = !pick || (pick.filter?.(c) ?? true);
          const el = createCardElement(c);
          if (!usable) el.classList.add('card--dim');
          el.addEventListener('mouseenter', () => this.inspect(c));
          el.addEventListener('click', () => {
            this.inspected = c;
            if (pick && usable) { finish(c); this.render(); return; }
            this.render();
          });
          grid.append(el);
        }
        if (!list.length) {
          const p = document.createElement('p');
          p.className = 'mictlan-view__empty';
          p.textContent = 'Todavía no hay cartas en este Mictlán.';
          grid.append(p);
        }
        box.replaceChildren(head, grid);
      };
      paint();
      box.hidden = false;
    });
  }

  /** Muestra las opciones de una fusión y espera a que el jugador elija (null = cancelar). */
  private chooseFusion(a: CardDef, b: CardDef, options: CardDef[]): Promise<number | null> {
    return new Promise(resolve => {
      const box = this.el.chooser;
      const finish = (id: number | null) => { box.hidden = true; box.replaceChildren(); resolve(id); };
      const title = document.createElement('p');
      title.className = 'chooser__title';
      title.textContent = `${a.name} + ${b.name}`;
      const sub = document.createElement('p');
      sub.className = 'chooser__sub';
      sub.textContent = '¿Qué fusión quieres?';
      const row = document.createElement('div');
      row.className = 'chooser__options';
      for (const opt of options) {
        const el = createCardElement(opt);
        el.addEventListener('click', () => finish(opt.id));
        row.append(el);
      }
      const cancel = document.createElement('button');
      cancel.className = 'tag-btn';
      cancel.textContent = 'Cancelar';
      cancel.addEventListener('click', () => finish(null));
      box.replaceChildren(title, sub, row, cancel);
      box.hidden = false;
    });
  }

  /** Juega la cadena en la zona; si algún paso tiene varias opciones, pregunta cuál. */
  private async playSelected(slot: number): Promise<void> {
    const me = this.engine.state.players[this.me];
    const handIds = [...this.selectedHand];
    const fromHand = handIds.map(id => me.hand.find(c => c.instanceId === id)!.def).filter(d => d.type === 'monster');   // los equipos no fusionan
    const occupant = me.field[slot];
    const chain = occupant ? [occupant.def, ...fromHand] : fromHand;
    const choices: number[] = [];
    let current = chain[0];
    for (const next of chain.slice(1)) {
      const options = fusionDb.fusionOptions(current, next);
      let result = options[0] ?? null;
      if (options.length > 1) {
        const picked = await this.chooseFusion(current, next, options);
        if (picked === null) { this.render(); return; }
        choices.push(picked);
        result = options.find(o => o.id === picked)!;
      }
      current = result ?? next;
    }
    this.submit({ type: 'play', player: this.me, handIds, slot, position: this.placePosition, faceDown: this.placeFaceDown, fusionChoices: choices });
  }

  private resetPlacement(): void {
    this.placePosition = 'attack';
    this.placeFaceDown = false;
    this.setSpell = false;
    this.armedSupport = null;
    this.fieldSpell = null;
  }

  /** Barra arriba de tu mano: ataque/defensa y boca arriba/abajo (o activar/colocar para mágicas). */
  private renderPlaceBar(myTurn: boolean): void {
    const bar = this.el.placeBar;
    const defs = this.selectedHand.map(id => this.handCard(id)?.def).filter((d): d is CardDef => !!d);
    if (!myTurn || !defs.length) { bar.hidden = true; bar.replaceChildren(); return; }
    const opt = (label: string, on: boolean, title: string, fn: () => void, disabled = false) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `place-opt${on ? ' place-opt--on' : ''}`;
      b.textContent = label;
      b.title = title;
      b.disabled = disabled;
      b.addEventListener('click', ev => { ev.stopPropagation(); sfx('click'); fn(); this.render(); });
      return b;
    };
    const spell = this.selectedSpell();
    if (spell) {
      if (spell.def.type === 'trap') { bar.hidden = true; bar.replaceChildren(); return; }
      bar.replaceChildren(
        opt('✦ Activar', !this.setSpell, 'Usarla ahora', () => { this.setSpell = false; }),
        opt('▼ Colocar boca abajo', this.setSpell, 'Dejarla boca abajo y activarla en otro turno', () => { this.setSpell = true; }));
      bar.hidden = false;
      return;
    }
    const monsters = defs.filter(d => d.type === 'monster').length;
    const forcedUp = monsters > 1 || defs.length > monsters;   // fusión o equipada: sale boca arriba
    bar.replaceChildren(
      opt('⚔ Ataque', this.placePosition === 'attack', 'Bajarla en posición de ataque', () => { this.placePosition = 'attack'; }),
      opt('⛨ Defensa', this.placePosition === 'defense', 'Bajarla en posición de defensa', () => { this.placePosition = 'defense'; }),
      opt('▲ Boca arriba', !this.placeFaceDown || forcedUp, 'El rival la ve', () => { this.placeFaceDown = false; }),
      opt('▼ Boca abajo', this.placeFaceDown && !forcedUp, forcedUp ? 'Las fusiones y los monstruos equipados salen boca arriba' : 'El rival no la ve hasta que se voltee', () => { this.placeFaceDown = true; }, forcedUp));
    bar.hidden = false;
  }

  private statusMessage(): string {
    const s = this.engine.state;
    if (s.winner !== null) return '';
    if (this.setup.remote && s.turnPlayer === this.foe) return `Turno de ${this.setup.opponent.name}…`;
    if (this.aiThinking || s.turnPlayer === this.foe) return 'El rival está pensando...';
    if (this.selectedHand.length > 1) return this.chainPreview();
    const spell = this.selectedSpell();
    if (spell) {
      if (s.monsterPlayedThisTurn) return 'Ya bajaste monstruo: las mágicas y trampas van antes del monstruo.';
      if (s.supportUsedThisTurn) return 'Ya usaste una mágica o trampa este turno.';
      if (spell.def.type === 'trap' || this.setSpell) return `Toca una de tus zonas de abajo (◈) para colocar ${spell.def.name} boca abajo.`;
      return needsEquipTarget(spell.def)
        ? `Toca uno de tus monstruos para equiparle ${spell.def.name}.`
        : `Toca una de tus zonas de abajo (◈) para activar ${spell.def.name}.`;
    }
    if (this.selectedHand.length === 1) return 'Toca una zona para jugarla, o elige más cartas para fusionar.';
    if (this.selectedAttacker !== null) {
      const sel = s.players[this.me].field.find(c => c?.instanceId === this.selectedAttacker);
      const bubble = sel && this.canChangePosition(sel) ? ' El botón redondo cambia su posición.' : '';
      if (sel?.position === 'defense') return `En defensa no puede atacar.${bubble}`;
      if (s.turn === 1 && !FIRST_TURN_CAN_ATTACK) return `En el primer turno no se ataca.${bubble}`;
      if (sel?.hasAttackedThisTurn) return 'Ese monstruo ya atacó este turno.';
      return (s.players[this.foe].field.every(c => c === null)
        ? 'Toca la barra del rival para atacar directo.'
        : 'Toca un monstruo rival para atacarlo.') + bubble;
    }
    if (s.phase === 'main' && !s.monsterPlayedThisTurn && !s.supportUsedThisTurn) return 'Puedes usar una mágica o trampa y luego bajar un monstruo.';
    if (s.phase === 'main' && !s.monsterPlayedThisTurn) return 'Ahora puedes bajar un monstruo o una fusión.';
    return 'Toca uno de tus monstruos para atacar, o termina el turno.';
  }

  private toastTimer = 0;
  private toast(text: string): void {
    const t = this.el.toast;
    t.textContent = text;
    t.hidden = false;
    t.classList.remove('toast--show');
    void t.offsetWidth;            // reinicia la animación
    t.classList.add('toast--show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { t.hidden = true; }, 1800);
  }

  // ---------------------------------------------------------------- fusión en pantalla

  /** Muestra "A + B → resultado" unos segundos. Tocar la animación la salta. */
  private showNextFusion(): void {
    if (this.fusionShowing) return;
    const next = this.fusionQueue.shift();
    const box = this.el.fusionShow;
    if (!next) { box.hidden = true; box.replaceChildren(); return; }
    this.fusionShowing = true;
    const done = () => {
      clearTimeout(this.fusionTimer);
      box.onclick = null;
      this.fusionShowing = false;
      this.showNextFusion();
    };
    box.onclick = done;

    if (next.kind === 'cast') {
      // Mágica, equipo o trampa: su arte en grande unos segundos
      const t = document.createElement('p');
      t.className = 'fusion-show__title cast-show__title';
      const kind = next.trap ? '¡Trampa!' : next.card.type === 'equip' ? 'Equipo' : 'Mágica';
      t.textContent = `${next.player === this.me ? '' : 'Rival · '}${kind}`;
      const c = createCardElement(next.card);
      c.classList.add('cast-card');
      const sub = document.createElement('p');
      sub.className = 'cast-show__sub';
      sub.textContent = next.target ? `${next.card.name} → ${next.target}` : next.card.name;
      box.replaceChildren(t, c, sub);
      box.classList.toggle('fusion-show--foe', next.player === this.foe);
      box.dataset.kind = next.trap ? 'trap' : next.card.type;
      box.classList.add('cast-show');
      box.hidden = false;
      this.fusionTimer = window.setTimeout(done, CAST_SHOW_MS - 100);
      return;
    }
    box.classList.remove('cast-show');
    delete box.dataset.kind;

    const title = document.createElement('p');
    title.className = 'fusion-show__title';
    title.textContent = next.player === this.me ? '¡Fusión!' : '¡El rival fusiona!';
    const row = document.createElement('div');
    row.className = 'fusion-show__row';
    const op = (txt: string) => { const s2 = document.createElement('span'); s2.className = 'fusion-show__op'; s2.textContent = txt; return s2; };
    const ca = createCardElement(next.a); ca.classList.add('fs-a');
    const cb = createCardElement(next.b); cb.classList.add('fs-b');
    const cr = createCardElement(next.r, { hidden: next.r.id === 0 }); cr.classList.add('fs-r');   // fusión boca abajo del rival: no se ve
    row.append(ca, op('+'), cb, op('='), cr);
    box.replaceChildren(title, row);
    box.classList.toggle('fusion-show--foe', next.player === this.foe);
    box.hidden = false;
    this.fusionTimer = window.setTimeout(done, FUSION_SHOW_MS - 100);
  }

  // ---------------------------------------------------------------- registro

  private record(events: DuelEvent[]): void {
    this.playSounds(events);
    this.animate(events);
    for (const e of events) {
      if (e.type === 'activated' || e.type === 'trapActivated') {
        const card = this.engine.getCard(e.instanceId);
        const targetId = e.type === 'activated' ? e.targetId : null;
        if (card && card.def.id !== 0) {
          this.fusionQueue.push({ kind: 'cast', player: e.player, card: card.def, trap: e.type === 'trapActivated', target: targetId !== null ? this.engine.getCard(targetId)?.name ?? null : null });
          this.showNextFusion();
        }
      }
      if (e.type === 'fusion') {
        // Se aprende de TODAS las fusiones que se ven, tuyas y del rival.
        const [a, b] = e.materialIds.map(id => this.engine.getCard(id)?.def ?? HIDDEN_CARD);
        const result = this.engine.getCard(e.resultId);
        if (!result) continue;
        if (result.def.id !== 0) { this.album.add(albumKey(a.id, b.id, result.def.id)); this.inspected = result; }
        this.fusionQueue.push({ kind: 'fusion', player: e.player, a, b, r: result.def });
        this.showNextFusion();
      }
      if (e.type === 'effect') this.toast(`Efecto: ${this.engine.getCard(e.instanceId)?.def.name ?? ''}`);
      if (e.type === 'timeChanged') this.toast(`${PHASE_INFO[e.phase].icon} ${PHASE_INFO[e.phase].name}: ${describePhase(e.phase)}`);
      if (e.type === 'nahualShift') this.toast(e.night ? '🐆 Los nahuales toman su forma animal' : 'Los nahuales vuelven a su forma humana');
      if (e.type === 'trapActivated') this.toast(`¡Trampa! ${this.engine.getCard(e.instanceId)?.def.name ?? ''}`);
      if (e.type === 'attackNegated') this.toast('Ataque detenido');
      if (e.type === 'returnedToHand') this.toast(`${this.engine.getCard(e.instanceId)?.name ?? ''} regresa a la mano`);
      if (e.type === 'controlChanged' && e.player !== this.engine.getCard(e.instanceId)?.owner) this.toast(`¡${this.engine.getCard(e.instanceId)?.name ?? ''} cambia de bando!`);
      if (e.type === 'specialSummoned') this.toast(`¡${this.engine.getCard(e.instanceId)?.name ?? ''} sale del mazo!`);
      if (e.type === 'attackLocked') this.toast(e.player === this.me ? 'No podrás atacar en tu siguiente turno' : 'El rival no podrá atacar');
      if (e.type === 'battleSaved') this.toast(`${this.engine.getCard(e.instanceId)?.name ?? ''} resiste el golpe`);
      const line = this.describe(e);
      if (line) this.log.push(line);
    }
  }

  private stageEl(): HTMLElement | null { return this.el.hand.closest('.stage'); }

  /** Animaciones sobre el tablero que todavía muestra el momento ANTES de la jugada. */
  private animate(events: DuelEvent[]): void {
    if (!this.fx) return;
    let t = 0;
    const bar = (p: PlayerIndex) => this.fx.rect(p === this.me ? this.el.me : this.el.foe);
    for (const e of events) {
      switch (e.type) {
        case 'attackDeclared': {
          const attacker = this.fx.cardEl(e.attackerId);
          const targetEl = e.targetId !== null ? this.fx.cardEl(e.targetId) : null;
          const attackerSide = this.engine.state.turnPlayer;
          const r = targetEl ? this.fx.rect(targetEl) : bar(attackerSide === this.me ? this.foe : this.me);
          if (attacker) {
            this.fx.lunge(attacker, r);
            this.lunging = { id: e.attackerId, until: Date.now() + 520 };
            setTimeout(() => {
              this.stageEl()?.querySelector(`.zones [data-instance-id="${e.attackerId}"]`)?.classList.remove('card--lunging');
            }, 540);
          }
          this.fx.slash(r, 200);
          t = 380;
          break;
        }
        case 'sentToMictlan':
          if (e.reason === 'battle' || e.reason === 'effect') {
            const el = this.fx.cardEl(e.instanceId);
            if (el) this.fx.shatter(el, t);
          }
          break;
        case 'damage': this.fx.float(bar(e.player), `−${e.amount}`, 'damage', t); break;
        case 'healed': this.fx.float(bar(e.player), `+${e.amount}`, 'heal', t); break;
        case 'cardPlayed': case 'specialSummoned': case 'revived': this.enterIds.add(e.instanceId); break;
        case 'controlChanged': this.enterIds.add(e.instanceId); break;
        default: break;
      }
    }
  }

  private describe(e: DuelEvent): string | null {
    const who = (p: PlayerIndex) => (p === this.me ? 'Tú' : 'Rival');
    const name = (id: number) => this.engine.getCard(id)?.name ?? '?';
    switch (e.type) {
      case 'turnStarted': return `— Turno ${e.turn}: ${who(e.player)} —`;
      case 'cardsDrawn': return e.player === this.me ? `Robas ${e.instanceIds.length}` : `Rival roba ${e.instanceIds.length}`;
      case 'cardPlayed': {
        const shown = e.player === this.me || !e.faceDown ? name(e.instanceId) : 'una carta boca abajo';
        return `${who(e.player)} juega ${shown}${e.position === 'defense' ? ' en defensa' : ''}`;
      }
      case 'fusion': return `¡Fusión! ${name(e.materialIds[0])} + ${name(e.materialIds[1])} = ${name(e.resultId)}`;
      case 'fusionFailed': return `Fusión fallida: ${name(e.discardedId)} va al Mictlán`;
      case 'sentToMictlan': return e.reason === 'battle' || e.reason === 'effect' ? `${name(e.instanceId)} es destruido` : null;
      case 'phaseChanged': return null;
      case 'attackDeclared': return `${name(e.attackerId)} ataca ${e.targetId === null ? 'directo' : 'a ' + name(e.targetId)}`;
      case 'flipped': return `${name(e.instanceId)} se voltea`;
      case 'damage': return `${who(e.player)} recibe ${e.amount} de daño (${e.lifeAfter} PV)`;
      case 'activated': return `${who(e.player)} activa ${name(e.instanceId)}${e.targetId !== null ? ' en ' + name(e.targetId) : ''}`;
      case 'effect': return `Efecto de ${name(e.instanceId)}`;
      case 'statChanged': return `${name(e.instanceId)} queda en ATK ${e.atk} / DEF ${e.def}`;
      case 'healed': return `${who(e.player)} recupera ${e.amount} PV (${e.lifeAfter} PV)`;
      case 'revived': return `${name(e.instanceId)} regresa del Mictlán`;
      case 'timeChanged': return `${PHASE_INFO[e.phase].icon} Empieza ${PHASE_INFO[e.phase].name} (${describePhase(e.phase)})`;
      case 'nahualShift': return e.night ? 'Los nahuales cambian a su forma de noche' : 'Los nahuales vuelven a su forma de día';
      case 'trapSet': return e.player === this.me ? `Colocas ${name(e.instanceId)} boca abajo` : 'Rival coloca una trampa boca abajo';
      case 'trapActivated': return `¡Trampa! ${name(e.instanceId)} responde al ataque de ${name(e.attackerId)}`;
      case 'attackNegated': return `El ataque de ${name(e.attackerId)} se detiene`;
      case 'positionChanged': return `${name(e.instanceId)} pasa a ${e.position === 'attack' ? 'ataque' : 'defensa'}${e.flipped ? ' (se voltea)' : ''}`;
      case 'returnedToHand': return `${name(e.instanceId)} regresa a la mano`;
      case 'controlChanged': return `${e.player === this.me ? 'Tú controlas' : 'El rival controla'} a ${name(e.instanceId)}`;
      case 'specialSummoned': return `${who(e.player)} invoca ${name(e.instanceId)} desde el mazo`;
      case 'attackLocked': return `${e.player === this.me ? 'No puedes' : 'El rival no puede'} atacar hasta el turno ${e.untilTurn}`;
      case 'battleSaved': return `${name(e.instanceId)} resiste el combate`;
      case 'gameOver': return `${who(e.winner)} gana${e.reason === 'deckOut' ? ' (mazo vacío)' : e.reason === 'surrender' ? ' (rendición)' : ''}`;
    }
  }
}
