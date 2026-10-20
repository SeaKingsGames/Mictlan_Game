import { cardDb } from '../data/index.ts';
import { RARITIES, RARITY_LABEL, rarityOf, type CardDef, type CardRarity } from '../data/types.ts';
import { CURRENCY } from '../game/config.ts';
import { packOdds, packPool, packs, PACK_COUNTS, PACK_PITY, PACK_SIZE, type PackDef } from '../game/packs.ts';
import { levelOf, owned, type Profile } from '../game/profile.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { appScreen, rarityChip, thumb, wallets } from './shell.ts';
import { sfx } from './sound.ts';

export interface PackCard { id: number; converted: boolean; cacao?: number; jade?: number }
export interface PackResult { packs: { cards: PackCard[]; pity: boolean }[] }

/** Quién abre los sobres: en la nube el servidor (cobra jade); en modo local, el navegador (gratis). */
export interface PackShop {
  /** Jade disponible; null = modo local (gratis). */
  jade(): number | null;
  open(pack: PackDef, count: number): Promise<PackResult>;
}

/** Arte del sobre hecho con CSS (cámbialo por una imagen cuando tengas diseño propio). */
export function packArt(pack: PackDef, cls = ''): HTMLElement {
  return h('div', { class: `pack ${cls}`, style: `--pack:${pack.color}`, 'aria-hidden': 'true' },
    h('span', { class: 'pack__crimp pack__crimp--top' }),
    h('span', { class: 'pack__glyph' }, pack.glyph),
    h('span', { class: 'pack__name' }, pack.name.replace(/^Sobre (del?|de) /, '')),
    h('span', { class: 'pack__count' }, `${PACK_SIZE} cartas`),
    h('span', { class: 'pack__crimp pack__crimp--bottom' }),
    h('span', { class: 'pack__shine' }));
}

/**
 * Tienda de sobres: eliges un sobre temático, ves qué trae y con qué probabilidad, y lo abres.
 * 5 cartas por sobre: N 60% · R 28% · SR 10% · UR 2% cada una. 10 sobres seguidos sin UR = UR segura.
 */
