import { cardDb } from '../data/index.ts';
import { RARITIES, RARITY_LABEL, rarityOf, type CardDef, type CardRarity } from '../data/types.ts';
import { WIN_CACAO } from '../game/economy.ts';
import { CURRENCY } from '../game/config.ts';
import { duelists, isUnlocked, type Duelist } from '../game/duelists.ts';
import { levelOf, owned, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { sfx } from './sound.ts';

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

const pct = (x: number) => (x >= 0.1 ? `${Math.round(x * 100)}%` : `${(x * 100).toFixed(1).replace('.0', '')}%`);

/**
 * Duelo libre: eliges un duelista desbloqueado y ves qué puede darte al ganarle,
 * agrupado por rareza (N, R, SR, UR) con la probabilidad de cada carta.
 */
export function renderFreeDuel(root: HTMLElement, profile: Profile, go: (hash: string) => void): void {
  const deckErrors = validatePlayerDeck(profile, profile.deck, cardDb);
  const unlocked = duelists.filter(d => isUnlocked(d.id, profile.defeated));
  let selected: Duelist = unlocked[unlocked.length - 1] ?? duelists[0];
  const detail = h('section', { class: 'free__detail' });
  const list = h('nav', { class: 'free__list', 'aria-label': 'Duelistas' });
  const stars = (d: Duelist) => '★'.repeat(d.level) + '☆'.repeat(3 - d.level);

  function renderList(): void {
    list.replaceChildren(...duelists.map(d => {
      const open = isUnlocked(d.id, profile.defeated);
      const btn = h('button', {
        class: `free__pick${d === selected ? ' free__pick--on' : ''}${open ? '' : ' free__pick--locked'}`,
        disabled: !open,
        'aria-pressed': d === selected,
      },
        h('span', { class: 'free__glyph' }, open ? d.glyph : '🔒'),
        h('span', { class: 'free__pick-text' },
          h('b', {}, open ? d.name : '???'),
          h('small', {}, open ? stars(d) : 'Bloqueado')));
      btn.addEventListener('click', () => { sfx('click'); selected = d; renderList(); renderDetail(); });
      return btn;
    }));
  }

  function renderDetail(): void {
    const d = selected;
    const firstWin = !profile.defeated.includes(d.id);
    const signature = cardDb.tryGet(d.signature);
    const groups = dropTable(d);
    detail.replaceChildren(
      h('header', { class: 'free__head' },
        h('div', { class: 'duelist__portrait free__portrait' }, d.glyph),
        h('div', { class: 'free__who' },
          h('p', { class: 'duelist__step' }, d.title),
          h('h2', { class: 'duelist__name' }, d.name),
          h('p', { class: 'duelist__level' }, `Dificultad ${stars(d)} · Ganar: ${CURRENCY.common.icon} ${WIN_CACAO[d.level]} ${CURRENCY.common.name}`)),
        h('button', {
          class: 'big-btn big-btn--main free__go',
          disabled: deckErrors.length > 0,
          onclick: () => { sfx('click'); go(`#/duelo/${d.id}`); },
        }, 'Retar')),
      h('p', { class: 'free__intro' }, d.intro),
      signature ? h('div', { class: `free__sig${firstWin ? '' : ' free__sig--done'}` },
        h('span', {}, firstWin ? '★ Primera victoria: te regala su carta firma' : '✓ Ya tienes su carta firma'),
        miniCard(signature, 1, true)) : '',
      h('h3', { class: 'free__drops-title' }, 'Botín al ganar (1 carta al azar)'),
      ...groups.map(g => h('div', { class: `drops drops--${g.rarity}` },
        h('div', { class: 'drops__head' },
          h('span', { class: `rarity-chip rarity-chip--${g.rarity}` }, g.rarity),
          h('b', {}, RARITY_LABEL[g.rarity]),
          h('span', { class: 'drops__total' }, pct(g.total))),
        h('div', { class: 'drops__cards' }, ...g.entries.map(e => miniCard(e.card, e.chance))))),
    );
  }

  function miniCard(card: CardDef, chance: number, isSignature = false): HTMLElement {
    const have = owned(profile, card.id);
    const el = createCardElement(card, { level: levelOf(profile, card.id) });
    return h('figure', { class: `drop${have ? '' : ' drop--new'}`, title: `${card.name} · ${have}/3 en tu colección` },
      el,
      h('figcaption', {},
        h('b', {}, isSignature ? 'Firma' : pct(chance)),
        h('small', {}, have ? `Tienes ${have}/3` : 'Nueva')));
  }

  root.replaceChildren(h('main', { class: 'screen screen--wide free' },
    h('header', { class: 'screen__head' },
      h('button', { class: 'link-btn', onclick: () => go('#/') }, '← Menú'),
      h('h1', {}, 'Duelo libre'),
      h('button', { class: 'link-btn', onclick: () => go('#/mazo') }, 'Mi mazo →')),
    deckErrors.length
      ? h('div', { class: 'warn-box' }, h('b', {}, 'Tu mazo no está listo: '), deckErrors[0] + '. ',
          h('button', { class: 'link-btn', onclick: () => go('#/mazo') }, 'Arreglar mazo →'))
      : '',
    h('div', { class: 'free__layout' }, list, detail)));
  renderList();
  renderDetail();
}
