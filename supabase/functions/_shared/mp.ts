// Mercado Pago: crear el cobro y entregar lo comprado cuando el pago se aprueba.
// La fuente de verdad SIEMPRE es la API de Mercado Pago (consultada con tu Access Token, que solo vive
// en los secretos de Supabase). Un aviso falso no sirve de nada: se vuelve a preguntar a Mercado Pago.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { CURRENCY_CODE, FIRST_PURCHASE_MULTIPLIER, jadePackage, newGiftCode, newSeed, planGrant } from './game.js';

const API = 'https://api.mercadopago.com';
const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export const mpToken = (): string | undefined => Deno.env.get('MP_ACCESS_TOKEN') || undefined;
export const siteUrl = (): string => (Deno.env.get('SITE_URL') || 'https://cartas.seakingsstudios.com').replace(/\/+$/, '');

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = mpToken();
  if (!token) throw new Error('MP_ACCESS_TOKEN no está configurado');
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export interface MpPayment {
  id: number | string;
  status: string;                 // approved | pending | in_process | rejected | cancelled | refunded | charged_back ...
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string | null;
}

export interface OrderRow {
  id: string; user_id: string; package_id: string; price: number; gift: boolean; status: string;
  mp_status: string | null; first_bonus: boolean; rewards: unknown; code: string | null;
  created_at: string; paid_at: string | null; mp_preference_id: string | null;
  offer?: { bonus_pct?: number; extra_gold?: number } | null;
}

/** Crea el cobro en Mercado Pago (Checkout Pro). Devuelve la liga a donde mandar al jugador. */
export async function createPreference(order: OrderRow, title: string, email: string | null): Promise<{ id: string; url: string }> {
  const back = `${siteUrl()}/?pedido=${order.id}`;
  const pref = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>('/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': order.id },
    body: JSON.stringify({
      items: [{ id: order.package_id, title, quantity: 1, unit_price: Number(order.price), currency_id: CURRENCY_CODE }],
      external_reference: order.id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      statement_descriptor: 'QUINTO SOL',
      ...(email ? { payer: { email } } : {}),
      metadata: { order_id: order.id },
    }),
  });
  // Con credenciales de prueba (empiezan con TEST-) se usa la liga de pruebas.
  const test = mpToken()!.startsWith('TEST-');
  return { id: pref.id, url: (test && pref.sandbox_init_point) || pref.init_point };
}

export const getPayment = (id: string) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);

export async function paymentsForOrder(orderId: string): Promise<MpPayment[]> {
  const r = await mp<{ results: MpPayment[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`);
  return r.results ?? [];
}

export async function paymentsOfMerchantOrder(id: string): Promise<string[]> {
  const r = await mp<{ payments?: { id: number }[] }>(`/merchant_orders/${encodeURIComponent(id)}`);
  return (r.payments ?? []).map(p => String(p.id));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aplica un pago de Mercado Pago a su pedido: entrega si está aprobado, anota si no. */
export async function settlePayment(db: SupabaseClient, pay: MpPayment): Promise<void> {
  const orderId = String(pay.external_reference ?? '');
  if (!UUID.test(orderId)) return;   // no es de esta tienda
  const { data: order } = await db.from('jade_orders').select('*').eq('id', orderId).maybeSingle<OrderRow>();
  if (!order) return;

  if (pay.status !== 'approved') {
    const { error } = await db.rpc('update_jade_order', { p_order: order.id, p_payment: String(pay.id), p_mp_status: pay.status });
    if (error) throw error;
    return;
  }
  if (order.status !== 'pending') return;
  if (pay.currency_id !== CURRENCY_CODE) {
    await db.rpc('update_jade_order', { p_order: order.id, p_payment: String(pay.id), p_mp_status: 'currency_mismatch' });
    return;
  }
  const pkg = jadePackage(order.package_id);
  if (!pkg) throw new Error(`Paquete desconocido: ${order.package_id}`);

  const { data: coll } = await db.from('collection').select('card_id, count').eq('user_id', order.user_id);
  const collection: Record<string, number> = {};
  for (const r of coll ?? []) collection[r.card_id] = r.count;
  // Oferta con la que se creó el pedido: +% de jade y tickets oro extra
  const bonusJade = Math.round(pkg.jade * Math.max(0, Number(order.offer?.bonus_pct ?? 0)) / 100);
  const gold = pkg.gold + Math.max(0, Number(order.offer?.extra_gold ?? 0));
  const plan = planGrant({ jade: pkg.jade, ur: pkg.ur, gold }, newSeed(secureRandom), collection);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db.rpc('fulfill_jade_order', {
      p_order: order.id, p_payment: String(pay.id), p_mp_status: pay.status, p_amount: Number(pay.transaction_amount),
      p_jade_first: pkg.jade * FIRST_PURCHASE_MULTIPLIER + bonusJade, p_jade: pkg.jade + bonusJade, p_gold: gold, p_ur: pkg.ur,
      p_cards: order.gift ? [] : plan.cards, p_code: order.gift ? newGiftCode(secureRandom) : null,
    });
    if (error && error.code === '23505' && order.gift) continue;   // código repetido (casi imposible): otro
    if (error) throw error;
    if (!data.ok) console.warn('pedido no entregado', order.id, data.error);
    return;
  }
}

/** Revisa en Mercado Pago los pagos de un pedido (por si el aviso todavía no llega). */
export async function syncOrder(db: SupabaseClient, orderId: string): Promise<void> {
  const pays = await paymentsForOrder(orderId);
  // primero los aprobados: si hubo un intento rechazado y luego uno bueno, cuenta el bueno
  pays.sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved'));
  for (const p of pays) await settlePayment(db, p);
}

/**
 * Revisa la firma del aviso (x-signature) con la clave secreta de tus Webhooks.
 * Plantilla de Mercado Pago:  id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export async function validSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const sig = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=', 2) as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}
