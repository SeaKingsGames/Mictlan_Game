import type { CardAttribute, CardTag } from '../data/types.ts';

/**
 * Signo del día (Tonalpohualli): al empezar el duelo sale uno de los 20 y cambia una regla
 * durante todo el duelo. Los signos viven en src/data/signs.json; aquí solo las reglas posibles.
 */
export type SignRule =
  | { readonly kind: 'stat'; readonly attribute?: CardAttribute; readonly tag?: CardTag; readonly atk?: number; readonly def?: number }
  | { readonly kind: 'fusionBonus'; readonly atk: number }      // los monstruos de fusión salen con +ATK
  | { readonly kind: 'startLife'; readonly amount: number }     // ambos empiezan con esta vida
  | { readonly kind: 'extraDraw'; readonly amount: number }     // ambos roban cartas extra al empezar
  | { readonly kind: 'turnHeal'; readonly amount: number }      // al empezar tu turno recuperas vida
  | { readonly kind: 'destroyBurn'; readonly amount: number }   // si destruyen tu monstruo, recibes daño
  | { readonly kind: 'destroyHeal'; readonly amount: number }   // si destruyes un monstruo rival, recuperas vida
  | { readonly kind: 'directBonus'; readonly amount: number };  // los ataques directos hacen más daño

export const SIGN_RULE_KINDS = ['stat', 'fusionBonus', 'startLife', 'extraDraw', 'turnHeal', 'destroyBurn', 'destroyHeal', 'directBonus'] as const;

export interface DaySign {
  readonly id: string;
  readonly name: string;      // nombre náhuatl
  readonly meaning: string;   // en español
  readonly glyph: string;     // emoji o símbolo (hasta que haya arte)
  readonly text: string;      // lo que hace, para mostrar
  readonly rules: readonly SignRule[];
}

export const signRules = <K extends SignRule['kind']>(sign: DaySign | null, kind: K): Extract<SignRule, { kind: K }>[] =>
  (sign?.rules ?? []).filter((r): r is Extract<SignRule, { kind: K }> => r.kind === kind);

/** Suma de una regla numérica del signo (0 si no la tiene). */
export function signTotal(sign: DaySign | null, kind: Exclude<SignRule['kind'], 'stat'>): number {
  let n = 0;
  for (const r of sign?.rules ?? []) {
    if (r.kind !== kind) continue;
    n += r.kind === 'fusionBonus' ? r.atk : 'amount' in r ? r.amount : 0;
  }
  return n;
}
