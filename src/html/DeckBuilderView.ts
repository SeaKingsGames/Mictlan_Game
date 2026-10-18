import starterJson from '../data/starter.json';
import { cardDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { CARD_TAGS, DECK_SIZE, MAX_COPIES, type CardDef, type CardType } from '../data/types.ts';
import { countIn, levelOf, owned, saveProfile, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { ASCEND_COPIES, EFFECT_BOOST_LEVEL, MAX_LEVEL, levelUpCost } from '../core/progression.ts';
import { CURRENCY } from '../game/config.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';

const TYPE_LABEL: Record<CardType, string> = { monster: 'Monstruos', spell: 'Mágicas', equip: 'Equipos', trap: 'Trampas', ritual: 'Rituales' };
const TYPE_ORDER: CardType[] = ['monster', 'spell', 'equip', 'trap', 'ritual'];

/**
 * Armar mazo: a la izquierda tu colección, a la derecha tu mazo.
 * Clic en una carta de la colección = agregarla; clic en el mazo = quitarla. Se guarda solo.
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
  const filters = { text: '', type: '' as '' | CardType, tag: '', sort: 'atk' as 'atk' | 'name' | 'id' };
  let inspected: CardDef | null = null;

  const grid = h('div', { class: 'collection' });
  const deckPanel = h('aside', { class: 'deck-panel' });

  const changed = () => { save(profile); renderGrid(); renderDeck(); };

  const add = (c: CardDef) => {
    const inDeck = countIn(profile.deck, c.id);
    if (profile.deck.length >= DECK_SIZE || inDeck >= Math.min(MAX_COPIES, owned(profile, c.id))) return;
    profile.deck.push(c.id);
    changed();
  };
  const remove = (id: number) => {
    const i = profile.deck.lastIndexOf(id);
    if (i >= 0) { profile.deck.splice(i, 1); changed(); }
  };

  // ---------------- filtros
  const search = h('input', { type: 'text', placeholder: 'Buscar carta…', 'aria-label': 'Buscar' });
  search.addEventListener('input', () => { filters.text = search.value; renderGrid(); });
  const typeSel = h('select', { 'aria-label': 'Tipo' },
    h('option', { value: '' }, 'Todos los tipos'),
    ...TYPE_ORDER.filter(t => t !== 'ritual').map(t => h('option', { value: t }, TYPE_LABEL[t])));
  typeSel.addEventListener('change', () => { filters.type = typeSel.value as '' | CardType; renderGrid(); });
  const tagSel = h('select', { 'aria-label': 'Etiqueta' },
    h('option', { value: '' }, 'Todas las etiquetas'), ...CARD_TAGS.map(t => h('option', { value: t }, t)));
  tagSel.addEventListener('change', () => { filters.tag = tagSel.value; renderGrid(); });
  const sortSel = h('select', { 'aria-label': 'Ordenar' },
    h('option', { value: 'atk' }, 'Ordenar: ATK'), h('option', { value: 'name' }, 'Ordenar: nombre'), h('option', { value: 'id' }, 'Ordenar: número'));
  sortSel.addEventListener('change', () => { filters.sort = sortSel.value as typeof filters.sort; renderGrid(); });

  root.replaceChildren(h('main', { class: 'screen screen--wide' },
    h('header', { class: 'screen__head' },
      h('button', { class: 'link-btn', onclick: () => go('#/') }, '← Menú'),
      h('h1', {}, 'Mi mazo y colección'),
      h('button', { class: 'link-btn', onclick: () => go('#/campana') }, 'Campaña →'),
    ),
    h('p', { class: 'screen__hint' }, `Toca una carta de tu colección para meterla al mazo. Toca una del mazo para sacarla. Necesitas ${DECK_SIZE} cartas, máximo ${MAX_COPIES} copias de cada una.`),
    h('div', { class: 'builder' },
      h('section', {},
        h('div', { class: 'filters' }, search, typeSel, tagSel, sortSel),
        grid),
      deckPanel),
  ));

  function visibleCards(): CardDef[] {
    const q = filters.text.trim().toLowerCase();
    return cardDb.all()
      .filter(c => owned(profile, c.id) > 0)
      .filter(c => !filters.type || c.type === filters.type)
      .filter(c => !filters.tag || c.tags.includes(filters.tag as CardDef['tags'][number]))
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .sort((a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name) : filters.sort === 'id' ? a.id - b.id : b.atk - a.atk || a.id - b.id);
  }

  function renderGrid(): void {
    const cards = visibleCards();
    const full = profile.deck.length >= DECK_SIZE;
    grid.replaceChildren(
      ...cards.map(c => {
        const have = owned(profile, c.id);
        const used = countIn(profile.deck, c.id);
        const canAdd = !full && used < Math.min(MAX_COPIES, have);
        const el = createCardElement(c, { level: levelOf(profile, c.id) });
        const wrap = h('button', {
          class: `coll-card${canAdd ? '' : ' coll-card--off'}`,
          title: canAdd ? `Agregar ${c.name}` : used >= MAX_COPIES ? 'Ya tienes 3 en el mazo' : full ? 'El mazo ya tiene 40' : 'Ya usas todas tus copias',
          onclick: () => { inspected = c; add(c); renderInspector(); },
        }, el, h('span', { class: `coll-card__count${c.ascendsTo && have >= ASCEND_COPIES ? ' coll-card__count--ready' : ''}` }, `${used}/${have}`));
        wrap.addEventListener('mouseenter', () => { inspected = c; renderInspector(); });
        return wrap;
      }),
      cards.length ? '' : h('p', { class: 'screen__hint' }, 'Ninguna carta coincide con el filtro.'),
    );
  }

  let inspector: HTMLElement;
  function renderInspector(): void {
    if (!inspector) return;
    if (!inspected) { inspector.replaceChildren(h('p', { class: 'screen__hint' }, 'Pasa el mouse sobre una carta para verla.')); return; }
    const card = inspected;
    const level = levelOf(profile, card.id);
    const fx = describeEffects(card.effects);
    inspector.replaceChildren(
      createCardElement(card, { level }),
      h('div', { class: 'deck-inspector__text' },
        h('b', {}, card.name),
        h('p', {}, card.description),
        fx ? h('p', { class: 'deck-inspector__fx' }, `Efecto: ${fx}${level >= EFFECT_BOOST_LEVEL ? ' (nivel 3+: 25% más fuerte)' : ''}`) : '',
        card.nahual ? h('p', { class: 'deck-inspector__fx' }, `🌙 Nahual: de noche es ${card.nahual.name} (${card.nahual.atk}/${card.nahual.def})`) : '',
        upgrades && owned(profile, card.id) > 0 ? upgradePanel(card, level) : ''),
    );
  }

  /** Nivel con cacao y ascensión de la carta que estás viendo. */
  function upgradePanel(card: CardDef, level: number): HTMLElement {
    const box = h('div', { class: 'upgrade' });
    const msg = h('p', { class: 'upgrade__msg', role: 'status' });
    const busy = (on: boolean) => box.querySelectorAll('button').forEach(b => { (b as HTMLButtonElement).disabled = on || b.dataset.off === '1'; });
    const run = async (fn: () => Promise<void>) => {
      busy(true); msg.textContent = 'Un momento…';
      try { await fn(); } catch (e) { msg.textContent = e instanceof Error ? e.message : String(e); busy(false); }
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
      changed();
      inspected = card;
      renderInspector();
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
          changed();
          inspected = got;
          renderInspector();
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
    (overlay.querySelector('.ritual__ok') as HTMLButtonElement).focus();
  }

  function renderDeck(): void {
    const errors = validatePlayerDeck(profile, profile.deck, cardDb);
    const counts = new Map<number, number>();
    for (const id of profile.deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    const defs = [...counts.keys()].map(id => cardDb.get(id));
    const monsters = profile.deck.map(id => cardDb.get(id)).filter(c => c.type === 'monster');
    const avg = monsters.length ? Math.round(monsters.reduce((n, c) => n + c.atk, 0) / monsters.length) : 0;

    inspector = h('div', { class: 'deck-inspector' });
    deckPanel.replaceChildren(
      inspector,
      h('h2', { class: `deck-panel__count${profile.deck.length === DECK_SIZE ? ' ok' : ''}` }, `Mazo ${profile.deck.length}/${DECK_SIZE}`),
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
            const li = h('li', {},
              h('button', { class: 'deck-row', title: `Quitar una ${c.name}`, onclick: () => remove(c.id) },
                h('span', { class: 'deck-row__n' }, `×${counts.get(c.id)}`),
                h('span', { class: 'deck-row__name' }, c.name),
                h('span', { class: 'deck-row__atk' }, c.type === 'monster' ? String(c.atk) : ''),
                h('span', { class: 'deck-row__x', 'aria-hidden': 'true' }, '−')));
            li.addEventListener('mouseenter', () => { inspected = c; renderInspector(); });
            return li;
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
    renderInspector();
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
}
