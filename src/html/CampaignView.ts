import { cardDb } from '../data/index.ts';
import { duelists, isUnlocked, type Duelist } from '../game/duelists.ts';
import { validatePlayerDeck, type Profile } from '../game/profile.ts';
import { h } from './dom.ts';

/** Lista de rivales en orden. Se desbloquean al vencer al anterior. */
export function renderCampaign(root: HTMLElement, profile: Profile, go: (hash: string) => void, freeMode = false): void {
  const deckErrors = validatePlayerDeck(profile, profile.deck, cardDb);
  const stars = (d: Duelist) => '★'.repeat(d.level) + '☆'.repeat(3 - d.level);

  root.replaceChildren(h('main', { class: 'screen' },
    h('header', { class: 'screen__head' },
      h('button', { class: 'link-btn', onclick: () => go('#/') }, '← Menú'),
      h('h1', {}, freeMode ? 'Duelo libre' : 'Campaña'),
      h('span', {}),
    ),
    h('p', { class: 'screen__hint' }, freeMode
      ? 'Reta a cualquier duelista que ya hayas desbloqueado.'
      : 'Vence a cada duelista para desbloquear al siguiente. Al ganar te llevas una carta de su mazo; la primera vez, también su carta firma.'),
    deckErrors.length
      ? h('div', { class: 'warn-box' },
          h('b', {}, 'Tu mazo no está listo: '), deckErrors[0] + '. ',
          h('button', { class: 'link-btn', onclick: () => go('#/mazo') }, 'Arreglar mazo →'))
      : '',
    h('ol', { class: 'campaign' },
      ...duelists.map((d, i) => {
        const unlocked = isUnlocked(d.id, profile.defeated);
        const beaten = profile.defeated.includes(d.id);
        const signature = cardDb.tryGet(d.signature);
        return h('li', { class: `duelist${unlocked ? '' : ' duelist--locked'}${beaten ? ' duelist--beaten' : ''}` },
          h('div', { class: 'duelist__portrait' }, unlocked ? d.glyph : '🔒'),
          h('div', { class: 'duelist__body' },
            h('p', { class: 'duelist__step' }, `${i + 1} · ${d.title}`),
            h('h2', { class: 'duelist__name' }, unlocked ? d.name : '???'),
            h('p', { class: 'duelist__level' }, `Dificultad ${stars(d)}`),
            h('p', { class: 'duelist__intro' }, unlocked ? d.intro : 'Vence al duelista anterior para desbloquearlo.'),
            unlocked && signature ? h('p', { class: 'duelist__sig' }, beaten ? `✓ Vencido · carta firma: ${signature.name}` : `Carta firma: ${signature.name}`) : '',
          ),
          h('button', {
            class: 'big-btn duelist__go',
            disabled: !unlocked || deckErrors.length > 0,
            onclick: () => go(`#/duelo/${d.id}`),
          }, beaten ? 'Revancha' : 'Retar'),
        );
      })),
  ));
}
