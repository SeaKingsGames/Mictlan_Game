import type { Intent } from '../core/DuelState.ts';
import { DATA_VERSION } from '../data/index.ts';
import type { Profile } from '../game/profile.ts';
import { supabase } from './supabase.ts';

/**
 * Todo lo que habla con Supabase. Las pantallas no usan `supabase` directo, solo estas funciones.
 * Lo que da recursos (cartas, cacao, jade) solo lo hacen las Edge Functions en el servidor.
 */

function db() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** Mensajes de error de Supabase Auth, en español. */
function authError(message: string): Error {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return new Error('Correo o contraseña incorrectos');
  if (m.includes('already registered') || m.includes('already been registered')) return new Error('Ese correo ya tiene cuenta. Inicia sesión.');
  if (m.includes('password should be')) return new Error('La contraseña debe tener al menos 6 caracteres');
  if (m.includes('email not confirmed')) return new Error('Confirma tu correo (revisa tu bandeja) y vuelve a entrar');
  if (m.includes('anonymous sign-ins are disabled')) return new Error('El modo invitado no está activado en Supabase');
  if (m.includes('rate limit')) return new Error('Demasiados intentos. Espera un momento.');
  return new Error(message);
}

// ---------------------------------------------------------------- sesión

export async function hasSession(): Promise<boolean> {
  const { data } = await db().auth.getSession();
  return data.session !== null;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw authError(error.message);
}

/** Crea la cuenta. Devuelve true si Supabase pide confirmar el correo antes de entrar. */
export async function signUp(email: string, password: string, username: string): Promise<boolean> {
  const { data, error } = await db().auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw authError(error.message);
  return data.session === null;
}

/** Jugar como invitado (cuenta anónima: se pierde si cierras sesión o borras el navegador). */
export async function signInGuest(): Promise<void> {
  const { error } = await db().auth.signInAnonymously();
  if (error) throw authError(error.message);
}

/** Convierte la cuenta de invitado en una cuenta con correo, sin perder el progreso. */
export async function upgradeGuest(email: string, password: string): Promise<void> {
  const { error } = await db().auth.updateUser({ email, password });
  if (error) throw authError(error.message);
}

export async function signOut(): Promise<void> {
  await db().auth.signOut();
}

// ---------------------------------------------------------------- perfil

/** Baja tu perfil completo de la nube con la misma forma que el perfil local. */
export async function loadCloudProfile(): Promise<Profile> {
  const sb = db();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Sin sesión');
  const [p, coll, deck, prog] = await Promise.all([
    sb.from('profiles').select('username, cacao, jade, wins, losses, packs_since_ur').eq('id', user.id).single(),
    sb.from('collection').select('card_id, count, level').eq('user_id', user.id),
    sb.from('decks').select('cards').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    sb.from('campaign_progress').select('duelist_id, wins').eq('user_id', user.id),
  ]);
  const err = p.error ?? coll.error ?? deck.error ?? prog.error;
  if (err) throw new Error(err.message);
  if (!p.data) throw new Error('No se encontró tu perfil');
  const me = p.data;

  const collection: Record<string, number> = {};
  const levels: Record<string, number> = {};
  for (const r of coll.data ?? []) {
    if (r.count > 0) collection[r.card_id] = r.count;
    if (r.level > 1) levels[r.card_id] = r.level;   // el nivel se queda aunque no tengas copias
  }
  return {
    version: 1,
    collection,
    deck: deck.data?.cards ?? [],
    defeated: (prog.data ?? []).filter(r => r.wins > 0).map(r => r.duelist_id),
    levels,
    packsSinceUr: me.packs_since_ur ?? 0,
    wins: me.wins,
    losses: me.losses,
    account: {
      username: me.username ?? null,
      email: user.email ?? null,
      guest: user.is_anonymous ?? false,
      cacao: me.cacao,
      jade: me.jade,
    },
  };
}

// ---------------------------------------------------------------- mazo (se guarda con un pequeño retraso)

let pendingDeck: number[] | null = null;
let deckTimer: ReturnType<typeof setTimeout> | undefined;
let deckSaving: Promise<void> = Promise.resolve();

export function queueDeckSave(deck: readonly number[]): void {
  pendingDeck = [...deck];
  clearTimeout(deckTimer);
  deckTimer = setTimeout(() => { void flushDeck(); }, 800);
}

/** Guarda ya el mazo pendiente (antes de un duelo, por ejemplo). */
export async function flushDeck(): Promise<void> {
  clearTimeout(deckTimer);
  if (!pendingDeck) return deckSaving;
  const cards = pendingDeck;
  pendingDeck = null;
  deckSaving = deckSaving.then(async () => {
    const sb = db();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return;
    const { error } = await sb.from('decks').update({ cards, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user.id).eq('is_active', true);
    if (error) console.error('No se guardó el mazo', error);
  });
  return deckSaving;
}

// ---------------------------------------------------------------- duelos

/** Mensaje legible del error de una Edge Function (con su `code`, si lo trae). */
export async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    let code: string | undefined;
    if (ctx && typeof ctx.json === 'function') {
      try { const j = await ctx.json(); if (j?.error) message = j.error; code = j?.code; } catch { /* sin cuerpo */ }
    }
    throw Object.assign(new Error(message), { code });
  }
  return data as T;
}

export interface CloudDuel { duelId: string; seed: number; deck: number[]; levels: Record<number, number> }

export function startCloudDuel(duelistId: string): Promise<CloudDuel> {
  return invoke<CloudDuel>('duel-start', { duelistId, dataVersion: DATA_VERSION });
}

export interface CloudDuelResult {
  won: boolean;
  firstWin: boolean;
  cacao: number;
  jade: number;
  cards: { id: number; converted: boolean; cacao?: number; jade?: number }[];
  balance: { cacao: number; jade: number; wins: number; losses: number };
}

export function finishCloudDuel(duelId: string, intents: readonly Intent[]): Promise<CloudDuelResult> {
  return invoke<CloudDuelResult>('duel-finish', { duelId, intents });
}

// ---------------------------------------------------------------- crecer cartas (Fase B)

export interface LevelUpResult { ok: true; cardId: number; level: number; cacao: number }
export interface AscendResult { ok: true; cardId: number; resultId: number; base: number; result: number; deck: number[] }

export async function levelUpCloud(cardId: number): Promise<LevelUpResult> {
  await flushDeck();
  return invoke<LevelUpResult>('card-upgrade', { action: 'levelUp', cardId, dataVersion: DATA_VERSION });
}

export async function ascendCloud(cardId: number): Promise<AscendResult> {
  await flushDeck();   // que el servidor vea tu mazo actual antes de recortarlo
  return invoke<AscendResult>('card-upgrade', { action: 'ascend', cardId, dataVersion: DATA_VERSION });
}

// ---------------------------------------------------------------- sobres (tienda)

export interface PackCardResult { id: number; converted: boolean; cacao?: number; jade?: number }
export interface OpenPacksResult { ok: true; packs: { cards: PackCardResult[]; pity: boolean }[]; jade: number; cacao: number; sinceUr: number }

export function openPacksCloud(packId: string, count: number): Promise<OpenPacksResult> {
  return invoke<OpenPacksResult>('pack-open', { packId, count, dataVersion: DATA_VERSION });
}
