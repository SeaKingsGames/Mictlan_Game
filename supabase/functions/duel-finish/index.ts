// POST { duelId, intents }  →  { won, cacao, jade, cards, firstWin, balance }
// Vuelve a jugar el duelo con la semilla guardada. Solo si ganaste de verdad hay premio.
import { DATA_VERSION, planRewards, verifyDuel } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import { recordProgress } from '../_shared/progress.ts';

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);

  const { data: duel, error } = await db.from('duels').select('*').eq('id', String(body.duelId ?? '')).maybeSingle();
  if (error) throw error;
  if (!duel || duel.user_id !== user.id) return json({ error: 'Duelo no encontrado' }, 404);
  if (duel.status !== 'active') return json({ error: 'Este duelo ya se guardó', code: 'already_settled' }, 409);
  if (duel.data_version !== DATA_VERSION) {
    await db.from('duels').update({ status: 'rejected' }).eq('id', duel.id).eq('status', 'active');
    return json({ error: 'El juego se actualizó durante el duelo; este duelo no cuenta.', code: 'stale_data' }, 409);
  }

  const seed = Number(duel.seed);
  const verified = verifyDuel({ seed, deck: duel.deck, duelistId: duel.duelist_id, intents: body.intents, levels: duel.levels });
  if (!verified.ok) {
    console.warn('duelo rechazado', duel.id, verified.error);
    await db.from('duels').update({ status: 'rejected', rewards: { error: verified.error } }).eq('id', duel.id).eq('status', 'active');
    return json({ error: 'No se pudo verificar el duelo', detail: verified.error, code: 'rejected' }, 422);
  }

  const won = verified.value.won;
  let plan = { cacao: 0, jade: 0, tickets: 0, cards: [] as { id: number; cacao: number; jade: number }[] };
  if (won) {
    const { data: prog } = await db.from('campaign_progress').select('wins')
      .eq('user_id', user.id).eq('duelist_id', duel.duelist_id).maybeSingle();
    plan = planRewards(duel.duelist_id, seed, !prog || prog.wins === 0);
  }

  const { data: result, error: rpcError } = await db.rpc('settle_duel', {
    p_duel: duel.id, p_won: won, p_cacao: plan.cacao, p_jade: plan.jade,
    p_cards: plan.cards, p_rewards: { turns: verified.value.turns, tickets: plan.tickets },
  });
  if (rpcError) throw rpcError;
  if (!result.ok) return json({ error: 'Este duelo ya se guardó', code: 'already_settled' }, 409);
  await recordProgress(db, user.id, verified.value.progress);

  const { data: balance } = await db.from('profiles').select('cacao, jade, tickets, gold_tickets, wins, losses').eq('id', user.id).single();
  return json({ won, ...result, balance });
}));
