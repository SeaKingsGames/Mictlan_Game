import './card.css';
import './editor.css';
import fusionsJson from '../data/fusions.json';
import { cardDb } from '../data/index.ts';
import { FusionDatabase, type FusionData } from '../data/fusionDatabase.ts';
import { CARD_TAGS, type CardDef, type CardTag } from '../data/types.ts';
import { createCardElement } from './cardElement.ts';

/**
 * Editor de fusiones: abre /fusiones.html con `npm run dev`.
 * Edita recetas y reglas, pruébalas, y copia o descarga el JSON para
 * reemplazar src/data/fusions.json.
 */

type EditorData = FusionData & { notes?: string };

const DRAFT_KEY = 'cartas.editorFusiones.borrador';
const original: EditorData = structuredClone(fusionsJson as EditorData);
const monsters = cardDb.all().filter(c => c.type === 'monster');

let data: EditorData = loadDraft() ?? structuredClone(original);
let tester: [number, number, number] = [monsters[0]?.id ?? 0, monsters[1]?.id ?? 0, 0];
let filter = '';

// ---------------------------------------------------------------- utilidades

function loadDraft(): EditorData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as EditorData) : null;
  } catch { return null; }
}
function saveDraft(): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* sin almacenamiento */ }
}

/** Crea un elemento: h('button', { class: 'ebtn', onclick }, 'Texto') */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const cardLabel = (c: CardDef) => `${c.id} · ${c.name} (${c.atk})`;

function cardSelect(value: number, onChange: (id: number) => void, allowEmpty = false): HTMLSelectElement {
  const sel = h('select', { 'aria-label': 'Carta', onchange: () => onChange(Number(sel.value)) });
  if (allowEmpty) sel.append(h('option', { value: 0 }, '— ninguna —'));
  for (const c of monsters) sel.append(h('option', { value: c.id, selected: c.id === value }, cardLabel(c)));
  return sel;
}

function tagSelect(value: CardTag, onChange: (t: CardTag) => void): HTMLSelectElement {
  const sel = h('select', { 'aria-label': 'Etiqueta', onchange: () => onChange(sel.value as CardTag) });
  for (const t of CARD_TAGS) sel.append(h('option', { value: t, selected: t === value }, t));
  return sel;
}

function update(mutator: () => void): void {
  mutator();
  saveDraft();
  render();
}

// ---------------------------------------------------------------- página

const app = document.querySelector<HTMLDivElement>('#app')!;
app.append(h('main', { class: 'editor' },
  h('h1', {}, 'Editor de fusiones'),
  h('p', { class: 'hint' },
    'Los cambios se guardan como borrador en este navegador. Cuando quede listo, descarga el JSON y reemplaza ',
    h('code', {}, 'src/data/fusions.json'), '.'),
  h('div', { class: 'cols' },
    h('div', { class: 'col' },
      h('section', { class: 'box', id: 'recipes' }),
      h('section', { class: 'box', id: 'rules' }),
      h('section', { class: 'box', id: 'recipeOnly' }),
    ),
    h('div', { class: 'col col--side' },
      h('section', { class: 'box', id: 'validation' }),
      h('section', { class: 'box', id: 'tester' }),
      h('section', { class: 'box', id: 'json' }),
    ),
  ),
  h('section', { class: 'box all', id: 'all' }),
));
const $ = (id: string) => document.getElementById(id)!;

function render(): void {
  const resolver = new FusionDatabase(data, cardDb, false);
  renderRecipes();
  renderRules();
  renderRecipeOnly();
  renderValidation(resolver);
  renderTester(resolver);
  renderJson();
  renderAll(resolver);
}

// ---------------------------------------------------------------- recetas

