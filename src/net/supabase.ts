import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Conexión a Supabase. Si faltan las variables (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY),
 * el juego funciona en "modo local": todo se guarda en el navegador, sin cuentas.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const cloudEnabled = supabase !== null;
