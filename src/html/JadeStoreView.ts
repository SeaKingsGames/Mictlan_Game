import { cardDb } from '../data/index.ts';
import { rarityOf } from '../data/types.ts';
import { CURRENCY } from '../game/config.ts';
import { FIRST_PURCHASE_MULTIPLIER, formatMxn, getJadePackage, JADE_PACKAGES, normalizeCode, isPlausibleCode, type JadePackage } from '../game/jadeStore.ts';
import { levelOf, type Profile } from '../game/profile.ts';
import {
  applyCards, applyWallet, checkOrder, forgetOrder, listOrders, redeemCode, rememberedOrder, rememberOrder, startCheckout, type JadeOrder, type Rewards,
} from '../net/payments.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { appScreen, wallets } from './shell.ts';
import { sfx } from './sound.ts';

const JADE = CURRENCY.premium.icon;
const GOLD = CURRENCY.gold.icon;
const n = (x: number) => x.toLocaleString('es-MX');
const err = (e: unknown) => (e instanceof Error ? e.message : String(e));
const TERMS_URL = '/terminos';

/**
 * Tienda de jade (dinero real, Mercado Pago) y "Canjear código".
 *   #/jade         la tienda
 *   #/jade/<id>    regreso de Mercado Pago: confirma el pago y muestra lo que llegó
 * Devuelve una función para limpiar (deja de preguntar por el pago al salir).
 */
