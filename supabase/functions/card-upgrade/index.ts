// POST { action: 'levelUp' | 'ascend', cardId, dataVersion }
//   levelUp → { ok, cardId, level, cacao }
//   ascend  → { ok, cardId, resultId, base, result, deck }
// Las reglas (costos, a qué asciende) salen de game.js; el cobro lo hace la base de datos en una transacción.
import { DATA_VERSION, planAscend, planLevelUp, trimDeckToCollection } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import { recordProgress } from '../_shared/progress.ts';

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);

  const cardId = Number(body.cardId);
  const { data: rows, error } = await db.from('collection').select('card_id, count, level').eq('user_id', user.id);
  if (error) throw error;
  const row = (id: number) => rows?.find(r => r.card_id === id);
  const have = (id: number) => row(id)?.count ?? 0;

  if (body.action === 'levelUp') {
    const level = row(cardId)?.level ?? 1;
    const { data: prof, error: pErr } = await db.from('profiles').select('cacao').eq('id', user.id).single();
    if (pErr) throw pErr;
    const plan = planLevelUp(cardId, have(cardId), level, prof.cacao);
    if (!plan.ok) return json({ error: plan.error }, 400);
    const { data, error: rpcErr } = await db.rpc('level_up_card', { p_user: user.id, p_card: cardId, p_cost: plan.cost, p_from_level: level });
    if (rpcErr) throw rpcErr;
    if (!data.ok) return json({ error: data.error }, 409);
    await recordProgress(db, user.id, { level_up: 1 });
    return json({ ok: true, cardId, level: data.level, cacao: data.cacao });
  }

  if (body.action === 'ascend') {
    const plan = planAscend(cardId, have(cardId), have);
    if (!plan.ok || !plan.result) return json({ error: plan.ok ? 'No se puede ascender' : plan.error }, 400);
    const { data, error: rpcErr } = await db.rpc('ascend_card', { p_user: user.id, p_card: cardId, p_result: plan.result });
    if (rpcErr) throw rpcErr;
    if (!data.ok) return json({ error: data.error }, 409);

    // Si el mazo usaba las copias que se gastaron, se quitan
    const owned = (id: number) => (id === cardId ? data.base : id === plan.result ? data.result : have(id));
    const { data: deckRow } = await db.from('decks').select('id, cards').eq('user_id', user.id).eq('is_active', true).maybeSingle();
    let deck: number[] = deckRow?.cards ?? [];
    const trimmed = trimDeckToCollection(deck, owned);
    if (deckRow && trimmed.length !== deck.length) {
      await db.from('decks').update({ cards: trimmed, updated_at: new Date().toISOString() }).eq('id', deckRow.id);
      deck = trimmed;
    }
    return json({ ok: true, cardId, resultId: plan.result, base: data.base, result: data.result, deck });
  }

  return json({ error: 'Acción desconocida' }, 400);
}));
