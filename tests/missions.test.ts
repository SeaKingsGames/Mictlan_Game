import { describe, expect, it } from 'vitest';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent } from '../src/core/DuelState.ts';
import { getDuelist } from '../src/game/duelists.ts';
import {
  activeMissions, DAILY_COUNT, DAILY_POOL, dayKey, duelProgress, LOGIN_REWARDS, loginStatus, progressItems, WEEKLY_COUNT, WEEKLY_POOL, weekKey,
} from '../src/game/missions.ts';
import { createDuel, replayDuel } from '../src/game/replay.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { missionItems, verifyDuel } from '../src/server/rules.ts';

const at = (iso: string) => Date.parse(iso);

describe('periodos (hora de México)', () => {
  it('el día cambia a la medianoche de México (06:00 UTC)', () => {
    expect(dayKey(at('2026-11-05T05:59:00Z'))).toBe('2026-11-04');
    expect(dayKey(at('2026-11-05T06:00:00Z'))).toBe('2026-11-05');
  });
  it('semana ISO, de lunes a domingo', () => {
    expect(weekKey(at('2026-11-05T18:00:00Z'))).toBe('2026-W45');
    expect(weekKey(at('2026-11-02T07:00:00Z'))).toBe('2026-W45');   // lunes
    expect(weekKey(at('2026-11-09T05:00:00Z'))).toBe('2026-W45');   // domingo 23:00 en México
    expect(weekKey(at('2026-11-09T07:00:00Z'))).toBe('2026-W46');
    expect(weekKey(at('2027-01-01T18:00:00Z'))).toBe('2026-W53');
  });
});

describe('misiones al azar', () => {
  it('3 diarias y 4 semanales, sin repetir lo que cuentan, iguales todo el día', () => {
    const a = activeMissions(at('2026-11-05T07:00:00Z'));
    const b = activeMissions(at('2026-11-06T05:00:00Z'));
    expect(a).toEqual(b);
    const daily = a.filter(m => m.kind === 'daily'), weekly = a.filter(m => m.kind === 'weekly');
    expect(daily).toHaveLength(DAILY_COUNT);
    expect(weekly).toHaveLength(WEEKLY_COUNT);
    expect(new Set(daily.map(m => m.stat)).size).toBe(DAILY_COUNT);
    expect(new Set(weekly.map(m => m.stat)).size).toBe(WEEKLY_COUNT);
  });
  it('cambian solas: las diarias cada día y las semanales cada semana', () => {
    const days = new Set<string>(), weeks = new Set<string>();
    for (let d = 0; d < 28; d++) {
      const ms = activeMissions(at('2026-11-02T12:00:00Z') + d * 86_400_000);
      days.add(ms.filter(m => m.kind === 'daily').map(m => m.id).join());
      weeks.add(ms.filter(m => m.kind === 'weekly').map(m => m.id).join());
    }
    expect(days.size).toBeGreaterThan(15);
    expect(weeks.size).toBe(4);
  });
  it('ids únicos en las listas', () => {
    const ids = [...DAILY_POOL, ...WEEKLY_POOL].map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('el progreso solo va a misiones activas y del mismo tipo', () => {
    const now = at('2026-11-05T18:00:00Z');
    const items = progressItems({ duel_play: 1, duel_win: 1, fusion: 3, damage: 9000, pack_open: 1, spin: 1, pvp_play: 1 }, now);
    const active = activeMissions(now);
    for (const it of items) {
      const m = active.find(x => x.id === it.mission)!;
      expect(m.period).toBe(it.period);
      expect(it.target).toBe(m.target);
    }
    expect(missionItems({}, now)).toEqual([]);
  });
});

describe('entrada diaria', () => {
  const now = at('2026-11-05T18:00:00Z');
  it('primera vez = día 1', () => expect(loginStatus({ streak: 0, lastDay: null }, now)).toMatchObject({ day: 1, claimed: false }));
  it('ayer = sigue la racha', () => expect(loginStatus({ streak: 3, lastDay: '2026-11-04' }, now).day).toBe(4));
  it('fallaste un día = vuelve al 1', () => expect(loginStatus({ streak: 5, lastDay: '2026-11-02' }, now).day).toBe(1));
  it('hoy ya cobrado', () => expect(loginStatus({ streak: 2, lastDay: '2026-11-05' }, now)).toMatchObject({ day: 2, claimed: true }));
  it('después del día 7 vuelve a empezar', () => {
    expect(loginStatus({ streak: 7, lastDay: '2026-11-04' }, now).day).toBe(1);
    expect(LOGIN_REWARDS[6].gold).toBe(1);
  });
});

describe('estadísticas del duelo (las calcula el servidor al repetirlo)', () => {
  it('el servidor cuenta fusiones, daño y victoria del duelo repetido', () => {
    const rival = getDuelist('tianguis')!;
    const deck = [...rival.deck];
    let checked = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const engine = createDuel(seed, deck, rival, cardDb, fusionDb);
      engine.start();
      const intents: Intent[] = [];
      for (let g = 0; engine.state.winner === null && g < 3000; g++) {
        if (engine.state.turnPlayer === 1) {
          const r = engine.apply(nextAiIntent(engine.state, 1, rival.level >= 2 ? fusionDb : undefined));
          if (!r.ok) engine.apply({ type: 'endTurn', player: 1 });
          continue;
        }
        let it: Intent = nextAiIntent(engine.state, 0, fusionDb);
        let r = engine.apply(it);
        if (!r.ok) { it = { type: 'endTurn', player: 0 }; r = engine.apply(it); }
        intents.push(it);
      }
      const rep = replayDuel({ seed, playerDeck: deck, opponent: rival, intents }, cardDb, fusionDb);
      expect(rep.ok).toBe(true);
      if (!rep.ok || !rep.stats) continue;
      expect(rep.stats.won).toBe(rep.winner === 0);
      expect(rep.stats.turns).toBe(rep.turns);
      if (rep.stats.won) expect(rep.stats.damage).toBeGreaterThan(0);
      const v = verifyDuel({ seed, deck, duelistId: rival.id, intents });
      expect(v.ok).toBe(true);
      if (v.ok) {
        expect(v.value.progress.duel_play).toBe(1);
        expect(v.value.progress.duel_win ?? 0).toBe(v.value.won ? 1 : 0);
        expect(v.value.progress).toEqual(duelProgress(rep.stats, { pvp: false, chapter2: false }));
      }
      checked++;
    }
    expect(checked).toBe(6);
  });
});
