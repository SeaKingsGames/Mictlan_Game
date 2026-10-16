import './card.css';
import './editor.css';
import cardsJson from '../data/cards.json';
import decksJson from '../data/decks.json';
import fusionsJson from '../data/fusions.json';
import { CardDatabase } from '../data/cardDatabase.ts';
import { CARD_TAGS, RARITIES, RARITY_LABEL, type CardAttribute, type CardDef, type CardRarity, type CardTag, type CardType } from '../data/types.ts';
import { CardInstance } from '../core/CardInstance.ts';
import { createCardElement } from './cardElement.ts';
import { renderEffectEditor, type EditableEffect } from './effectEditor.ts';

/**
 * Editor de cartas: abre /editor-cartas.html con `npm run dev`.
 * Edita datos y arte, y descarga cards.json + las imágenes para el proyecto.
 */

type MutableCard = { -readonly [K in keyof CardDef]: CardDef[K] } & { tags: CardTag[] };
interface Art { dataUrl: string; ext: 'webp' | 'jpg' }

const DRAFT_KEY = 'cartas.editorCartas.borrador';
const IMG_KEY = (id: number) => `cartas.editorCartas.img.${id}`;
const ART_SIZE = 512;

const ATTRIBUTES: { value: CardAttribute; label: string; color: string }[] = [
  { value: 'sol', label: 'Sol', color: '#e8a33d' },
  { value: 'viento', label: 'Viento', color: '#8fb8c9' },
  { value: 'agua', label: 'Agua', color: '#3d7fe8' },
  { value: 'tierra', label: 'Tierra', color: '#a07a45' },
];
const TYPES: { value: CardType; label: string }[] = [
  { value: 'monster', label: 'Monstruo' }, { value: 'spell', label: 'Mágica' },
  { value: 'equip', label: 'Equipo' }, { value: 'trap', label: 'Trampa' },
];

let draftNotice = '';   // aviso si el borrador se combinó con cartas nuevas
const original = (cardsJson as CardDef[]).map(c => ({ ...c, tags: [...c.tags] }) as MutableCard);
let cards: MutableCard[] = loadDraft() ?? structuredClone(original);
const arts = new Map<number, Art>();
for (const c of cards) {
  const saved = loadImage(c.id);
  if (saved) arts.set(c.id, saved);
}
let selectedId = cards[0]?.id ?? 0;
let search = '';

// ---------------------------------------------------------------- almacenamiento

/**
 * Carga el borrador y lo combina con el cards.json del proyecto:
 *  - las cartas que existen en el proyecto pero no en tu borrador se agregan (ej. mágicas nuevas)
 *  - en borradores viejos (antes del editor de efectos) se copian los efectos del proyecto
 * Tus cambios (nombres, ATK/DEF, arte, descripciones) se respetan.
 */
function loadDraft(): MutableCard[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MutableCard[] | { version: 2; cards: MutableCard[] };
    const isOld = Array.isArray(parsed);
    const draft = isOld ? parsed : parsed.cards;
    const have = new Set(draft.map(c => c.id));
    const added = original.filter(c => !have.has(c.id));
    let withEffects = 0;
    if (isOld) {
      for (const c of draft) {
        const proj = original.find(o => o.id === c.id);
        if (!c.effects && proj?.effects) { c.effects = structuredClone(proj.effects) as MutableCard['effects']; withEffects++; }
      }
    }
    const merged = [...draft, ...structuredClone(added)].sort((a, b) => a.id - b.id);
    const notes: string[] = [];
    if (added.length) notes.push(`Se agregaron ${added.length} cartas nuevas del proyecto: ${added.map(c => c.name).join(', ')}.`);
    if (withEffects) notes.push(`Se copiaron los efectos del proyecto a ${withEffects} cartas de tu borrador.`);
    draftNotice = notes.join(' ');
    return merged;
  } catch { return null; }
}
function saveDraft(): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, cards })); } catch { /* sin almacenamiento */ }
}
function loadImage(id: number): Art | null {
  try { const raw = localStorage.getItem(IMG_KEY(id)); return raw ? JSON.parse(raw) as Art : null; }
  catch { return null; }
}
function saveImage(id: number, art: Art | null): boolean {
  try {
    if (art) localStorage.setItem(IMG_KEY(id), JSON.stringify(art));
    else localStorage.removeItem(IMG_KEY(id));
    return true;
  } catch { return false; }   // sin espacio: la imagen sigue en memoria hasta que cierres
}

