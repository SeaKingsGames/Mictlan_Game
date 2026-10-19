import { cardDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { rarityOf, RARITY_LABEL } from '../data/types.ts';
import { CURRENCY } from '../game/config.ts';
import { msToNextDay, SHOP_ODDS, SHOP_PRICES, SHOP_REFRESH_TICKETS, type ShopSlot } from '../game/cardShop.ts';
import { levelOf, owned, type Profile } from '../game/profile.ts';
import { GOLD_BUY_COUNTS, GOLD_TICKET_PRICE, ROULETTE_PRIZES } from '../game/roulette.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { appScreen, rarityChip, wallets } from './shell.ts';
import { sfx } from './sound.ts';

/** Monedas que devuelve el servidor (null = modo local, todo gratis). */
export interface MarketWallet { cacao: number; jade: number; tickets: number; gold: number }
export interface CardGot { id: number; converted: boolean; cacao?: number; jade?: number }
export interface MarketState { featured: number; shop: { slots: ShopSlot[]; day: string } }
export interface SpinResult { index: number; prize: { kind: string; amount: number; card: number | null }; card: CardGot | null; featured: number }

/** Quién hace las cuentas: en la nube el servidor (Edge Function "market"); en modo local, el navegador (gratis). */
export interface Market {
  local: boolean;
  state(): Promise<MarketState>;
  buyGold(count: number): Promise<void>;
  spin(): Promise<SpinResult>;
  refresh(): Promise<MarketState['shop']>;
  buy(slot: number): Promise<MarketState['shop']>;
}

const err = (e: unknown) => (e instanceof Error ? e.message : String(e));

// =====================================================================
// Ruleta
// =====================================================================

/**
 * Ruleta de premios: 1 ticket oro = 1 giro. Uno de los gajos es "la carta a la vista",
 * una R o SR que se ve antes de girar y cambia después de cada giro.
 */
export function renderRoulette(root: HTMLElement, profile: Profile, go: (hash: string) => void, market: Market): void {
  const bar = h('div', { class: 'app-bar__wallets' });
  const wheelBox = h('section', { class: 'roul__wheel panel' });
  const side = h('aside', { class: 'roul__side panel' });
  root.replaceChildren(appScreen({ cls: 'roul', title: 'Ruleta de premios', back: () => go('#/'), right: bar }, wheelBox, side));
  const paintBar = () => bar.replaceChildren(...wallets(profile));
  paintBar();
  wheelBox.replaceChildren(h('p', { class: 'empty' }, 'Cargando…'));

  let featured = 0;
  let spinning = false;
  let turns = 0;           // vueltas acumuladas (para que siempre gire hacia adelante)
  const N = ROULETTE_PRIZES.length;
  const seg = 360 / N;

  const wheel = h('div', { class: 'wheel', style: `background:conic-gradient(${ROULETTE_PRIZES.map((p, i) => `${p.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})` });
  const labels = ROULETTE_PRIZES.map((p, i) => h('span', { class: `wheel__label${p.kind === 'card' ? ' wheel__label--card' : ''}`, style: `--a:${i * seg + seg / 2}deg` },
    h('b', {}, p.kind === 'card' ? '🃏' : p.kind === 'cacao' ? CURRENCY.common.icon : p.kind === 'jade' ? CURRENCY.premium.icon : p.kind === 'tickets' ? CURRENCY.ticket.icon : CURRENCY.gold.icon),
    h('small', {}, p.label)));
  wheel.append(...labels);
  const spinBtn = h('button', { class: 'wheel__hub', 'aria-label': 'Girar' }, 'GIRAR');
  const msg = h('p', { class: 'roul__msg', role: 'status' });
  const result = h('div', { class: 'roul__result' });
  wheelBox.replaceChildren(
    h('div', { class: 'wheel-wrap' }, h('span', { class: 'wheel__pointer', 'aria-hidden': 'true' }), wheel, spinBtn),
    msg, result);
  spinBtn.addEventListener('click', () => void spin());

  function renderSide(): void {
    const card = cardDb.tryGet(featured);
    const gold = profile.account?.gold ?? null;
    const buys = GOLD_BUY_COUNTS.map(n => {
      const price = n * GOLD_TICKET_PRICE;
      const short = profile.account ? profile.account.cacao < price : false;
      const b = h('button', { class: 'big-btn roul__buy', disabled: short || market.local },
        h('span', {}, `+${n} ${CURRENCY.gold.icon}`), h('small', {}, market.local ? 'no hace falta' : `${CURRENCY.common.icon} ${price.toLocaleString('es-MX')}`));
      b.addEventListener('click', () => void run(async () => { await market.buyGold(n); sfx('coin'); msg.textContent = `Compraste ${n} ticket${n > 1 ? 's' : ''} oro.`; }));
      return b;
    });
    side.replaceChildren(
      h('h2', { class: 'panel__title' }, '🃏 Carta a la vista'),
      card ? h('div', { class: `altar altar--${rarityOf(card)} roul__card` }, createCardElement(card, { level: levelOf(profile, card.id) })) : h('p', { class: 'empty' }, '—'),
      card ? h('p', { class: 'detail__meta' }, rarityChip(rarityOf(card)), ` ${card.name} · tienes ${owned(profile, card.id)}/3`) : '',
      card && describeEffects(card.effects) ? h('p', { class: 'detail__fx' }, describeEffects(card.effects)) : '',
      h('p', { class: 'roul__hint' }, 'Puede salir en este giro. Después de girar aparece otra.'),
      h('div', { class: 'roul__gold' },
        h('b', {}, market.local ? 'Modo local: giros gratis' : `Tienes ${gold} ${CURRENCY.gold.icon} ${gold === 1 ? 'ticket oro' : 'tickets oro'}`),
        h('small', {}, `1 giro = 1 ticket oro · cada ticket cuesta ${GOLD_TICKET_PRICE.toLocaleString('es-MX')} de cacao`)),
      h('div', { class: 'roul__buys' }, ...buys),
      h('table', { class: 'odds' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Premio'), h('th', {}, 'Probabilidad'))),
        h('tbody', {}, ...ROULETTE_PRIZES.map(p => h('tr', {},
          h('td', {}, h('span', { class: 'roul__dot', style: `background:${p.color}` }), p.kind === 'card' ? `La carta a la vista${card ? ` (${card.name})` : ''}` : p.label),
          h('td', {}, `${p.weight}%`))))),
    );
    spinBtn.disabled = spinning || (!market.local && (gold ?? 0) < 1);
  }

  async function run(fn: () => Promise<void>): Promise<void> {
    try { await fn(); } catch (e) { sfx('error'); msg.textContent = err(e); }
    paintBar();
    renderSide();
  }

  async function spin(): Promise<void> {
    if (spinning) return;
    if (!market.local && (profile.account?.gold ?? 0) < 1) { sfx('error'); msg.textContent = 'Necesitas 1 ticket oro.'; return; }
    spinning = true;
    spinBtn.disabled = true;
    msg.textContent = '';
    result.replaceChildren();
    const shownCard = featured;
    let r: SpinResult;
    try { r = await market.spin(); } catch (e) { spinning = false; sfx('error'); msg.textContent = err(e); renderSide(); return; }
    paintBar();
    // El gajo i queda bajo la flecha de arriba
    turns += 6;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const angle = turns * 360 - (r.index * seg + seg / 2) + jitter;
    sfx('phase');
    wheel.style.transform = `rotate(${angle}deg)`;
    const done = () => {
      wheel.removeEventListener('transitionend', done);
      spinning = false;
      featured = r.featured;
      showPrize(r, shownCard);
      renderSide();
    };
    wheel.addEventListener('transitionend', done);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  }

  function showPrize(r: SpinResult, cardId: number): void {
    const p = ROULETTE_PRIZES[r.index];
    if (p.kind === 'card') {
      const card = cardDb.get(cardId);
      sfx('ritual');
      result.replaceChildren(
        h('p', { class: 'roul__won roul__won--card' }, '¡Ganaste la carta!'),
        h('div', { class: `altar altar--${rarityOf(card)}` }, createCardElement(card)),
        r.card?.converted ? h('p', { class: 'roul__hint' }, `Ya tenías 3: se volvió ${r.card.cacao ?? 0} ${CURRENCY.common.name}${r.card.jade ? ` y ${r.card.jade} ${CURRENCY.premium.name}` : ''}`) : '');
    } else {
      sfx(p.kind === 'gold' || p.amount >= 100 && p.kind === 'jade' ? 'win' : 'coin');
      result.replaceChildren(h('p', { class: 'roul__won', style: `--c:${p.color}` }, p.kind === 'gold' ? '¡Ticket oro extra: gira otra vez!' : `¡+${p.label}!`));
    }
  }

  void (async () => {
    try {
      const s = await market.state();
      featured = s.featured;
      paintBar();
      renderSide();
    } catch (e) {
      wheelBox.replaceChildren(h('p', { class: 'warn-box' }, err(e)));
    }
  })();
  renderSide();
}

// =====================================================================
// Mercado de cartas
// =====================================================================

/** 6 cartas al azar que se compran con cacao. Se renuevan gratis cada día o con 25 tickets. */
export function renderCardMarket(root: HTMLElement, profile: Profile, go: (hash: string) => void, market: Market): void {
  const bar = h('div', { class: 'app-bar__wallets' });
  const head = h('div', { class: 'mkt__head panel' });
  const grid = h('section', { class: 'mkt__grid' });
  root.replaceChildren(appScreen({ cls: 'mkt', title: 'Mercado de cartas', back: () => go('#/'), right: bar }, head, grid));
  const paintBar = () => bar.replaceChildren(...wallets(profile));
  paintBar();
  grid.replaceChildren(h('p', { class: 'empty' }, 'Cargando…'));

  let shop: MarketState['shop'] | null = null;
  let busy = false;
  const msg = h('p', { class: 'shop__msg', role: 'status' });
  const clock = h('span', { class: 'mkt__clock' });
  const tick = () => {
    const ms = msToNextDay();
    const hh = Math.floor(ms / 3600_000), mm = Math.floor(ms / 60_000) % 60, ss = Math.floor(ms / 1000) % 60;
    clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    if (!document.body.contains(clock)) clearInterval(timer);
  };
  const timer = setInterval(tick, 1000);
  tick();

  async function run(fn: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    try { await fn(); msg.textContent = ''; } catch (e) { sfx('error'); msg.textContent = err(e); }
    busy = false;
    paintBar();
    render();
  }

  function render(): void {
    const tickets = profile.account?.tickets ?? null;
    const refresh = h('button', { class: 'big-btn', disabled: busy || (tickets !== null && tickets < SHOP_REFRESH_TICKETS) },
      `Cartas nuevas · ${market.local ? 'gratis' : `${SHOP_REFRESH_TICKETS} ${CURRENCY.ticket.icon}`}`);
    refresh.addEventListener('click', () => void run(async () => {
      if (!market.local && !confirm(`¿Cambiar las 6 cartas por ${SHOP_REFRESH_TICKETS} tickets?`)) return;
      shop = await market.refresh();
      sfx('draw');
    }));
    head.replaceChildren(
      h('div', { class: 'mkt__info' },
        h('p', {}, h('b', {}, 'Cada carta se compra una sola vez. '), 'Las UR no siempre aparecen.'),
        h('p', { class: 'mkt__prices' }, ...(['N', 'R', 'SR', 'UR'] as const).map(r => h('span', {}, rarityChip(r), ` ${SHOP_PRICES[r].toLocaleString('es-MX')} ${CURRENCY.common.icon}`))),
        h('p', { class: 'roul__hint' }, `Por lugar: N ${SHOP_ODDS.N}% · R ${SHOP_ODDS.R}% · SR ${SHOP_ODDS.SR}% · UR ${SHOP_ODDS.UR}%. Ganas 1 ${CURRENCY.ticket.icon} por cada duelo ganado y más en la ruleta.`)),
      h('div', { class: 'mkt__actions' },
        h('p', { class: 'mkt__free' }, 'Cartas nuevas gratis en ', clock),
        refresh,
        tickets !== null && tickets < SHOP_REFRESH_TICKETS ? h('small', { class: 'roul__hint' }, `Tienes ${tickets} ${CURRENCY.ticket.icon}`) : '',
        msg));

    if (!shop) return;
    grid.replaceChildren(...shop.slots.map((s, i) => {
      const card = cardDb.tryGet(s.card);
      if (!card) return h('div', { class: 'mkt__slot' }, '—');
      const have = owned(profile, card.id);
      const cacao = profile.account?.cacao ?? null;
      const full = have >= 3;
      const short = cacao !== null && cacao < s.price;
      const btn = h('button', { class: `big-btn${s.sold || full || short ? '' : ' big-btn--main'} mkt__buy`, disabled: busy || s.sold || full || short },
        s.sold ? 'Comprada ✓' : full ? 'Ya tienes 3' : market.local ? 'Llevar (gratis)' : `${s.price.toLocaleString('es-MX')} ${CURRENCY.common.icon}`);
      btn.addEventListener('click', () => void run(async () => {
        if (!market.local && !confirm(`¿Comprar ${card.name} por ${s.price.toLocaleString('es-MX')} de cacao?`)) return;
        shop = await market.buy(i);
        sfx(rarityOf(card) === 'UR' ? 'ritual' : 'coin');
      }));
      return h('article', { class: `mkt__slot mkt__slot--${rarityOf(card)}${s.sold ? ' mkt__slot--sold' : ''}` },
        h('div', { class: 'mkt__card' }, createCardElement(card, { level: levelOf(profile, card.id) })),
        h('p', { class: 'mkt__name' }, rarityChip(rarityOf(card)), ` ${card.name}`),
        h('small', { class: 'mkt__have' }, `${RARITY_LABEL[rarityOf(card)]} · tienes ${have}/3`),
        btn);
    }));
  }

  void (async () => {
    try { shop = (await market.state()).shop; } catch (e) { grid.replaceChildren(h('p', { class: 'warn-box' }, err(e))); return; }
    paintBar();
    render();
  })();
  render();
}
