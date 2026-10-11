import { nextAiIntent } from '../ai/aiPlayer.ts';
import type { BattlePosition, CardInstance } from '../core/CardInstance.ts';
import { DuelEngine } from '../core/DuelEngine.ts';
import { FIELD_SLOTS, type DuelEvent, type Intent, type PlayerIndex } from '../core/DuelState.ts';
import { cardDb, fusionDb, getDeck } from '../data/index.ts';
import { START_LIFE, type CardDef } from '../data/types.ts';
import { createCardElement } from './cardElement.ts';

const HUMAN: PlayerIndex = 0;
const AI: PlayerIndex = 1;
const AI_STEP_MS = 750;
const FUSION_SHOW_MS = 2200;

const ALBUM_KEY = 'cartas.fusiones.v2';

/** Fusiones descubiertas: "idA+idB>idResultado" (A y B ordenados). Se guardan en el navegador. */
function loadAlbum(): Set<string> {
  try {
    const raw = localStorage.getItem(ALBUM_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function saveAlbum(album: Set<string>): void {
  try { localStorage.setItem(ALBUM_KEY, JSON.stringify([...album])); } catch { /* sin almacenamiento: no pasa nada */ }
}
const pairKey = (a: number, b: number) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const albumKey = (a: number, b: number, r: number) => `${pairKey(a, b)}>${r}`;

const ATTR: Record<string, string> = { sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra' };

/**
 * Tablero del duelo en HTML/CSS: escenario 16:9 que escala completo a la pantalla.
 * Solo DIBUJA el estado y manda intenciones al motor; nunca cambia el estado ella misma.
 */
export class DuelView {
  private engine!: DuelEngine;
  private selectedHand: number[] = [];
  private selectedAttacker: number | null = null;
  private playPosition: BattlePosition = 'attack';
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
  private readonly album = loadAlbum();
  private surrenderArmed = false;
  private surrenderTimer = 0;

  private readonly el: Record<
    'inspectorCard' | 'inspectorInfo' | 'status' | 'logPanel' | 'log' | 'turn' |
    'foeHand' | 'foeSupport' | 'foeField' | 'myField' | 'mySupport' | 'hand' |
    'me' | 'foe' | 'deck' | 'mictlan' | 'overlay' | 'albumPanel' | 'album' | 'chooser' | 'fusionShow', HTMLElement>;
  private readonly btn: Record<'log' | 'album' | 'position' | 'end' | 'surrender', HTMLButtonElement>;

  constructor(root: HTMLElement) {
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
              <h2>Fusiones descubiertas</h2>
              <ol class="log album" data-ref="album"></ol>
            </div>
            <p class="status" data-ref="status" role="status"></p>
          </section>

          <nav class="side-buttons">
            <button class="tag-btn" data-btn="log">Registro</button>
            <button class="tag-btn" data-btn="position"></button>
            <button class="tag-btn" data-btn="album">Fusiones</button>
            <span class="turn-tag" data-ref="turn"></span>
          </nav>

          <div class="field-bg" aria-hidden="true"></div>
          <div class="foe-hand" data-ref="foeHand" aria-label="Mano del rival"></div>
          <div class="zones zones--support zones--foe" data-ref="foeSupport"></div>
          <div class="zones zones--monster zones--foe" data-ref="foeField"></div>

          <div class="lifebar">
            <div class="pl pl--me" data-ref="me"></div>
            <div class="emblem" aria-hidden="true">✺</div>
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
      albumPanel: ref('albumPanel'), album: ref('album'), chooser: ref('chooser'), fusionShow: ref('fusionShow'),
    };
    this.btn = { log: btn('log'), album: btn('album'), position: btn('position'), end: btn('end'), surrender: btn('surrender') };

    // Zonas de apoyo (magia/equipo): decorativas hasta la Fase 3
    for (const row of [this.el.foeSupport, this.el.mySupport]) {
      for (let i = 0; i < FIELD_SLOTS; i++) {
        const z = document.createElement('div');
        z.className = 'zone zone--support';
        row.append(z);
      }
    }

    this.btn.log.addEventListener('click', () => { this.showLog = !this.showLog; this.showAlbum = false; this.render(); });
    this.btn.album.addEventListener('click', () => { this.showAlbum = !this.showAlbum; this.showLog = false; this.render(); });
    this.btn.position.addEventListener('click', () => {
      this.playPosition = this.playPosition === 'attack' ? 'defense' : 'attack';
      this.render();
    });
    this.btn.end.addEventListener('click', () => this.submit({ type: 'endTurn', player: HUMAN }));
    this.btn.surrender.addEventListener('click', () => this.onSurrender());
    this.el.foe.addEventListener('click', () => this.onDirectAttack());
    this.el.mictlan.addEventListener('click', () => {
      const top = this.engine.state.players[HUMAN].mictlan.at(-1);
      if (top) { this.inspected = top; this.render(); }
    });

    this.newDuel();
  }

  // ---------------------------------------------------------------- flujo

  private newDuel(): void {
    const deck = getDeck('prueba').cards;
    this.engine = new DuelEngine({
      db: cardDb, decks: [deck, deck], seed: Math.floor(Math.random() * 2 ** 31), firstPlayer: HUMAN,
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
    this.message = '';
    this.selectedHand = [];
    this.selectedAttacker = null;
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
      let result = this.engine.apply(nextAiIntent(s, AI, fusionDb));
      if (!result.ok) result = this.engine.apply({ type: 'endTurn', player: AI }); // nunca atorarse
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
    if (i >= 0) this.selectedHand.splice(i, 1);
    else this.selectedHand.push(card.instanceId);
    this.selectedAttacker = null;
    this.message = '';
    this.render();
  }

  private onMySlot(slot: number): void {
    const card = this.engine.state.players[HUMAN].field[slot];
    if (card) this.inspected = card;
    if (!this.isMyTurn()) { this.render(); return; }
    if (this.selectedHand.length > 0) {
      void this.playSelected(slot);
      return;
    }
    if (!card) return;
    this.selectedAttacker = this.selectedAttacker === card.instanceId ? null : card.instanceId;
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
    const canDirect = myTurn && this.selectedAttacker !== null && foe.field.every(c => c === null);

    // Barra central
    this.el.me.replaceChildren(...this.playerBar('Tú', HUMAN, `Mano ${me.hand.length}`));
    this.el.foe.replaceChildren(...this.playerBar('Rival', AI, `Mazo ${foe.deck.length} · Mictlán ${foe.mictlan.length}`));
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
    this.el.myField.classList.toggle('zones--placing', myTurn && this.selectedHand.length > 0);
    this.el.foeField.classList.toggle('zones--targeting', myTurn && this.selectedAttacker !== null);

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
    this.btn.position.textContent = this.playPosition === 'attack' ? 'Posición: ATK' : 'Posición: DEF';
    this.btn.position.classList.toggle('tag-btn--def', this.playPosition === 'defense');
    this.btn.position.disabled = !myTurn;
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
    avatar.textContent = player === HUMAN ? '☀' : '☾';
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
    return zone;
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
      <p class="inspector__stats"><b>ATK ${card.atk}</b><b>DEF ${card.defense}</b></p>
      <p class="inspector__desc"></p>
      <p class="inspector__where"></p>`;
    this.el.inspectorInfo.querySelector('.inspector__name')!.textContent = card.def.name;
    this.el.inspectorInfo.querySelector('.inspector__meta')!.textContent = `${ATTR[card.def.attribute]} · ${card.def.tags.join(' · ')}`;
    this.el.inspectorInfo.querySelector('.inspector__desc')!.textContent = card.def.description;
    this.el.inspectorInfo.querySelector('.inspector__where')!.textContent = where + pos;
  }

  private renderOverlay(): void {
    const winner = this.engine.state.winner;
    this.el.overlay.hidden = winner === null;
    if (winner === null) return;
    this.el.overlay.innerHTML = `
      <div class="overlay__box">
        <p class="overlay__title ${winner === HUMAN ? 'win' : 'lose'}">${winner === HUMAN ? '¡Victoria!' : 'Derrota'}</p>
        <button class="end-btn">Jugar otra vez</button>
      </div>`;
    this.el.overlay.querySelector('button')!.addEventListener('click', () => this.newDuel());
  }

  private renderAlbum(): void {
    const items = [...this.album].flatMap(key => {
      const [pair, r] = key.split('>');
      const [a, b] = pair.split('+').map(Number);
      const [ca, cb, cr] = [cardDb.tryGet(a), cardDb.tryGet(b), cardDb.tryGet(Number(r))];
      return ca && cb && cr ? [{ a: ca, b: cb, r: cr }] : [];
    }).sort((x, y) => y.r.atk - x.r.atk);
    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Todavía no descubres ninguna. Elige 2 o más cartas de tu mano y juégalas juntas.';
      this.el.album.replaceChildren(li);
      return;
    }
    this.el.album.replaceChildren(...items.map(({ a, b, r }) => {
      const li = document.createElement('li');
      li.className = 'album__item';
      li.textContent = `${a.name} + ${b.name} → ${r.name} (${r.atk})`;
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
    this.submit({ type: 'play', player: HUMAN, handIds, slot, position: this.playPosition, fusionChoices: choices });
  }

  private statusMessage(): string {
    const s = this.engine.state;
    if (s.winner !== null) return '';
    if (this.aiThinking || s.turnPlayer === AI) return 'El rival está pensando...';
    if (this.selectedHand.length > 1) return this.chainPreview();
    if (this.selectedHand.length === 1) return 'Toca una zona para jugarla, o elige más cartas para fusionar.';
    if (this.selectedAttacker !== null) {
      return s.players[AI].field.every(c => c === null)
        ? 'Toca la barra del rival para atacar directo.'
        : 'Toca un monstruo rival para atacarlo.';
    }
    if (s.phase === 'main' && !s.hasPlayedThisTurn) return 'Elige una carta de tu mano.';
    return 'Toca uno de tus monstruos para atacar, o termina el turno.';
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
        saveAlbum(this.album);
        this.inspected = result;
        this.fusionQueue.push({ player: e.player, a, b, r: result.def });
        this.showNextFusion();
      }
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
      case 'sentToMictlan': return e.reason === 'battle' ? `${name(e.instanceId)} es destruido` : null;
      case 'phaseChanged': return null;
      case 'attackDeclared': return `${name(e.attackerId)} ataca ${e.targetId === null ? 'directo' : 'a ' + name(e.targetId)}`;
      case 'flipped': return `${name(e.instanceId)} se voltea`;
      case 'damage': return `${who(e.player)} recibe ${e.amount} de daño (${e.lifeAfter} PV)`;
      case 'gameOver': return `${who(e.winner)} gana${e.reason === 'deckOut' ? ' (mazo vacío)' : e.reason === 'surrender' ? ' (rendición)' : ''}`;
    }
  }
}
