import cardsJson from './cards.json';
import decksJson from './decks.json';
import duelistsJson from './duelists.json';
import fusionsJson from './fusions.json';
import signsJson from './signs.json';
import packsJson from './packs.json';
import jadeJson from './jade.json';
import type { DaySign } from '../core/daySign.ts';
import { CardDatabase } from './cardDatabase.ts';
import { FusionDatabase, type FusionData } from './fusionDatabase.ts';
import type { CardDef, DeckDef } from './types.ts';

export const cardDb = new CardDatabase(cardsJson as CardDef[]);
export const fusionDb = new FusionDatabase(fusionsJson as FusionData, cardDb);
export const decks: readonly DeckDef[] = decksJson as DeckDef[];
/** Los 20 signos del día (Tonalpohualli). */
export const daySigns: readonly DaySign[] = signsJson as DaySign[];

/**
 * Versión de las REGLAS del motor. Súbela (+1) cada vez que cambies cómo funciona el duelo
 * (DuelEngine, IA, Reloj Solar…). Así el servidor detecta si tiene reglas viejas.
 */
export const ENGINE_VERSION = 5;   // 5: equipos en la cadena de fusión, mágicas boca abajo

export function getDeck(id: string): DeckDef {
  const deck = decks.find(d => d.id === id);
  if (!deck) throw new Error(`No existe el mazo "${id}"`);
  return deck;
}

/**
 * Huella de los datos del juego (cartas + fusiones + duelistas). El servidor la compara con la del
 * cliente: si cambias cards.json y no vuelves a desplegar las funciones, el servidor lo detecta.
 */
export const DATA_VERSION = fnv1a(`v${ENGINE_VERSION}` + JSON.stringify(cardsJson) + JSON.stringify(fusionsJson) + JSON.stringify(duelistsJson) + JSON.stringify(signsJson) + JSON.stringify(packsJson) + JSON.stringify(jadeJson));

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
