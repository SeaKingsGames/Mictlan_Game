import starterJson from '../data/starter.json';
import { cardDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { CARD_TAGS, DECK_SIZE, MAX_COPIES, type CardDef, type CardType } from '../data/types.ts';
import { countIn, owned, saveProfile, validatePlayerDeck, type Profile } from '../game/profile.ts';
import { createCardElement } from './cardElement.ts';
import { h } from './dom.ts';

const TYPE_LABEL: Record<CardType, string> = { monster: 'Monstruos', spell: 'Mágicas', equip: 'Equipos', trap: 'Trampas', ritual: 'Rituales' };
const TYPE_ORDER: CardType[] = ['monster', 'spell', 'equip', 'trap', 'ritual'];

/**
 * Armar mazo: a la izquierda tu colección, a la derecha tu mazo.
 * Clic en una carta de la colección = agregarla; clic en el mazo = quitarla. Se guarda solo.
 */
export function renderDeckBuilder(
  root: HTMLElement, profile: Profile, go: (hash: string) => void,
  save: (p: Profile) => void = saveProfile,   // en la nube: guarda el mazo en Supabase
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
        const el = createCardElement(c);
        const wrap = h('button', {
          class: `coll-card${canAdd ? '' : ' coll-card--off'}`,
          title: canAdd ? `Agregar ${c.name}` : used >= MAX_COPIES ? 'Ya tienes 3 en el mazo' : full ? 'El mazo ya tiene 40' : 'Ya usas todas tus copias',
          onclick: () => add(c),
        }, el, h('span', { class: 'coll-card__count' }, `${used}/${have}`));
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
    const fx = describeEffects(inspected.effects);
    inspector.replaceChildren(
      createCardElement(inspected),
      h('div', { class: 'deck-inspector__text' },
        h('b', {}, inspected.name),
        h('p', {}, inspected.description),
        fx ? h('p', { class: 'deck-inspector__fx' }, `Efecto: ${fx}`) : ''),
    );
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
