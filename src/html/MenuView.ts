import { cardDb } from '../data/index.ts';
import { GAME_SUBTITLE, GAME_TITLE } from '../game/config.ts';
import { duelists } from '../game/duelists.ts';
import { resetProfile, saveProfile, type Profile } from '../game/profile.ts';
import { h } from './dom.ts';

/** Pantalla de inicio. */
export function renderMenu(root: HTMLElement, profile: Profile, go: (hash: string) => void, onReset: (p: Profile) => void): void {
  const distinct = Object.keys(profile.collection).filter(id => (profile.collection[id] ?? 0) > 0).length;
  const total = cardDb.all().length;
  const beaten = duelists.filter(d => profile.defeated.includes(d.id)).length;

  root.replaceChildren(h('main', { class: 'screen menu' },
    h('div', { class: 'menu__sun', 'aria-hidden': 'true' }, '✺'),
    h('h1', { class: 'menu__title' }, GAME_TITLE),
    h('p', { class: 'menu__subtitle' }, GAME_SUBTITLE),
    h('nav', { class: 'menu__buttons' },
      h('button', { class: 'big-btn big-btn--main', onclick: () => go('#/campana') }, 'Campaña'),
      h('button', { class: 'big-btn', onclick: () => go('#/mazo') }, 'Mi mazo y colección'),
      h('button', { class: 'big-btn', onclick: () => go('#/libre') }, 'Duelo libre'),
    ),
    h('p', { class: 'menu__stats' },
      `Victorias ${profile.wins} · Derrotas ${profile.losses} · Cartas ${distinct}/${total} · Duelistas vencidos ${beaten}/${duelists.length}`),
    h('details', { class: 'menu__tools' },
      h('summary', {}, 'Herramientas'),
      h('div', { class: 'menu__tool-links' },
        h('a', { href: '/editor-cartas.html' }, 'Editor de cartas'),
        h('a', { href: '/fusiones.html' }, 'Editor de fusiones'),
        h('a', { href: '/cartas.html' }, 'Galería'),
        h('button', { class: 'link-btn', onclick: () => {
          if (!confirm('¿Borrar todo tu progreso (colección, mazo y campaña)?')) return;
          const fresh = resetProfile();
          saveProfile(fresh);
          onReset(fresh);
        } }, 'Reiniciar progreso'),
      )),
  ));
}