function renderRecipes(): void {
  $('recipes').replaceChildren(
    h('h2', {}, 'Recetas (cartas específicas)'),
    h('p', { class: 'hint' }, 'Carta A + carta B = carta exacta. Se revisan antes que las reglas. El orden de A y B no importa.'),
    ...data.recipes.map((r, i) => h('div', { class: 'rowx' },
      cardSelect(r.a, id => update(() => { r.a = id; })),
      h('span', { class: 'op' }, '+'),
      cardSelect(r.b, id => update(() => { r.b = id; })),
      h('span', { class: 'op' }, '='),
      cardSelect(r.result, id => update(() => { r.result = id; })),
      h('span', { class: 'grow' }),
      h('button', { class: 'ebtn ebtn--icon ebtn--danger', title: 'Borrar', onclick: () => update(() => { data.recipes.splice(i, 1); }) }, '✕'),
    )),
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn', onclick: () => update(() => {
        data.recipes.push({ a: monsters[0].id, b: monsters[1].id, result: monsters.at(-1)!.id });
      }) }, '+ Agregar receta')),
  );
}

// ---------------------------------------------------------------- reglas

function renderRules(): void {
  const recipeOnly = new Set(data.recipeOnly ?? []);
  $('rules').replaceChildren(
    h('h2', {}, 'Reglas por etiqueta'),
    h('p', { class: 'hint' },
      'Etiqueta + etiqueta = la carta más débil que tenga TODAS las etiquetas marcadas y supere en ATK a los dos materiales. ',
      'Si dos materiales cumplen varias reglas, en el juego aparece un panel y el jugador elige el resultado (la IA toma el de más ATK).'),
    ...data.rules.map((r, i) => {
      const candidates = monsters
        .filter(c => !recipeOnly.has(c.id) && r.result.every(t => c.tags.includes(t)))
        .sort((x, y) => x.atk - y.atk);
      return h('div', { class: 'rowx' },
        h('span', { class: 'op' }, `${i + 1}.`),
        tagSelect(r.a, t => update(() => { r.a = t; })),
        h('span', { class: 'op' }, '+'),
        tagSelect(r.b, t => update(() => { r.b = t; })),
        h('span', { class: 'op' }, '→'),
        h('span', { class: 'grow' }),
        h('button', { class: 'ebtn ebtn--icon', title: 'Subir', disabled: i === 0,
          onclick: () => update(() => { [data.rules[i - 1], data.rules[i]] = [data.rules[i], data.rules[i - 1]]; }) }, '↑'),
        h('button', { class: 'ebtn ebtn--icon', title: 'Bajar', disabled: i === data.rules.length - 1,
          onclick: () => update(() => { [data.rules[i + 1], data.rules[i]] = [data.rules[i], data.rules[i + 1]]; }) }, '↓'),
        h('button', { class: 'ebtn ebtn--icon ebtn--danger', title: 'Borrar', onclick: () => update(() => { data.rules.splice(i, 1); }) }, '✕'),
        h('div', { class: 'chips', style: 'width:100%' },
          ...CARD_TAGS.map(t => h('button', {
            class: `chip${r.result.includes(t) ? ' chip--on' : ''}`,
            onclick: () => update(() => {
              r.result = r.result.includes(t) ? r.result.filter(x => x !== t) : [...r.result, t];
            }),
          }, t))),
        h('div', { class: 'cands' },
          candidates.length
            ? h('span', {}, 'Puede dar: ', ...candidates.flatMap((c, k) => [k ? ', ' : '', h('b', {}, c.name), ` ${c.atk}`]))
            : h('span', { class: 'msg--error' }, 'Ninguna carta tiene todas esas etiquetas')),
      );
    }),
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn', onclick: () => update(() => {
        data.rules.push({ a: CARD_TAGS[0], b: CARD_TAGS[1], result: [CARD_TAGS[0], CARD_TAGS[1]] });
      }) }, '+ Agregar regla')),
  );
}

// ---------------------------------------------------------------- solo por receta