// ---------------------------------------------------------------- utilidades

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Record<string, unknown> = {}, ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const selected = () => cards.find(c => c.id === selectedId);

/** Copia de la carta con el arte nuevo (si subiste uno) para dibujarla. */
function previewDef(card: MutableCard): CardDef {
  const art = arts.get(card.id);
  return art ? { ...card, art: art.dataUrl } : card;
}

function download(name: string, href: string): void {
  h('a', { href, download: name }).click();
}

/** Mismo formato que el cards.json del proyecto: una carta por línea. */
function formatCards(list: MutableCard[]): string {
  const ordered = list.map(c => {
    const o: Record<string, unknown> = {
      id: c.id, name: c.name, description: c.description, type: c.type,
      attribute: c.attribute, tags: c.tags, atk: c.atk, def: c.def,
    };
    if (c.rarity) o.rarity = c.rarity;
    if (c.art) o.art = c.art;
    if (c.effects && c.effects.length) o.effects = c.effects;
    if (c.type === 'monster' && c.nahual) o.nahual = c.nahual;
    return '  ' + JSON.stringify(o);
  });
  return '[\n' + ordered.join(',\n') + '\n]\n';
}

function changed(): void {
  saveDraft();
  renderList();
  renderPreview();
  renderSide();
}

// ---------------------------------------------------------------- página

if (draftNotice) saveDraft();   // guarda ya el borrador combinado

const app = document.querySelector<HTMLDivElement>('#app')!;
app.append(h('main', { class: 'editor' },
  h('h1', {}, 'Editor de cartas'),
  draftNotice ? h('p', { class: 'hint', style: 'color:#8fd8c6' }, '✓ ' + draftNotice) : '',
  h('p', { class: 'hint' },
    'Los cambios se guardan como borrador en este navegador. Al terminar, descarga ',
    h('code', {}, 'cards.json'), ' (va en ', h('code', {}, 'src/data/'), ') y las imágenes nuevas (van en ',
    h('code', {}, 'public/cards/'), ').'),
  h('div', { class: 'ce' },
    h('aside', { class: 'box ce-list', id: 'list' }),
    h('section', { class: 'col' },
      h('div', { class: 'box', id: 'form' }),
      h('div', { class: 'box', id: 'effects' }),
      h('div', { class: 'box', id: 'art' }),
    ),
    h('aside', { class: 'ce-side' },
      h('div', { class: 'box ce-preview', id: 'preview' }),
      h('div', { class: 'box', id: 'validation' }),
      h('div', { class: 'box', id: 'json' }),
    ),
  ),
));
const $ = (id: string) => document.getElementById(id)!;

// ---------------------------------------------------------------- lista

function renderList(): void {
  const q = search.trim().toLowerCase();
  const filterInput = h('input', { type: 'text', placeholder: 'Buscar…', value: search, 'aria-label': 'Buscar carta' });
  filterInput.addEventListener('input', () => {
    search = filterInput.value;
    renderList();
    const again = $('list').querySelector('input')!;
    again.focus();
    again.setSelectionRange(search.length, search.length);
  });
  $('list').replaceChildren(
    h('h2', {}, `Cartas (${cards.length})`),
    filterInput,
    ...cards
      .filter(c => !q || c.name.toLowerCase().includes(q) || String(c.id) === q)
      .map(c => h('button', {
        class: `ce-item${c.id === selectedId ? ' ce-item--on' : ''}`,
        onclick: () => { selectedId = c.id; renderAll(); },
      },
        h('span', { class: 'dot', style: `background:${ATTRIBUTES.find(a => a.value === c.attribute)?.color}` }),
        h('span', { style: 'flex:1' }, `${c.id} · ${c.name || '(sin nombre)'}`),
        h('small', {}, c.type === 'monster' ? String(c.atk) : TYPES.find(t => t.value === c.type)?.label ?? ''),
      )),
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn ebtn--main', onclick: addCard }, '+ Nueva carta')),
  );
}

