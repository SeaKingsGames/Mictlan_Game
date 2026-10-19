import { CardInstance } from '../core/CardInstance.ts';
import { clampLevel, levelBonus, MAX_LEVEL } from '../core/progression.ts';
import { rarityOf, type CardAttribute, type CardDef } from '../data/types.ts';

const ATTRIBUTE_LABEL: Record<CardAttribute, string> = {
  sol: 'Sol', viento: 'Viento', agua: 'Agua', tierra: 'Tierra',
};

const TYPE_LABEL: Record<CardDef['type'], string> = {
  monster: 'Monstruo', spell: 'Mágica', equip: 'Equipo', trap: 'Trampa', ritual: 'Ritual',
};

/** Arte del dorso (opcional). Formato 5:7, por ejemplo 1000×1400 px. */
const BACK_ART = '/cards/dorso.webp';
let backArt: boolean | null = null;   // null = aún no se sabe si existe el archivo

export interface CardElementOptions {
  hidden?: boolean;            // dorso
  selectionOrder?: number;     // número de la cadena de fusión
  defense?: boolean;           // girada 90°
  faceDownOwn?: boolean;       // propia boca abajo (se ve atenuada)
  attacked?: boolean;          // ya atacó este turno
  selected?: boolean;          // resaltada
  level?: number;              // nivel en tu colección (para cartas sin instancia)
}

/**
 * Dibuja una carta como HTML. Acepta una definición (galería, álbum)
 * o una instancia (en partida, con ATK/DEF modificados).
 * Solo MUESTRA: nunca cambia el estado.
 */
export function createCardElement(source: CardDef | CardInstance, opts: CardElementOptions = {}): HTMLElement {
  const def = source instanceof CardInstance ? source.def : source;
  const inst = source instanceof CardInstance ? source : null;
  const level = clampLevel(inst ? inst.level : opts.level);
  const bonus = def.type === 'monster' && !inst ? levelBonus(level) : 0;
  const atk = inst ? inst.atk : def.atk + bonus;
  const defense = inst ? inst.defense : def.def + bonus;
  const night = !!inst?.nightForm;
  const name = inst ? inst.name : def.name;
  const baseAtk = inst ? inst.baseAtk - inst.levelStats : def.atk;   // verde = mejorada por nivel o efectos
  const baseDef = inst ? inst.baseDef - inst.levelStats : def.def;

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
    // Dorso con arte propio: pon el archivo en public/cards/dorso.webp (si no existe, queda el dorso dibujado)
    if (backArt !== false) {
      const img = document.createElement('img');
      img.className = 'card__back-art';
      img.src = BACK_ART;
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('load', () => { backArt = true; el.classList.add('card--back-art'); });
      img.addEventListener('error', () => { backArt = false; img.remove(); });
      if (backArt === true) el.classList.add('card--back-art');
      el.append(img);
    }
    return el;
  }

  el.dataset.type = def.type;
  el.dataset.rarity = rarityOf(def);
  if (def.nahual) el.classList.add('card--nahual');
  if (level >= MAX_LEVEL) el.classList.add('card--lv5');
  el.classList.toggle('card--night', night);
  el.setAttribute('aria-label', def.type === 'monster' ? `${name}, ATK ${atk}, DEF ${defense}` : `${name}, ${TYPE_LABEL[def.type]}`);
  el.innerHTML = `
    <header class="card__head">
      <span>${ATTRIBUTE_LABEL[def.attribute]}</span>
      <span>${TYPE_LABEL[def.type]}</span>
    </header>
    <h3 class="card__name"></h3>
    <span class="card__rarity card__rarity--${rarityOf(def)}">${rarityOf(def)}</span>
    ${def.nahual ? `<span class="card__nahual" title="Nahual: cambia de forma de noche">${night ? '🐾' : '🌙'}</span>` : ''}
    <div class="card__art"><span class="card__glyph"></span>${level > 1 ? `<span class="card__level" title="Nivel ${level}">Nv ${level}</span>` : ''}</div>
    <p class="card__tags"></p>
    <p class="card__desc"></p>
    <footer class="card__stats">${def.type === 'monster'
      ? `<span class="${statClass(atk, baseAtk)}">ATK ${atk}</span><span class="${statClass(defense, baseDef)}">DEF ${defense}</span>`
      : `<span class="stat stat--type">${TYPE_LABEL[def.type]}</span>`}
    </footer>
    ${opts.selectionOrder !== undefined ? `<span class="card__badge">${opts.selectionOrder}</span>` : ''}
  `;
  // textContent (no innerHTML) para los datos: así un nombre raro nunca rompe la página.
  el.querySelector('.card__name')!.textContent = name;
  el.querySelector('.card__glyph')!.textContent = name.charAt(0);
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
  el.querySelector('.card__tags')!.textContent = (def.nahual ? ['nahual', ...def.tags] : def.tags).join(' · ');
  el.querySelector('.card__desc')!.textContent = night && def.nahual?.description ? def.nahual.description : def.description;
  return el;
}

function statClass(current: number, base: number): string {
  if (current > base) return 'stat stat--up';
  if (current < base) return 'stat stat--down';
  return 'stat';
}
