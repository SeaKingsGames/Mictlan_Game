import type { CardInstance } from '../core/CardInstance.ts';
import { DuelEngine, FIRST_TURN_CAN_ATTACK } from '../core/DuelEngine.ts';
import { isNightTurn, type DuelEvent, type Intent, type PlayerIndex } from '../core/DuelState.ts';
import { cardDb, fusionDb } from '../data/index.ts';
import type { Duelist } from '../game/duelists.ts';
import { aiStep } from '../game/replay.ts';
import { START_LIFE, isSupportCard, needsEquipTarget, type CardDef } from '../data/types.ts';
import { describeEffects } from '../data/effectText.ts';
import { createCardElement } from './cardElement.ts';

const HUMAN: PlayerIndex = 0;
const AI: PlayerIndex = 1;
const AI_STEP_MS = 750;
const FUSION_SHOW_MS = 2200;

/** Fusiones vistas en ESTE duelo (tuyas y del rival): "idA+idB>idResultado". Se reinicia cada duelo. */
const pairKey = (a: number, b: number) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const albumKey = (a: number, b: number, r: number) => `${pairKey(a, b)}>${r}`;

const ATTR: Record<string, string> = { sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra' };

export interface DuelResult {
  rewards: number[];      // cartas nuevas para mostrar
  notes: string[];        // avisos (cacao ganado, desbloqueos…)
  error?: string;         // si no se pudo guardar el resultado
}

export interface DuelSetup {
  playerDeck: number[];
  opponent: Duelist;
  /** Semilla de cada duelo (en la nube la da el servidor). Si falla, se muestra el error. */
  newSeed?: () => Promise<number>;
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
  private engine!: DuelEngine;
  private selectedHand: number[] = [];
  private selectedAttacker: number | null = null;
  private aiThinking = false;
  private log: string[] = [];
  private message = '';
  private inspected: CardInstance | null = null;
  private lastLife: [number, number] = [START_LIFE, START_LIFE];
  private showLog = false;
  private showAlbum = false;
  private fusionQueue: { player: PlayerIndex; a: CardDef; b: CardDef; r: CardDef }[] = [];
  private fusionShowing = false;
  private fusionTimer = 0;
  private readonly album = new Set<string>();
  private surrenderArmed = false;
  private surrenderTimer = 0;

  private readonly el: Record<
    'inspectorCard' | 'inspectorInfo' | 'status' | 'logPanel' | 'log' | 'turn' |
    'foeHand' | 'foeSupport' | 'foeField' | 'myField' | 'mySupport' | 'hand' |
    'me' | 'foe' | 'deck' | 'mictlan' | 'overlay' | 'albumPanel' | 'album' | 'albumCount' | 'chooser' | 'fusionShow' | 'emblem' | 'toast', HTMLElement>;
  private readonly btn: Record<'log' | 'album' | 'end' | 'surrender' | 'exit', HTMLButtonElement>;
  private readonly setup: DuelSetup;
  private finished: DuelResult | null = null;
  private finishing = false;
  private intents: Intent[] = [];   // tus jugadas aceptadas (el servidor las vuelve a jugar)
  private duelNo = 0;

  constructor(root: HTMLElement, setup: DuelSetup) {
    this.setup = setup;
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
            <span class="turn-tag" data-ref="turn"></span>
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
          <div class="hand" data-ref="hand"></div>

          <aside class="right">
            <div class="pile" data-ref="deck"></div>
            <div class="pile" data-ref="mictlan"></div>
            <button class="end-btn" data-btn="end">Fin turno</button>
            <button class="surrender-btn" data-btn="surrender">Rendirse</button>
          </aside>

          <div class="chooser" data-ref="chooser" hidden></div>
          <div class="toast" data-ref="toast" hidden></div>
          <div class="fusion-show" data-ref="fusionShow" hidden></div>
          <div class="overlay" data-ref="overlay" hidden></div>
        </div>
        <div class="rotate-hint">
          <p>Gira tu celular para jugar en horizontal</p>
          <button class="tag-btn" onclick="this.parentElement.remove()">Seguir así</button>
        </div>
      </div>`;

    const ref = (name: string) => root.querySelector<HTMLElement>(`[data-ref="${name}"]`)!;
    const btn = (name: string) => root.querySelector<HTMLButtonElement>(`[data-btn="${name}"]`)!;
    this.el = {
      inspectorCard: ref('inspectorCard'), inspectorInfo: ref('inspectorInfo'), status: ref('status'),
      logPanel: ref('logPanel'), log: ref('log'), turn: ref('turn'),
      foeHand: ref('foeHand'), foeSupport: ref('foeSupport'), foeField: ref('foeField'),
      myField: ref('myField'), mySupport: ref('mySupport'), hand: ref('hand'),
      me: ref('me'), foe: ref('foe'), deck: ref('deck'), mictlan: ref('mictlan'), overlay: ref('overlay'),
      albumPanel: ref('albumPanel'), album: ref('album'), chooser: ref('chooser'), fusionShow: ref('fusionShow'), albumCount: ref('albumCount'), emblem: ref('emblem'), toast: ref('toast'),
    };
    this.btn = { log: btn('log'), album: btn('album'), end: btn('end'), surrender: btn('surrender'), exit: btn('exit') };
    this.btn.exit.addEventListener('click', () => {
      if (!this.engine || this.engine.state.winner !== null) { this.setup.onExit(); return; }
      if (!confirm('¿Salir del duelo? Cuenta como derrota.')) return;
      this.submit({ type: 'surrender', player: HUMAN });
      this.setup.onExit();
    });


    this.btn.log.addEventListener('click', () => { this.showLog = !this.showLog; this.showAlbum = false; this.render(); });
    this.btn.album.addEventListener('click', () => { this.showAlbum = !this.showAlbum; this.showLog = false; this.render(); });
    this.btn.end.addEventListener('click', () => this.submit({ type: 'endTurn', player: HUMAN }));
    this.btn.surrender.addEventListener('click', () => this.onSurrender());
    this.el.foe.addEventListener('click', () => this.onDirectAttack());
    this.el.mictlan.addEventListener('click', () => {
      if (!this.engine) return;
      const top = this.engine.state.players[HUMAN].mictlan.at(-1);
      if (top) { this.inspected = top; this.render(); }
    });

    void this.newDuel();
    // Solo en desarrollo (npm run dev): window.__duel para probar desde la consola
    if (import.meta.env.DEV) (window as unknown as { __duel: DuelView }).__duel = this;
  }

  /** Para pruebas en desarrollo: el rival se rinde. */
  debugWin(): void {
    const r = this.engine.apply({ type: 'surrender', player: AI });
    if (r.ok) { this.record(r.events); this.render(); }
  }

  // ---------------------------------------------------------------- flujo

  private async newDuel(): Promise<void> {
    const no = ++this.duelNo;
    let seed: number;
    try {
      if (this.setup.newSeed) this.showOverlayMessage('Preparando el duelo…');
      seed = this.setup.newSeed ? await this.setup.newSeed() : Math.floor(Math.random() * 2 ** 31);
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
    this.engine = new DuelEngine({
      db: cardDb, decks: [this.setup.playerDeck, this.setup.opponent.deck], seed, firstPlayer: HUMAN,
      fusion: fusionDb,
    });
    this.log = [];
    this.selectedHand = [];
    this.selectedAttacker = null;
    this.inspected = null;
    this.message = '';
    this.lastLife = [START_LIFE, START_LIFE];
    this.record(this.engine.start());
    this.render();
  }

  private submit(intent: Intent): void {
    if (this.aiThinking && intent.type !== 'surrender') return;
    const result = this.engine.apply(intent);
    if (!result.ok) {
      this.message = result.error;
      this.render();
      return;
    }
    if (intent.player === HUMAN) this.intents.push(intent);
    this.message = '';
    this.selectedHand = [];
    if (intent.type !== 'changePosition') this.selectedAttacker = null;   // tras cambiar posición sigue elegido
    this.record(result.events);
    this.render();
    if (this.engine.state.turnPlayer === AI && this.engine.state.winner === null && !this.aiThinking) this.runAiTurn();
  }

  private runAiTurn(): void {
    this.aiThinking = true;
    this.render();
    const step = () => {
      const s = this.engine.state;
      if (s.winner !== null || s.turnPlayer !== AI) {
        this.aiThinking = false;
        this.render();
        return;
      }
      const result = aiStep(this.engine, this.setup.opponent, fusionDb);   // la misma IA que repite el servidor
      if (result.ok) this.record(result.events);
      this.render();
      // Si el rival fusionó, espera a que se vea la fusión antes de seguir.
      const fusions = result.ok ? result.events.filter(e => e.type === 'fusion').length : 0;
      setTimeout(step, AI_STEP_MS + fusions * FUSION_SHOW_MS);
    };
    setTimeout(step, AI_STEP_MS);
  }

  // ---------------------------------------------------------------- input

  private onHandCard(card: CardInstance): void {
    this.inspected = card;
    if (!this.isMyTurn()) { this.render(); return; }
    const i = this.selectedHand.indexOf(card.instanceId);
    const isSpell = card.def.type !== 'monster';
    const hadSpell = this.selectedHand.some(id => this.handCard(id)?.def.type !== 'monster');
    if (i >= 0) this.selectedHand.splice(i, 1);
    else if (isSpell || hadSpell) this.selectedHand = [card.instanceId];   // mágicas y equipos van solas
    else this.selectedHand.push(card.instanceId);
    this.selectedAttacker = null;
    this.message = '';
    this.render();
  }

  private handCard(id: number): CardInstance | undefined {
    return this.engine.state.players[HUMAN].hand.find(c => c.instanceId === id);
  }

  /** La carta elegida si es mágica o equipo. */
  private selectedSpell(): CardInstance | undefined {
    const c = this.selectedHand.length === 1 ? this.handCard(this.selectedHand[0]) : undefined;
    return c && isSupportCard(c.def) ? c : undefined;
  }

  private onSupportSlot(slot: number): void {
    const own = this.engine.state.players[HUMAN].support[slot];
    if (own) { this.inspected = own; this.render(); }
    const spell = this.selectedSpell();
    if (!this.isMyTurn() || !spell) return;
    if (spell.def.type === 'trap') {
      this.submit({ type: 'activate', player: HUMAN, handId: spell.instanceId, slot });
      return;
    }
    if (needsEquipTarget(spell.def)) {
      this.message = 'Toca uno de tus monstruos para equiparlo.';
      this.render();
      return;
    }
    this.submit({ type: 'activate', player: HUMAN, handId: spell.instanceId });
  }

  private onMySlot(slot: number): void {
    const card = this.engine.state.players[HUMAN].field[slot];
    if (card) this.inspected = card;
    if (!this.isMyTurn()) { this.render(); return; }
    const spell = this.selectedSpell();
    if (spell) {
      if (needsEquipTarget(spell.def) && card) {
        this.submit({ type: 'activate', player: HUMAN, handId: spell.instanceId, targetId: card.instanceId });
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
    const target = this.engine.state.players[AI].field[slot];
    if (target && !target.faceDown) this.inspected = target;
    if (!this.isMyTurn() || this.selectedAttacker === null || !target) { this.render(); return; }
    this.submit({ type: 'attack', player: HUMAN, attackerId: this.selectedAttacker, targetId: target.instanceId });
  }

  private onDirectAttack(): void {
    if (!this.isMyTurn() || this.selectedAttacker === null) return;
    this.submit({ type: 'attack', player: HUMAN, attackerId: this.selectedAttacker, targetId: null });
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
    this.submit({ type: 'surrender', player: HUMAN });
  }

  private isMyTurn(): boolean {
    const s = this.engine.state;
    return !this.aiThinking && s.winner === null && s.turnPlayer === HUMAN;
  }

  // ---------------------------------------------------------------- dibujo

  private render(): void {
    const s = this.engine.state;
    const me = s.players[HUMAN];
    const foe = s.players[AI];
    const myTurn = this.isMyTurn();
    const attackerSel = me.field.find(c => c?.instanceId === this.selectedAttacker);
    const canAttackNow = s.turn > 1 || FIRST_TURN_CAN_ATTACK;
    const canDirect = myTurn && canAttackNow && attackerSel?.position === 'attack' && !attackerSel.hasAttackedThisTurn && foe.field.every(c => c === null);

    // Barra central
    this.el.me.replaceChildren(...this.playerBar('Tú', HUMAN, `Mano ${me.hand.length}`));
    this.el.foe.replaceChildren(...this.playerBar(this.setup.opponent.name, AI, `Mazo ${foe.deck.length} · Mictlán ${foe.mictlan.length}`));
    this.el.foe.classList.toggle('pl--target', canDirect);
    this.el.foe.title = canDirect ? 'Ataque directo' : '';
    this.el.me.classList.toggle('pl--active', s.turnPlayer === HUMAN && s.winner === null);
    this.el.foe.classList.toggle('pl--active', s.turnPlayer === AI && s.winner === null);
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
    const night = isNightTurn(s.turn);
    this.el.emblem.textContent = night ? '☾' : '☀';
    this.el.emblem.title = night ? 'Noche' : 'Día';
    this.el.emblem.classList.toggle('emblem--night', night);
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
    avatar.textContent = player === HUMAN ? '☀' : this.setup.opponent.glyph;
    const text = document.createElement('span');
    text.className = 'pl__text';
    text.innerHTML = `<span class="pl__name"></span><span class="pl__life${hit ? ' pl__life--hit' : ''}"></span>
      <span class="pl__bar"><span style="width:${Math.max(0, Math.min(100, (p.life / START_LIFE) * 100))}%"></span></span>
      <span class="pl__detail"></span>`;
    text.querySelector('.pl__name')!.textContent = name;
    text.querySelector('.pl__life')!.textContent = String(p.life);
    text.querySelector('.pl__detail')!.textContent = detail;
    return player === HUMAN ? [text, avatar] : [avatar, text];
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
    if (mine && card.instanceId === this.selectedAttacker && this.canChangePosition(card)) {
      const bubble = document.createElement('span');
      bubble.className = 'pos-bubble';
      bubble.setAttribute('role', 'button');
      bubble.title = card.position === 'attack' ? 'Pasar a defensa' : 'Pasar a ataque';
      bubble.textContent = card.position === 'attack' ? '⛨' : '⚔';
      bubble.addEventListener('click', ev => {
        ev.stopPropagation();
        this.submit({ type: 'changePosition', player: HUMAN, instanceId: card.instanceId });
      });
      zone.append(bubble);
    }
    return zone;
  }

  private canChangePosition(card: CardInstance): boolean {
    return this.isMyTurn() && !card.hasAttackedThisTurn;
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
    this.el.inspectorInfo.querySelector('.inspector__name')!.textContent = card.def.name;
    this.el.inspectorInfo.querySelector('.inspector__meta')!.textContent = [ATTR[card.def.attribute], ...card.def.tags].join(' · ');
    this.el.inspectorInfo.querySelector('.inspector__desc')!.textContent = card.def.description;
    const fx = describeEffects(card.def.effects);
    this.el.inspectorInfo.querySelector('.inspector__effect')!.textContent = fx ? `Efecto: ${fx}` : '';
    this.el.inspectorInfo.querySelector('.inspector__where')!.textContent = where + pos;
  }

  private renderOverlay(): void {
    const winner = this.engine.state.winner;
    this.el.overlay.hidden = winner === null;
    if (winner === null) return;
    const won = winner === HUMAN;
    if (!this.finishing) {                                          // una sola vez por duelo
      this.finishing = true;
      const engine = this.engine;
      Promise.resolve()
        .then(() => this.setup.onFinish(won, [...this.intents]))
        .catch((e: unknown) => ({ rewards: [], notes: [], error: e instanceof Error ? e.message : String(e) }))
        .then(result => {
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
    buttons.append(again, back);
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
    const hand = this.engine.state.players[HUMAN].hand;
    const defs = this.selectedHand
      .map(id => hand.find(c => c.instanceId === id)?.def)
      .filter((d): d is CardDef => d !== undefined);
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
    return `${parts.join(' ')} (ATK ${current.atk}). Toca una zona para jugarla.`;
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
    const me = this.engine.state.players[HUMAN];
    const handIds = [...this.selectedHand];
    const fromHand = handIds.map(id => me.hand.find(c => c.instanceId === id)!.def);
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
    this.submit({ type: 'play', player: HUMAN, handIds, slot, position: 'attack', fusionChoices: choices });
  }

  private statusMessage(): string {
    const s = this.engine.state;
    if (s.winner !== null) return '';
    if (this.aiThinking || s.turnPlayer === AI) return 'El rival está pensando...';
    if (this.selectedHand.length > 1) return this.chainPreview();
    const spell = this.selectedSpell();
    if (spell) {
      if (s.monsterPlayedThisTurn) return 'Ya bajaste monstruo: las mágicas y trampas van antes del monstruo.';
      if (s.supportUsedThisTurn) return 'Ya usaste una mágica o trampa este turno.';
      if (spell.def.type === 'trap') return `Toca una de tus zonas de abajo (◈) para colocar ${spell.def.name} boca abajo.`;
      return needsEquipTarget(spell.def)
        ? `Toca uno de tus monstruos para equiparle ${spell.def.name}.`
        : `Toca una de tus zonas de abajo (◈) para activar ${spell.def.name}.`;
    }
    if (this.selectedHand.length === 1) return 'Toca una zona para jugarla, o elige más cartas para fusionar.';
    if (this.selectedAttacker !== null) {
      const sel = s.players[HUMAN].field.find(c => c?.instanceId === this.selectedAttacker);
      const bubble = sel && this.canChangePosition(sel) ? ' El botón redondo cambia su posición.' : '';
      if (sel?.position === 'defense') return `En defensa no puede atacar.${bubble}`;
      if (s.turn === 1 && !FIRST_TURN_CAN_ATTACK) return `En el primer turno no se ataca.${bubble}`;
      if (sel?.hasAttackedThisTurn) return 'Ese monstruo ya atacó este turno.';
      return (s.players[AI].field.every(c => c === null)
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

    const title = document.createElement('p');
    title.className = 'fusion-show__title';
    title.textContent = next.player === HUMAN ? '¡Fusión!' : '¡El rival fusiona!';
    const row = document.createElement('div');
    row.className = 'fusion-show__row';
    const op = (txt: string) => { const s2 = document.createElement('span'); s2.className = 'fusion-show__op'; s2.textContent = txt; return s2; };
    const ca = createCardElement(next.a); ca.classList.add('fs-a');
    const cb = createCardElement(next.b); cb.classList.add('fs-b');
    const cr = createCardElement(next.r); cr.classList.add('fs-r');
    row.append(ca, op('+'), cb, op('='), cr);
    box.replaceChildren(title, row);
    box.classList.toggle('fusion-show--foe', next.player === AI);
    box.hidden = false;

    const done = () => {
      clearTimeout(this.fusionTimer);
      box.onclick = null;
      this.fusionShowing = false;
      this.showNextFusion();
    };
    box.onclick = done;
    this.fusionTimer = window.setTimeout(done, FUSION_SHOW_MS - 100);
  }

  // ---------------------------------------------------------------- registro

  private record(events: DuelEvent[]): void {
    for (const e of events) {
      if (e.type === 'fusion') {
        // Se aprende de TODAS las fusiones que se ven, tuyas y del rival.
        const [a, b] = e.materialIds.map(id => this.engine.getCard(id)!.def);
        const result = this.engine.getCard(e.resultId)!;
        this.album.add(albumKey(a.id, b.id, result.def.id));
        this.inspected = result;
        this.fusionQueue.push({ player: e.player, a, b, r: result.def });
        this.showNextFusion();
      }
      if (e.type === 'effect') this.toast(`Efecto: ${this.engine.getCard(e.instanceId)?.def.name ?? ''}`);
      if (e.type === 'timeChanged') this.toast(e.night ? 'Cae la noche ☾' : 'Sale el sol ☀');
      if (e.type === 'trapActivated') this.toast(`¡Trampa! ${this.engine.getCard(e.instanceId)?.def.name ?? ''}`);
      if (e.type === 'attackNegated') this.toast('Ataque detenido');
      const line = this.describe(e);
      if (line) this.log.push(line);
    }
  }

  private describe(e: DuelEvent): string | null {
    const who = (p: PlayerIndex) => (p === HUMAN ? 'Tú' : 'Rival');
    const name = (id: number) => this.engine.getCard(id)?.def.name ?? '?';
    switch (e.type) {
      case 'turnStarted': return `— Turno ${e.turn}: ${who(e.player)} —`;
      case 'cardsDrawn': return e.player === HUMAN ? `Robas ${e.instanceIds.length}` : `Rival roba ${e.instanceIds.length}`;
      case 'cardPlayed': {
        const shown = e.player === HUMAN || !e.faceDown ? name(e.instanceId) : 'una carta boca abajo';
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
      case 'timeChanged': return e.night ? '☾ Cae la noche' : '☀ Sale el sol';
      case 'trapSet': return e.player === HUMAN ? `Colocas ${name(e.instanceId)} boca abajo` : 'Rival coloca una trampa boca abajo';
      case 'trapActivated': return `¡Trampa! ${name(e.instanceId)} responde al ataque de ${name(e.attackerId)}`;
      case 'attackNegated': return `El ataque de ${name(e.attackerId)} se detiene`;
      case 'positionChanged': return `${name(e.instanceId)} pasa a ${e.position === 'attack' ? 'ataque' : 'defensa'}${e.flipped ? ' (se voltea)' : ''}`;
      case 'gameOver': return `${who(e.winner)} gana${e.reason === 'deckOut' ? ' (mazo vacío)' : e.reason === 'surrender' ? ' (rendición)' : ''}`;
    }
  }
}
