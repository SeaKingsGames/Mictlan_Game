import { DATA_VERSION } from '../data/index.ts';
import type { Profile } from '../game/profile.ts';
import { invoke } from './cloud.ts';

/** Tienda de jade con dinero real: todo lo hace la Edge Function "payments". Aquí solo se refleja. */

export interface Wallet { cacao: number; jade: number; tickets: number; gold: number }
export interface GrantedCard { id: number; converted: boolean; cacao?: number; jade?: number }
export interface Rewards { jade: number; gold: number; ur: number; cards: GrantedCard[] }

export interface JadeOrder {
  id: string;
  packageId: string;
  price: number;
  gift: boolean;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  mpStatus: string | null;
  first: boolean;
  rewards: Rewards | null;
  code: string | null;
  createdAt: string;
  paidAt: string | null;
}

const call = <T>(action: string, extra: Record<string, unknown> = {}) => invoke<T>('payments', { action, dataVersion: DATA_VERSION, ...extra });

export function applyWallet(p: Profile, w: Wallet | undefined): void {
  if (!w || !p.account) return;
  p.account.cacao = w.cacao; p.account.jade = w.jade; p.account.tickets = w.tickets; p.account.gold = w.gold;
}

export function applyCards(p: Profile, cards: readonly GrantedCard[] | undefined): void {
  for (const c of cards ?? []) if (!c.converted) p.collection[c.id] = (p.collection[c.id] ?? 0) + 1;
}

/** Crea el pedido y devuelve la liga de pago de Mercado Pago. */
export const startCheckout = (packageId: string, gift: boolean) => call<{ orderId: string; url: string }>('create', { packageId, gift });

export const checkOrder = (orderId: string) => call<{ order: JadeOrder; wallet: Wallet }>('check', { orderId });

export const listOrders = () => call<{ orders: JadeOrder[]; firstDone: string[] }>('orders');

export const redeemCode = (code: string) => call<{ rewards: Rewards; wallet: Wallet }>('redeem', { code });

// ---------------------------------------------------------------- regreso de Mercado Pago

const PENDING_KEY = 'cartas.pedido';

/** Antes de ir a pagar se recuerda el pedido, por si Mercado Pago no regresa con la liga. */
export function rememberOrder(id: string): void {
  try { localStorage.setItem(PENDING_KEY, id); } catch { /* sin almacenamiento */ }
}
export function rememberedOrder(): string | null {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
export function forgetOrder(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* nada */ }
}

/**
 * Mercado Pago regresa a  https://tu-juego/?pedido=<id>&collection_status=...
 * Convierte eso en  #/jade/<id>  y limpia la dirección. Devuelve true si había pedido.
 */
export function takeReturnFromCheckout(): boolean {
  const q = new URLSearchParams(location.search);
  const id = q.get('pedido') ?? q.get('external_reference');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  history.replaceState(null, '', `${location.pathname}#/jade/${id}`);
  return true;
}
