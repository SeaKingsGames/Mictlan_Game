/**
 * Efectos visuales del duelo (capa encima del tablero, no toca el estado):
 * embestida del atacante, tajo sobre la carta atacada, carta que se rompe, números de daño.
 * Trabaja con COPIAS de las cartas porque el tablero se vuelve a dibujar justo después.
 */

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class DuelFx {
  private readonly layer: HTMLElement;
  private readonly stage: HTMLElement;
  constructor(stage: HTMLElement) {
    this.stage = stage;
    this.layer = document.createElement('div');
    this.layer.className = 'fx-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    stage.append(this.layer);
  }

  /** Posición de un elemento dentro del escenario. */
  rect(el: Element): DOMRect {
    const s = this.stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return new DOMRect(r.left - s.left, r.top - s.top, r.width, r.height);
  }

  cardEl(instanceId: number): HTMLElement | null {
    return this.stage.querySelector<HTMLElement>(`.zones [data-instance-id="${instanceId}"], .hand [data-instance-id="${instanceId}"]`);
  }

  private place(el: HTMLElement, r: DOMRect, ms: number, delay = 0): void {
    el.style.left = `${r.left}px`; el.style.top = `${r.top}px`; el.style.width = `${r.width}px`; el.style.height = `${r.height}px`;
    el.style.animationDelay = `${delay}ms`;
    this.layer.append(el);
    setTimeout(() => el.remove(), ms + delay + 50);
  }

  /** El atacante se lanza hacia su objetivo y regresa. */
  lunge(attacker: HTMLElement, target: DOMRect): void {
    if (reduced()) return;
    const from = this.rect(attacker);
    const clone = attacker.cloneNode(true) as HTMLElement;
    const wrap = document.createElement('div');
    wrap.className = 'fx-lunge';
    wrap.style.setProperty('--dx', `${target.left + target.width / 2 - (from.left + from.width / 2)}px`);
    wrap.style.setProperty('--dy', `${target.top + target.height / 2 - (from.top + from.height / 2)}px`);
    wrap.append(clone);
    keepSize(attacker, wrap);
    const hide = attacker.style.visibility;
    attacker.style.visibility = 'hidden';
    setTimeout(() => { attacker.style.visibility = hide; }, 520);
    this.place(wrap, from, 520);
  }

  /** Tajo de obsidiana sobre lo atacado. */
  slash(r: DOMRect, delay = 0): void {
    const el = document.createElement('div');
    el.className = 'fx-slash';
    el.append(document.createElement('i'), document.createElement('i'));
    this.place(el, r, 650, delay);
  }

  /** La carta se parte en dos y se desvanece (destruida). */
  shatter(card: HTMLElement, delay = 0): void {
    const r = this.rect(card);
    const wrap = document.createElement('div');
    wrap.className = 'fx-shatter';
    for (const side of ['a', 'b']) {
      const half = document.createElement('div');
      half.className = `fx-shatter__half fx-shatter__half--${side}`;
      const c = card.cloneNode(true) as HTMLElement;
      half.append(c);
      wrap.append(half);
    }
    keepSize(card, wrap);
    const flash = document.createElement('div');
    flash.className = 'fx-shatter__flash';
    wrap.append(flash);
    this.place(wrap, r, 900, delay);
  }

  /** Número que sube y se desvanece (daño en rojo, curación en verde). */
  float(r: DOMRect, text: string, kind: 'damage' | 'heal', delay = 0): void {
    const el = document.createElement('div');
    el.className = `fx-float fx-float--${kind}`;
    el.textContent = text;
    this.place(el, r, 1300, delay);
  }

  /** Destello sobre una zona (algo entró al campo). */
  glow(r: DOMRect, delay = 0): void {
    const el = document.createElement('div');
    el.className = 'fx-glow';
    this.place(el, r, 700, delay);
  }
}

/** La copia de la carta usa el mismo tamaño que la original (cada zona define --card-w). */
function keepSize(original: HTMLElement, wrap: HTMLElement): void {
  const w = getComputedStyle(original).getPropertyValue('--card-w');
  if (w) wrap.style.setProperty('--card-w', w);
}
