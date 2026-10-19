import starterJson from '../data/starter.json';
import { cardDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { DECK_SIZE, MAX_COPIES, RARITY_LABEL, rarityOf, type CardAttribute, type CardDef, type CardRarity, type CardType } from '../data/types.ts';
import { countIn, levelOf, owned, saveProfile, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { ASCEND_COPIES, EFFECT_BOOST_LEVEL, MAX_LEVEL, levelUpCost } from '../core/progression.ts';
import { CURRENCY } from '../game/config.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { sfx } from './sound.ts';
import { appScreen, markThumb, rarityChip, tabs, thumb, TYPE_TABS } from './shell.ts';

const TYPE_SHORT: Record<CardType, string> = { monster: 'Monstruo', spell: 'Mágica', equip: 'Equipo', trap: 'Trampa', ritual: 'Ritual' };
const ATTR_ICON: Record<CardAttribute, string> = { sol: '☀', viento: '🌀', agua: '💧', tierra: '⛰' };
type SortKey = 'atk' | 'def' | 'name' | 'rarity';
const TYPE_ORDER: CardType[] = ['monster', 'spell', 'equip', 'trap', 'ritual'];

/**
 * Editor de mazo en tres paneles: a la izquierda TUS CARTAS (lista con filtros), en medio el ALTAR
 * (la carta que estás viendo) y a la derecha TU MAZO como cartas. + mete, − saca. Se guarda solo.
 */
/** Subir de nivel y ascender (en la nube lo hace el servidor; en modo local, el navegador). */
export interface CardUpgrades {
  /** Cacao disponible; null = modo local (gratis para probar). */
  cacao(): number | null;
  levelUp(card: CardDef): Promise<void>;
  /** Devuelve la carta en la que ascendió. */
  ascend(card: CardDef): Promise<CardDef>;
}

export function renderDeckBuilder(
  root: HTMLElement, profile: Profile, go: (hash: string) => void,
  save: (p: Profile) => void = saveProfile,   // en la nube: guarda el mazo en Supabase
  upgrades?: CardUpgrades,
): void {
  const filters = { text: '', type: '' as '' | CardType, attr: '' as '' | CardAttribute, sort: 'atk' as SortKey };
  let inspected: CardDef | null = null;

  const showcase = h('section', { class: 'deck__altar panel', 'aria-label': 'Carta seleccionada', 'aria-live': 'polite' });
  const list = h('div', { class: 'catalog', role: 'list' });
  const progress = h('p', { class: 'catalog__progress' });
  const vault = h('section', { class: 'deck__vault panel' });

  const changed = () => { save(profile); renderList(); renderDeck(); renderShowcase(); };
  const select = (c: CardDef) => { inspected = c; renderShowcase(); markSelected(); };

  const canAdd = (c: CardDef) => profile.deck.length < DECK_SIZE && countIn(profile.deck, c.id) < Math.min(MAX_COPIES, owned(profile, c.id));
  const whyNot = (c: CardDef) => countIn(profile.deck, c.id) >= MAX_COPIES ? `Máximo ${MAX_COPIES} copias en el mazo`
    : profile.deck.length >= DECK_SIZE ? `El mazo ya tiene ${DECK_SIZE}` : 'Ya usas todas tus copias';
  const add = (c: CardDef) => {
    if (!canAdd(c)) { sfx('error'); return; }
    profile.deck.push(c.id);
    sfx('play');
    inspected = c;
    changed();
  };
  const remove = (c: CardDef) => {
    const i = profile.deck.lastIndexOf(c.id);
    if (i < 0) return;
    profile.deck.splice(i, 1);
    sfx('click');
    inspected = c;
    changed();
  };

  // ---------------- catálogo (izquierda)
  const search = h('input', { type: 'search', class: 'field', placeholder: 'Buscar nombre o efecto…', 'aria-label': 'Buscar' });
  search.addEventListener('input', () => { filters.text = search.value; renderList(); });
  const sortTabs = tabs<SortKey>([['atk', 'ATK'], ['def', 'DEF'], ['name', 'Nombre'], ['rarity', 'Rareza']], filters.sort,
    v => { filters.sort = v; renderList(); }, 'tabs--small');
  const typeTabs = tabs<'' | CardType>(TYPE_TABS.map(([v, t]) => [v, t === 'Todas' ? 'Todo' : t] as ['' | CardType, string]), filters.type,
    v => { filters.type = v; renderList(); }, 'tabs--small');
  const attrTabs = tabs<'' | CardAttribute>([['', 'Todos'], ...(Object.keys(ATTR_ICON) as CardAttribute[]).map(a => [a, `${ATTR_ICON[a]}`] as ['' | CardAttribute, string])],
    filters.attr, v => { filters.attr = v; renderList(); }, 'tabs--small tabs--icons');

  root.replaceChildren(appScreen({ cls: 'deck', title: 'Editor de mazo', back: () => go('#/'), profile,
    right: h('button', { class: 'app-bar__link', onclick: () => go('#/libre') }, 'Duelo libre') },
    h('section', { class: 'deck__catalog panel' },
      h('header', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, 'Tus cartas'), progress),
      search, sortTabs, typeTabs, attrTabs,
      list),
    showcase,
    vault));

  const RANK: Record<CardRarity, number> = { N: 0, R: 1, SR: 2, UR: 3 };
  function visibleCards(): CardDef[] {
    const q = filters.text.trim().toLowerCase();
    return cardDb.all()
      .filter(c => owned(profile, c.id) > 0)
      .filter(c => !filters.type || c.type === filters.type)
      .filter(c => !filters.attr || c.attribute === filters.attr)
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || describeEffects(c.effects).toLowerCase().includes(q))
      .sort((a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name)
        : filters.sort === 'def' ? b.def - a.def || a.id - b.id
        : filters.sort === 'rarity' ? RANK[rarityOf(b)] - RANK[rarityOf(a)] || b.atk - a.atk
        : (a.type === 'monster' ? 0 : 1) - (b.type === 'monster' ? 0 : 1) || b.atk - a.atk || a.id - b.id);
  }

  function renderList(): void {
    const all = cardDb.all();
    progress.textContent = `Colección ${all.filter(c => owned(profile, c.id) > 0).length}/${all.length}`;
    const cards = visibleCards();
    list.replaceChildren(
      ...cards.map(c => {
        const have = owned(profile, c.id);
        const used = countIn(profile.deck, c.id);
        const ok = canAdd(c);
        const plus = h('button', { class: 'cat-row__add', title: ok ? `Agregar ${c.name} al mazo` : whyNot(c), 'aria-label': `Agregar ${c.name}`, disabled: !ok }, '+');
        plus.addEventListener('click', e => { e.stopPropagation(); add(c); });
        const row = h('div', {
          class: `cat-row cat-row--${rarityOf(c)}${used >= Math.min(MAX_COPIES, have) ? ' cat-row--used' : ''}${inspected?.id === c.id ? ' cat-row--sel' : ''}`,
          role: 'listitem', tabindex: '0', 'data-card': String(c.id),
        },
          h('span', { class: `rarity-dot rarity-dot--${rarityOf(c)}`, title: RARITY_LABEL[rarityOf(c)] }),
          h('span', { class: 'cat-row__name' }, c.name, levelOf(profile, c.id) > 1 ? h('small', { class: 'cat-row__lv' }, ` Nv${levelOf(profile, c.id)}`) : ''),
          h('span', { class: 'cat-row__attr', title: c.attribute }, ATTR_ICON[c.attribute]),
          h('span', { class: 'cat-row__stat' }, c.type === 'monster' ? String(filters.sort === 'def' ? c.def : c.atk) : TYPE_SHORT[c.type]),
          h('span', { class: `cat-row__count${c.ascendsTo && have >= ASCEND_COPIES ? ' cat-row__count--ready' : ''}`, title: 'En el mazo / tienes' }, `${used}/${have}`),
          plus);
        row.addEventListener('click', () => { sfx('click'); select(c); });
        row.addEventListener('dblclick', () => add(c));
        row.addEventListener('keydown', e => {
          const k = (e as KeyboardEvent).key;
          if (k === 'Enter' || k === ' ') { e.preventDefault(); select(c); }
          if (k === '+') add(c);
          if (k === '-') remove(c);
        });
        return row;
      }),
      cards.length ? '' : h('p', { class: 'empty' }, 'Ninguna carta coincide con el filtro.'),
    );
    if (!inspected && cards[0]) { inspected = cards[0]; renderShowcase(); }
  }

  function markSelected(): void {
    list.querySelectorAll('.cat-row--sel').forEach(el => el.classList.remove('cat-row--sel'));
    if (inspected) list.querySelector(`[data-card="${inspected.id}"]`)?.classList.add('cat-row--sel');
    markThumb(vault, inspected?.id);
  }

  /** El altar: la carta que estás viendo, siempre en el centro. */
  function renderShowcase(): void {
    if (!inspected) { showcase.replaceChildren(h('p', { class: 'empty' }, 'Toca una carta para verla aquí.')); return; }
    const card = inspected;
    const level = levelOf(profile, card.id);
    const have = owned(profile, card.id);
    const used = countIn(profile.deck, card.id);
    const fx = describeEffects(card.effects);
    const addBtn = h('button', { class: 'big-btn big-btn--main altar__btn', disabled: !canAdd(card), title: canAdd(card) ? '' : whyNot(card) }, '+ Al mazo');
    addBtn.addEventListener('click', () => add(card));
    const rmBtn = h('button', { class: 'big-btn altar__btn', disabled: used === 0 }, '− Sacar');
    rmBtn.addEventListener('click', () => remove(card));
    showcase.replaceChildren(
      h('p', { class: 'altar__label' }, '✦ Altar de la carta ✦'),
      h('div', { class: `altar altar--${rarityOf(card)}` }, createCardElement(card, { level })),
      h('h2', { class: 'detail__name' }, card.name),
      h('p', { class: 'detail__meta' }, rarityChip(rarityOf(card)), ` ${TYPE_SHORT[card.type]} · ${ATTR_ICON[card.attribute]} ${card.attribute}`),
      card.type === 'monster' ? h('div', { class: 'detail__stats' }, h('span', {}, `ATK ${card.atk}`), h('span', {}, `DEF ${card.def}`)) : '',
      h('div', { class: 'altar__actions' }, addBtn, rmBtn),
      h('p', { class: 'altar__count' }, `En el mazo ${used}/${Math.min(MAX_COPIES, have)} · Tienes ${have}`),
      h('div', { class: 'detail__box' },
        fx ? h('p', { class: 'detail__fx' }, h('b', {}, 'Efecto: '), fx, level >= EFFECT_BOOST_LEVEL ? ' (nivel 3+: 25% más fuerte)' : '') : '',
        card.nahual ? h('p', { class: 'detail__fx' }, `🌙 Nahual: de noche es ${card.nahual.name} (${card.nahual.atk}/${card.nahual.def})`) : '',
        h('p', { class: 'detail__desc' }, card.description),
        card.type === 'monster' && card.tags.length ? h('p', { class: 'detail__tags' }, card.tags.join(' · ')) : ''),
      upgrades && have > 0 ? upgradePanel(card, level) : '',
    );
  }

  /** Nivel con cacao y ascensión de la carta que estás viendo. */
  function upgradePanel(card: CardDef, level: number): HTMLElement {
    const box = h('div', { class: 'upgrade' });
    const msg = h('p', { class: 'upgrade__msg', role: 'status' });
    const busy = (on: boolean) => box.querySelectorAll('button').forEach(b => { (b as HTMLButtonElement).disabled = on || b.dataset.off === '1'; });
    const run = async (fn: () => Promise<void>) => {
      busy(true); msg.textContent = 'Un momento…';
      try { await fn(); } catch (e) { sfx('error'); msg.textContent = e instanceof Error ? e.message : String(e); busy(false); }
    };

    // Nivel
    const stars = '★'.repeat(level) + '☆'.repeat(MAX_LEVEL - level);
    const cost = levelUpCost(card, level);
    const cacao = upgrades!.cacao();
    const short = cost !== null && cacao !== null && cacao < cost;
    const lvBtn = h('button', { class: 'big-btn upgrade__btn', 'data-off': cost === null || short ? '1' : '0' },
      cost === null ? 'Nivel máximo' : `Subir a nivel ${level + 1} · ${cacao === null ? 'gratis (modo local)' : `${CURRENCY.common.icon} ${cost}`}`);
    lvBtn.disabled = cost === null || short;
    lvBtn.addEventListener('click', () => run(async () => {
      await upgrades!.levelUp(card);
      sfx('level');
      changed();
    }));
    box.append(
      h('p', { class: 'upgrade__level' }, h('span', { class: 'upgrade__stars' }, stars), ` Nivel ${level}`,
        card.type === 'monster' && level > 1 ? h('small', {}, ` (+${(level - 1) * 100} ATK/DEF)`) : ''),
      lvBtn,
      short ? h('small', { class: 'upgrade__hint' }, `Te faltan ${cost! - cacao!} de cacao. Gana duelos para conseguir más.`) : '',
    );

    // Ascensión
    const result = card.ascendsTo ? cardDb.tryGet(card.ascendsTo) : undefined;
    if (result) {
      const have = owned(profile, card.id);
      const ready = have >= ASCEND_COPIES;
      const asBtn = h('button', { class: `big-btn upgrade__btn${ready ? ' big-btn--main' : ''}`, 'data-off': ready ? '0' : '1' },
        ready ? '✺ Ascender' : `Ascender (${have}/${ASCEND_COPIES} copias)`);
      asBtn.disabled = !ready;
      asBtn.addEventListener('click', () => {
        const totalAfter = Object.values(profile.collection).reduce((n, x) => n + x, 0) - ASCEND_COPIES + 1;
        const warn = totalAfter < DECK_SIZE ? `\n\nOjo: te quedarán ${totalAfter} cartas en total y el mazo necesita ${DECK_SIZE}. Tendrás que ganar más cartas para volver a jugar.` : '';
        if (!confirm(`Se gastarán tus ${ASCEND_COPIES} copias de ${card.name} para obtener 1 ${result.name}. ¿Continuar?${warn}`)) return;
        void run(async () => {
          const got = await upgrades!.ascend(card);
          inspected = got;
          changed();
          showAscension(card, got);
        });
      });
      box.append(
        h('div', { class: 'upgrade__ascend' },
          h('p', {}, `Asciende a: `, h('b', {}, result.name), ` (${result.atk}/${result.def})`),
          h('div', { class: 'upgrade__mini' }, createCardElement(result)),
          asBtn));
    }
    box.append(msg);
    return box;
  }

  /** Animación del ritual: 3 copias se juntan y aparece la carta ascendida. */
  function showAscension(from: CardDef, to: CardDef): void {
    const copies = [0, 1, 2].map(i => { const el = createCardElement(from); el.classList.add('ritual__copy', `ritual__copy--${i}`); return el; });
    const result = createCardElement(to);
    result.classList.add('ritual__result');
    const overlay = h('div', { class: 'ritual', role: 'dialog', 'aria-label': 'Ascensión' },
      h('div', { class: 'ritual__stage' }, ...copies, h('div', { class: 'ritual__flash' }), result),
      h('p', { class: 'ritual__title' }, '¡Ascensión!'),
      h('p', { class: 'ritual__name' }, `${from.name} → ${to.name}`),
      h('button', { class: 'big-btn big-btn--main ritual__ok' }, 'Continuar'));
    const close = () => overlay.remove();
    overlay.querySelector('.ritual__ok')!.addEventListener('click', close);
    overlay.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') close(); });
    document.body.append(overlay);
    sfx('ritual');
    (overlay.querySelector('.ritual__ok') as HTMLButtonElement).focus();
  }

  /** La bóveda: tu mazo como cartas (derecha). */
  function renderDeck(): void {
    const errors = validatePlayerDeck(profile, profile.deck, cardDb);
    const defs = profile.deck.map(id => cardDb.get(id))
      .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || b.atk - a.atk || a.id - b.id);
    const byType = (t: CardType) => defs.filter(c => c.type === t).length;
    const monsters = defs.filter(c => c.type === 'monster');
    const avg = monsters.length ? Math.round(monsters.reduce((n, c) => n + c.atk, 0) / monsters.length) : 0;
    const full = profile.deck.length === DECK_SIZE;

    vault.replaceChildren(
      h('header', { class: 'panel__head' },
        h('h2', { class: 'panel__title' }, 'Tu mazo'),
        h('span', { class: `vault__count${full ? ' ok' : ''}` }, `${profile.deck.length}/${DECK_SIZE}`)),
      h('div', { class: 'meter' }, h('span', { style: `width:${Math.min(100, profile.deck.length / DECK_SIZE * 100)}%` })),
      h('p', { class: 'vault__stats' },
        h('span', { title: 'Monstruos' }, `M ${byType('monster')}`), h('span', { title: 'Mágicas' }, `S ${byType('spell')}`),
        h('span', { title: 'Equipos' }, `E ${byType('equip')}`), h('span', { title: 'Trampas' }, `T ${byType('trap')}`),
        h('span', { title: 'ATK promedio de tus monstruos' }, `ATK ⌀ ${avg}`)),
      errors.length ? h('p', { class: 'vault__error' }, errors[0]) : h('p', { class: 'vault__ok' }, '✓ Listo para jugar'),
      h('div', { class: 'vault__grid' }, ...defs.map(c => {
        const t = thumb(c, { level: levelOf(profile, c.id), selected: inspected?.id === c.id, onClick: () => select(c) });
        const x = h('span', { class: 'thumb__x', role: 'button', title: `Sacar una ${c.name}`, 'aria-label': `Sacar una ${c.name}` }, '−');
        x.addEventListener('click', e => { e.stopPropagation(); remove(c); });
        t.append(x);
        return t;
      })),
      profile.deck.length ? '' : h('p', { class: 'empty' }, 'Tu mazo está vacío. Toca + en tus cartas para agregarlas.'),
      h('div', { class: 'vault__actions' },
        h('button', { class: 'chip-btn', onclick: () => { autoFill(); changed(); } }, 'Completar'),
        h('button', { class: 'chip-btn', onclick: () => {
          const starter = (starterJson as { cards: number[] }).cards;
          if (validatePlayerDeck(profile, starter, cardDb).length === 0 && confirm('¿Volver al mazo inicial?')) { profile.deck = [...starter]; changed(); }
        } }, 'Mazo inicial'),
        h('button', { class: 'chip-btn', onclick: () => { if (confirm('¿Vaciar el mazo?')) { profile.deck = []; changed(); } } }, 'Vaciar')),
    );
  }

  /** Rellena hasta 40 con tus monstruos más fuertes y luego mágicas/trampas. */
  function autoFill(): void {
    const pool = cardDb.all()
      .filter(c => owned(profile, c.id) > 0)
      .sort((a, b) => (a.type === 'monster' ? 0 : 1) - (b.type === 'monster' ? 0 : 1) || b.atk - a.atk);
    let changedSomething = true;
    while (profile.deck.length < DECK_SIZE && changedSomething) {
      changedSomething = false;
      for (const c of pool) {
        if (profile.deck.length >= DECK_SIZE) break;
        if (countIn(profile.deck, c.id) < Math.min(MAX_COPIES, owned(profile, c.id))) {
          profile.deck.push(c.id);
          changedSomething = true;
        }
      }
    }
  }

  renderList();
  renderDeck();
  renderShowcase();
}
