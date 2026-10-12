import { cardDb } from '../data/index.ts';
import { CURRENCY, GAME_SUBTITLE, GAME_TITLE } from '../game/config.ts';
import { duelists } from '../game/duelists.ts';
import { resetProfile, saveProfile, type Profile } from '../game/profile.ts';
import { h } from './dom.ts';

/** Pantalla de inicio. */
export interface MenuActions {
  onReset: (p: Profile) => void;     // modo local: reiniciar progreso
  onSignOut?: () => void;            // con cuenta: cerrar sesión
  onUpgrade?: () => void;            // invitado: guardar con correo
}

export function renderMenu(root: HTMLElement, profile: Profile, go: (hash: string) => void, actions: MenuActions): void {
  const acc = profile.account;
  const distinct = Object.keys(profile.collection).filter(id => (profile.collection[id] ?? 0) > 0).length;
  const total = cardDb.all().length;
  const beaten = duelists.filter(d => profile.defeated.includes(d.id)).length;

  const accountBar = acc
    ? h('div', { class: 'account-bar' },
        h('span', { class: 'account-bar__who' }, acc.guest ? 'Invitado' : (acc.username ?? acc.email ?? 'Jugador')),
        h('span', { class: 'wallet', title: CURRENCY.common.name }, `${CURRENCY.common.icon} ${acc.cacao.toLocaleString('es-MX')}`),
        h('span', { class: 'wallet wallet--jade', title: CURRENCY.premium.name }, `${CURRENCY.premium.icon} ${acc.jade.toLocaleString('es-MX')}`),
        acc.guest && actions.onUpgrade ? h('button', { class: 'link-btn', onclick: actions.onUpgrade }, 'Guardar mi cuenta') : '',
        actions.onSignOut ? h('button', { class: 'link-btn', onclick: () => {
          if (acc.guest && !confirm('Eres invitado: si cierras sesión perderás este progreso. ¿Cerrar sesión?')) return;
          actions.onSignOut!();
        } }, 'Cerrar sesión') : '')
    : '';

  root.replaceChildren(h('main', { class: 'screen menu' },
    accountBar,
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
        acc ? '' : h('button', { class: 'link-btn', onclick: () => {
          if (!confirm('¿Borrar todo tu progreso (colección, mazo y campaña)?')) return;
          const fresh = resetProfile();
          saveProfile(fresh);
          actions.onReset(fresh);
        } }, 'Reiniciar progreso'),
      )),
  ));
}