export function renderJadeStore(root: HTMLElement, profile: Profile, go: (hash: string) => void, cloud: boolean, orderId?: string): () => void {
  const acc = profile.account;
  const guest = !!acc?.guest;
  const bar = h('div', { class: 'app-bar__wallets' });
  const grid = h('div', { class: 'jpacks' });
  const checkout = h('div', { class: 'jade__checkout' });
  const redeemBox = h('div', { class: 'jade__redeem' });
  const ordersBox = h('div', { class: 'jade__orders' });
  root.replaceChildren(appScreen({ cls: 'jade', title: 'Tienda de Jade', back: () => go('#/'), right: bar },
    h('section', { class: 'jade__packs panel' },
      h('div', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, `${JADE} Paquetes de jade`), h('span', { class: 'panel__count' }, 'Precios finales en pesos mexicanos')),
      grid),
    h('aside', { class: 'jade__side panel' }, checkout, redeemBox, ordersBox)));

  let selected: JadePackage = JADE_PACKAGES.find(p => p.ur > 0) ?? JADE_PACKAGES[0];
  let gift = false;
  let firstDone = new Set<string>();
  let orders: JadeOrder[] = [];
  let busy = false;
  let alive = true;
  let poll: ReturnType<typeof setTimeout> | undefined;

  const paintBar = () => bar.replaceChildren(...wallets(profile));
  const isFirst = (p: JadePackage) => cloud && !guest && !firstDone.has(p.id);

  // ------------------------------------------------------------ paquetes
  function renderGrid(): void {
    grid.replaceChildren(...JADE_PACKAGES.map(p => {
      const b = h('button', { class: `jpack${p.id === selected.id ? ' jpack--on' : ''}`, style: `--c:${p.color}`, 'aria-pressed': p.id === selected.id },
        h('div', { class: 'jpack__art' },
          h('span', { class: 'jpack__crimp', 'aria-hidden': 'true' }),
          p.ur ? h('span', { class: 'jpack__ur' }, `${p.ur} UR`) : '',
          h('span', { class: 'jpack__glyph', 'aria-hidden': 'true' }, p.glyph),
          h('span', { class: 'jpack__name' }, p.name)),
        h('b', { class: 'jpack__price' }, formatMxn(p.price).replace(' MXN', '')),
        h('span', { class: 'jpack__jade' }, `${JADE} ${n(p.jade)}`, isFirst(p) ? h('em', { class: 'jpack__x2' }, `×${FIRST_PURCHASE_MULTIPLIER}`) : ''),
        p.gold ? h('small', { class: 'jpack__gold' }, `+${p.gold} ${GOLD}`) : h('small', { class: 'jpack__gold' }, ' '));
      b.addEventListener('click', () => { sfx('click'); selected = p; renderGrid(); renderCheckout(); });
      return b;
    }));
  }

  // ------------------------------------------------------------ pagar
  function renderCheckout(): void {
    const p = selected;
    const first = isFirst(p) && !gift;
    const jade = p.jade * (first ? FIRST_PURCHASE_MULTIPLIER : 1);
    const items = [
      h('li', {}, h('b', {}, `${JADE} ${n(jade)} jade`), first ? h('span', { class: 'jade__x2' }, ` doble por ser tu primera compra de este paquete`) : ''),
      p.ur ? h('li', {}, h('b', {}, `${p.ur} carta${p.ur > 1 ? 's' : ''} UR`), ' al azar (primero las que no tienes)') : '',
      p.gold ? h('li', {}, h('b', {}, `${p.gold} ${GOLD} ticket${p.gold > 1 ? 's' : ''} oro`), ` (${p.gold} giro${p.gold > 1 ? 's' : ''} de ruleta)`) : '',
    ];
    let action: Node;
    if (!cloud) {
      action = h('p', { class: 'warn-box' }, 'La tienda de jade solo funciona en la versión en línea del juego.');
    } else if (guest) {
      action = h('div', { class: 'jade__guest' },
        h('p', {}, 'Para comprar necesitas guardar tu cuenta con correo y contraseña. Así no pierdes lo que compres.'),
        h('button', { class: 'big-btn big-btn--main', onclick: () => go('#/cuenta') }, 'Guardar mi cuenta'));
    } else {
      const giftBox = h('input', { type: 'checkbox', checked: gift });
      giftBox.addEventListener('change', () => { gift = giftBox.checked; renderCheckout(); });
      const pay = h('button', { class: 'big-btn big-btn--main jade__pay', disabled: busy }, busy ? 'Abriendo Mercado Pago…' : `Pagar ${formatMxn(p.price)}`);
      pay.addEventListener('click', () => void buy());
      action = h('div', { class: 'jade__actions' },
        h('label', { class: 'jade__gift' }, giftBox, h('span', {}, '🎁 Es para regalar', h('small', {}, 'Recibes un código para dárselo a quien quieras (sin doble jade).'))),
        pay,
        h('p', { class: 'jade__fine' }, 'Pagas en Mercado Pago: tarjeta, saldo o efectivo en OXXO. Al comprar aceptas los ',
          h('a', { href: TERMS_URL, target: '_blank', rel: 'noopener' }, 'términos de compra'), '. Si eres menor de edad, pide permiso a tus papás.'));
    }
    checkout.replaceChildren(
      h('div', { class: 'jade__sel', style: `--c:${p.color}` },
        h('span', { class: 'jade__sel-glyph', 'aria-hidden': 'true' }, p.glyph),
        h('div', {}, h('h2', { class: 'jade__sel-name' }, p.name), h('b', { class: 'jade__sel-price' }, formatMxn(p.price)))),
      h('ul', { class: 'jade__gets' }, ...items),
      h('p', { class: 'jade__msg', role: 'status' }),
      action);
  }

  async function buy(): Promise<void> {
    if (busy) return;
    busy = true; renderCheckout();
    try {
      const r = await startCheckout(selected.id, gift);
      rememberOrder(r.orderId);
      sfx('coin');
      location.href = r.url;    // a Mercado Pago; regresa a ?pedido=<id>
    } catch (e) {
      busy = false; renderCheckout();
      sfx('error');
      const m = checkout.querySelector('.jade__msg');
      if (m) m.textContent = err(e);
    }
  }

  // ------------------------------------------------------------ canjear código
  function renderRedeem(): void {
    const input = h('input', { class: 'field jade__code', placeholder: 'QS-XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, maxlength: 24 });
    const btn = h('button', { class: 'big-btn' }, 'Canjear');
    const msg = h('p', { class: 'jade__msg', role: 'status' });
    const go2 = async () => {
      const code = normalizeCode(input.value);
      if (!isPlausibleCode(code)) { sfx('error'); msg.textContent = 'Escribe el código completo.'; return; }
      btn.disabled = true; msg.textContent = 'Canjeando…';
      try {
        const r = await redeemCode(code);
        applyWallet(profile, r.wallet);
        applyCards(profile, r.rewards.cards);
        paintBar();
        input.value = ''; msg.textContent = '';
        showRewards(`Canjeaste ${code}`, r.rewards);
      } catch (e) { sfx('error'); msg.textContent = err(e); }
      btn.disabled = false;
    };
    btn.addEventListener('click', () => void go2());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') void go2(); });
    redeemBox.replaceChildren(
      h('h3', { class: 'detail__sub' }, '🎁 Canjear código'),
      cloud ? h('div', { class: 'jade__code-row' }, input, btn) : h('p', { class: 'empty' }, 'Solo en la versión en línea.'),
      msg);
  }

  // ------------------------------------------------------------ mis compras
  function renderOrders(): void {
    if (!cloud || guest) { ordersBox.replaceChildren(); return; }
    const rows = orders.map(o => {
      const p = getJadePackage(o.packageId);
      const st = o.status === 'paid' ? ['ok', o.gift ? 'Regalo listo' : 'Entregado']
        : o.status === 'refunded' ? ['bad', 'Reembolsado']
        : o.mpStatus === 'pending' || o.mpStatus === 'in_process' ? ['wait', 'Pago pendiente']
        : o.mpStatus === 'rejected' ? ['bad', 'Rechazado']
        : ['wait', 'Sin pagar'];
      const code = o.code && o.status === 'paid' ? codeChip(o.code) : '';
      const recheck = o.status === 'pending'
        ? h('button', { class: 'chip-btn', onclick: () => go(`#/jade/${o.id}`) }, 'Revisar')
        : '';
      return h('li', { class: 'jorder' },
        h('div', { class: 'jorder__main' },
          h('b', {}, `${p?.glyph ?? JADE} ${p?.name ?? o.packageId}${o.gift ? ' 🎁' : ''}`),
          h('small', {}, `${new Date(o.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${formatMxn(o.price)}`)),
        h('span', { class: `jorder__st jorder__st--${st[0]}` }, st[1]), recheck, code);
    });
    ordersBox.replaceChildren(
      h('h3', { class: 'detail__sub' }, 'Mis compras'),
      rows.length ? h('ul', { class: 'jorders' }, ...rows) : h('p', { class: 'jade__fine' }, 'Aquí aparecen tus compras y los códigos de regalo.'));
  }

  function codeChip(code: string): HTMLElement {
    const b = h('button', { class: 'jcode', title: 'Copiar' }, code, h('small', {}, 'copiar'));
    b.addEventListener('click', () => {
      void navigator.clipboard?.writeText(code).then(() => { b.querySelector('small')!.textContent = '¡copiado!'; }, () => undefined);
    });
    return b;
  }

  // ------------------------------------------------------------ overlay (pago y premios)
  function overlay(...children: (Node | string)[]): HTMLElement {
    document.querySelector('.opening.jade-ov')?.remove();
    const ov = h('div', { class: 'opening jade-ov', role: 'dialog', 'aria-modal': 'true' }, ...children);
    document.body.append(ov);
    return ov;
  }
  const closeOverlay = () => document.querySelector('.opening.jade-ov')?.remove();

  function showRewards(title: string, r: Rewards, code?: string | null): void {
    sfx('level');
    const cards = r.cards.map(c => {
      const def = cardDb.tryGet(c.id);
      if (!def) return '';
      return h('div', { class: 'jreward__card' },
        h('div', { class: `altar altar--${rarityOf(def)}` }, createCardElement(def, { level: levelOf(profile, def.id) })),
        c.converted ? h('small', {}, `Ya tenías 3: +${c.cacao ?? 0} ${CURRENCY.common.icon} +${c.jade ?? 0} ${JADE}`) : h('small', {}, '¡Nueva en tu colección!'));
    });
    const giftBlock = code ? h('div', { class: 'jreward__gift' },
      h('p', {}, 'Tu código de regalo:'),
      codeChip(code),
      typeof navigator.share === 'function'
        ? h('button', { class: 'big-btn', onclick: () => void navigator.share({ text: `Te regalo jade para Cartas del Quinto Sol 🎁 Canjéalo en la Tienda de Jade → Canjear código: ${code}` }).catch(() => undefined) }, 'Compartir')
        : '',
      h('small', {}, 'Quien lo reciba lo canjea en Tienda de Jade → Canjear código. También lo ves en "Mis compras".')) : '';
    overlay(
      h('h2', { class: 'opening__title' }, title),
      code ? '' : h('div', { class: 'jreward__coins' },
        r.jade ? h('b', {}, `+${n(r.jade)} ${JADE}`) : '',
        r.gold ? h('b', { class: 'jreward__gold' }, `+${r.gold} ${GOLD}`) : ''),
      code ? h('p', { class: 'opening__hint' }, `Incluye ${n(r.jade)} ${JADE}${r.ur ? ` · ${r.ur} UR` : ''}${r.gold ? ` · ${r.gold} ${GOLD}` : ''}`) : '',
      giftBlock,
      cards.length ? h('div', { class: 'jreward__cards' }, ...cards) : '',
      h('div', { class: 'opening__actions' }, h('button', { class: 'big-btn big-btn--main', onclick: () => { closeOverlay(); } }, 'Continuar')));
  }

  async function confirmOrder(id: string): Promise<void> {
    const status = h('p', { class: 'opening__hint' }, 'Esto tarda unos segundos.');
    overlay(h('div', { class: 'jade-spin', 'aria-hidden': 'true' }, JADE), h('h2', { class: 'opening__title' }, 'Confirmando tu pago…'), status,
      h('div', { class: 'opening__actions' }, h('button', { class: 'big-btn', onclick: () => { stopPoll(); closeOverlay(); go('#/jade'); } }, 'Cerrar')));
    let tries = 0;
    const tick = async (): Promise<void> => {
      if (!alive) return;
      tries++;
      let r: { order: JadeOrder; wallet: { cacao: number; jade: number; tickets: number; gold: number } };
      try { r = await checkOrder(id); } catch (e) {
        status.textContent = err(e);
        if (tries < 3) poll = setTimeout(() => void tick(), 3000);
        return;
      }
      if (!alive) return;
      const o = r.order;
      if (o.status === 'paid') {
        forgetOrder();
        applyWallet(profile, r.wallet);
        if (!o.gift) applyCards(profile, o.rewards?.cards);
        paintBar();
        await refreshOrders();
        const pkg = getJadePackage(o.packageId);
        showRewards(o.gift ? '¡Tu regalo está listo!' : `¡Gracias! Llegó tu ${pkg?.name ?? 'compra'}`, o.rewards ?? { jade: 0, gold: 0, ur: 0, cards: [] }, o.gift ? o.code : null);
        window.history.replaceState(null, '', '#/jade');
        return;
      }
      if (o.status === 'refunded') { status.textContent = 'Este pago fue reembolsado.'; return; }
      if (o.mpStatus === 'rejected' || o.mpStatus === 'cancelled') {
        forgetOrder();
        overlay(h('h2', { class: 'opening__title' }, 'El pago no pasó'),
          h('p', { class: 'opening__hint' }, 'Mercado Pago rechazó el pago. No se te cobró. Puedes intentar con otra tarjeta o pagar en OXXO.'),
          h('div', { class: 'opening__actions' }, h('button', { class: 'big-btn big-btn--main', onclick: () => { closeOverlay(); go('#/jade'); } }, 'Volver a la tienda')));
        return;
      }
      if ((o.mpStatus === 'pending' || o.mpStatus === 'in_process') && tries >= 3) {
        overlay(h('h2', { class: 'opening__title' }, 'Pago pendiente'),
          h('p', { class: 'opening__hint' }, 'Si elegiste pagar en OXXO o en efectivo, tu jade llega solo cuando Mercado Pago confirme el pago (puede tardar unas horas). Lo verás en "Mis compras".'),
          h('div', { class: 'opening__actions' }, h('button', { class: 'big-btn big-btn--main', onclick: () => { closeOverlay(); go('#/jade'); } }, 'Entendido')));
        return;
      }
      if (tries >= 20) {
        overlay(h('h2', { class: 'opening__title' }, 'Todavía no vemos tu pago'),
          h('p', { class: 'opening__hint' }, 'Si ya pagaste, en cuanto Mercado Pago nos avise te llega solo. Puedes revisarlo en "Mis compras". Si no pagaste, no se te cobró nada.'),
          h('div', { class: 'opening__actions' }, h('button', { class: 'big-btn big-btn--main', onclick: () => { closeOverlay(); go('#/jade'); } }, 'Entendido')));
        return;
      }
      status.textContent = tries > 4 ? 'Seguimos esperando la confirmación de Mercado Pago…' : 'Esto tarda unos segundos.';
      poll = setTimeout(() => void tick(), 3000);
    };
    await tick();
  }
  const stopPoll = () => { clearTimeout(poll); poll = undefined; };

  async function refreshOrders(): Promise<void> {
    if (!cloud || guest) return;
    try {
      const r = await listOrders();
      orders = r.orders;
      firstDone = new Set(r.firstDone);
    } catch { /* sin conexión: se queda lo que había */ }
    if (!alive) return;
    renderGrid(); renderCheckout(); renderOrders();
  }

  paintBar(); renderGrid(); renderCheckout(); renderRedeem(); renderOrders();
  void refreshOrders();
  if (orderId && cloud) void confirmOrder(orderId);
  else if (cloud && !guest) void quietCheck();

  /**
   * Si fuiste a pagar y Mercado Pago no te regresó al juego (pasa a veces en la app instalada),
   * al volver a la tienda se revisa ese pedido una vez, sin estorbar.
   */
  async function quietCheck(): Promise<void> {
    const id = rememberedOrder();
    if (!id) return;
    try {
      const r = await checkOrder(id);
      if (!alive) return;
      if (r.order.status === 'paid' || r.order.mpStatus === 'rejected') { forgetOrder(); }
      if (r.order.status === 'paid') {
        applyWallet(profile, r.wallet);
        if (!r.order.gift) applyCards(profile, r.order.rewards?.cards);
        paintBar();
        await refreshOrders();
        showRewards(r.order.gift ? '¡Tu regalo está listo!' : '¡Llegó tu compra!', r.order.rewards ?? { jade: 0, gold: 0, ur: 0, cards: [] }, r.order.gift ? r.order.code : null);
      } else if (Date.now() - Date.parse(r.order.createdAt) > 86400_000) forgetOrder();
    } catch { forgetOrder(); }
  }

  return () => { alive = false; stopPoll(); closeOverlay(); };
}
