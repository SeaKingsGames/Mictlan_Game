// Ruleta de premios y mercado de cartas. POST { action, dataVersion, ... }
//   state                → { wallet, roulette: { featured }, shop: { slots, day } }   (pone la carta a la vista y renueva el mercado si cambió el día)
//   buyGold { count }    → { wallet }                         compra tickets oro con cacao
//   spin                 → { index, prize, card, wallet, roulette }   gasta 1 ticket oro
//   refresh              → { wallet, shop }                   cartas nuevas por 25 tickets estándar
//   buy { slot }         → { wallet, shop, card }             compra la carta de ese lugar
// Qué sale lo decide game.js con semillas del servidor; los cobros los hace la base de datos.
import {
  DATA_VERSION, GOLD_BUY_COUNTS, GOLD_TICKET_PRICE, newSeed, planFeatured, planShop, planSpin, SHOP_REFRESH_TICKETS, shopDay,
} from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const seed = () => newSeed(secureRandom);

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);
  const action = String(body.action ?? '');

  if (action === 'state') {
    const prof = await profile(db, user.id);
    let featured = prof.roulette_featured;
    if (!featured) {
      const { data, error } = await db.rpc('set_roulette_featured', { p_user: user.id, p_card: planFeatured(seed()) });
      if (error) throw error;
      featured = data;
    }
    const shop = await dailyShop(db, user.id);
    const now = await profile(db, user.id);
    return json({ wallet: wallet(now), roulette: { featured }, shop });
  }

  if (action === 'buyGold') {
    const count = Number(body.count ?? 1);
    if (!(GOLD_BUY_COUNTS as readonly number[]).includes(count)) return json({ error: 'Cantidad inválida' }, 400);
    const { data, error } = await db.rpc('buy_gold_tickets', { p_user: user.id, p_count: count, p_price: GOLD_TICKET_PRICE });
    if (error) throw error;
    if (!data.ok) return json({ error: data.error }, 400);
    return json({ wallet: wallet(await profile(db, user.id)) });
  }

  if (action === 'spin') {
    for (let attempt = 0; attempt < 3; attempt++) {
      const prof = await profile(db, user.id);
      if (prof.gold_tickets < 1) return json({ error: 'Necesitas 1 ticket oro', code: 'no_gold' }, 400);
      const featured = prof.roulette_featured ?? planFeatured(seed());
      const plan = planSpin(seed(), featured);
      if (!plan.ok) return json({ error: plan.error }, 400);
      const p = plan.value.prize;
      const { data, error } = await db.rpc('spin_roulette', {
        p_user: user.id, p_expected_featured: prof.roulette_featured, p_kind: p.kind, p_amount: p.amount,
        p_card: p.card, p_card_cacao: p.cacao, p_card_jade: p.jade, p_next_featured: plan.value.nextFeatured,
      });
      if (error) throw error;
      if (!data.ok && data.error === 'retry') continue;
      if (!data.ok) return json({ error: data.error }, 400);
      return json({
        index: plan.value.index, prize: { kind: p.kind, amount: p.amount, card: p.card }, card: data.card,
        wallet: { cacao: data.cacao, jade: data.jade, tickets: data.tickets, gold: data.gold },
        roulette: { featured: data.featured },
      });
    }
    return json({ error: 'Intenta de nuevo' }, 409);
  }

  if (action === 'refresh') {
    const { data, error } = await db.rpc('shop_set', { p_user: user.id, p_slots: planShop(seed()), p_day: shopDay(), p_cost: SHOP_REFRESH_TICKETS });
    if (error) throw error;
    if (!data.ok) return json({ error: data.error, code: 'no_tickets' }, 400);
    return json({ wallet: wallet(await profile(db, user.id)), shop: { slots: data.slots, day: data.day } });
  }

  if (action === 'buy') {
    const slot = Number(body.slot);
    const { data: cur } = await db.from('card_shops').select('slots').eq('user_id', user.id).maybeSingle();
    const s = cur?.slots?.[slot];
    if (!s) return json({ error: 'Ese lugar no existe' }, 400);
    const { data, error } = await db.rpc('shop_buy', { p_user: user.id, p_slot: slot, p_card: s.card, p_price: s.price });
    if (error) throw error;
    if (!data.ok) return json({ error: data.error }, 400);
    return json({ wallet: wallet(await profile(db, user.id)), shop: { slots: data.slots, day: shopDay() }, card: s.card });
  }

  return json({ error: 'Acción desconocida' }, 400);
}));

interface Prof { cacao: number; jade: number; tickets: number; gold_tickets: number; roulette_featured: number | null }

async function profile(db: SupabaseClient, id: string): Promise<Prof> {
  const { data, error } = await db.from('profiles').select('cacao, jade, tickets, gold_tickets, roulette_featured').eq('id', id).single();
  if (error) throw error;
  return data as Prof;
}

const wallet = (p: Prof) => ({ cacao: p.cacao, jade: p.jade, tickets: p.tickets, gold: p.gold_tickets });

/** El mercado de hoy: si cambió el día (o no existe), se renueva gratis. */
async function dailyShop(db: SupabaseClient, userId: string) {
  const today = shopDay();
  const { data: cur } = await db.from('card_shops').select('slots, day').eq('user_id', userId).maybeSingle();
  if (cur && cur.day === today) return { slots: cur.slots, day: cur.day };
  const { data, error } = await db.rpc('shop_set', { p_user: userId, p_slots: planShop(seed()), p_day: today, p_cost: 0 });
  if (error) throw error;
  return { slots: data.slots, day: data.day };
}
