import type { DuelEvent, PlayerIndex } from '../core/DuelState.ts';

/**
 * Tutorial del primer duelo: globos con consejos que avanzan cuando haces lo que piden.
 * Se muestra una sola vez (o cuando tocas "¿Cómo jugar?" en el menú). Siempre se puede saltar.
 */
const KEY = 'cartas.tutorial';

export function tutorialPending(): boolean {
  try { return localStorage.getItem(KEY) !== 'hecho'; } catch { return false; }
}
export function resetTutorial(): void {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}
function markDone(): void {
  try { localStorage.setItem(KEY, 'hecho'); } catch { /* nada */ }
}

interface Step {
  title: string;
  text: string;
  /** Si existe, el paso termina cuando pasa esto; si no, con el botón. */
  until?: (e: DuelEvent, me: PlayerIndex, turnPlayer: PlayerIndex) => boolean;
  button?: string;
}

const STEPS: Step[] = [
  { title: '¡Bienvenido al duelo!', text: 'Ganas cuando la vida del rival llega a 0 (o cuando se queda sin cartas en su mazo).', button: 'Empezar' },
  { title: 'Baja un monstruo', text: 'Toca un monstruo de tu mano (abajo) y luego una zona vacía de tu lado del tablero.',
    until: (e, me) => e.type === 'cardPlayed' && e.player === me },
  { title: 'Fusiones', text: 'Si eliges 2 o más monstruos antes de tocar la zona, se fusionan en uno más fuerte. Si no combinan, el primero se va al Mictlán. ¡Experimenta!', button: 'Entendido' },
  { title: 'Ataca', text: 'Toca tu monstruo en el campo y luego un monstruo rival. Si el rival no tiene monstruos, ataca directo a su vida.',
    until: (e, me, tp) => e.type === 'attackDeclared' && tp === me },
  { title: 'Termina tu turno', text: 'Cuando acabes, toca "Fin turno". En tu primer turno no se puede atacar: si no pudiste, solo termina el turno.',
    until: (e, me) => e.type === 'turnStarted' && e.player !== me },
  { title: 'El Reloj Solar', text: 'Cada 2 turnos cambia: Alba, Mediodía, Ocaso y Medianoche. Cada fase da bonos a un atributo, y de noche los nahuales cambian de forma.', button: 'Entendido' },
  { title: 'Mágicas y trampas', text: 'En tu turno puedes usar 1 mágica, equipo o trampa ANTES de bajar tu monstruo. Las trampas se colocan boca abajo y saltan solas cuando el rival ataca.', button: '¡A jugar!' },
];

export class Tutorial {
  private i = 0;
  private readonly box: HTMLElement;
  private readonly me: PlayerIndex;
  private done = false;

  constructor(stage: HTMLElement, me: PlayerIndex) {
    this.me = me;
    this.box = document.createElement('div');
    this.box.className = 'coach';
    this.box.setAttribute('role', 'dialog');
    stage.append(this.box);
    this.paint();
  }

  onEvents(events: readonly DuelEvent[], turnPlayer: PlayerIndex): void {
    if (this.done) return;
    const step = STEPS[this.i];
    if (step?.until && events.some(e => step.until!(e, this.me, turnPlayer))) this.next();
  }

  private next(): void {
    this.i++;
    if (this.i >= STEPS.length) { this.finish(); return; }
    this.paint();
  }

  private finish(): void {
    this.done = true;
    markDone();
    this.box.remove();
  }

  private paint(): void {
    const s = STEPS[this.i];
    this.box.replaceChildren();
    const head = document.createElement('div');
    head.className = 'coach__head';
    const n = document.createElement('span');
    n.className = 'coach__step';
    n.textContent = `${this.i + 1}/${STEPS.length}`;
    const t = document.createElement('b');
    t.textContent = s.title;
    const skip = document.createElement('button');
    skip.className = 'coach__skip';
    skip.textContent = 'Saltar';
    skip.addEventListener('click', () => this.finish());
    head.append(n, t, skip);
    const p = document.createElement('p');
    p.textContent = s.text;
    this.box.append(head, p);
    if (s.button) {
      const b = document.createElement('button');
      b.className = 'coach__next';
      b.textContent = s.button;
      b.addEventListener('click', () => this.next());
      this.box.append(b);
    } else {
      const wait = document.createElement('small');
      wait.className = 'coach__wait';
      wait.textContent = 'Hazlo para continuar…';
      this.box.append(wait);
    }
    this.box.classList.remove('coach--in');
    void this.box.offsetWidth;
    this.box.classList.add('coach--in');
  }
}
