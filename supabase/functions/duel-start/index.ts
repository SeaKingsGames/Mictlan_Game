// POST { duelistId, dataVersion }  →  { duelId, seed, deck }
// Revisa que el rival esté desbloqueado y que el mazo sea tuyo; luego da una semilla nueva.
import { checkDuelStart, DATA_VERSION } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);

  if (body.dataVersion !== DATA_VERSION) {
    return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);
  }
  const duelistId = String(body.duelistId ?? '');

  const [deckRes, collRes, progRes] = await Promise.all([
    db.from('decks').select('cards').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    db.from('collection').select('card_id, count').eq('user_id', user.id),
    db.from('campaign_progress').select('duelist_id, wins').eq('user_id', user.id),
  ]);
  if (deckRes.error || collRes.error || progRes.error) throw deckRes.error ?? collRes.error ?? progRes.error;

  const deck: number[] = deckRes.data?.cards ?? [];
  const collection: Record<string, number> = {};
  for (const r of collRes.data ?? []) collection[r.card_id] = r.count;
  const defeated = (progRes.data ?? []).filter(r => r.wins > 0).map(r => r.duelist_id);

  const check = checkDuelStart({ duelistId, deck, collection, defeated });
  if (!check.ok) return json({ error: check.error }, 400);

  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { data, error } = await db.from('duels')
    .insert({ user_id: user.id, duelist_id: duelistId, seed, deck, data_version: DATA_VERSION })
    .select('id').single();
  if (error) throw error;

  return json({ duelId: data.id, seed, deck });
}));
