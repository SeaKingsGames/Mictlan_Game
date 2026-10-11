import { CardInstance } from '../core/CardInstance.ts';
import type { CardAttribute, CardDef } from '../data/types.ts';

const ATTRIBUTE_LABEL: Record<CardAttribute, string> = {
  sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra',
};

const TYPE_LABEL: Record<CardDef['type'], string> = {
  monster: 'Monstruo', spell: 'Mágica', equip: 'Equipo', ritual: 'Ritual',
};

export interface CardElementOptions {
  hidden?: boolean;            // dorso
  selectionOrder?: number;     // número de la cadena de fusión
  defense?: boolean;           // girada 90°
  faceDownOwn?: boolean;       // propia boca abajo (se ve atenuada)
  attacked?: boolean;          // ya atacó este turno
  selected?: boolean;          // resaltada
}

/**
 * Dibuja una carta como HTML. Acepta una definición (galería, álbum)
 * o una instancia (en partida, con ATK/DEF modificados).
 * Solo MUESTRA: nunca cambia el estado.
 */
export function createCardElement(source: CardDef | CardInstance, opts: CardElementOptions = {}): HTMLElement {
  const def = source instanceof CardInstance ? source.def : source;
  const atk = source instanceof CardInstance ? source.atk : def.atk;
  const defense = source instanceof CardInstance ? source.defense : def.def;

  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.attribute = def.attribute;
  el.dataset.cardId = String(def.id);
  if (source instanceof CardInstance) el.dataset.instanceId = String(source.instanceId);

  el.classList.toggle('card--back', !!opts.hidden);
  el.classList.toggle('card--defense', !!opts.defense);
  el.classList.toggle('card--facedown-own', !!opts.faceDownOwn);
  el.classList.toggle('card--attacked', !!opts.attacked);
  el.classList.toggle('card--selected', !!opts.selected || opts.selectionOrder !== undefined);

  if (opts.hidden) {
    el.setAttribute('aria-label', 'Carta boca abajo');
    el.innerHTML = `<div class="card__back-sun">✺</div>`;
    return el;
  }

  el.setAttribute('aria-label', `${def.name}, ATK ${atk}, DEF ${defense}`);
  el.innerHTML = `
    <header class="card__head">
      <span>${ATTRIBUTE_LABEL[def.attribute]}</span>
      <span>${TYPE_LABEL[def.type]}</span>
    </header>
    <h3 class="card__name"></h3>
    <div class="card__art"><span class="card__glyph"></span></div>
    <p class="card__tags"></p>
    <p class="card__desc"></p>
    <footer class="card__stats">
      <span class="${statClass(atk, def.atk)}">ATK ${atk}</span>
      <span class="${statClass(defense, def.def)}">DEF ${defense}</span>
    </footer>
    ${opts.selectionOrder !== undefined ? `<span class="card__badge">${opts.selectionOrder}</span>` : ''}
  `;
  // textContent (no innerHTML) para los datos: así un nombre raro nunca rompe la página.
  el.querySelector('.card__name')!.textContent = def.name;
  el.querySelector('.card__glyph')!.textContent = def.name.charAt(0);
  if (def.art) {
    // Arte de la carta: archivo en public/cards/ (ej. "art": "/cards/3.webp" en cards.json)
    const img = document.createElement('img');
    img.src = def.art;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove());   // si falta el archivo, queda la inicial
    el.querySelector('.card__art')!.append(img);
  }
  el.querySelector('.card__tags')!.textContent = def.tags.join(' · ');
  el.querySelector('.card__desc')!.textContent = def.description;
  return el;
}

function statClass(current: number, base: number): string {
  if (current > base) return 'stat stat--up';
  if (current < base) return 'stat stat--down';
  return 'stat';
}
