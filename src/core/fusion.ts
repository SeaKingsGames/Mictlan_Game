import type { CardDef } from '../data/types.ts';

/**
 * Quién decide qué da una fusión. Devuelve TODAS las opciones posibles,
 * ordenadas de mejor a peor (la primera es la de más ATK). Lista vacía = no fusionan.
 */
export interface FusionResolver {
  fusionOptions(a: CardDef, b: CardDef): CardDef[];
}

export const noFusions: FusionResolver = { fusionOptions: () => [] };

export const bestFusion = (r: FusionResolver, a: CardDef, b: CardDef): CardDef | null => r.fusionOptions(a, b)[0] ?? null;

export interface ChainStep {
  a: CardDef;
  b: CardDef;
  options: CardDef[];           // lo que podía salir
  result: CardDef | null;       // lo que salió (null = falló)
}

export type ChainPlan = { ok: true; result: CardDef; steps: ChainStep[] } | { ok: false; error: string };

/**
 * Resuelve una cadena de fusión SIN tocar el duelo.
 * `choices` = IDs de carta elegidos, uno por cada paso que tenga más de una opción, en orden.
 * Si falta una elección, se usa la mejor opción.
 */
export function planChain(resolver: FusionResolver, chain: readonly CardDef[], choices: readonly number[] = []): ChainPlan {
  if (chain.length === 0) return { ok: false, error: 'Cadena vacía' };
  let current = chain[0];
  let choiceIdx = 0;
  const steps: ChainStep[] = [];
  for (const next of chain.slice(1)) {
    const options = resolver.fusionOptions(current, next);
    let result: CardDef | null = options[0] ?? null;
    if (options.length > 1) {
      const wanted = choices[choiceIdx++];
      if (wanted !== undefined) {
        const picked = options.find(o => o.id === wanted);
        if (!picked) return { ok: false, error: 'Esa fusión no puede dar esa carta' };
        result = picked;
      }
    }
    steps.push({ a: current, b: next, options, result });
    current = result ?? next;
  }
  return { ok: true, result: current, steps };
}
