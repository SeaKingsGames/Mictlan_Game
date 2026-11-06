import { createRng } from '../core/rng.ts';
import { shopDay } from './cardShop.ts';
import type { DuelStats } from './duelStats.ts';

/**
 * MISIONES Y RECOMPENSA DIARIA
 *
 * Las misiones se eligen SOLAS al azar de estas listas, igual para todos los jugadores:
 *  - 3 diarias, cambian cada día a la medianoche de México
 *  - 4 semanales, cambian cada lunes
 * No hace falta programar nada: el "azar" sale de la fecha. Para agregar misiones nuevas,
 * copia una línea de DAILY_POOL o WEEKLY_POOL (el id no debe repetirse).
 *
 * stat = qué cuenta:
 *   duel_play / duel_win   duelos contra duelistas (campaña o duelo libre)
 *   pvp_play / pvp_win     duelos contra otros jugadores
 *   fusion, spell, trap, destroy, damage   lo que hiciste en cualquier duelo
 *   night_win              ganar de noche · big_win ganar con 5000 PV o más · fast_win ganar en 12 turnos o menos
 *   chapter2_win           ganarle a un duelista del Capítulo 2
 *   pack_open, market_buy, spin, level_up   sobres, mercado, ruleta, subir de nivel
 */
export type MissionStat =
  | 'duel_play' | 'duel_win' | 'pvp_play' | 'pvp_win' | 'fusion' | 'spell' | 'trap' | 'destroy' | 'damage'
  | 'night_win' | 'big_win' | 'fast_win' | 'chapter2_win' | 'pack_open' | 'market_buy' | 'spin' | 'level_up';

export interface Reward { cacao?: number; jade?: number; tickets?: number; gold?: number }
export interface MissionDef { id: string; stat: MissionStat; target: number; text: string; reward: Reward }
export type MissionKind = 'daily' | 'weekly';

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 4;

export const DAILY_POOL: readonly MissionDef[] = [
  { id: 'd-win-2', stat: 'duel_win', target: 2, text: 'Gana 2 duelos contra duelistas', reward: { cacao: 150 } },
  { id: 'd-play-3', stat: 'duel_play', target: 3, text: 'Juega 3 duelos contra duelistas', reward: { cacao: 100, tickets: 1 } },
  { id: 'd-fusion-5', stat: 'fusion', target: 5, text: 'Haz 5 fusiones', reward: { cacao: 120 } },
  { id: 'd-spell-4', stat: 'spell', target: 4, text: 'Usa 4 mágicas o equipos', reward: { cacao: 100 } },
  { id: 'd-trap-2', stat: 'trap', target: 2, text: 'Haz que salten 2 trampas', reward: { cacao: 120 } },
  { id: 'd-destroy-8', stat: 'destroy', target: 8, text: 'Destruye 8 monstruos rivales', reward: { cacao: 150 } },
  { id: 'd-damage-8000', stat: 'damage', target: 8000, text: 'Haz 8,000 de daño a tus rivales', reward: { cacao: 150 } },
  { id: 'd-night-1', stat: 'night_win', target: 1, text: 'Gana un duelo de noche (Ocaso o Medianoche)', reward: { cacao: 150, tickets: 1 } },
  { id: 'd-pack-1', stat: 'pack_open', target: 1, text: 'Abre 1 sobre', reward: { cacao: 100 } },
  { id: 'd-spin-1', stat: 'spin', target: 1, text: 'Gira la ruleta 1 vez', reward: { cacao: 200 } },
  { id: 'd-pvp-1', stat: 'pvp_play', target: 1, text: 'Juega 1 duelo contra otro jugador', reward: { cacao: 150, tickets: 2 } },
  { id: 'd-level-1', stat: 'level_up', target: 1, text: 'Sube de nivel 1 carta', reward: { tickets: 2 } },
];

export const WEEKLY_POOL: readonly MissionDef[] = [
  { id: 'w-win-15', stat: 'duel_win', target: 15, text: 'Gana 15 duelos contra duelistas', reward: { jade: 150, tickets: 3 } },
  { id: 'w-fusion-40', stat: 'fusion', target: 40, text: 'Haz 40 fusiones', reward: { jade: 100, cacao: 300 } },
  { id: 'w-destroy-50', stat: 'destroy', target: 50, text: 'Destruye 50 monstruos rivales', reward: { jade: 100, cacao: 300 } },
  { id: 'w-damage-60000', stat: 'damage', target: 60000, text: 'Haz 60,000 de daño a tus rivales', reward: { jade: 150 } },
  { id: 'w-night-5', stat: 'night_win', target: 5, text: 'Gana 5 duelos de noche', reward: { jade: 100, tickets: 3 } },
  { id: 'w-big-3', stat: 'big_win', target: 3, text: 'Gana 3 duelos con 5,000 PV o más', reward: { jade: 150 } },
  { id: 'w-fast-3', stat: 'fast_win', target: 3, text: 'Gana 3 duelos en 12 turnos o menos', reward: { jade: 150 } },
  { id: 'w-ch2-3', stat: 'chapter2_win', target: 3, text: 'Vence 3 veces a duelistas de La Guerra Florida', reward: { jade: 150, gold: 1 } },
  { id: 'w-pvp-5', stat: 'pvp_win', target: 5, text: 'Gana 5 duelos contra otros jugadores', reward: { jade: 200, gold: 1 } },
  { id: 'w-pack-5', stat: 'pack_open', target: 5, text: 'Abre 5 sobres', reward: { cacao: 500, tickets: 3 } },
  { id: 'w-market-3', stat: 'market_buy', target: 3, text: 'Compra 3 cartas en el mercado', reward: { jade: 100 } },
  { id: 'w-level-5', stat: 'level_up', target: 5, text: 'Sube de nivel 5 cartas', reward: { jade: 100, tickets: 3 } },
];

