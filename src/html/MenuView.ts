import { cardDb } from '../data/index.ts';
import { GAME_TITLE } from '../game/config.ts';
import { duelists } from '../game/duelists.ts';
import type { Profile } from '../game/profile.ts';
import { assetUrl } from './assets.ts';
import { h } from './dom.ts';
import { openOptions, openProfile, type MenuActions } from './OptionsView.ts';
import { wallets } from './shell.ts';
import { sfx } from './sound.ts';
import { applyUpdate, checkForUpdate } from './update.ts';

export type { MenuActions } from './OptionsView.ts';

interface Spot { hash: string; img: string; label: string; sub?: string }

/**
 * Pantalla de inicio: arriba tu perfil, monedas y Opciones (⚙); al centro la rueda del Quinto Sol con
 * 7 medallones. La Campaña va en medio, más grande; tocar cualquier medallón entra directo.
 */
export function renderMenu(root: HTMLElement, profile: Profile, go: (hash: string) => void, actions: MenuActions): void {
  const next = duelists.find(d => !profile.defeated.includes(d.id));
  const spots: Spot[] = [
    { hash: '#/misiones', img: 'misiones', label: 'Misiones' },
    { hash: '#/pvp', img: 'pvp', label: 'Multijugador' },
    { hash: '#/libre', img: 'libre', label: 'Duelo libre' },
    { hash: '#/campana', img: 'campana', label: 'Campaña', sub: next ? `Sigue: ${next.name}` : 'Venciste a todos' },
    { hash: '#/mazo', img: 'mazo', label: 'Mi mazo' },
    { hash: '#/tienda', img: 'tienda', label: 'Tienda' },
    { hash: '#/biblioteca', img: 'biblioteca', label: 'Biblioteca' },
  ];
  const mid = Math.floor(spots.length / 2);

  const wheel = h('nav', { class: 'sunwheel', 'aria-label': 'Menú principal' },
    sunStone(),
    ...spots.map((s, i) => {
      const o = i - mid;
      return h('button', {
        class: `medal${o === 0 ? ' medal--main' : ''}`, type: 'button', 'data-hash': s.hash,
        style: `--o:${o};--a:${Math.abs(o)}`,
        onclick: () => { sfx('click'); go(s.hash); },
      },
        h('span', { class: 'medal__ring' }, h('img', { class: 'medal__img', src: assetUrl(`/menu/${s.img}.webp`), alt: '', decoding: 'async', draggable: 'false' })),
        h('span', { class: 'medal__label' }, s.label),
        s.sub ? h('small', { class: 'medal__sub' }, s.sub) : '');
    }));
  // Flechas del teclado: de un medallón al de junto
  wheel.addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const items = [...wheel.querySelectorAll<HTMLButtonElement>('.medal')];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const j = i < 0 ? mid : Math.min(items.length - 1, Math.max(0, i + (ev.key === 'ArrowRight' ? 1 : -1)));
    items[j].focus();
    ev.preventDefault();
  });

  const distinct = Object.keys(profile.collection).filter(id => (profile.collection[id] ?? 0) > 0).length;
  const total = cardDb.all().length;
  const beaten = duelists.filter(d => profile.defeated.includes(d.id)).length;
  const acc = profile.account;
  const name = acc ? (acc.username ?? (acc.guest ? 'Invitado' : 'Jugador')) : 'Jugador local';

  const who = h('button', {
    class: 'hud-who', type: 'button', title: 'Ver perfil',
    onclick: () => { sfx('click'); openProfile(profile, actions, () => renderMenu(root, profile, go, actions)); },
  },
    h('span', { class: 'hud-who__avatar', 'aria-hidden': 'true' }, '✺'),
    h('span', { class: 'hud-who__text' },
      h('b', {}, name),
      h('small', {}, `${distinct}/${total} cartas · ${beaten}/${duelists.length} rivales`)));

  const hud = h('header', { class: 'hud' }, who,
    h('div', { class: 'hud__right' },
      h('div', { class: 'hud__wallets' }, ...wallets(profile)),
      updateButton(),
      h('button', {
        class: 'hud-btn', type: 'button', title: 'Opciones', 'aria-label': 'Opciones',
        onclick: () => { sfx('click'); openOptions(profile, go, actions); },
      }, '⚙')));

  root.replaceChildren(h('main', { class: 'menu3' }, hud, h('h1', { class: 'menu3__title' }, GAME_TITLE), wheel));
}

/** Piedra del sol detrás de los medallones (gira muy lento). */
function sunStone(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const svg = el('svg', { class: 'sunwheel__stone', viewBox: '-100 -100 200 200', 'aria-hidden': 'true' });
  svg.append(
    el('circle', { r: 98, class: 'stone-line' }),
    el('circle', { r: 92, class: 'stone-dots' }),
    el('circle', { r: 86, class: 'stone-line' }),
    el('circle', { r: 66, class: 'stone-line' }));
  // 20 casillas (los 20 signos de los días) entre los anillos
  for (let i = 0; i < 20; i++) {
    const g = el('g', { transform: `rotate(${i * 18})` });
    g.append(el('rect', { x: -6, y: -84, width: 12, height: 14, rx: 2, class: 'stone-cell' }));
    svg.append(g);
  }
  // 8 rayos del sol
  for (let i = 0; i < 8; i++) {
    const g = el('g', { transform: `rotate(${i * 45 + 22.5})` });
    g.append(el('path', { d: 'M -7 -66 L 0 -98 L 7 -66 Z', class: 'stone-ray' }));
    svg.append(g);
  }
  return svg;
}

/** Botón redondo ⟳: busca una versión nueva y, si la hay, actualiza. */
function updateButton(): HTMLElement {
  const tip = h('span', { class: 'update-btn__tip', role: 'status' });
  const btn = h('button', { class: 'hud-btn update-btn', type: 'button', title: 'Buscar actualización', 'aria-label': 'Buscar actualización' }, '⟳');
  let busy = false;
  const say = (text: string, ms = 2600) => {
    tip.textContent = text;
    tip.classList.add('update-btn__tip--on');
    if (ms) setTimeout(() => tip.classList.remove('update-btn__tip--on'), ms);
  };
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    sfx('click');
    btn.classList.add('update-btn--spin');
    say('Buscando actualización…', 0);
    const state = await checkForUpdate();
    if (state === 'new') { say('¡Hay versión nueva! Actualizando…', 0); await applyUpdate(); return; }
    btn.classList.remove('update-btn--spin');
    busy = false;
    say(state === 'same' ? '✓ Ya tienes la última versión' : 'Sin conexión: intenta más tarde');
  });
  return h('div', { class: 'hud-update' }, tip, btn);
}

/** Puntito con número sobre un medallón del menú (cosas por cobrar). */
export function setMenuBadge(hash: string, n: number): void {
  const ring = document.querySelector<HTMLElement>(`.medal[data-hash="${hash}"] .medal__ring`);
  if (!ring) return;
  ring.querySelector('.medal__badge')?.remove();
  if (n > 0) ring.append(h('span', { class: 'medal__badge', 'aria-label': `${n} por cobrar` }, String(n)));
}
