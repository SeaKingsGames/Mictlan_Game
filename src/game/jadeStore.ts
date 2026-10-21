import jadeJson from '../data/jade.json';
import type { CardDatabase } from '../data/cardDatabase.ts';
import { rarityOf } from '../data/types.ts';
import type { Rng } from '../core/rng.ts';
import { packPool, packs } from './packs.ts';

/**
 * Tienda de jade con dinero real (Mercado Pago). Los paquetes viven en src/data/jade.json:
 *   price → pesos mexicanos (MXN), jade → jade que da, ur → cartas UR de regalo, gold → tickets oro.
 * La PRIMERA compra de cada paquete (para ti, no de regalo) da el doble de jade.
 * Quien decide y entrega es SIEMPRE el servidor; el navegador solo muestra.
 */
export interface JadePackage {
  id: string;
  name: string;
  price: number;
  jade: number;
  ur: number;
  gold: number;
  glyph: string;
  color: string;
}

export const JADE_PACKAGES: readonly JadePackage[] = jadeJson as JadePackage[];
export const getJadePackage = (id: string): JadePackage | undefined => JADE_PACKAGES.find(p => p.id === id);
export const FIRST_PURCHASE_MULTIPLIER = 2;
export const CURRENCY_CODE = 'MXN';

/** Lo que da un paquete o un código. */
export interface Grant { jade: number; ur: number; gold: number }

export function packageGrant(pkg: JadePackage, firstPurchase: boolean): Grant {
  return { jade: pkg.jade * (firstPurchase ? FIRST_PURCHASE_MULTIPLIER : 1), ur: pkg.ur, gold: pkg.gold };
}

/**
 * Las UR que se pueden regalar: las que salen en algún sobre (así respeta las que sacaste a mano,
 * como las 5 cimas 96-100 que son solo por fusión, y las de ascensión).
 */
export function giftableUrs(db: CardDatabase): number[] {
  const ids = new Set<number>();
  for (const pack of packs) for (const c of packPool(pack, db).UR) ids.add(c.id);
  return [...ids].sort((a, b) => a - b);
}

/**
 * Elige `count` UR distintas: primero las que no tienes, luego las que tienes menos de 3,
 * y si ya tienes todas al tope, cualquiera (se vuelve jade/cacao como las repetidas).
 */
export function pickUrs(db: CardDatabase, owned: (id: number) => number, count: number, rng: Rng): number[] {
  const pool = giftableUrs(db).filter(id => rarityOf(db.get(id)) === 'UR');
  const out: number[] = [];
  const tiers = [pool.filter(id => owned(id) === 0), pool.filter(id => owned(id) > 0 && owned(id) < 3), pool.filter(id => owned(id) >= 3)];
  for (const tier of tiers) {
    const left = [...tier];
    while (out.length < count && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  }
  return out;
}

// ---------------------------------------------------------------- códigos de regalo

/** Sin letras que se confunden (O/0, I/1/L, S/5). */
const CODE_ABC = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';

/** Código nuevo: QS-XXXX-XXXX (≈ 700 mil millones de combinaciones). */
export function newGiftCode(random: () => number): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ABC[Math.floor(random() * CODE_ABC.length)]).join('');
  return `QS-${part()}-${part()}`;
}

/** Lo que escribe el jugador → como se guarda (mayúsculas, sin espacios). Los códigos de promoción pueden ser palabras. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s_]+/g, '').replace(/[—–]/g, '-');
}

export const isPlausibleCode = (code: string): boolean => /^[A-Z0-9-]{4,24}$/.test(code);

/** "$1,499 MXN" */
export const formatMxn = (n: number): string => `$${n.toLocaleString('es-MX')} MXN`;