/** Recompensa por entrar cada día (7 días seguidos; si fallas un día, vuelves al día 1). */
export const LOGIN_REWARDS: readonly Reward[] = [
  { cacao: 200 },
  { tickets: 3 },
  { cacao: 400 },
  { jade: 50 },
  { cacao: 600, tickets: 3 },
  { jade: 100 },
  { jade: 150, gold: 1 },
];

// ---------------------------------------------------------------- periodos

/** Día de juego (cambia a la medianoche de México): "2026-11-05". */
export const dayKey = (now = Date.now()): string => shopDay(now);

/** Semana de juego (lunes a domingo, hora de México): "2026-W45". */
export function weekKey(now = Date.now()): string {
  const d = new Date(dayKey(now) + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;                 // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow + 3);              // jueves de esa semana (regla ISO)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86_400_000 - 3 + ((yearStart.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Milisegundos para que cambien las diarias / las semanales. */
export function msToNextDay(now = Date.now()): number {
  const shifted = now - 6 * 3600_000;
  return 86_400_000 - (shifted % 86_400_000);
}
export function msToNextWeek(now = Date.now()): number {
  const d = new Date(dayKey(now) + 'T00:00:00Z');
  const daysLeft = 6 - ((d.getUTCDay() + 6) % 7);
  return msToNextDay(now) + daysLeft * 86_400_000;
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Elige `count` misiones del pool, sin repetir lo que cuentan, con la fecha como semilla. */
function pick(pool: readonly MissionDef[], count: number, key: string): MissionDef[] {
  const rng = createRng(hash(key));
  const left = [...pool];
  const out: MissionDef[] = [];
  while (out.length < count && left.length) {
    const m = left.splice(Math.floor(rng() * left.length), 1)[0];
    if (out.some(x => x.stat === m.stat)) continue;
    out.push(m);
  }
  return out;
}

export interface ActiveMission extends MissionDef { kind: MissionKind; period: string }

/** Las misiones de hoy y de esta semana. */
export function activeMissions(now = Date.now()): ActiveMission[] {
  const day = dayKey(now), week = weekKey(now);
  return [
    ...pick(DAILY_POOL, DAILY_COUNT, 'dia:' + day).map(m => ({ ...m, kind: 'daily' as const, period: day })),
    ...pick(WEEKLY_POOL, WEEKLY_COUNT, 'semana:' + week).map(m => ({ ...m, kind: 'weekly' as const, period: week })),
  ];
}

export function findActiveMission(period: string, id: string, now = Date.now()): ActiveMission | undefined {
  return activeMissions(now).find(m => m.period === period && m.id === id);
}

// ---------------------------------------------------------------- progreso

export type StatCounts = Partial<Record<MissionStat, number>>;

/** Lo que suma un duelo a las misiones. */
export function duelProgress(stats: DuelStats | undefined, opts: { pvp: boolean; chapter2?: boolean }): StatCounts {
  const out: StatCounts = opts.pvp ? { pvp_play: 1 } : { duel_play: 1 };
  if (!stats) return out;
  if (stats.won) {
    if (opts.pvp) out.pvp_win = 1; else out.duel_win = 1;
    if (stats.nightWin) out.night_win = 1;
    if (stats.lifeLeft >= 5000) out.big_win = 1;
    if (stats.turns <= 12) out.fast_win = 1;
    if (opts.chapter2) out.chapter2_win = 1;
  }
  if (stats.fusions) out.fusion = stats.fusions;
  if (stats.spells) out.spell = stats.spells;
  if (stats.traps) out.trap = stats.traps;
  if (stats.destroyed) out.destroy = stats.destroyed;
  if (stats.damage) out.damage = stats.damage;
  return out;
}

/** Qué filas de progreso actualizar para estas cuentas (solo misiones activas). */
export function progressItems(counts: StatCounts, now = Date.now()): { period: string; mission: string; target: number; amount: number }[] {
  return activeMissions(now)
    .filter(m => (counts[m.stat] ?? 0) > 0)
    .map(m => ({ period: m.period, mission: m.id, target: m.target, amount: Math.floor(counts[m.stat]!) }));
}

// ---------------------------------------------------------------- entrada diaria

export interface LoginState { streak: number; lastDay: string | null }

/** Qué día de la racha toca hoy. claimed = ya cobraste hoy. */
export function loginStatus(st: LoginState, now = Date.now()): { today: string; day: number; claimed: boolean; reward: Reward } {
  const today = dayKey(now);
  if (st.lastDay === today) {
    const day = ((Math.max(1, st.streak) - 1) % LOGIN_REWARDS.length) + 1;
    return { today, day, claimed: true, reward: LOGIN_REWARDS[day - 1] };
  }
  const gap = st.lastDay ? Math.round((Date.parse(today) - Date.parse(st.lastDay)) / 86_400_000) : 99;
  const streak = gap === 1 ? st.streak + 1 : 1;
  const day = ((streak - 1) % LOGIN_REWARDS.length) + 1;
  return { today, day, claimed: false, reward: LOGIN_REWARDS[day - 1] };
}

/** "200 🫘 · 3 🎟" */
export function rewardText(r: Reward, icons: { cacao: string; jade: string; tickets: string; gold: string }): string {
  const parts: string[] = [];
  if (r.jade) parts.push(`${r.jade} ${icons.jade}`);
  if (r.cacao) parts.push(`${r.cacao} ${icons.cacao}`);
  if (r.tickets) parts.push(`${r.tickets} ${icons.tickets}`);
  if (r.gold) parts.push(`${r.gold} ${icons.gold}`);
  return parts.join(' · ');
}