function renderRecipeOnly(): void {
  const list = data.recipeOnly ?? [];
  let toAdd = monsters.find(c => !list.includes(c.id))?.id ?? 0;
  $('recipeOnly').replaceChildren(
    h('h2', {}, 'Solo por receta'),
    h('p', { class: 'hint' }, 'Estas cartas nunca salen por reglas de etiqueta, solo por su receta exacta (por ejemplo, dioses legendarios).'),
    h('div', { class: 'chips' },
      ...list.map(id => h('button', {
        class: 'chip chip--card', title: 'Quitar',
        onclick: () => update(() => { data.recipeOnly = list.filter(x => x !== id); }),
      }, `${cardDb.tryGet(id)?.name ?? id} ✕`))),
    h('div', { class: 'actions-row' },
      cardSelect(toAdd, id => { toAdd = id; }),
      h('button', { class: 'ebtn', onclick: () => update(() => {
        if (toAdd && !list.includes(toAdd)) data.recipeOnly = [...list, toAdd];
      }) }, '+ Agregar')),
  );
}

// ---------------------------------------------------------------- validación

function renderValidation(resolver: FusionDatabase): void {
  const seen = new Set<string>();
  const dupRules: string[] = [];
  for (const r of data.rules) {
    const key = [r.a, r.b].sort().join('+');
    if (seen.has(key)) dupRules.push(`La regla ${r.a} + ${r.b} está repetida: la de abajo solo se usa si la de arriba no da nada.`);
    seen.add(key);
  }
  const errors = resolver.problems;
  const warns = [...resolver.warnings, ...dupRules];
  $('validation').replaceChildren(
    h('h2', {}, 'Revisión'),
    h('ul', { class: 'msgs' },
      ...errors.map(e => h('li', { class: 'msg--error' }, '✕ ' + e)),
      ...warns.map(w => h('li', { class: 'msg--warn' }, '! ' + w)),
      errors.length + warns.length === 0 ? h('li', { class: 'msg--ok' }, '✓ Todo bien. Listo para descargar.') : null,
    ),
  );
}

// ---------------------------------------------------------------- probador

function renderTester(resolver: FusionDatabase): void {
  const chain = tester.filter(id => id > 0).map(id => cardDb.get(id));
  const preview = resolver.previewChain(chain);
  const steps = preview?.steps ?? [];
  $('tester').replaceChildren(
    h('h2', {}, 'Probador'),
    h('p', { class: 'hint' }, 'Elige 2 o 3 cartas en orden, como en una cadena de fusión.'),
    h('div', { class: 'tester' },
      cardSelect(tester[0], id => { tester[0] = id; render(); }),
      h('span', { class: 'op' }, '+'),
      cardSelect(tester[1], id => { tester[1] = id; render(); }),
      h('span', { class: 'op' }, '+'),
      cardSelect(tester[2], id => { tester[2] = id; render(); }, true),
    ),
    h('div', { class: 'tester__out' },
      preview ? createCardElement(preview.result) : null,
      h('div', { class: 'tester__steps' },
        ...steps.map(s => h('div', {},
          `${s.a.name} + ${s.b.name} → `,
          s.result ? h('b', {}, `${s.result.name} (${s.result.atk})`) : h('span', { class: 'msg--error' }, `falla: ${s.a.name} al Mictlán`),
          s.options.length > 1
            ? h('span', { class: 'msg--warn' }, ` · el jugador elige entre: ${s.options.map(o => `${o.name} (${o.atk})`).join(', ')}`)
            : '',
        ))),
    ),
  );
}

// ---------------------------------------------------------------- JSON

