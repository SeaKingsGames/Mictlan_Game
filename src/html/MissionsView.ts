import { CURRENCY } from '../game/config.ts';
import { LOGIN_REWARDS, msToNextDay, msToNextWeek, rewardText, type Reward } from '../game/missions.ts';
import type { Profile } from '../game/profile.ts';
import { claimDaily, claimMission, loadRewards, type MissionRow, type RewardsState } from '../net/rewards.ts';
import { h } from './dom.ts';
import { appScreen, wallets } from './shell.ts';
import { sfx } from './sound.ts';

const ICONS = { cacao: CURRENCY.common.icon, jade: CURRENCY.premium.icon, tickets: CURRENCY.ticket.icon, gold: CURRENCY.gold.icon };
export const rewardLabel = (r: Reward): string => rewardText(r, ICONS);
const err = (e: unknown) => (e instanceof Error ? e.message : String(e));

function countdown(ms: number): string {
  const d = Math.floor(ms / 86_400_000), hrs = Math.floor(ms / 3_600_000) % 24, min = Math.floor(ms / 60_000) % 60;
  return d > 0 ? `${d} d ${hrs} h` : `${hrs} h ${String(min).padStart(2, '0')} min`;
}

/** Fila de los 7 días de la entrada diaria. */
export function dailyStrip(st: RewardsState['daily']): HTMLElement {
  return h('ol', { class: 'daily' }, ...LOGIN_REWARDS.map((r, i) => {
    const n = i + 1;
    const done = n < st.day || (n === st.day && st.claimed);
    const today = n === st.day && !st.claimed;
    return h('li', { class: `daily__day${done ? ' daily__day--done' : ''}${today ? ' daily__day--today' : ''}${n === 7 ? ' daily__day--big' : ''}` },
      h('small', {}, `Día ${n}`),
      h('b', {}, done ? '✓' : rewardLabel(r)));
  }));
}

/**
 * Misiones (#/misiones): entrada diaria, 3 misiones del día y 4 de la semana.
 * Las misiones se eligen solas al azar cada día y cada semana (ver src/game/missions.ts).
 */
