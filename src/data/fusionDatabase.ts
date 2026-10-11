import type { FusionResolver } from '../core/fusion.ts';
import type { CardDatabase } from './cardDatabase.ts';
import { CARD_TAGS, type CardDef, type CardTag } from './types.ts';

export interface FusionData {
  recipeOnly?: number[];                                   // cartas que solo salen por receta
  recipes: { a: number; b: number; result: number }[];
  rules: { a: CardTag; b: CardTag; result: CardTag[] }[];
}

interface Rule { a: CardTag; b: CardTag; candidates: CardDef[] }   // candidatos ordenados por ATK asc

const pairKey = (x: number, y: number) => (x < y ? `${x}+${y}` : `${y}+${x}`);  // A+B = B+A

/**
 * Fusiones al estilo YGOFM:
 *  1) receta exacta (A + B = C)
 *  2) reglas por etiqueta, en orden: la carta más débil con las etiquetas del resultado
 *     que sea más fuerte que AMBOS materiales.
 */
export class FusionDatabase implements FusionResolver {
  private readonly recipes = new Map<string, CardDef>();
  private readonly rules: Rule[] = [];

  constructor(data: FusionData, db: CardDatabase) {
    const problems: string[] = [];
    const recipeOnly = new Set(data.recipeOnly ?? []);

    for (const r of data.recipes) {
      const [a, b, res] = [db.tryGet(r.a), db.tryGet(r.b), db.tryGet(r.result)];
      if (!a || !b || !res) { problems.push(`receta ${r.a}+${r.b}=${r.result}: id inexistente`); continue; }
      const key = pairKey(r.a, r.b);
      if (this.recipes.has(key)) problems.push(`receta repetida ${key}`);
      this.recipes.set(key, res);
    }

    for (const r of data.rules) {
      for (const t of [r.a, r.b, ...r.result]) {
        if (!CARD_TAGS.includes(t)) problems.push(`regla ${r.a}+${r.b}: etiqueta desconocida "${t}"`);
      }
      const candidates = db.all()
        .filter(c => c.type === 'monster' && !recipeOnly.has(c.id) && r.result.every(t => c.tags.includes(t)))
        .sort((x, y) => x.atk - y.atk);
      if (candidates.length === 0) problems.push(`regla ${r.a}+${r.b}: ninguna carta tiene [${r.result.join(', ')}]`);
      this.rules.push({ a: r.a, b: r.b, candidates });
    }

    if (problems.length) throw new Error('fusions.json tiene problemas:\n- ' + problems.join('\n- '));
  }

  tryFuse(a: CardDef, b: CardDef): CardDef | null {
    if (a.type !== 'monster' || b.type !== 'monster') return null;
    const exact = this.recipes.get(pairKey(a.id, b.id));
    if (exact) return exact;
    for (const rule of this.rules) {
      const matches =
        (a.tags.includes(rule.a) && b.tags.includes(rule.b)) ||
        (a.tags.includes(rule.b) && b.tags.includes(rule.a));
      if (!matches) continue;
      const result = rule.candidates.find(c => c.atk > a.atk && c.atk > b.atk);
      if (result) return result;     // si esta regla no da nada mejor, prueba la siguiente
    }
    return null;
  }

  /** Simula una cadena completa (para vista previa e IA). No toca el duelo. */
  previewChain(chain: readonly CardDef[]): { result: CardDef; steps: { a: CardDef; b: CardDef; result: CardDef | null }[] } | null {
    if (chain.length === 0) return null;
    let current = chain[0];
    const steps: { a: CardDef; b: CardDef; result: CardDef | null }[] = [];
    for (const next of chain.slice(1)) {
      const result = this.tryFuse(current, next);
      steps.push({ a: current, b: next, result });
      current = result ?? next;
    }
    return { result: current, steps };
  }
}
