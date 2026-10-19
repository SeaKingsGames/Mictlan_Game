import { MAX_COPIES, rarityOf, type CardDef, type CardRarity } from '../data/types.ts';

/**
 * Crecimiento de cartas (Fase B). Lo usan el cliente (pantallas) y el servidor (Edge Function),
 * así que las reglas viven en un solo lugar.
 *
 *  - ASCENSIÓN: 3 copias de una carta → 1 copia de la carta en la que asciende (`ascendsTo`).
 *  - NIVELES: 1 a 5, se suben con cacao. Cada nivel da +100 ATK/DEF; desde nivel 3 los efectos
 *    son 25% más fuertes; el nivel 5 se ve con marco especial.
 */
export const ASCEND_COPIES = 3;
export const MAX_LEVEL = 5;
export const LEVEL_STAT_BONUS = 100;          // por nivel arriba del 1
export const EFFECT_BOOST_LEVEL = 3;          // desde aquí los efectos mejoran
export const EFFECT_BOOST = 1.25;

/** Cacao base por rareza. Subir del nivel L al L+1 cuesta base × L (N: 150, 300, 450, 600 · UR: 1200 … 4800). */
export const LEVEL_COST_BASE: Record<CardRarity, number> = { N: 150, R: 300, SR: 600, UR: 1200 };

export const levelBonus = (level: number): number => (clampLevel(level) - 1) * LEVEL_STAT_BONUS;

export function clampLevel(level: number | undefined): number {
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level ?? 1)));
}

/** Cuánto cuesta subir esta carta desde `level`. null si ya está al máximo. */
export function levelUpCost(card: CardDef, level: number): number | null {
  const l = clampLevel(level);
  if (l >= MAX_LEVEL) return null;
  return LEVEL_COST_BASE[rarityOf(card)] * l;
}

/** Cantidad del efecto según el nivel (desde nivel 3: ×1.25, redondeado hacia arriba a 50). */
export function scaleEffectAmount(amount: number, level: number): number {
  if (clampLevel(level) < EFFECT_BOOST_LEVEL || amount === 0) return amount;
  // Siempre hacia arriba en múltiplos de 50: 500 → 650, 300 → 400, 200 → 250
  return Math.sign(amount) * Math.ceil((Math.abs(amount) * EFFECT_BOOST) / 50) * 50;
}

export type UpgradeCheck = { ok: true; cost: number; result?: number } | { ok: false; error: string };

/** ¿Se puede ascender? `have` = copias que tienes de la carta y del resultado. */
export function checkAscend(card: CardDef | undefined, result: CardDef | undefined, haveBase: number, haveResult: number): UpgradeCheck {
  if (!card) return { ok: false, error: 'Esa carta no existe' };
  if (!card.ascendsTo || !result) return { ok: false, error: `${card.name} no puede ascender` };
  if (haveBase < ASCEND_COPIES) return { ok: false, error: `Necesitas ${ASCEND_COPIES} copias de ${card.name} (tienes ${haveBase})` };
  if (haveResult >= MAX_COPIES) return { ok: false, error: `Ya tienes ${MAX_COPIES} de ${result.name}` };
  return { ok: true, cost: 0, result: result.id };
}

/** ¿Se puede subir de nivel? */
export function checkLevelUp(card: CardDef | undefined, have: number, level: number, cacao: number): UpgradeCheck {
  if (!card) return { ok: false, error: 'Esa carta no existe' };
  if (have <= 0) return { ok: false, error: `No tienes ${card.name}` };
  const cost = levelUpCost(card, level);
  if (cost === null) return { ok: false, error: `${card.name} ya está en nivel ${MAX_LEVEL}` };
  if (cacao < cost) return { ok: false, error: `Te faltan ${cost - cacao} de cacao` };
  return { ok: true, cost };
}

/** Quita del mazo las copias que ya no tienes (después de ascender). */
export function trimDeckToCollection(deck: readonly number[], owned: (id: number) => number): number[] {
  const used = new Map<number, number>();
  return deck.filter(id => {
    const n = (used.get(id) ?? 0) + 1;
    used.set(id, n);
    return n <= owned(id);
  });
}
