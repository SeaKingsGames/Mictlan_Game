import { cardDb } from '../data/index.ts';
import { CURRENCY, GAME_SUBTITLE, GAME_TITLE } from '../game/config.ts';
import { duelists } from '../game/duelists.ts';
import { resetProfile, saveProfile, type Profile } from '../game/profile.ts';
import { h } from './dom.ts';
import { canPromptInstall, installHelpText, isInstalled, onInstallChange, promptInstall } from './install.ts';
import { muteButton, musicButton, sfx } from './sound.ts';
import { wallets } from './shell.ts';

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

  const name = acc ? (acc.guest ? 'Invitado' : (acc.username ?? acc.email ?? 'Jugador')) : 'Jugador local';
  const profileCard = h('section', { class: 'menu-profile panel' },
    h('div', { class: 'menu-profile__top' },
      h('span', { class: 'menu-profile__avatar', 'aria-hidden': 'true' }, '✺'),
      h('div', {},
        h('b', { class: 'menu-profile__name' }, name),
        h('small', {}, acc ? (acc.guest ? 'Cuenta de invitado' : 'Cuenta guardada') : 'Modo local (este navegador)'))),
    acc ? h('div', { class: 'menu-profile__wallets' }, ...wallets(profile)) : '',
    h('dl', { class: 'menu-profile__stats' },
      h('dt', {}, 'Victorias'), h('dd', { class: 'win' }, String(profile.wins)),
      h('dt', {}, 'Derrotas'), h('dd', { class: 'loss' }, String(profile.losses)),
      h('dt', {}, 'Cartas'), h('dd', {}, `${distinct}/${total}`),
      h('dt', {}, 'Rivales vencidos'), h('dd', {}, `${beaten}/${duelists.length}`)),
    h('div', { class: 'meter', title: 'Colección' }, h('span', { style: `width:${(distinct / total) * 100}%` })),
    h('div', { class: 'menu-profile__links' },
      acc?.guest && actions.onUpgrade ? h('button', { class: 'link-btn', onclick: actions.onUpgrade }, 'Guardar mi cuenta') : '',
      actions.onSignOut ? h('button', { class: 'link-btn', onclick: () => {
        if (acc?.guest && !confirm('Eres invitado: si cierras sesión perderás este progreso. ¿Cerrar sesión?')) return;
        actions.onSignOut!();
      } }, 'Cerrar sesión') : ''));

  const item = (label: string, hash: string, sub: string, main = false) =>
    h('button', { class: `menu-item${main ? ' menu-item--main' : ''}`, onclick: () => { sfx('click'); go(hash); } },
      h('span', { class: 'menu-item__label' }, label), h('small', {}, sub));

  root.replaceChildren(h('main', { class: 'menu2' },
    h('div', { class: 'menu2__sky', 'aria-hidden': 'true' }, h('span', { class: 'menu2__sun' }, '✺')),
    profileCard,
    h('div', { class: 'menu2__center' },
      h('h1', { class: 'menu__title' }, GAME_TITLE),
      h('p', { class: 'menu__subtitle' }, GAME_SUBTITLE),
      h('nav', { class: 'menu2__buttons' },
        item('Campaña', '#/campana', 'Vence a los duelistas en orden', true),
        item('Duelo libre', '#/libre', 'Reta a quien ya desbloqueaste'),
        item('⚔ Contra otro jugador', '#/pvp', 'Sala con código'),
        item('Tienda de sobres', '#/tienda', `${CURRENCY.premium.icon} Sobres temáticos de 5 cartas`),
        item('Mercado de cartas', '#/mercado', `${CURRENCY.common.icon} 6 cartas al azar cada día`),
        item('Ruleta de premios', '#/ruleta', `${CURRENCY.gold.icon} Gira con tickets oro`),
        item('Editor de mazo', '#/mazo', 'Arma tu mazo de 40'),
        item('Biblioteca', '#/biblioteca', 'Todas las cartas del juego')),
      h('div', { class: 'menu__install' }, installButton(), muteButton(), musicButton()),
      // Editores: solo en tu compu (npm run dev), no en la página pública
      !import.meta.env.DEV ? '' : h('details', { class: 'menu__tools' },
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
        ))),
  ));
}

/** "Instalar juego": solo si no lo estás jugando ya como app. */
function installButton(): HTMLElement | string {
  if (isInstalled()) return '';
  const help = h('p', { class: 'install-help', role: 'status' });
  const btn = h('button', { class: 'link-btn' }, '📲 Instalar juego');
  btn.addEventListener('click', async () => {
    if (canPromptInstall()) { if (await promptInstall()) wrap.remove(); }
    else help.textContent = installHelpText();
  });
  const wrap = h('div', { class: 'install-wrap' }, btn, help);
  const off = onInstallChange(() => { if (isInstalled()) { wrap.remove(); off(); } });
  return wrap;
}
