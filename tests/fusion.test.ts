import { describe, expect, it } from 'vitest';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { FusionDatabase } from '../src/data/fusionDatabase.ts';

const c = (id: number) => cardDb.get(id);
const fuse = (a: number, b: number) => fusionDb.tryFuse(c(a), c(b))?.id ?? null;

describe('fusiones', () => {
  it('Macehual (guerrero) + Ocelote (jaguar) = Guerrero Jaguar', () => {
    expect(fuse(2, 1)).toBe(3);
  });

  it('el orden de los materiales no importa', () => {
    expect(fuse(1, 2)).toBe(fuse(2, 1));
  });

  it('Macehual + Colibrí (ave) = Guerrero Águila', () => {
    expect(fuse(2, 9)).toBe(4);
  });

  it('Serpiente de lago + Sacerdote del Fuego Nuevo = Xiuhcóatl', () => {
    expect(fuse(10, 12)).toBe(5);
  });

  it('bestia + agua elige la carta más débil que supere a ambos', () => {
    expect(fuse(1, 10)).toBe(47);    // Ocelote 800 + Serpiente de lago 700 → Sapo de la lluvia 1100
    expect(fuse(13, 13)).toBe(14);   // Cipactli 1500 + Cipactli → Ahuízotl 2000 (Cipactli no supera 1500)
  });

  it('receta exacta: Serpiente de plumas + Guerrero Águila = Quetzalcóatl', () => {
    expect(fuse(15, 4)).toBe(8);
  });

  it('los dioses UR solo salen por receta', () => {
    expect(fuse(48, 42)).toBe(60);   // Colibrí de Huitzilopochtli + Águila real = Huitzilopochtli
    expect(fuse(46, 42)).not.toBe(60);   // guerrero + ave por regla general NO da Huitzilopochtli
  });

  it('Quetzalcóatl no sale por reglas generales', () => {
    expect(fuse(10, 9)).toBe(15);    // serpiente + ave → Serpiente de plumas, no Quetzalcóatl
  });

  it('sin regla = no hay fusión', () => {
    expect(fuse(1, 1)).toBeNull();   // jaguar + jaguar
    expect(fuse(2, 2)).toBeNull();   // guerrero + guerrero
  });

  it('si el resultado no supera a los materiales, no hay fusión', () => {
    expect(fuse(3, 1)).toBeNull();   // Guerrero Jaguar 1800 ya es el más fuerte de su tipo
  });

  it('vista previa de cadena de 3: la fusión sigue con la siguiente carta', () => {
    // Macehual + Ocelote = Guerrero Jaguar; Guerrero Jaguar + Tecolote (muerte) = Guerrera cihuateteo
    const preview = fusionDb.previewChain([c(2), c(1), c(16)]);
    expect(preview?.result.id).toBe(49);
    expect(preview?.steps.map(s => s.result?.id ?? null)).toEqual([3, 49]);
  });

  it('si aplican varias reglas, da varias opciones de mejor a peor', () => {
    const opts = fusionDb.fusionOptions(c(2), c(16)).map(x => x.id);
    expect(opts).toEqual([49, 4]);   // Guerrera cihuateteo 1900, Guerrero Águila 1700
  });

  it('una receta es la única opción', () => {
    expect(fusionDb.fusionOptions(c(15), c(4)).map(x => x.id)).toEqual([8]);
  });

  it('detecta errores en fusions.json', () => {
    expect(() => new FusionDatabase({ recipes: [{ a: 1, b: 2, result: 999 }], rules: [] }, cardDb)).toThrow(/inexistente/);
    expect(() => new FusionDatabase({ recipes: [], rules: [{ a: 'jaguar', b: 'agua', result: ['deidad', 'fuego', 'agua'] }] }, cardDb)).toThrow(/ninguna carta/);
  });
});
