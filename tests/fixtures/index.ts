import cardsJson from './cards.json';
import fusionsJson from './fusions.json';
import { CardDatabase } from '../../src/data/cardDatabase.ts';
import { FusionDatabase, type FusionData } from '../../src/data/fusionDatabase.ts';
import type { CardDef } from '../../src/data/types.ts';

/**
 * Cartas FIJAS para las pruebas de reglas (efectos, niveles, signos…).
 * Son una copia: así puedes cambiar stats y efectos de tus cartas en el editor
 * sin que estas pruebas fallen. Las pruebas que revisan TUS datos usan src/data.
 */
export const testCards = new CardDatabase(cardsJson as CardDef[]);
export const testFusion = new FusionDatabase(fusionsJson as FusionData, testCards);