function addCard(): void {
  const id = Math.max(0, ...cards.map(c => c.id)) + 1;
  cards.push({ id, name: 'Carta nueva', description: '', type: 'monster', attribute: 'tierra', tags: [], atk: 1000, def: 1000 });
  selectedId = id;
  saveDraft();
  renderAll();
  $('form').querySelector<HTMLInputElement>('input[name=name]')?.select();
}

// ---------------------------------------------------------------- formulario

function renderForm(): void {
  const c = selected();
  if (!c) { $('form').replaceChildren(h('p', { class: 'hint' }, 'Elige una carta.')); return; }

  const text = (name: 'name' | 'description', label: string, multiline = false) => {
    const input = multiline
      ? h('textarea', { name, value: c[name] })
      : h('input', { type: 'text', name, value: c[name] });
    input.addEventListener('input', () => { c[name] = input.value; changed(); });
    return h('label', { class: multiline ? 'full' : '' }, label, input);
  };
  const num = (name: 'atk' | 'def', label: string) => {
    const input = h('input', { type: 'number', name, min: 0, step: 50, value: c[name] });
    input.addEventListener('input', () => { c[name] = Math.max(0, Math.round(Number(input.value) || 0)); changed(); });
    return h('label', {}, label, input);
  };
  const select = <T extends string>(label: string, options: { value: T; label: string }[], value: T, set: (v: T) => void) => {
    const sel = h('select', {});
    for (const o of options) sel.append(h('option', { value: o.value, selected: o.value === value }, o.label));
    sel.addEventListener('change', () => { set(sel.value as T); changed(); });
    return h('label', {}, label, sel);
  };

  const tagChips = h('div', { class: 'chips' });
  const drawChips = () => tagChips.replaceChildren(...CARD_TAGS.map(t => h('button', {
    type: 'button',
    class: `chip${c.tags.includes(t) ? ' chip--on' : ''}`,
    onclick: () => {
      c.tags = c.tags.includes(t) ? c.tags.filter(x => x !== t) : [...c.tags, t];
      drawChips();
      changed();
    },
  }, t)));
  drawChips();

  $('form').replaceChildren(
    h('h2', {}, `Carta #${c.id}`),
    h('div', { class: 'form' },
      text('name', 'Nombre'),
      select('Tipo', TYPES, c.type, v => { c.type = v; renderEffects(); }),
      text('description', 'Descripción', true),
      select('Atributo', ATTRIBUTES, c.attribute, v => { c.attribute = v; }),
      select('Rareza', RARITIES.map(r => ({ value: r, label: `${r} · ${RARITY_LABEL[r]}` })), c.rarity ?? 'N', v => { c.rarity = v as CardRarity; }),
      num('atk', 'ATK'),
      num('def', 'DEF'),
      h('div', { class: 'full' },
        h('p', { class: 'hint', style: 'margin:0 0 6px' }, 'Etiquetas (sirven para las fusiones)'),
        tagChips),
    ),
    c.type === 'monster' ? nahualSection(c) : '',
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn ebtn--danger', onclick: deleteCard }, 'Borrar carta')),
  );
}

/** Nahual: forma de noche (Ocaso y Medianoche). */
function nahualSection(c: MutableCard): HTMLElement {
  const on = h('input', { type: 'checkbox', checked: !!c.nahual });
  on.addEventListener('change', () => {
    c.nahual = on.checked ? { name: `${c.name} (noche)`, atk: c.atk + 500, def: Math.max(0, c.def - 300) } : undefined;
    if (!c.nahual) delete c.nahual;
    changed();
    renderForm();
  });
  const box = h('fieldset', { class: 'nahual-box' },
    h('legend', {}, h('label', {}, on, ' 🌙 Es nahual (cambia de forma de noche)')));
  const n = c.nahual;
  if (n) {
    const set = (patch: Partial<NonNullable<MutableCard['nahual']>>) => {
      c.nahual = { ...c.nahual!, ...patch };
      if (c.nahual.description === '') delete (c.nahual as { description?: string }).description;
      changed();
    };
    const name = h('input', { type: 'text', value: n.name });
    name.addEventListener('input', () => set({ name: name.value }));
    const atk = h('input', { type: 'number', min: 0, step: 50, value: n.atk });
    atk.addEventListener('input', () => set({ atk: Math.max(0, Math.round(Number(atk.value) || 0)) }));
    const def = h('input', { type: 'number', min: 0, step: 50, value: n.def });
    def.addEventListener('input', () => set({ def: Math.max(0, Math.round(Number(def.value) || 0)) }));
    const desc = h('textarea', { value: n.description ?? '' });
    desc.addEventListener('input', () => set({ description: desc.value }));
    box.append(h('div', { class: 'form' },
      h('label', {}, 'Nombre de noche', name),
      h('label', {}, 'ATK de noche', atk),
      h('label', {}, 'DEF de noche', def),
      h('label', { class: 'full' }, 'Descripción de noche (opcional)', desc)));
  }
  return box;
}

