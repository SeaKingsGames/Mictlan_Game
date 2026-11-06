// Tienda de jade (dinero real) y códigos. POST { action, dataVersion, ... }
//   create { packageId, gift }  → { orderId, url }       crea el pedido y el cobro en Mercado Pago
//   check  { orderId }          → { order, wallet }      estado del pedido (pregunta a Mercado Pago si sigue pendiente)
//   orders                      → { orders, firstDone }  tus últimas compras y qué paquetes ya tuvieron su doble jade
//   redeem { code }             → { rewards, wallet }    canjea un código
// Lo que se entrega lo decide game.js; los cobros los confirma Mercado Pago; la base de datos lo aplica.
import { DATA_VERSION, isPlausibleCode, jadePackage, newSeed, normalizeCode, planGrant } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import { createPreference, mpToken, syncOrder, type OrderRow } from '../_shared/mp.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const MAX_PENDING_PER_HOUR = 10;

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);
  const action = String(body.action ?? '');

  if (action === 'create') {
    if (user.is_anonymous) return json({ error: 'Guarda tu cuenta con correo para poder comprar', code: 'guest' }, 403);
    if (!mpToken()) return json({ error: 'La tienda todavía no está abierta' }, 503);
    const pkg = jadePackage(String(body.packageId ?? ''));
    if (!pkg) return json({ error: 'Ese paquete no existe' }, 400);
    const gift = body.gift === true;

    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from('jade_orders').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('status', 'pending').gte('created_at', since);
    if ((count ?? 0) >= MAX_PENDING_PER_HOUR) return json({ error: 'Tienes muchas compras sin terminar. Espera un rato.' }, 429);

    const offer = await activeOffer(db, pkg.id);
    const price = offer?.price ? Number(offer.price) : pkg.price;
    const { data: order, error } = await db.from('jade_orders')
      .insert({ user_id: user.id, package_id: pkg.id, price, gift, offer })
      .select('*').single<OrderRow>();
    if (error) throw error;
    const pref = await createPreference(order, `${pkg.name}${offer ? ` (${offer.label})` : ''}${gift ? ' (regalo)' : ''} · Cartas del Quinto Sol`, user.email ?? null);
    await db.from('jade_orders').update({ mp_preference_id: pref.id }).eq('id', order.id);
    return json({ orderId: order.id, url: pref.url });
  }

  if (action === 'check') {
    const id = String(body.orderId ?? '');
    let order = await ownOrder(db, user.id, id);
    if (!order) return json({ error: 'No encontramos esa compra' }, 404);
    if (order.status === 'pending' && mpToken()) {
      try { await syncOrder(db, order.id); } catch (e) { console.error(e); }
      order = (await ownOrder(db, user.id, id))!;
    }
    return json({ order: view(order), wallet: await wallet(db, user.id) });
  }

  if (action === 'orders') {
    const { data, error } = await db.from('jade_orders').select('*').eq('user_id', user.id)
      .neq('status', 'cancelled').order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    const rows = (data ?? []) as OrderRow[];
    // Para "doble jade": paquetes que ya compraste para ti (contando todos, no solo los 30 últimos)
    const { data: done } = await db.from('jade_orders').select('package_id').eq('user_id', user.id).eq('first_bonus', true);
    return json({
      offers: await activeOffers(db),
      orders: rows.filter(o => o.status !== 'pending' || Date.now() - Date.parse(o.created_at) < 3 * 86400_000).map(view),
      firstDone: [...new Set((done ?? []).map(r => r.package_id))],
    });
  }

  if (action === 'redeem') {
    const code = normalizeCode(String(body.code ?? ''));
    if (!isPlausibleCode(code)) return json({ error: 'Ese código no existe' }, 400);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: k } = await db.from('redeem_codes').select('jade, ur, gold').eq('code', code).maybeSingle();
      if (!k) {
        await new Promise(r => setTimeout(r, 600));   // frena a quien intenta adivinar códigos
        return json({ error: 'Ese código no existe' }, 400);
      }
      const { data: coll } = await db.from('collection').select('card_id, count').eq('user_id', user.id);
      const collection: Record<string, number> = {};
      for (const r of coll ?? []) collection[r.card_id] = r.count;
      const plan = planGrant({ jade: k.jade, ur: k.ur, gold: k.gold }, newSeed(secureRandom), collection);
      const { data, error } = await db.rpc('redeem_code', { p_user: user.id, p_code: code, p_cards: plan.cards });
      if (error) throw error;
      if (!data.ok && data.error === 'retry') continue;
      if (!data.ok) return json({ error: data.error }, 400);
      return json({ rewards: data.rewards, wallet: await wallet(db, user.id) });
    }
    return json({ error: 'Intenta de nuevo' }, 409);
  }

  return json({ error: 'Acción desconocida' }, 400);
}));

export interface Offer { id: number; package_id: string; label: string; bonus_pct: number; extra_gold: number; price: number | null; ends_at: string }

/** Ofertas vigentes (tabla store_offers; las creas en el SQL Editor). */
async function activeOffers(db: SupabaseClient): Promise<Offer[]> {
  const now = new Date().toISOString();
  const { data } = await db.from('store_offers').select('id, package_id, label, bonus_pct, extra_gold, price, ends_at')
    .eq('active', true).lte('starts_at', now).gte('ends_at', now).order('created_at', { ascending: false });
  const seen = new Set<string>();
  return ((data ?? []) as Offer[]).filter(o => !seen.has(o.package_id) && seen.add(o.package_id));
}
async function activeOffer(db: SupabaseClient, packageId: string): Promise<Offer | null> {
  return (await activeOffers(db)).find(o => o.package_id === packageId) ?? null;
}

async function ownOrder(db: SupabaseClient, userId: string, id: string): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db.from('jade_orders').select('*').eq('id', id).eq('user_id', userId).maybeSingle<OrderRow>();
  return data ?? null;
}

function view(o: OrderRow) {
  return {
    id: o.id, packageId: o.package_id, price: Number(o.price), gift: o.gift, status: o.status, mpStatus: o.mp_status,
    first: o.first_bonus, rewards: o.rewards, code: o.code, createdAt: o.created_at, paidAt: o.paid_at,
  };
}

async function wallet(db: SupabaseClient, id: string) {
  const { data, error } = await db.from('profiles').select('cacao, jade, tickets, gold_tickets').eq('id', id).single();
  if (error) throw error;
  return { cacao: data.cacao, jade: data.jade, tickets: data.tickets, gold: data.gold_tickets };
}
