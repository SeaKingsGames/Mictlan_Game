// POST { packId, count: 1 | 10, dataVersion }
//   → { ok, packs: [{ cards: [{id, converted, cacao?, jade?}], pity }], jade, cacao, sinceUr }
// Qué sale lo decide game.js con una semilla del servidor; el cobro lo hace la base de datos en una transacción.
import { DATA_VERSION, newSeed, planPacks, PACK_SIZE } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';

const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);

  const packId = String(body.packId ?? '');
  const count = Number(body.count ?? 1);

  // Si dos compras chocan (misma garantía), se reintenta con el valor nuevo
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: prof, error } = await db.from('profiles').select('jade, packs_since_ur').eq('id', user.id).single();
    if (error) throw error;
    const plan = planPacks(packId, count, newSeed(secureRandom), prof.packs_since_ur);
    if (!plan.ok) return json({ error: plan.error }, 400);
    if (prof.jade < plan.value.price) return json({ error: 'No te alcanza el jade', code: 'no_jade' }, 400);

    const flat = plan.value.packs.flatMap(p => p.cards);
    const { data, error: rpcErr } = await db.rpc('open_packs', {
      p_user: user.id, p_pack: packId, p_count: count, p_price: plan.value.price, p_cards: flat,
      p_expected_since: prof.packs_since_ur, p_new_since: plan.value.sinceUr,
    });
    if (rpcErr) throw rpcErr;
    if (!data.ok && data.error === 'retry') continue;
    if (!data.ok) return json({ error: data.error, code: data.error.includes('jade') ? 'no_jade' : undefined }, 409);

    // Volver a partir la lista plana en sobres de PACK_SIZE (con lo que pasó con cada carta)
    const results = data.cards as { id: number; converted: boolean; cacao?: number; jade?: number }[];
    let i = 0;
    const packs = plan.value.packs.map(p => {
      const cards = results.slice(i, i + p.cards.length);
      i += p.cards.length;
      return { cards, pity: p.pity };
    });
    return json({ ok: true, packs, jade: data.jade, cacao: data.cacao, sinceUr: data.sinceUr, size: PACK_SIZE });
  }
  return json({ error: 'Intenta de nuevo' }, 409);
}));