function deleteCard(): void {
  const c = selected();
  if (!c) return;
  const uses: string[] = [];
  const f = fusionsJson as { recipes: { a: number; b: number; result: number }[]; recipeOnly?: number[] };
  if (f.recipes.some(r => [r.a, r.b, r.result].includes(c.id))) uses.push('una receta de fusions.json');
  if (f.recipeOnly?.includes(c.id)) uses.push('"solo por receta"');
  if ((decksJson as { cards: number[] }[]).some(d => d.cards.includes(c.id))) uses.push('un mazo de decks.json');
  const warn = uses.length ? `\n\nOjo: se usa en ${uses.join(', ')}. Tendrás que quitarla de ahí también.` : '';
  if (!confirm(`¿Borrar "${c.name}" (#${c.id})?${warn}`)) return;
  cards = cards.filter(x => x !== c);
  arts.delete(c.id);
  saveImage(c.id, null);
  selectedId = cards[0]?.id ?? 0;
  saveDraft();
  renderAll();
}

// ---------------------------------------------------------------- arte

let cropImage: HTMLImageElement | null = null;
let crop = { zoom: 1, cx: 0, cy: 0 };   // centro del recorte en coordenadas de la imagen

function drawCrop(ctx: CanvasRenderingContext2D, size: number): void {
  if (!cropImage) return;
  const img = cropImage;
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight) * crop.zoom;
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, size / 2 - crop.cx * scale, size / 2 - crop.cy * scale, img.naturalWidth * scale, img.naturalHeight * scale);
}

/** Mantiene el recorte dentro de la imagen (sin bordes vacíos). */
function clampCrop(size: number): void {
  if (!cropImage) return;
  const scale = Math.max(size / cropImage.naturalWidth, size / cropImage.naturalHeight) * crop.zoom;
  const half = size / 2 / scale;
  crop.cx = Math.min(Math.max(crop.cx, half), cropImage.naturalWidth - half);
  crop.cy = Math.min(Math.max(crop.cy, half), cropImage.naturalHeight - half);
}

