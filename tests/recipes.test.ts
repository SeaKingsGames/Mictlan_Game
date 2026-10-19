import { describe, expect, it } from 'vitest';
import { CardDatabase } from '../src/data/cardDatabase.ts';
import { FusionDatabase, type FusionData } from '../src/data/fusionDatabase.ts';
import type { CardDef } from '../src/data/types.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { testCards } from './fixtures/index.ts';

const base = testCards.all();
const god: CardDef = { id: 900, name: 'Dios de prueba', description: '', type: 'monster', attribute: 'sol', tags: ['deidad'], atk: 4000, def: 4000, noFusion: true, recipes: [[1, 2], [9, 10]] };
const noRules: FusionData = { recipes: [], rules: [] };

describe('recetas guardadas en la carta', () => {
  it('la pareja exacta da la carta (en cualquier orden) y aparece en recipesFor', () => {
    const db = new CardDatabase([...base, god]);
    const f = new FusionDatabase(noRules, db);
    expect(f.tryFuse(db.get(1), db.get(2))?.id).toBe(900);
    expect(f.tryFuse(db.get(2), db.get(1))?.id).toBe(900);
    expect(f.tryFuse(db.get(10), db.get(9))?.id).toBe(900);
    expect(f.recipesFor(900).map(([a, b]) => [a.id, b.id])).toEqual([[1, 2], [9, 10]]);
  });

  it('gana sobre una receta de fusions.json con la misma pareja (con aviso)', () => {
    const db = new CardDatabase([...base, god]);
    const f = new FusionDatabase({ recipes: [{ a: 2, b: 1, result: 3 }], rules: [] }, db);
    expect(f.tryFuse(db.get(1), db.get(2))?.id).toBe(900);
    expect(f.warnings.some(w => w.includes('se ignora'))).toBe(true);
  });

  it('dos cartas con la misma pareja es un error', () => {
    const other = { ...god, id: 901, name: 'Otro dios', recipes: [[2, 1]] as [number, number][] };
    const db = new CardDatabase([...base, god, other]);
    expect(() => new FusionDatabase(noRules, db)).toThrow(/dos cartas distintas/);
  });

  it('valida la receta: ids que existan, monstruos y no la misma carta', () => {
    expect(() => new CardDatabase([...base, { ...god, recipes: [[1, 99999]] }])).toThrow(/no existe/);
    expect(() => new CardDatabase([...base, { ...god, recipes: [[1, 18]] }])).toThrow(/no es monstruo/);
    expect(() => new CardDatabase([...base, { ...god, recipes: [[1, 900]] }])).toThrow(/misma carta/);
    expect(() => new CardDatabase([...base, { ...god, recipes: [[1]] as unknown as [number, number][] }])).toThrow(/pareja/);
  });

  it('noFusion: no sale por reglas genéricas, solo por su receta', () => {
    const db = new CardDatabase([...base, { ...god, tags: ['guerrero', 'jaguar'] }]);
    const f = new FusionDatabase({ recipes: [], rules: [{ a: 'guerrero', b: 'jaguar', result: ['guerrero', 'jaguar'] }] }, db);
    expect(f.rulesFor(db.get(900))).toEqual([]);
    expect(f.tryFuse(db.get(2), db.get(3))?.id).not.toBe(900);
  });

  it('tus datos: cada receta da una carta más fuerte que sus materiales', () => {
    for (const c of cardDb.all()) {
      for (const [a, b] of fusionDb.recipesFor(c.id)) {
        expect(fusionDb.tryFuse(a, b)?.id, `${a.name} + ${b.name}`).toBe(c.id);
      }
    }
    expect(fusionDb.problems).toEqual([]);
  });
});
