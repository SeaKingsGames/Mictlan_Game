import './card.css';
import { CardInstance } from '../core/CardInstance.ts';
import { cardDb } from '../data/index.ts';
import { createCardElement } from './cardElement.ts';

/**
 * Prototipo: cartas dibujadas con HTML/CSS usando los mismos datos y el mismo
 * CardInstance que el juego. Abre /cartas.html con `npm run dev`.
 */
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="page">
    <h1>Cartas · prototipo HTML/CSS</h1>
    <p class="hint">Mismos datos que el juego (cards.json). Cambia el tamaño para ver cómo escala en celular o PC.</p>
    <div class="controls">
      <label>Tamaño de carta <input id="size" type="range" min="90" max="280" value="180" /> <span id="sizeLabel"></span></label>
    </div>

    <h2>Mano</h2>
    <p class="hint">Toca cartas para armar la cadena de fusión (el número es el orden).</p>
    <div class="row gallery-hand" id="hand"></div>
    <div class="chain" id="chain"></div>

    <h2>Campo</h2>
    <p class="hint">Ataque, defensa, boca abajo (rival y propia), ya atacó y con +500 ATK por un efecto.</p>
    <div class="row" id="field" style="row-gap: 40px"></div>

    <h2>Todas las cartas (${cardDb.size})</h2>
    <div class="row" id="all"></div>
  </main>
`;

// --- Tamaño ---
const size = document.querySelector<HTMLInputElement>('#size')!;
const sizeLabel = document.querySelector<HTMLSpanElement>('#sizeLabel')!;
// Arranca con el tamaño que puso el CSS (más chico en celular).
const startSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-w'), 10) || 180;
size.value = String(startSize);
sizeLabel.textContent = `${startSize}px`;
size.addEventListener('input', () => {
  document.documentElement.style.setProperty('--card-w', `${size.value}px`);
  sizeLabel.textContent = `${size.value}px`;
});

// --- Galería completa ---
const all = document.querySelector('#all')!;
for (const def of cardDb.all()) all.append(createCardElement(def));

// --- Mano con selección en orden ---
let nextId = 1;
const handCards = [1, 2, 3, 6, 7].map(id => new CardInstance(nextId++, 0, cardDb.get(id)));
const chain: number[] = [];
const handEl = document.querySelector('#hand')!;
const chainEl = document.querySelector('#chain')!;

function renderHand(): void {
  handEl.replaceChildren(...handCards.map(card => {
    const pos = chain.indexOf(card.instanceId);
    const el = createCardElement(card, { selectionOrder: pos >= 0 ? pos + 1 : undefined });
    el.addEventListener('click', () => {
      const i = chain.indexOf(card.instanceId);
      if (i >= 0) chain.splice(i, 1); else chain.push(card.instanceId);
      renderHand();
    });
    return el;
  }));
  chainEl.textContent = chain.length
    ? 'Cadena: ' + chain.map(id => handCards.find(c => c.instanceId === id)!.def.name).join('  →  ')
    : '';
}
renderHand();

// --- Campo: estados ---
const buffed = new CardInstance(nextId++, 0, cardDb.get(3));
buffed.addModifier({ atk: 500, def: 0, sourceId: 0, untilEndOfTurn: true });

const fieldExamples: { label: string; el: HTMLElement }[] = [
  { label: 'Ataque', el: createCardElement(new CardInstance(nextId++, 0, cardDb.get(5))) },
  { label: 'Defensa', el: createCardElement(new CardInstance(nextId++, 0, cardDb.get(6)), { defense: true }) },
  { label: 'Rival boca abajo', el: createCardElement(cardDb.get(7), { hidden: true, defense: true }) },
  { label: 'Propia boca abajo', el: createCardElement(new CardInstance(nextId++, 0, cardDb.get(11)), { faceDownOwn: true, defense: true }) },
  { label: 'Ya atacó', el: createCardElement(new CardInstance(nextId++, 0, cardDb.get(4)), { attacked: true }) },
  { label: '+500 ATK (efecto)', el: createCardElement(buffed) },
];
document.querySelector('#field')!.append(...fieldExamples.map(({ label, el }) => {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const caption = document.createElement('span');
  caption.className = 'slot__label';
  caption.textContent = label;
  slot.append(el, caption);
  return slot;
}));