export function renderShop(root: HTMLElement, profile: Profile, go: (hash: string) => void, shop: PackShop): void {
  let selected = packs[0];
  const list = h('nav', { class: 'shop__packs panel', 'aria-label': 'Sobres' });
  const stage = h('section', { class: 'shop__stage panel' });
  const contents = h('section', { class: 'shop__contents panel' });
  const bar = h('div', { class: 'app-bar__wallets' });

  const screen = appScreen({ cls: 'shop', title: 'Tienda de sobres', back: () => go('#/'), right: bar }, list, stage, contents);
  root.replaceChildren(screen);

  const paintWallets = () => bar.replaceChildren(...wallets(profile));

  function renderList(): void {
    list.replaceChildren(h('h2', { class: 'panel__title' }, 'Sobres'), ...packs.map(p => {
      const b = h('button', { class: `shop__pick${p === selected ? ' shop__pick--on' : ''}`, 'aria-pressed': p === selected, style: `--pack:${p.color}` },
        packArt(p, 'pack--mini'),
        h('span', { class: 'shop__pick-text' }, h('b', {}, p.name), h('small', {}, `${CURRENCY.premium.icon} ${p.price}`)));
      b.addEventListener('click', () => { sfx('click'); selected = p; renderAll(); });
      return b;
    }));
  }

  function renderStage(): void {
    const p = selected;
    const jade = shop.jade();
    const pool = packPool(p, cardDb);
    const odds = packOdds(pool);
    const since = profile.packsSinceUr ?? 0;
    const left = Math.max(1, PACK_PITY - since);
    const msg = h('p', { class: 'shop__msg', role: 'status' });
    const buttons = PACK_COUNTS.map(n => {
      const price = p.price * n;
      const short = jade !== null && jade < price;
      const b = h('button', { class: `big-btn${n === 1 ? ' big-btn--main' : ''} shop__buy`, disabled: short },
        h('span', {}, n === 1 ? 'Abrir 1 sobre' : `Abrir ${n} sobres`),
        h('small', {}, jade === null ? 'gratis (modo local)' : `${CURRENCY.premium.icon} ${price}`));
      b.addEventListener('click', () => void buy(n, msg));
      return b;
    });
    const art = packArt(p, 'pack--big');
    art.addEventListener('click', () => { if (!buttons[0].disabled) void buy(1, msg); });
    stage.replaceChildren(
      h('div', { class: 'shop__art' }, art),
      h('h2', { class: 'shop__name' }, p.name),
      h('p', { class: 'shop__desc' }, p.description),
      h('div', { class: 'shop__buttons' }, ...buttons),
      jade !== null && jade < p.price ? h('p', { class: 'shop__hint' }, `Te falta jade. Lo consigues en la ruleta o con cartas repetidas (R +1, SR +2, UR +5).`) : '',
      msg,
      h('div', { class: 'pity', title: `Si abres ${PACK_PITY} sobres seguidos sin UR, el último trae una UR segura` },
        h('div', { class: 'pity__head' }, h('span', {}, 'UR garantizada'), h('b', {}, left === 1 ? '¡en el próximo sobre!' : `en ${left} sobres`)),
        h('div', { class: 'pity__bar' }, h('span', { style: `width:${(since / PACK_PITY) * 100}%` }))),
      h('table', { class: 'odds' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Rareza'), h('th', {}, 'Por carta'), h('th', {}, 'Cartas'))),
        h('tbody', {}, ...[...RARITIES].reverse().map(r => h('tr', {},
          h('td', {}, rarityChip(r), ` ${RARITY_LABEL[r]}`),
          h('td', {}, `${odds[r]}%`),
          h('td', {}, `${pool[r].filter(c => owned(profile, c.id) > 0).length}/${pool[r].length}`))))),
    );
  }

  function renderContents(): void {
    const pool = packPool(selected, cardDb);
    const all = Object.values(pool).flat();
    const have = all.filter(c => owned(profile, c.id) > 0).length;
    contents.replaceChildren(
      h('header', { class: 'panel__head' },
        h('h2', { class: 'panel__title' }, 'Contenido del sobre'),
        h('span', { class: 'panel__count' }, `Tienes ${have}/${all.length}`)),
      ...[...RARITIES].reverse().filter(r => pool[r].length).map(r => raritySection(r, pool[r])));
  }

  function raritySection(r: CardRarity, cards: CardDef[]): HTMLElement {
    return h('section', { class: 'rar-section' },
      h('h3', { class: 'rar-section__head' }, rarityChip(r), h('span', {}, `${cards.length} cartas`)),
      h('div', { class: 'thumbs' }, ...cards
        .sort((a, b) => b.atk - a.atk || a.id - b.id)
        .map(c => thumb(c, { missing: owned(profile, c.id) === 0, level: levelOf(profile, c.id), caption: `${owned(profile, c.id)}/3` }))));
  }

  let buying = false;
  async function buy(count: number, msg: HTMLElement): Promise<void> {
    if (buying) return;
    buying = true;
    msg.textContent = 'Abriendo…';
    try {
      const result = await shop.open(selected, count);
      msg.textContent = '';
      sfx('coin');
      showOpening(selected, count, result, () => { renderAll(); });
    } catch (e) {
      sfx('error');
      msg.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      buying = false;
    }
  }

  /** La apertura: tocas el sobre, salen las cartas boca abajo y las volteas. */
  function showOpening(pack: PackDef, count: number, result: PackResult, done: () => void): void {
    const cards = result.packs.flatMap(p => p.cards);
    const flips: HTMLElement[] = [];
    let revealed = 0;
    const summary = h('div', { class: 'opening__summary' });
    const grid = h('div', { class: `opening__cards${count > 1 ? ' opening__cards--many' : ''}` });
    const revealAll = h('button', { class: 'big-btn' }, 'Revelar todo');
    const again = h('button', { class: 'big-btn big-btn--main' }, count === 1 ? 'Abrir otro' : `Abrir ${count} más`);
    const close = h('button', { class: 'big-btn' }, 'Listo');
    const actions = h('div', { class: 'opening__actions' }, revealAll);
    const art = packArt(pack, 'pack--big pack--shake');
    const hint = h('p', { class: 'opening__hint' }, 'Toca el sobre para abrirlo');
    const stageEl = h('div', { class: 'opening__stage' }, art, hint);
    const overlay = h('div', { class: 'opening', role: 'dialog', 'aria-label': `Abriendo ${pack.name}`, style: `--pack:${pack.color}` },
      h('h2', { class: 'opening__title' }, count === 1 ? pack.name : `${count} × ${pack.name}`),
      stageEl, grid, summary, actions);
    document.body.append(overlay);

    const finish = () => { overlay.remove(); done(); };
    close.addEventListener('click', () => { sfx('click'); finish(); });
    again.addEventListener('click', () => {
      sfx('click'); overlay.remove(); done();
      const msg = stage.querySelector('.shop__msg') as HTMLElement;
      const btn = [...stage.querySelectorAll<HTMLButtonElement>('.shop__buy')][count === 1 ? 0 : 1];
      if (btn && !btn.disabled) void buy(count, msg);
    });

    let opened = false;
    const tear = () => {
      if (opened) return;
      opened = true;
      sfx('pack');
      art.classList.add('pack--tear');
      hint.remove();
      setTimeout(() => {
        stageEl.remove();
        cards.forEach((c, i) => {
          const def = cardDb.get(c.id);
          const f = h('button', { class: `flip flip--${rarityOf(def)}`, 'aria-label': `Carta ${i + 1}: toca para voltear`, style: `--i:${i % 25}` },
            h('span', { class: 'flip__inner' },
              h('span', { class: 'flip__back' }, createCardElement(def, { hidden: true })),
              h('span', { class: 'flip__front' }, createCardElement(def, { level: levelOf(profile, def.id) }),
                c.converted ? h('span', { class: 'flip__tag flip__tag--dup' }, `+${c.cacao ?? 0}${CURRENCY.common.icon}${c.jade ? ` +${c.jade}${CURRENCY.premium.icon}` : ''}`)
                  : isNew(c, i) ? h('span', { class: 'flip__tag' }, 'NUEVA') : '')));
          f.addEventListener('click', () => flip(f, def));
          flips.push(f);
          grid.append(f);
        });
      }, 450);
    };
    art.addEventListener('click', tear);
    stageEl.addEventListener('click', tear);

    /** Es nueva si antes de este sobre no la tenías (y es la primera vez que sale en él). */
    const before = new Map<number, number>();
    for (const c of cards) if (!c.converted) before.set(c.id, (before.get(c.id) ?? 0) + 1);
    function isNew(c: PackCard, index: number): boolean {
      const firstIndex = cards.findIndex(x => x.id === c.id);
      return firstIndex === index && owned(profile, c.id) - (before.get(c.id) ?? 0) <= 0;
    }

    function flip(f: HTMLElement, def: CardDef): void {
      if (f.classList.contains('flip--open')) return;
      f.classList.add('flip--open');
      f.setAttribute('aria-label', def.name);
      const r = rarityOf(def);
      sfx(r === 'UR' ? 'ritual' : r === 'SR' ? 'level' : 'draw');
      if (r === 'UR') { overlay.classList.remove('opening--flash'); void overlay.offsetWidth; overlay.classList.add('opening--flash'); }
      revealed++;
      if (revealed === cards.length) showSummary();
    }

    revealAll.addEventListener('click', () => {
      const wait = opened ? 0 : 500;
      tear();
      const delay = count > 1 ? 60 : 220;
      setTimeout(() => flips.filter(f => !f.classList.contains('flip--open'))
        .forEach((f, i) => setTimeout(() => flip(f, cardDb.get(cards[flips.indexOf(f)].id)), i * delay)), wait);
    });

    function showSummary(): void {
      const fresh = new Set(cards.filter((c, i) => isNew(c, i)).map(c => c.id)).size;
      const dups = cards.filter(c => c.converted);
      const cacao = dups.reduce((n, c) => n + (c.cacao ?? 0), 0);
      const jade = dups.reduce((n, c) => n + (c.jade ?? 0), 0);
      const best = cards.map(c => rarityOf(cardDb.get(c.id))).sort((a, b) => RARITIES.indexOf(b) - RARITIES.indexOf(a))[0];
      const pity = result.packs.some(p => p.pity);
      summary.replaceChildren(
        h('p', {}, fresh ? h('b', {}, `${fresh} carta${fresh === 1 ? '' : 's'} nueva${fresh === 1 ? '' : 's'} en tu colección`) : 'Ninguna carta nueva esta vez',
          best === 'UR' ? h('span', { class: 'opening__ur' }, ' · ¡Ultra rara!') : ''),
        dups.length ? h('p', { class: 'opening__dups' }, `${dups.length} repetida${dups.length === 1 ? '' : 's'} (ya tenías 3) → +${cacao} ${CURRENCY.common.name}${jade ? ` y +${jade} ${CURRENCY.premium.name}` : ''}`) : '',
        pity ? h('p', { class: 'opening__pity' }, `★ La garantía de ${PACK_PITY} sobres te dio una UR`) : '');
      const jadeNow = shop.jade();
      const canAgain = jadeNow === null || jadeNow >= pack.price * count;
      actions.replaceChildren(...(canAgain ? [again] : []), close);
      close.focus();
    }
    paintWallets();
  }

  function renderAll(): void {
    paintWallets();
    renderList();
    renderStage();
    renderContents();
  }
  renderAll();
}
