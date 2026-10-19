import starterJson from '../data/starter.json';
import { cardDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { CARD_TAGS, DECK_SIZE, MAX_COPIES, RARITIES, RARITY_LABEL, rarityOf, type CardDef, type CardRarity, type CardType } from '../data/types.ts';
import { countIn, levelOf, owned, saveProfile, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { ASCEND_COPIES, EFFECT_BOOST_LEVEL, MAX_LEVEL, levelUpCost } from '../core/progression.ts';
import { CURRENCY } from '../game/config.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';
import { sfx } from './sound.ts';

const TYPE_LABEL: Record<CardType, string> = { monster: 'Monstruos', spell: 'Mágicas', equip: 'Equipos', trap: 'Trampas', ritual: 'Rituales' };
const TYPE_ORDER: CardType[] = ['monster', 'spell', 'equip', 'trap', 'ritual'];

/**
 * Armar mazo en tres paneles: el MOSTRADOR (la carta que estás viendo, siempre a la vista),
 * tu COLECCIÓN y tu MAZO. Tocar una carta la muestra; los botones + / − la meten o la sacan.
 * Doble clic en la colección también la agrega. Se guarda solo.
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
  const filters = { text: '', type: '' as '' | CardType, tag: '', rarity: '' as '' | CardRarity, sort: 'atk' as 'atk' | 'name' | 'id' | 'rarity' };
  let inspected: CardDef | null = null;

  const showcase = h('aside', { class: 'showcase', 'aria-label': 'Carta seleccionada', 'aria-live': 'polite' });
  const progress = h('p', { class: 'coll-progress' });
  const grid = h('div', { class: 'collection' });
  const deckPanel = h('aside', { class: 'deck-panel' });

  const changed = () => { save(profile); renderGrid(); renderDeck(); renderShowcase(); };
  const select = (c: CardDef) => { inspected = c; renderShowcase(); markSelected(); };

  const canAdd = (c: CardDef) => profile.deck.length < DECK_SIZE && countIn(profile.deck, c.id) < Math.min(MAX_COPIES, owned(profile, c.id));
  const whyNot = (c: CardDef) => countIn(profile.deck, c.id) >= MAX_COPIES ? `Máximo ${MAX_COPIES} copias en el mazo`
    : profile.deck.length >= DECK_SIZE ? `El mazo ya tiene ${DECK_SIZE}` : 'Ya usas todas tus copias';
  const add = (c: CardDef) => {
    if (!canAdd(c)) { sfx('error'); return; }
    profile.deck.push(c.id);
    sfx('click');
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

  // ---------------- filtros
  const search = h('input', { type: 'search', placeholder: 'Buscar carta…', 'aria-label': 'Buscar' });
  search.addEventListener('input', () => { filters.text = search.value; renderGrid(); });
  const typeSel = h('select', { 'aria-label': 'Tipo' },
    h('option', { value: '' }, 'Tipo: todos'),
    ...TYPE_ORDER.filter(t => t !== 'ritual').map(t => h('option', { value: t }, TYPE_LABEL[t])));
  typeSel.addEventListener('change', () => { filters.type = typeSel.value as '' | CardType; renderGrid(); });
  const raritySel = h('select', { 'aria-label': 'Rareza' },
    h('option', { value: '' }, 'Rareza: todas'), ...[...RARITIES].reverse().map(r => h('option', { value: r }, `${r} · ${RARITY_LABEL[r]}`)));
  raritySel.addEventListener('change', () => { filters.rarity = raritySel.value as '' | CardRarity; renderGrid(); });
  const tagSel = h('select', { 'aria-label': 'Etiqueta' },
    h('option', { value: '' }, 'Etiqueta: todas'), ...CARD_TAGS.map(t => h('option', { value: t }, t)));
  tagSel.addEventListener('change', () => { filters.tag = tagSel.value; renderGrid(); });
  const sortSel = h('select', { 'aria-label': 'Ordenar' },
    h('option', { value: 'atk' }, 'Orden: ATK'), h('option', { value: 'rarity' }, 'Orden: rareza'),
    h('option', { value: 'name' }, 'Orden: nombre'), h('option', { value: 'id' }, 'Orden: número'));
  sortSel.addEventListener('change', () => { filters.sort = sortSel.value as typeof filters.sort; renderGrid(); });

  root.replaceChildren(h('main', { class: 'screen screen--wide deck-screen' },
    h('header', { class: 'screen__head' },
      h('button', { class: 'link-btn', onclick: () => go('#/') }, '← Menú'),
      h('h1', {}, 'Mi mazo y colección'),
      h('button', { class: 'link-btn', onclick: () => go('#/libre') }, 'Duelo libre →'),
    ),
    h('p', { class: 'screen__hint' }, `Toca una carta para verla. Con + la metes al mazo y con − la sacas. Necesitas ${DECK_SIZE} cartas, máximo ${MAX_COPIES} copias de cada una.`),
    h('div', { class: 'builder3' },
      showcase,
      h('section', { class: 'coll-pane' },
        h('div', { class: 'filters' }, search, typeSel, raritySel, tagSel, sortSel),
        progress,
        grid),
      deckPanel),
  ));

  const RANK: Record<CardRarity, number> = { N: 0, R: 1, SR: 2, UR: 3 };
  function visibleCards(): CardDef[] {
    const q = filters.text.trim().toLowerCase();
    return cardDb.all()
      .filter(c => owned(profile, c.id) > 0)
      .filter(c => !filters.type || c.type === filters.type)
      .filter(c => !filters.rarity || rarityOf(c) === filters.rarity)
      .filter(c => !filters.tag || c.tags.includes(filters.tag as CardDef['tags'][number]))
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .sort((a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name)
        : filters.sort === 'id' ? a.id - b.id
        : filters.sort === 'rarity' ? RANK[rarityOf(b)] - RANK[rarityOf(a)] || b.atk - a.atk
        : b.atk - a.atk || a.id - b.id);
  }

  function renderProgress(): void {
    const all = cardDb.all().filter(c => c.type !== 'ritual');
    const have = all.filter(c => owned(profile, c.id) > 0);
    progress.replaceChildren(
      h('b', {}, `Colección ${have.length}/${all.length}`),
      ...[...RARITIES].reverse().map(r => h('span', { class: `rarity-chip rarity-chip--${r}`, title: RARITY_LABEL[r] },
        `${r} ${have.filter(c => rarityOf(c) === r).length}/${all.filter(c => rarityOf(c) === r).length}`)));
  }

  function renderGrid(): void {
    const cards = visibleCards();
    renderProgress();
    grid.replaceChildren(
      ...cards.map(c => {
        const have = owned(profile, c.id);
        const used = countIn(profile.deck, c.id);
        const ok = canAdd(c);
        const el = createCardElement(c, { level: levelOf(profile, c.id) });
        const plus = h('button', { class: 'coll-card__add', title: ok ? `Agregar ${c.name} al mazo` : whyNot(c), 'aria-label': `Agregar ${c.name}`, disabled: !ok }, '+');
        plus.addEventListener('click', e => { e.stopPropagation(); add(c); });
        const wrap = h('div', {
          class: `coll-card${used >= Math.min(MAX_COPIES, have) ? ' coll-card--used' : ''}${inspected?.id === c.id ? ' coll-card--sel' : ''}`,
          role: 'button', tabindex: '0', 'data-card': String(c.id), title: c.name,
        }, el,
          h('span', { class: `coll-card__count${c.ascendsTo && have >= ASCEND_COPIES ? ' coll-card__count--ready' : ''}`, title: 'En el mazo / tienes' }, `${used}/${have}`),
          plus);
        wrap.addEventListener('click', () => { sfx('click'); select(c); });
        wrap.addEventListener('dblclick', () => add(c));
        wrap.addEventListener('keydown', e => {
          const k = (e as KeyboardEvent).key;
          if (k === 'Enter' || k === ' ') { e.preventDefault(); select(c); }
          if (k === '+') add(c);
        });
        return wrap;
      }),
      cards.length ? '' : h('p', { class: 'screen__hint coll-empty' }, 'Ninguna carta coincide con el filtro.'),
    );
    if (!inspected && cards[0]) { inspected = cards[0]; renderShowcase(); }
  }

  function markSelected(): void {
    grid.querySelectorAll('.coll-card--sel').forEach(el => el.classList.remove('coll-card--sel'));
    if (inspected) grid.querySelector(`[data-card="${inspected.id}"]`)?.classList.add('coll-card--sel');
    deckPanel.querySelectorAll('.deck-row--sel').forEach(el => el.classList.remove('deck-row--sel'));
    if (inspected) deckPanel.querySelector(`[data-card="${inspected.id}"]`)?.classList.add('deck-row--sel');
  }

  /** El mostrador: siempre visible, no se pierde al bajar por la colección. */
  function renderShowcase(): void {
    if (!inspected) { showcase.replaceChildren(h('p', { class: 'screen__hint' }, 'Toca una carta para verla aquí.')); return; }
    const card = inspected;
    const level = levelOf(profile, card.id);
    const have = owned(profile, card.id);
    const used = countIn(profile.deck, card.id);
    const fx = describeEffects(card.effects);
    const addBtn = h('button', { class: 'big-btn big-btn--main showcase__btn', disabled: !canAdd(card), title: canAdd(card) ? '' : whyNot(card) }, '+ Al mazo');
    addBtn.addEventListener('click', () => add(card));
    const rmBtn = h('button', { class: 'big-btn showcase__btn', disabled: used === 0 }, '− Sacar');
    rmBtn.addEventListener('click', () => remove(card));
    showcase.replaceChildren(
      h('div', { class: 'showcase__card' }, createCardElement(card, { level })),
      h('div', { class: 'showcase__info' },
        h('h2', { class: 'showcase__name' }, card.name),
        h('p', { class: 'showcase__meta' },
          h('span', { class: `rarity-chip rarity-chip--${rarityOf(card)}` }, rarityOf(card)),
          ` ${RARITY_LABEL[rarityOf(card)]} · ${TYPE_LABEL[card.type].replace(/s$/, '').replace(/ee$/, 'e')}`,
          card.type === 'monster' ? ` · ${card.tags.join(' · ')}` : ''),
        h('p', { class: 'showcase__count' }, `En el mazo ${used}/${Math.min(MAX_COPIES, have)} · Tienes ${have}`),
        h('div', { class: 'showcase__actions' }, addBtn, rmBtn),
        h('p', { class: 'showcase__desc' }, card.description),
        fx ? h('p', { class: 'deck-inspector__fx' }, `Efecto: ${fx}${level >= EFFECT_BOOST_LEVEL ? ' (nivel 3+: 25% más fuerte)' : ''}`) : '',
        card.nahual ? h('p', { class: 'deck-inspector__fx' }, `🌙 Nahual: de noche es ${card.nahual.name} (${card.nahual.atk}/${card.nahual.def})`) : '',
        upgrades && have > 0 ? upgradePanel(card, level) : ''),
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

  function renderDeck(): void {
    const errors = validatePlayerDeck(profile, profile.deck, cardDb);
    const counts = new Map<number, number>();
    for (const id of profile.deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    const defs = [...counts.keys()].map(id => cardDb.get(id));
    const monsters = profile.deck.map(id => cardDb.get(id)).filter(c => c.type === 'monster');
    const avg = monsters.length ? Math.round(monsters.reduce((n, c) => n + c.atk, 0) / monsters.length) : 0;

    deckPanel.replaceChildren(
      h('h2', { class: `deck-panel__count${profile.deck.length === DECK_SIZE ? ' ok' : ''}` }, `Mazo ${profile.deck.length}/${DECK_SIZE}`),
      h('div', { class: 'deck-meter', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.min(100, profile.deck.length / DECK_SIZE * 100)}%` })),
      h('p', { class: 'deck-panel__stats' },
        `${monsters.length} monstruos · ${profile.deck.length - monsters.length} mágicas/trampas · ATK promedio ${avg}`),
      errors.length
        ? h('p', { class: 'deck-panel__error' }, errors[0])
        : h('p', { class: 'deck-panel__ok' }, '✓ Listo para jugar'),
      ...TYPE_ORDER.flatMap(type => {
        const group = defs.filter(c => c.type === type).sort((a, b) => b.atk - a.atk || a.name.localeCompare(b.name));
        if (!group.length) return [];
        return [
          h('h3', { class: 'deck-panel__group' }, `${TYPE_LABEL[type]} (${group.reduce((n, c) => n + counts.get(c.id)!, 0)})`),
          h('ul', { class: 'deck-list' }, ...group.map(c => {
            const minus = h('button', { class: 'deck-row__x', title: `Sacar una ${c.name}`, 'aria-label': `Sacar una ${c.name}` }, '−');
            minus.addEventListener('click', e => { e.stopPropagation(); remove(c); });
            const row = h('div', { class: `deck-row${inspected?.id === c.id ? ' deck-row--sel' : ''}`, role: 'button', tabindex: '0', 'data-card': String(c.id) },
              h('span', { class: 'deck-row__n' }, `×${counts.get(c.id)}`),
              h('span', { class: `rarity-dot rarity-dot--${rarityOf(c)}`, title: RARITY_LABEL[rarityOf(c)] }),
              h('span', { class: 'deck-row__name' }, c.name),
              h('span', { class: 'deck-row__atk' }, c.type === 'monster' ? String(c.atk) : ''),
              minus);
            row.addEventListener('click', () => { sfx('click'); select(c); });
            return h('li', {}, row);
          })),
        ];
      }),
      h('div', { class: 'deck-panel__actions' },
        h('button', { class: 'link-btn', onclick: () => { autoFill(); changed(); } }, 'Completar con las más fuertes'),
        h('button', { class: 'link-btn', onclick: () => {
          const starter = (starterJson as { cards: number[] }).cards;
          if (validatePlayerDeck(profile, starter, cardDb).length === 0 && confirm('¿Volver al mazo inicial?')) { profile.deck = [...starter]; changed(); }
        } }, 'Mazo inicial'),
        h('button', { class: 'link-btn', onclick: () => { if (confirm('¿Vaciar el mazo?')) { profile.deck = []; changed(); } } }, 'Vaciar'),
      ),
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

  renderGrid();
  renderDeck();
  renderShowcase();
}
