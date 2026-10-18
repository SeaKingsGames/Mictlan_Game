import { planChain, type FusionResolver } from '../core/fusion.ts';
import type { CardDatabase } from './cardDatabase.ts';
import { CARD_TAGS, type CardDef, type CardTag } from './types.ts';

export interface FusionData {
  recipeOnly?: number[];                                   // cartas que solo salen por receta (los nahuales tampoco salen por reglas genéricas)
  recipes: { a: number; b: number; result: number }[];
  rules: { a: CardTag; b: CardTag; result: CardTag[] }[];
}

interface Rule { a: CardTag; b: CardTag; candidates: CardDef[] }   // candidatos ordenados por ATK asc

const pairKey = (x: number, y: number) => (x < y ? `${x}+${y}` : `${y}+${x}`);  // A+B = B+A

/**
 * Fusiones al estilo YGOFM:
 *  1) receta exacta (A + B = C)
 *  2) reglas por etiqueta: cada regla que aplique da la carta más débil con sus etiquetas
 *     que sea más fuerte que AMBOS materiales. Si salen varias, el jugador elige.
 */
export class FusionDatabase implements FusionResolver {
  private readonly recipes = new Map<string, CardDef>();
  private readonly rules: Rule[] = [];
  /** Problemas encontrados (solo se llenan con strict = false; con strict = true lanzan error). */
  readonly problems: string[] = [];
  /** Avisos que no impiden jugar (por ejemplo, una receta que da una carta más débil). */
  readonly warnings: string[] = [];

  constructor(data: FusionData, db: CardDatabase, strict = true) {
    const problems = this.problems;
    const recipeOnly = new Set(data.recipeOnly ?? []);
    // Las cartas ascendidas solo se consiguen ascendiendo (o por receta), no por reglas genéricas
    for (const c of db.all()) if (c.ascendsTo) recipeOnly.add(c.ascendsTo);

    for (const r of data.recipes) {
      const [a, b, res] = [db.tryGet(r.a), db.tryGet(r.b), db.tryGet(r.result)];
      if (!a || !b || !res) { problems.push(`receta ${r.a}+${r.b}=${r.result}: id inexistente`); continue; }
      if (res.atk <= a.atk || res.atk <= b.atk) this.warnings.push(`Receta ${a.name} + ${b.name} = ${res.name}: el resultado no es más fuerte que los materiales.`);
      const key = pairKey(r.a, r.b);
      if (this.recipes.has(key)) problems.push(`receta repetida ${key}`);
      this.recipes.set(key, res);
    }

    for (const r of data.rules) {
      for (const t of [r.a, r.b, ...r.result]) {
        if (!CARD_TAGS.includes(t)) problems.push(`regla ${r.a}+${r.b}: etiqueta desconocida "${t}"`);
      }
      const candidates = db.all()
        .filter(c => c.type === 'monster' && !recipeOnly.has(c.id) && !c.nahual && r.result.every(t => c.tags.includes(t)))
        .sort((x, y) => x.atk - y.atk);
      if (candidates.length === 0) problems.push(`regla ${r.a}+${r.b}: ninguna carta tiene [${r.result.join(', ')}]`);
      this.rules.push({ a: r.a, b: r.b, candidates });
    }

    if (strict && problems.length) throw new Error('fusions.json tiene problemas:\n- ' + problems.join('\n- '));
  }

  /**
   * Todas las cartas que puede dar A + B, de mejor a peor.
   * Receta exacta = única opción. Si no, cada regla que aplique aporta su resultado
   * (la carta más débil de ese tipo que supere a ambos materiales) y el jugador elige.
   */
  fusionOptions(a: CardDef, b: CardDef): CardDef[] {
    if (a.type !== 'monster' || b.type !== 'monster') return [];
    const exact = this.recipes.get(pairKey(a.id, b.id));
    if (exact) return [exact];
    const found = new Map<number, CardDef>();
    for (const rule of this.rules) {
      const matches =
        (a.tags.includes(rule.a) && b.tags.includes(rule.b)) ||
        (a.tags.includes(rule.b) && b.tags.includes(rule.a));
      if (!matches) continue;
      const result = rule.candidates.find(c => c.atk > a.atk && c.atk > b.atk);
      if (result) found.set(result.id, result);
    }
    return [...found.values()].sort((x, y) => y.atk - x.atk);
  }

  /** La mejor opción (la que usa la IA y la que se juega si no eliges). */
  tryFuse(a: CardDef, b: CardDef): CardDef | null {
    return this.fusionOptions(a, b)[0] ?? null;
  }

  /** Simula una cadena completa (vista previa, editor, IA). No toca el duelo. */
  previewChain(chain: readonly CardDef[], choices: readonly number[] = []) {
    const plan = planChain(this, chain, choices);
    return plan.ok ? plan : null;
  }
}
