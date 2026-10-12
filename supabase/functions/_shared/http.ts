// Utilidades compartidas por las Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Cliente con la llave de servicio: puede escribir monedas y cartas. NUNCA va al navegador. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Quién hace la petición (según su token de sesión). */
export async function currentUser(req: Request, db: SupabaseClient): Promise<User | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

/** Envuelve una función: CORS, solo POST, JSON y errores legibles. */
export function handler(fn: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405);
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      if (text.length > 512_000) return json({ error: 'Petición demasiado grande' }, 413);
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: 'JSON inválido' }, 400);
    }
    try {
      return await fn(req, body);
    } catch (e) {
      console.error(e);
      return json({ error: 'Error del servidor' }, 500);
    }
  };
}
