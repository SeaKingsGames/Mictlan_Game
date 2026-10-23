import starterJson from '../data/starter.json';
import { cardDb, fusionDb } from '../data/index.ts';
import { describeEffects } from '../data/effectText.ts';
import { RARITIES, RARITY_LABEL, rarityOf, type CardAttribute, type CardDef, type CardRarity } from '../data/types.ts';
import { duelists, isUnlocked } from '../game/duelists.ts';
import { packsWithCard } from '../game/packs.ts';
import { levelOf, owned, type Profile } from '../game/profile.ts';
import { createCardElement } from './cardElement.ts';
import { SETS, setName } from '../data/sets/index.ts';
import { h } from './dom.ts';
import { dropTable } from './FreeDuelView.ts';
import { appScreen, markThumb, pct, rarityChip, tabs, thumb, TYPE_TABS, type TypeTab } from './shell.ts';

const ATTR_LABEL: Record<CardAttribute, string> = { sol: '☀ Sol', viento: '🌀 Viento', agua: '💧 Agua', tierra: '⛰ Tierra' };
const TYPE_NAME: Record<CardDef['type'], string> = { monster: 'Monstruo', spell: 'Mágica', equip: 'Equipo', trap: 'Trampa', ritual: 'Ritual' };

/**
 * Biblioteca: TODAS las cartas del juego, las tengas o no. Las que te faltan se ven apagadas.
 * Al tocar una ves su efecto y cómo conseguirla (rivales, sobres, recetas, ascensión).
 */