export function renderMissions(root: HTMLElement, profile: Profile, go: (hash: string) => void, cloud: boolean): () => void {
  const bar = h('div', { class: 'app-bar__wallets' });
  const body = h('div', { class: 'mis__body' });
  root.replaceChildren(appScreen({ cls: 'mis', title: 'Misiones', back: () => go('#/'), right: bar }, body));
  const paintBar = () => bar.replaceChildren(...wallets(profile));
  paintBar();
  let state: RewardsState | null = null;
  let alive = true;
  const timer = setInterval(() => { if (state) paintClocks(); }, 30_000);

  if (!cloud || !profile.account) {
    body.replaceChildren(h('p', { class: 'empty' }, 'Las misiones y la recompensa diaria necesitan una cuenta en línea.'));
    return () => clearInterval(timer);
  }
  if (profile.account.guest) {
    body.replaceChildren(h('div', { class: 'mis__guest panel' },
      h('p', {}, 'Guarda tu cuenta con correo para cobrar misiones y la recompensa diaria.'),
      h('button', { class: 'big-btn big-btn--main', onclick: () => go('#/cuenta') }, 'Guardar mi cuenta')));
    return () => clearInterval(timer);
  }
  body.replaceChildren(h('p', { class: 'empty' }, 'Cargando…'));

  const load = async () => {
    try { state = await loadRewards(profile); } catch (e) { body.replaceChildren(h('p', { class: 'warn-box' }, err(e))); return; }
    if (alive) { paintBar(); paint(); }
  };

  function paintClocks(): void {
    body.querySelectorAll<HTMLElement>('[data-clock]').forEach(el => {
      el.textContent = `Cambian en ${countdown(el.dataset.clock === 'week' ? msToNextWeek() : msToNextDay())}`;
    });
  }

  function missionRow(m: MissionRow): HTMLElement {
    const done = m.progress >= m.target;
    const btn = h('button', { class: `big-btn${done && !m.claimed ? ' big-btn--main' : ''} mis__claim`, disabled: !done || m.claimed },
      m.claimed ? '✓ Cobrada' : done ? 'Cobrar' : `${m.progress.toLocaleString('es-MX')}/${m.target.toLocaleString('es-MX')}`);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await claimMission(profile, m);
        sfx('coin');
        m.claimed = true;
        paintBar(); paint();
      } catch (e) { sfx('error'); btn.disabled = false; btn.textContent = err(e); }
    });
    return h('li', { class: `mis__row${m.claimed ? ' mis__row--claimed' : done ? ' mis__row--done' : ''}` },
      h('div', { class: 'mis__info' },
        h('b', {}, m.text),
        h('div', { class: 'meter mis__meter' }, h('span', { style: `width:${Math.min(100, (m.progress / m.target) * 100)}%` })),
        h('small', {}, `Premio: ${rewardLabel(m.reward)}`)),
      btn);
  }

  function paint(): void {
    if (!state) return;
    const st = state;
    const claimBtn = h('button', { class: `big-btn${st.daily.claimed ? '' : ' big-btn--main'}`, disabled: st.daily.claimed },
      st.daily.claimed ? '✓ Ya cobraste hoy · vuelve mañana' : `Cobrar día ${st.daily.day}: ${rewardLabel(st.daily.reward)}`);
    claimBtn.addEventListener('click', async () => {
      claimBtn.disabled = true;
      try { await claimDaily(profile); sfx('level'); st.daily.claimed = true; paintBar(); paint(); }
      catch (e) { sfx('error'); claimBtn.disabled = false; claimBtn.textContent = err(e); }
    });
    const daily = st.missions.filter(m => m.kind === 'daily');
    const weekly = st.missions.filter(m => m.kind === 'weekly');
    body.replaceChildren(
      h('section', { class: 'panel mis__login' },
        h('div', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, '☀ Entrada diaria'), h('span', { class: 'panel__count' }, 'Entra 7 días seguidos: el día 7 trae ticket oro')),
        dailyStrip(st.daily), claimBtn),
      h('section', { class: 'panel mis__list' },
        h('div', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, 'Misiones del día'), h('span', { class: 'panel__count', 'data-clock': 'day' })),
        h('ul', { class: 'mis__rows' }, ...daily.map(missionRow))),
      h('section', { class: 'panel mis__list' },
        h('div', { class: 'panel__head' }, h('h2', { class: 'panel__title' }, 'Misiones de la semana'), h('span', { class: 'panel__count', 'data-clock': 'week' })),
        h('ul', { class: 'mis__rows' }, ...weekly.map(missionRow))));
    paintClocks();
  }

  void load();
  return () => { alive = false; clearInterval(timer); };
}

/** Ventana al entrar al menú si no has cobrado hoy. */
export function showDailyPopup(profile: Profile, st: RewardsState, onDone: () => void): void {
  if (st.daily.claimed || document.querySelector('.daily-pop')) return;
  const msg = h('p', { class: 'opening__hint' });
  const btn = h('button', { class: 'big-btn big-btn--main' }, `Cobrar ${rewardLabel(st.daily.reward)}`);
  const ov = h('div', { class: 'opening daily-pop', role: 'dialog', 'aria-modal': 'true' },
    h('h2', { class: 'opening__title' }, `☀ Recompensa del día ${st.daily.day}`),
    h('p', { class: 'opening__hint' }, 'Entra cada día para no perder la racha. El día 7 trae un ticket oro.'),
    dailyStrip(st.daily),
    msg,
    h('div', { class: 'opening__actions' }, btn, h('button', { class: 'big-btn', onclick: () => ov.remove() }, 'Luego')));
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await claimDaily(profile);
      sfx('level');
      st.daily.claimed = true;
      ov.remove();
      onDone();
    } catch (e) { sfx('error'); msg.textContent = err(e); btn.disabled = false; }
  });
  document.body.append(ov);
}
