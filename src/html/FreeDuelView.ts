import { cardDb } from '../data/index.ts';
import { fillPortrait, hasPortrait } from './portrait.ts';
import { RARITIES, rarityOf, type CardDef, type CardRarity } from '../data/types.ts';
import { WIN_CACAO } from '../game/economy.ts';
import { CURRENCY } from '../game/config.ts';
import { duelists, isUnlocked, type Duelist } from '../game/duelists.ts';
import { levelOf, owned, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { h } from './dom.ts';
import { sfx } from './sound.ts';
import { appScreen, pct, rarityChip, tabs, thumb, TYPE_TABS, type TypeTab } from './shell.ts';

export interface DropEntry { card: CardDef; chance: number }

/** Botín de un duelista agrupado por rareza (UR primero), con la probabilidad de cada carta. */
export function dropTable(d: Duelist): { rarity: CardRarity; total: number; entries: DropEntry[] }[] {
  const sum = d.rewards.reduce((n, r) => n + r.weight, 0) || 1;
  const byRarity = new Map<CardRarity, DropEntry[]>();
  for (const r of d.rewards) {
    const card = cardDb.tryGet(r.card);
    if (!card) continue;
    const list = byRarity.get(rarityOf(card)) ?? [];
    const existing = list.find(e => e.card.id === card.id);
    if (existing) existing.chance += r.weight / sum; else list.push({ card, chance: r.weight / sum });
    byRarity.set(rarityOf(card), list);
  }
  return [...RARITIES].reverse()
    .filter(rar => byRarity.has(rar))
    .map(rar => {
      const entries = byRarity.get(rar)!.sort((a, b) => b.chance - a.chance || b.card.atk - a.card.atk);
      return { rarity: rar, total: entries.reduce((n, e) => n + e.chance, 0), entries };
    });
}

/**
 * Duelo libre: a la izquierda el rival (retrato, dificultad, premio y la lista para cambiar de rival);
 * a la derecha su botín agrupado por rareza (UR, SR, R, N) con la probabilidad de cada carta.
 */
export function renderFreeDuel(root: HTMLElement, profile: Profile, go: (hash: string) => void): void {
  const deckErrors = validatePlayerDeck(profile, profile.deck, cardDb);
  const unlocked = duelists.filter(d => isUnlocked(d.id, profile.defeated));
  let selected: Duelist = unlocked[unlocked.length - 1] ?? duelists[0];
  let typeTab: TypeTab = '';
  const side = h('aside', { class: 'free__side panel' });
  const drops = h('section', { class: 'free__drops panel' });
  const stars = (d: Duelist) => '★'.repeat(d.level) + '☆'.repeat(3 - d.level);

  root.replaceChildren(appScreen({ cls: 'free', title: 'Duelo libre', back: () => go('#/'), profile,
    right: h('button', { class: 'app-bar__link', onclick: () => go('#/mazo') }, 'Mi mazo') }, side, drops));

  function renderSide(): void {
    const d = selected;
    const beaten = profile.defeated.includes(d.id);
    const picker = h('div', { class: 'free__list', role: 'list' }, ...duelists.map(x => {
      const open = isUnlocked(x.id, profile.defeated);
      const b = h('button', {
        class: `free__pick${x === d ? ' free__pick--on' : ''}`, disabled: !open, 'aria-pressed': x === d, role: 'listitem',
      },
        fillPortrait(h('span', { class: 'free__glyph' }), x, !open),
        h('span', { class: 'free__pick-text' }, h('b', {}, open ? x.name : '???'), h('small', {}, open ? stars(x) : 'Bloqueado')),
        profile.defeated.includes(x.id) ? h('span', { class: 'free__check', title: 'Vencido' }, '✓') : '');
      b.addEventListener('click', () => { sfx('click'); selected = x; renderSide(); renderDrops(); });
      return b;
    }));
    side.replaceChildren(
      hasPortrait(d.id) ? fillPortrait(h('div', { class: 'free__portrait' }), d) : h('div', { class: 'free__portrait' }, h('span', {}, d.glyph)),
      h('div', { class: 'free__who' },
        h('p', { class: 'free__title' }, d.title),
        h('h2', { class: 'free__name' }, d.name),
        h('p', { class: 'free__stars' }, `Dificultad ${stars(d)}`),
        h('p', { class: 'free__record' }, beaten ? '✓ Ya lo venciste' : 'Aún no lo vences'),
        h('p', { class: 'free__prize' }, `Premio: ${CURRENCY.common.icon} ${WIN_CACAO[d.level]} ${CURRENCY.common.name} + 1 carta + 1 ${CURRENCY.ticket.icon}`)),
      h('p', { class: 'free__intro' }, d.intro),
      deckErrors.length
        ? h('p', { class: 'warn-box' }, deckErrors[0], ' ', h('button', { class: 'link-btn', onclick: () => go('#/mazo') }, 'Arreglar mazo →'))
        : '',
      h('button', {
        class: 'big-btn big-btn--main free__go', disabled: deckErrors.length > 0,
        onclick: () => { sfx('click'); go(`#/duelo/${d.id}`); },
      }, '⚔ Duelar'),
      h('h3', { class: 'panel__title free__list-title' }, 'Rivales'),
      picker);
  }

  function renderDrops(): void {
    const d = selected;
    const firstWin = !profile.defeated.includes(d.id);
    const signature = cardDb.tryGet(d.signature);
    const groups = dropTable(d)
      .map(g => ({ ...g, entries: g.entries.filter(e => !typeTab || e.card.type === typeTab) }))
      .filter(g => g.entries.length);
    const total = dropTable(d).reduce((n, g) => n + g.entries.length, 0);
    drops.replaceChildren(
      h('header', { class: 'panel__head' },
        h('h2', { class: 'panel__title' }, `Botín de ${d.name}`),
        h('span', { class: 'panel__count' }, `${total} cartas · sale 1 al ganar`)),
      tabs(TYPE_TABS, typeTab, t => { typeTab = t; renderDrops(); }),
      signature ? h('div', { class: `free__sig${firstWin ? '' : ' free__sig--done'}` },
        thumb(signature, { level: levelOf(profile, signature.id), missing: owned(profile, signature.id) === 0, caption: 'Firma' }),
        h('p', {}, firstWin ? h('b', {}, '★ Primera victoria: te regala su carta firma') : '✓ Ya te dio su carta firma', h('br', {}), h('small', {}, signature.name))) : '',
      ...groups.map(g => h('section', { class: 'rar-section' },
        h('h3', { class: 'rar-section__head' }, rarityChip(g.rarity), h('span', {}, `${g.entries.length} carta${g.entries.length === 1 ? '' : 's'}`), h('span', { class: 'rar-section__pct' }, pct(g.total))),
        h('div', { class: 'thumbs' }, ...g.entries.map(e => thumb(e.card, {
          level: levelOf(profile, e.card.id),
          missing: owned(profile, e.card.id) === 0,
          caption: h('span', {}, h('b', {}, pct(e.chance)), ` · ${owned(profile, e.card.id)}/3`),
          badge: owned(profile, e.card.id) ? undefined : 'NUEVA',
        }))))),
      groups.length ? '' : h('p', { class: 'empty' }, 'Este rival no suelta cartas de ese tipo.'));
  }

  renderSide();
  renderDrops();
}
