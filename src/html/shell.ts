import { RARITY_LABEL, rarityOf, type CardDef, type CardRarity, type CardType } from '../data/types.ts';
import { CURRENCY } from '../game/config.ts';
import type { Profile } from '../game/profile.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { sfx } from './sound.ts';

/**
 * Piezas comunes de las pantallas "de app" (mazo, biblioteca, tienda, duelo libre):
 * ocupan toda la pantalla, con barra de arriba y paneles que se desplazan por separado.
 */

export interface ScreenOptions {
  cls: string;
  title: string;
  back: () => void;
  backLabel?: string;
  profile?: Profile;
  right?: Node | string;
}

export function appScreen(o: ScreenOptions, ...body: (Node | string)[]): HTMLElement {
  return h('main', { class: `app-screen ${o.cls}` },
    h('header', { class: 'app-bar' },
      h('button', { class: 'app-bar__back', onclick: () => { sfx('click'); o.back(); }, 'aria-label': o.backLabel ?? 'Volver' }, '←'),
      h('h1', { class: 'app-bar__title' }, o.title),
      h('div', { class: 'app-bar__right' }, o.right ?? '', ...(o.profile ? wallets(o.profile) : []))),
    h('div', { class: 'app-body' }, ...body));
}

/** Cacao y jade (en modo local no hay monedas). */
export function wallets(p: Profile): HTMLElement[] {
  const acc = p.account;
  if (!acc) return [h('span', { class: 'wallet wallet--local', title: 'Sin cuenta: todo se guarda en este navegador' }, 'Modo local')];
  return [
    h('span', { class: 'wallet', title: CURRENCY.common.name }, `${CURRENCY.common.icon} ${acc.cacao.toLocaleString('es-MX')}`),
    h('span', { class: 'wallet wallet--jade', title: CURRENCY.premium.name }, `${CURRENCY.premium.icon} ${acc.jade.toLocaleString('es-MX')}`),
  ];
}

export function rarityChip(r: CardRarity, text: string = r): HTMLElement {
  return h('span', { class: `rarity-chip rarity-chip--${r}`, title: RARITY_LABEL[r] }, text);
}

export type TypeTab = '' | CardType;
export const TYPE_TABS: [TypeTab, string][] = [['', 'Todas'], ['monster', 'Monstruos'], ['spell', 'Mágicas'], ['equip', 'Equipos'], ['trap', 'Trampas']];

/** Fila de pestañas. Llama onPick y se vuelve a pintar sola. */
export function tabs<T extends string>(items: [T, string][], current: T, onPick: (t: T) => void, cls = ''): HTMLElement {
  const nav = h('nav', { class: `tabs ${cls}`, role: 'tablist' });
  const paint = (cur: T) => nav.replaceChildren(...items.map(([value, label]) => {
    const b = h('button', { class: `tab${value === cur ? ' tab--on' : ''}`, role: 'tab', 'aria-selected': value === cur }, label);
    b.addEventListener('click', () => { sfx('click'); paint(value); onPick(value); });
    return b;
  }));
  paint(current);
  return nav;
}

export interface ThumbOptions {
  level?: number;
  missing?: boolean;     // no la tienes: se ve apagada
  selected?: boolean;
  caption?: Node | string;
  badge?: string;        // esquina (ej. "x2", "NUEVA")
  onClick?: () => void;
}

/** Carta chiquita con su nombre abajo (cuadrículas densas). */
export function thumb(card: CardDef, o: ThumbOptions = {}): HTMLElement {
  const el = h(o.onClick ? 'button' : 'div', {
    class: `thumb thumb--${rarityOf(card)}${o.missing ? ' thumb--missing' : ''}${o.selected ? ' thumb--sel' : ''}`,
    title: card.name, 'data-card': String(card.id), type: o.onClick ? 'button' : undefined,
  },
    createCardElement(card, { level: o.level }),
    o.badge ? h('span', { class: 'thumb__badge' }, o.badge) : '',
    h('span', { class: 'thumb__name' }, card.name),
    o.caption ? h('span', { class: 'thumb__cap' }, o.caption) : '');
  if (o.onClick) el.addEventListener('click', () => { sfx('click'); o.onClick!(); });
  return el;
}

/** Marca como seleccionada la miniatura de esa carta dentro de `root`. */
export function markThumb(root: ParentNode, cardId: number | undefined): void {
  root.querySelectorAll('.thumb--sel').forEach(el => el.classList.remove('thumb--sel'));
  if (cardId !== undefined) root.querySelectorAll(`.thumb[data-card="${cardId}"]`).forEach(el => el.classList.add('thumb--sel'));
}

export const pct = (x: number): string => (x >= 0.1 ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(1).replace('.0', '')}%`);
