import { DATA_VERSION } from '../data/index.ts';
import type { Reward } from '../game/missions.ts';
import type { Profile } from '../game/profile.ts';
import { invoke } from './cloud.ts';

/** Misiones y entrada diaria: todo lo decide la Edge Function "rewards". */
export interface MissionRow {
  id: string; period: string; kind: 'daily' | 'weekly'; text: string; target: number; reward: Reward; progress: number; claimed: boolean;
}
export interface RewardsState {
  daily: { day: number; claimed: boolean; reward: Reward; streak: number };
  missions: MissionRow[];
  wallet: Wallet;
}
interface Wallet { cacao: number; jade: number; tickets: number; gold: number }

const call = <T>(action: string, extra: Record<string, unknown> = {}) => invoke<T>('rewards', { action, dataVersion: DATA_VERSION, ...extra });

function setWallet(p: Profile, w: Wallet): void {
  if (!p.account) return;
  p.account.cacao = w.cacao; p.account.jade = w.jade; p.account.tickets = w.tickets; p.account.gold = w.gold;
}

export async function loadRewards(p: Profile): Promise<RewardsState> {
  const r = await call<RewardsState>('state');
  setWallet(p, r.wallet);
  return r;
}

export async function claimDaily(p: Profile): Promise<{ day: number; reward: Reward }> {
  const r = await call<{ day: number; reward: Reward; wallet: Wallet }>('claimDaily');
  setWallet(p, r.wallet);
  return r;
}

export async function claimMission(p: Profile, m: { period: string; id: string }): Promise<Reward> {
  const r = await call<{ reward: Reward; wallet: Wallet }>('claimMission', { period: m.period, id: m.id });
  setWallet(p, r.wallet);
  return r.reward;
}

/** Cuántas cosas hay por cobrar (para el puntito del menú). */
export const pendingCount = (s: RewardsState): number =>
  (s.daily.claimed ? 0 : 1) + s.missions.filter(m => !m.claimed && m.progress >= m.target).length;
