import type { CardDef } from '../data/types.ts';

/** Fase 2 implementará esto con fusions.json. Por ahora ninguna fusión funciona. */
export interface FusionResolver {
  tryFuse(a: CardDef, b: CardDef): CardDef | null;
}

export const noFusions: FusionResolver = { tryFuse: () => null };