export function renderLibrary(root: HTMLElement, profile: Profile, go: (hash: string) => void): void {
  const f = { type: '' as TypeTab, rarity: '' as '' | CardRarity, attr: '' as '' | CardAttribute, have: '' as '' | 'yes' | 'no', set: '', text: '', sort: 'atk' };
  let selected: CardDef | undefined;

  const detail = h('aside', { class: 'lib__detail panel', 'aria-live': 'polite' });
  const sections = h('div', { class: 'lib__sections' });
  const progress = h('div', { class: 'lib__progress' });

  const search = h('input', { type: 'search', class: 'field', placeholder: 'Buscar nombre o efecto…', 'aria-label': 'Buscar' });
  search.addEventListener('input', () => { f.text = search.value; renderGrid(); });
  const sel = (label: string, opts: [string, string][], on: (v: string) => void) => {
    const s = h('select', { class: 'field', 'aria-label': label }, ...opts.map(([v, t]) => h('option', { value: v }, t)));
    s.addEventListener('change', () => on(s.value));
    return s;
  };

  root.replaceChildren(appScreen({ cls: 'lib', title: 'Biblioteca de cartas', back: () => go('#/'), profile },
    detail,
    h('section', { class: 'lib__main panel' },
      tabs(TYPE_TABS, f.type, t => { f.type = t; renderGrid(); }),
      h('div', { class: 'toolbar' },
        search,
        sel('Rareza', [['', 'Rareza: todas'], ...[...RARITIES].reverse().map(r => [r, `${r} · ${RARITY_LABEL[r]}`] as [string, string])], v => { f.rarity = v as CardRarity | ''; renderGrid(); }),
        sel('Atributo', [['', 'Atributo: todos'], ...Object.entries(ATTR_LABEL)], v => { f.attr = v as CardAttribute | ''; renderGrid(); }),
        sel('Expansión', [['', 'Expansión: todas'], ['base', 'Base'], ...SETS.map(x => [x.id, x.name] as [string, string])], v => { f.set = v; renderGrid(); }),
        sel('Colección', [['', 'Todas'], ['yes', 'Las que tengo'], ['no', 'Me faltan']], v => { f.have = v as typeof f.have; renderGrid(); }),
        sel('Orden', [['atk', 'Orden: ATK'], ['def', 'Orden: DEF'], ['name', 'Orden: nombre'], ['id', 'Orden: número']], v => { f.sort = v; renderGrid(); })),
      progress,
      sections)));

  function visible(): CardDef[] {
    const q = f.text.trim().toLowerCase();
    return cardDb.all()
      .filter(c => !f.type || c.type === f.type)
      .filter(c => !f.rarity || rarityOf(c) === f.rarity)
      .filter(c => !f.attr || c.attribute === f.attr)
      .filter(c => !f.set || (c.set ?? 'base') === f.set)
      .filter(c => !f.have || (f.have === 'yes') === owned(profile, c.id) > 0)
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || describeEffects(c.effects).toLowerCase().includes(q))
      .sort((a, b) => f.sort === 'name' ? a.name.localeCompare(b.name) : f.sort === 'id' ? a.id - b.id
        : f.sort === 'def' ? b.def - a.def || a.id - b.id : b.atk - a.atk || a.id - b.id);
  }

  function renderProgress(): void {
    const all = cardDb.all();
    const have = all.filter(c => owned(profile, c.id) > 0);
    progress.replaceChildren(
      h('b', {}, `Colección ${have.length}/${all.length}`),
      h('div', { class: 'meter' }, h('span', { style: `width:${(have.length / all.length) * 100}%` })),
      ...[...RARITIES].reverse().map(r => rarityChip(r, `${r} ${have.filter(c => rarityOf(c) === r).length}/${all.filter(c => rarityOf(c) === r).length}`)));
  }

  function renderGrid(): void {
    renderProgress();
    const cards = visible();
    const groups = [...RARITIES].reverse().map(r => [r, cards.filter(c => rarityOf(c) === r)] as const).filter(([, list]) => list.length);
    sections.replaceChildren(
      ...groups.map(([r, list]) => h('section', { class: 'rar-section' },
        h('h3', { class: 'rar-section__head' }, rarityChip(r), h('span', {}, `${list.length} cartas`)),
        h('div', { class: 'thumbs' }, ...list.map(c => thumb(c, {
          missing: owned(profile, c.id) === 0,
          level: levelOf(profile, c.id),
          selected: c.id === selected?.id,
          badge: owned(profile, c.id) ? `×${owned(profile, c.id)}` : 'Falta',
          onClick: () => { selected = c; renderDetail(); markThumb(sections, c.id); },
        }))))),
      cards.length ? '' : h('p', { class: 'empty' }, 'Ninguna carta coincide con el filtro.'));
    if (!selected && cards[0]) { selected = cards[0]; renderDetail(); markThumb(sections, selected.id); }
  }

  function renderDetail(): void {
    const c = selected;
    if (!c) { detail.replaceChildren(h('p', { class: 'empty' }, 'Toca una carta.')); return; }
    const have = owned(profile, c.id);
    const fx = describeEffects(c.effects);
    detail.replaceChildren(
      h('div', { class: `altar altar--${rarityOf(c)}${have ? '' : ' altar--missing'}` }, createCardElement(c, { level: levelOf(profile, c.id) })),
      h('h2', { class: 'detail__name' }, c.name),
      h('p', { class: 'detail__meta' }, rarityChip(rarityOf(c)), ` ${TYPE_NAME[c.type]} · ${ATTR_LABEL[c.attribute]}${c.set ? ` · ${setName(c.set)}` : ''}`),
      c.type === 'monster' ? h('div', { class: 'detail__stats' }, h('span', {}, `ATK ${c.atk}`), h('span', {}, `DEF ${c.def}`)) : '',
      c.tags.length ? h('p', { class: 'detail__tags' }, c.tags.join(' · ')) : '',
      h('p', { class: 'detail__desc' }, c.description),
      fx ? h('p', { class: 'detail__fx' }, h('b', {}, 'Efecto: '), fx) : '',
      c.nahual ? h('p', { class: 'detail__fx' }, `🌙 Nahual: de noche es ${c.nahual.name} (${c.nahual.atk}/${c.nahual.def})`) : '',
      h('p', { class: `detail__have${have ? '' : ' detail__have--no'}` }, have ? `En tu colección: ${have}/3` : 'Todavía no la tienes'),
      h('h3', { class: 'detail__sub' }, 'Cómo conseguirla'),
      h('ul', { class: 'sources' }, ...sources(c)));
  }

  function sources(c: CardDef): HTMLElement[] {
    const out: HTMLElement[] = [];
    if ((starterJson as { cards: number[] }).cards.includes(c.id)) out.push(h('li', {}, '🎒 Viene en el mazo inicial'));
    for (const d of duelists) {
      const open = isUnlocked(d.id, profile.defeated);
      const name = open ? d.name : '??? (rival bloqueado)';
      if (d.signature === c.id) out.push(h('li', {}, `★ Carta firma de ${name} (primera victoria)`));
      const entry = dropTable(d).flatMap(g => g.entries).find(e => e.card.id === c.id);
      if (entry) out.push(h('li', {}, `⚔ Botín de ${name}: ${pct(entry.chance)}`));
    }
    for (const p of packsWithCard(c.id, cardDb)) out.push(h('li', {}, `${p.glyph} ${p.name}`));
    for (const from of cardDb.all().filter(x => x.ascendsTo === c.id)) out.push(h('li', {}, `✺ Ascensión: 3 × ${from.name}`));
    for (const [a, b] of fusionDb.recipesFor(c.id)) out.push(h('li', {}, `⚗ Fusión exacta (en duelo): ${a.name} + ${b.name}`));
    const rules = fusionDb.rulesFor(c);
    if (rules.length) out.push(h('li', {}, `⚗ Combinación (en duelo): ${rules.map(r => `${r.a} + ${r.b}`).join(' · ')}`));
    if (!out.length) out.push(h('li', {}, c.type === 'monster' ? '⚗ Solo aparece al fusionar durante un duelo (no se guarda en tu colección)' : 'Por ahora no se consigue'));
    return out;
  }

  renderGrid();
}
