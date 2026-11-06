// Suma progreso a las misiones activas. Nunca hace fallar lo que la llama (si algo sale mal, solo se anota en los logs).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { missionItems, type StatCounts } from './game.js';

export async function recordProgress(db: SupabaseClient, userId: string | null | undefined, counts: StatCounts): Promise<void> {
  if (!userId) return;
  try {
    const items = missionItems(counts);
    if (!items.length) return;
    const { error } = await db.rpc('add_mission_progress', { p_user: userId, p_items: items });
    if (error) console.error('misiones', error);
  } catch (e) { console.error('misiones', e); }
}
