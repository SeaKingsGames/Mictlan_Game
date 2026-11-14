import duelistsJson from '../data/duelists.json';
import { SETS } from '../data/sets/index.ts';

/** Un rival de la campaña. Los datos viven en src/data/duelists.json. */
export interface Duelist {
  id: string;
  name: string;
  title: string;          // lugar o rango, se muestra debajo del nombre
  level: 1 | 2 | 3;       // 1 = no fusiona · 2 = fusiona · 3 = fusiona y juega fino
  glyph: string;          // símbolo del retrato (hasta que haya arte)
  intro: string;
  deck: number[];         // 40 IDs de carta
  signature: number;      // carta que regala la primera vez que lo vences
  rewards: { card: number; weight: number }[];   // botín al ganar (más peso = más común)
}

/** Campaña base + los capítulos de las expansiones (en orden: cada uno se desbloquea al vencer al anterior). */
export const duelists: readonly Duelist[] = [...(duelistsJson as Duelist[]), ...SETS.flatMap(s => s.duelists as Duelist[])];

export function getDuelist(id: string): Duelist | undefined {
  return duelists.find(d => d.id === id);
}

/** Jefes: el último duelista de cada capítulo (Mictlantecuhtli, el de cada expansión…). Tienen su propia música. */
const BOSSES = new Set([(duelistsJson as Duelist[]).at(-1)?.id, ...SETS.map(s => (s.duelists as Duelist[]).at(-1)?.id)].filter(Boolean));
export function isChapterBoss(id: string): boolean {
  return BOSSES.has(id);
}

/** Se desbloquean en orden: el primero siempre; los demás al vencer al anterior. */
export function isUnlocked(id: string, defeated: readonly string[]): boolean {
  const i = duelists.findIndex(d => d.id === id);
  if (i <= 0) return i === 0;
  return defeated.includes(duelists[i - 1].id);
}