function renderJson(): void {
  const text = JSON.stringify(data, null, 2);
  const area = h('textarea', { class: 'json', spellcheck: 'false', 'aria-label': 'JSON de fusiones' });
  area.value = text;
  const status = h('span', { class: 'hint' });
  $('json').replaceChildren(
    h('h2', {}, 'JSON'),
    h('p', { class: 'hint' }, 'Este es el contenido de fusions.json. También puedes pegar uno aquí y cargarlo.'),
    area,
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn ebtn--main', onclick: async () => {
        try { await navigator.clipboard.writeText(area.value); status.textContent = 'Copiado ✓'; }
        catch { area.select(); status.textContent = 'Selecciona y copia con Ctrl+C'; }
      } }, 'Copiar'),
      h('button', { class: 'ebtn', onclick: () => {
        const url = URL.createObjectURL(new Blob([area.value + '\n'], { type: 'application/json' }));
        h('a', { href: url, download: 'fusions.json' }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } }, 'Descargar fusions.json'),
      h('button', { class: 'ebtn', onclick: () => {
        try {
          const parsed = JSON.parse(area.value) as EditorData;
          if (!Array.isArray(parsed.recipes) || !Array.isArray(parsed.rules)) throw new Error('faltan "recipes" o "rules"');
          update(() => { data = parsed; });
        } catch (e) { status.textContent = `No se pudo cargar: ${(e as Error).message}`; }
      } }, 'Cargar lo pegado'),
      h('button', { class: 'ebtn ebtn--danger', onclick: () => {
        if (confirm('¿Descartar el borrador y volver al fusions.json del proyecto?')) update(() => { data = structuredClone(original); });
      } }, 'Volver al del proyecto'),
      status,
    ),
  );
}

// ---------------------------------------------------------------- todas las fusiones

function renderAll(resolver: FusionDatabase): void {
  const byResult = new Map<number, { a: CardDef; b: CardDef; recipe: boolean }[]>();
  const recipeKeys = new Set(data.recipes.map(r => [r.a, r.b].sort((x, y) => x - y).join('+')));
  for (let i = 0; i < monsters.length; i++) {
    for (let j = i; j < monsters.length; j++) {
      const [a, b] = [monsters[i], monsters[j]];
      for (const r of resolver.fusionOptions(a, b)) {
        const list = byResult.get(r.id) ?? [];
        list.push({ a, b, recipe: recipeKeys.has([a.id, b.id].sort((x, y) => x - y).join('+')) });
        byResult.set(r.id, list);
      }
    }
  }
  const total = [...byResult.values()].reduce((n, l) => n + l.length, 0);
  const q = filter.trim().toLowerCase();
  const entries = [...byResult]
    .map(([id, pairs]) => ({ card: cardDb.get(id), pairs }))
    .filter(e => !q || e.card.name.toLowerCase().includes(q) || e.pairs.some(p => (p.a.name + ' ' + p.b.name).toLowerCase().includes(q)))
    .sort((x, y) => y.card.atk - x.card.atk);
  const never = monsters.filter(c => !byResult.has(c.id));

  const search = h('input', { type: 'text', placeholder: 'Buscar carta…', value: filter, 'aria-label': 'Buscar' });
  search.addEventListener('input', () => {
    filter = search.value;
    renderAll(resolver);
    const again = document.querySelector<HTMLInputElement>('#all input');
    again?.focus();
    again?.setSelectionRange(filter.length, filter.length);
  });

  $('all').replaceChildren(
    h('h2', {}, `Todas las fusiones de 2 cartas (${total})`),
    h('p', { class: 'hint' }, 'Calculado con todas las cartas de cards.json y tus reglas actuales. Si una pareja aparece en dos resultados, el jugador elige. Sirve para revisar el balance.'),
    search,
    h('div', { class: 'all__list', style: 'margin-top:12px' },
      ...entries.map(({ card, pairs }) => h('div', { class: 'all__item' },
        h('h3', {}, `${card.name} `, h('span', {}, `ATK ${card.atk} · ${pairs.length} forma${pairs.length === 1 ? '' : 's'}`)),
        h('p', {}, ...pairs.flatMap((p, k) => [
          k ? ' · ' : '',
          `${p.a.name} + ${p.b.name}`,
          p.recipe ? h('span', { class: 'tag-recipe' }, 'RECETA') : '',
        ])),
      ))),
    never.length
      ? h('p', { class: 'hint', style: 'margin-top:14px' }, `No salen por ninguna fusión (${never.length}): ${never.map(c => c.name).join(', ')}`)
      : '',
  );
}

render();