function renderArt(): void {
  const c = selected();
  if (!c) { $('art').replaceChildren(); return; }
  const current = arts.get(c.id);
  const status = h('span', { class: 'hint' });

  const file = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Elegir imagen' });
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      crop = { zoom: 1, cx: img.naturalWidth / 2, cy: img.naturalHeight / 2 };
      renderArt();
    };
    img.src = URL.createObjectURL(f);
  });

  const parts: (Node | string)[] = [
    h('h2', {}, 'Arte'),
    h('p', { class: 'hint' }, `Se recorta en cuadrado a ${ART_SIZE} × ${ART_SIZE} px. Se guarda como /cards/${c.id}.webp.`),
    file,
  ];

  if (cropImage) {
    const view = 320;
    const canvas = h('canvas', { width: view, height: view });
    const ctx = canvas.getContext('2d')!;
    const redraw = () => { clampCrop(view); drawCrop(ctx, view); };
    const zoom = h('input', { type: 'range', min: 1, max: 4, step: 0.01, value: crop.zoom, 'aria-label': 'Zoom' });
    zoom.addEventListener('input', () => { crop.zoom = Number(zoom.value); redraw(); });
    // Arrastrar para mover el recorte
    let drag: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointerup', () => { drag = null; });
    canvas.addEventListener('pointermove', e => {
      if (!drag || !cropImage) return;
      const shown = canvas.getBoundingClientRect().width;
      const scale = Math.max(view / cropImage.naturalWidth, view / cropImage.naturalHeight) * crop.zoom * (shown / view);
      crop.cx -= (e.clientX - drag.x) / scale;
      crop.cy -= (e.clientY - drag.y) / scale;
      drag = { x: e.clientX, y: e.clientY };
      redraw();
    });
    redraw();
    parts.push(h('div', { class: 'crop', style: 'margin-top:12px' },
      canvas,
      h('label', {}, 'Zoom', zoom),
      h('p', { class: 'hint', style: 'margin:0' }, 'Arrastra la imagen para acomodarla.'),
      h('div', { class: 'actions-row' },
        h('button', { class: 'ebtn ebtn--main', onclick: () => {
          const out = h('canvas', { width: ART_SIZE, height: ART_SIZE });
          drawCrop(out.getContext('2d')!, ART_SIZE);
          let dataUrl = out.toDataURL('image/webp', 0.85);
          let ext: Art['ext'] = 'webp';
          if (!dataUrl.startsWith('data:image/webp')) { dataUrl = out.toDataURL('image/jpeg', 0.88); ext = 'jpg'; }
          const art: Art = { dataUrl, ext };
          arts.set(c.id, art);
          c.art = `/cards/${c.id}.${ext}`;
          const kept = saveImage(c.id, art);
          cropImage = null;
          changed();
          renderArt();
          if (!kept) alert('La imagen no cupo en el borrador del navegador. Descárgala antes de cerrar la página.');
        } }, 'Usar este recorte'),
        h('button', { class: 'ebtn', onclick: () => { cropImage = null; renderArt(); } }, 'Cancelar'),
      )));
  } else if (current || c.art) {
    parts.push(h('div', { class: 'actions-row' },
      current ? h('span', { class: 'badge-new' }, 'Imagen nueva sin subir al proyecto') : h('span', { class: 'hint' }, `Usa ${c.art}`),
    ), h('div', { class: 'actions-row' },
      current ? h('button', { class: 'ebtn ebtn--main', onclick: () => download(`${c.id}.${current.ext}`, current.dataUrl) }, `Descargar ${c.id}.${current.ext}`) : '',
      h('button', { class: 'ebtn ebtn--danger', onclick: () => {
        arts.delete(c.id);
        saveImage(c.id, null);
        delete c.art;
        changed();
        renderArt();
      } }, 'Quitar arte'),
      status,
    ));
  }
  $('art').replaceChildren(...parts);
}

// ---------------------------------------------------------------- lado derecho

function renderPreview(): void {
  const c = selected();
  if (!c) { $('preview').replaceChildren(); return; }
  const day = createCardElement(previewDef(c));
  if (!c.nahual) { $('preview').replaceChildren(day); return; }
  // Nahual: se ve la forma de día y la de noche
  const inst = new CardInstance(0, 0, previewDef(c));
  inst.nightForm = true;
  $('preview').replaceChildren(h('div', { class: 'nahual-preview' },
    h('figure', {}, day, h('figcaption', {}, '☀ De día')),
    h('figure', {}, createCardElement(inst), h('figcaption', {}, '☾ De noche'))));
}

