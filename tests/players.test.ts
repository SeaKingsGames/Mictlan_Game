import { describe, expect, it } from 'vitest';
import sql from '../supabase/migrations/20261121000000_jugadores.sql?raw';
import { PLAYER_MILESTONES, playerMilestone, playersLabel } from '../src/net/players.ts';

describe('contador de jugadores', () => {
  it('redondea hacia abajo a una cifra bonita', () => {
    expect(playerMilestone(0)).toBe(0);
    expect(playerMilestone(9)).toBe(0);
    expect(playerMilestone(10)).toBe(10);
    expect(playerMilestone(24)).toBe(10);
    expect(playerMilestone(25)).toBe(25);
    expect(playerMilestone(99)).toBe(50);
    expect(playerMilestone(100)).toBe(100);
    expect(playerMilestone(1234)).toBe(1000);
    expect(playerMilestone(3_000_000)).toBe(1_000_000);
  });
  it('no muestra nada con menos de 10', () => {
    expect(playersLabel(7)).toBeNull();
    expect(playersLabel(12)).toBe('+10 jugadores');
    expect(playersLabel(60)).toBe('+50 jugadores');
    expect(playersLabel(2600)).toBe('+2,500 jugadores');
  });
  it('usa las mismas cifras que la función SQL', () => {
    const list = sql.match(/array\[([\d,\s]+)\]/)?.[1].split(',').map(s => Number(s.trim()));
    expect(list).toEqual(PLAYER_MILESTONES);
  });
});
