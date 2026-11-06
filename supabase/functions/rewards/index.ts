// Misiones y recompensa por entrar cada día. POST { action, dataVersion, ... }
//   state                        → { daily: { day, claimed, reward, streak }, missions: [...], wallet, nextDay, nextWeek }
//   claimDaily                   → { wallet, day, reward }
//   claimMission { period, id }  → { wallet, reward }
// Qué misiones hay y cuánto dan lo decide game.js (con la fecha); el progreso lo guarda la base de datos.
import { activeMissions, DATA_VERSION, findActiveMission, loginStatus } from '../_shared/game.js';
import { admin, currentUser, handler, json } from '../_shared/http.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(handler(async (req, body) => {
  const db = admin();
  const user = await currentUser(req, db);
  if (!user) return json({ error: 'Inicia sesión' }, 401);
  if (body.dataVersion !== DATA_VERSION) return json({ error: 'El juego se actualizó. Recarga la página.', code: 'stale_data' }, 409);
  const action = String(body.action ?? '');

  if (action === 'state') {
    const [login, missions] = await Promise.all([loginRow(db, user.id), missionList(db, user.id)]);
    const st = loginStatus(login);
    return json({
      daily: { day: st.day, claimed: st.claimed, reward: st.reward, streak: login.streak },
      missions,
      wallet: await wallet(db, user.id),
    });
  }

  if (action === 'claimDaily') {
    for (let attempt = 0; attempt < 3; attempt++) {
      const login = await loginRow(db, user.id);
      const st = loginStatus(login);
      if (st.claimed) return json({ error: 'Ya cobraste hoy. Vuelve mañana.' }, 400);
      const streak = login.lastDay && Math.round((Date.parse(st.today) - Date.parse(login.lastDay)) / 86_400_000) === 1 ? login.streak + 1 : 1;
      const r = st.reward;
      const { data, error } = await db.rpc('claim_daily', {
        p_user: user.id, p_today: st.today, p_expected_last: login.lastDay, p_streak: streak,
        p_cacao: r.cacao ?? 0, p_jade: r.jade ?? 0, p_tickets: r.tickets ?? 0, p_gold: r.gold ?? 0,
      });
      if (error) throw error;
      if (!data.ok && data.error === 'retry') continue;
      if (!data.ok) return json({ error: data.error }, 400);
      return json({ day: st.day, reward: r, wallet: { cacao: data.cacao, jade: data.jade, tickets: data.tickets, gold: data.gold } });
    }
    return json({ error: 'Intenta de nuevo' }, 409);
  }

  if (action === 'claimMission') {
    const m = findActiveMission(String(body.period ?? ''), String(body.id ?? ''));
    if (!m) return json({ error: 'Esa misión ya terminó' }, 400);
    const r = m.reward;
    const { data, error } = await db.rpc('claim_mission', {
      p_user: user.id, p_period: m.period, p_mission: m.id,
      p_cacao: r.cacao ?? 0, p_jade: r.jade ?? 0, p_tickets: r.tickets ?? 0, p_gold: r.gold ?? 0,
    });
    if (error) throw error;
    if (!data.ok) return json({ error: data.error }, 400);
    return json({ reward: r, wallet: { cacao: data.cacao, jade: data.jade, tickets: data.tickets, gold: data.gold } });
  }

  return json({ error: 'Acción desconocida' }, 400);
}));

async function loginRow(db: SupabaseClient, id: string): Promise<{ streak: number; lastDay: string | null }> {
  const { data } = await db.from('daily_login').select('streak, last_day').eq('user_id', id).maybeSingle();
  return { streak: data?.streak ?? 0, lastDay: data?.last_day ?? null };
}

async function missionList(db: SupabaseClient, id: string) {
  const active = activeMissions();
  const periods = [...new Set(active.map(m => m.period))];
  const { data } = await db.from('mission_progress').select('period, mission_id, progress, claimed').eq('user_id', id).in('period', periods);
  const rows = new Map((data ?? []).map(r => [`${r.period}|${r.mission_id}`, r]));
  return active.map(m => {
    const r = rows.get(`${m.period}|${m.id}`);
    return { id: m.id, period: m.period, kind: m.kind, text: m.text, target: m.target, reward: m.reward,
      progress: Math.min(m.target, r?.progress ?? 0), claimed: r?.claimed ?? false };
  });
}

async function wallet(db: SupabaseClient, id: string) {
  const { data, error } = await db.from('profiles').select('cacao, jade, tickets, gold_tickets').eq('id', id).single();
  if (error) throw error;
  return { cacao: data.cacao, jade: data.jade, tickets: data.tickets, gold: data.gold_tickets };
}