function renderSide(): void {
  // Revisión
  const errors: string[] = [];
  const warns: string[] = [];
  try { new CardDatabase(cards); } catch (e) { errors.push((e as Error).message); }
  const names = new Map<string, number>();
  for (const c of cards) {
    const key = c.name.trim().toLowerCase();
    if (names.has(key)) warns.push(`Nombre repetido: "${c.name}" (#${names.get(key)} y #${c.id})`);
    names.set(key, c.id);
    if (c.type === 'monster' && c.tags.length === 0) warns.push(`#${c.id} ${c.name}: sin etiquetas, no podrá fusionarse por reglas`);
    if (!c.description.trim()) warns.push(`#${c.id} ${c.name}: sin descripción`);
  }
  const pending = [...arts.keys()].filter(id => cards.some(c => c.id === id));
  if (pending.length) warns.push(`${pending.length} imagen(es) nueva(s): descárgalas y ponlas en public/cards/`);
  $('validation').replaceChildren(
    h('h2', {}, 'Revisión'),
    h('ul', { class: 'msgs' },
      ...errors.map(e => h('li', { class: 'msg--error' }, '✕ ' + e)),
      ...warns.map(w => h('li', { class: 'msg--warn' }, '! ' + w)),
      errors.length + warns.length === 0 ? h('li', { class: 'msg--ok' }, '✓ Todo bien.') : null,
    ),
  );

  // JSON
  const text = formatCards(cards);
  const area = h('textarea', { class: 'json', spellcheck: 'false', 'aria-label': 'cards.json' });
  area.value = text;
  const status = h('span', { class: 'hint' });
  $('json').replaceChildren(
    h('h2', {}, 'cards.json'),
    area,
    h('div', { class: 'actions-row' },
      h('button', { class: 'ebtn ebtn--main', onclick: async () => {
        try { await navigator.clipboard.writeText(area.value); status.textContent = 'Copiado ✓'; }
        catch { area.select(); status.textContent = 'Selecciona y copia con Ctrl+C'; }
      } }, 'Copiar'),
      h('button', { class: 'ebtn', onclick: () => {
        const url = URL.createObjectURL(new Blob([area.value], { type: 'application/json' }));
        download('cards.json', url);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } }, 'Descargar cards.json'),
      pending.length ? h('button', { class: 'ebtn', onclick: () => {
        pending.forEach((id, i) => setTimeout(() => { const a = arts.get(id)!; download(`${id}.${a.ext}`, a.dataUrl); }, i * 300));
      } }, `Descargar imágenes (${pending.length})`) : '',
      h('button', { class: 'ebtn', onclick: () => importCards(status) }, 'Importar cartas (JSON)'),
      h('button', { class: 'ebtn ebtn--danger', onclick: () => {
        if (!confirm('¿Descartar el borrador y volver al cards.json del proyecto? Las imágenes nuevas también se borran.')) return;
        for (const id of arts.keys()) saveImage(id, null);
        arts.clear();
        cards = structuredClone(original);
        selectedId = cards[0]?.id ?? 0;
        saveDraft();
        renderAll();
      } }, 'Volver al del proyecto'),
      status,
    ),
  );
}

/**
 * Importa un archivo JSON de cartas (por ejemplo cartas-nuevas.json):
 *  - cartas con ID nuevo se agregan completas
 *  - cartas con ID que ya tienes: SOLO se copia la rareza (tus nombres, ATK, arte y efectos no se tocan)
 */
function importCards(status: HTMLElement): void {
  const input = h('input', { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text()) as MutableCard[];
      if (!Array.isArray(incoming)) throw new Error('el archivo debe ser una lista de cartas');
      let added = 0, rarities = 0;
      for (const raw of incoming) {
        const existing = cards.find(c => c.id === raw.id);
        if (!existing) { cards.push({ ...raw, tags: [...(raw.tags ?? [])] }); added++; }
        else {
          if (raw.rarity && existing.rarity !== raw.rarity) { existing.rarity = raw.rarity; rarities++; }
          if (raw.nahual && !existing.nahual) existing.nahual = raw.nahual;
        }
      }
      cards.sort((a, b) => a.id - b.id);
      saveDraft();
      renderAll();
      alert(`Listo: ${added} cartas nuevas y ${rarities} rarezas actualizadas. Tus cambios en las demás cartas se respetaron.`);
    } catch (e) {
      status.textContent = `No se pudo importar: ${(e as Error).message}`;
    }
  });
  input.click();
}

function renderEffects(): void {
  const c = selected();
  if (!c) { $('effects').replaceChildren(); return; }
  const editable = c as unknown as { type: CardType; description: string; effects?: EditableEffect[] };
  renderEffectEditor($('effects'), editable, () => {
    if (editable.effects && editable.effects.length === 0) delete editable.effects;
    changed();
    renderForm();
  });
}

function renderAll(): void {
  cropImage = null;
  renderList();
  renderForm();
  renderEffects();
  renderArt();
  renderPreview();
  renderSide();
}

renderAll();
