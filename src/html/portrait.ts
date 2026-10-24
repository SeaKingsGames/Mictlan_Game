import DUELIST_ARTS from 'virtual:duelist-arts';

/**
 * Retrato de un duelista: la imagen public/duelists/<id>.webp|jpg|png si existe; si no, su símbolo.
 * Llena el elemento que le pases (círculo, recuadro, etc.).
 */
export function fillPortrait(el: HTMLElement, duelist: { id: string; glyph: string }, locked = false): HTMLElement {
  el.replaceChildren();
  const src = locked ? undefined : DUELIST_ARTS[duelist.id];
  el.classList.toggle('has-portrait', !!src);
  if (!src) { el.append(locked ? '🔒' : duelist.glyph); return el; }
  const img = document.createElement('img');
  img.className = 'portrait-img';
  img.src = src;
  img.alt = '';
  img.decoding = 'async';
  img.addEventListener('error', () => { el.classList.remove('has-portrait'); el.replaceChildren(duelist.glyph); });
  el.append(img);
  return el;
}

export const hasPortrait = (id: string): boolean => !!DUELIST_ARTS[id];
