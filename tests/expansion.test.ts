import { describe, expect, it } from 'vitest';
import cardsJson from '../src/data/cards.json';
import fusionsJson from '../src/data/fusions.json';
import { nextAiIntent } from '../src/ai/aiPlayer.ts';
import type { Intent } from '../src/core/DuelState.ts';
import { CardDatabase } from '../src/data/cardDatabase.ts';
import { FusionDatabase, type FusionData } from '../src/data/fusionDatabase.ts';
import { cardDb, fusionDb } from '../src/data/index.ts';
import { SETS } from '../src/data/sets/index.ts';
import { rarityOf, type CardDef } from '../src/data/types.ts';
import { duelists, getDuelist } from '../src/game/duelists.ts';
import { packPool, packs } from '../src/game/packs.ts';
import { createPvpDuel, replayPvp } from '../src/game/replay.ts';

const set = SETS[0];
const setIds = new Set(set.cards.map(c => c.id));

describe(`expansión: ${set.name}`, () => {
  it('120 cartas nuevas, sin chocar con las de la base', () => {
    expect(set.cards).toHaveLength(120);
    for (const c of set.cards) expect(cardDb.get(c.id).set).toBe(set.id);
    expect(cardDb.size).toBe((cardsJson as unknown[]).length + set.cards.filter(c => !(cardsJson as CardDef[]).some(b => b.id === c.id)).length);
  });

  it('3 sobres de 40 cartas: 14 N · 13 R · 9 SR · 4 UR', () => {
    expect(set.packs).toHaveLength(3);
    for (const sp of set.packs) {
      const p = packs.find(x => x.id === sp.id)!;
      const pool = packPool(p, cardDb);
      expect([pool.N.length, pool.R.length, pool.SR.length, pool.UR.length], p.id).toEqual([14, 13, 9, 4]);
      for (const list of Object.values(pool)) for (const c of list) expect(c.set).toBe(set.id);
    }
  });

  it('los sobres base no traen cartas de la expansión', () => {
    for (const p of packs.filter(x => !x.set)) {
      for (const list of Object.values(packPool(p, cardDb))) for (const c of list) expect(setIds.has(c.id), `${p.id}: ${c.name}`).toBe(false);
    }
  });

  it('3 duelistas en el capítulo 2, después de la campaña base, con mazos válidos', () => {
    const ids = set.duelists.map(d => d.id);
    expect(duelists.slice(-3).map(d => d.id)).toEqual(ids);
    for (const d of set.duelists) {
      expect(cardDb.validateDeck({ id: d.id, name: d.name, cards: d.deck })).toEqual([]);
      expect(d.deck).toHaveLength(40);
    }
  });

  it('cada duelista suelta su sobre menos las 4 UR y 2 SR; su carta firma sí se puede ganar', () => {
    set.duelists.forEach((d, i) => {
      const pool = Object.values(packPool(packs.find(p => p.id === set.packs[i].id)!, cardDb)).flat().map(c => c.id);
      const drops = d.rewards.map(r => r.card);
      expect(new Set(drops).size).toBe(drops.length);
      expect(drops.every(id => pool.includes(id))).toBe(true);
      expect(drops).toHaveLength(34);
      expect(drops.some(id => rarityOf(cardDb.get(id)) === 'UR')).toBe(false);
      expect(pool.filter(id => !drops.includes(id)).map(id => rarityOf(cardDb.get(id))).sort()).toEqual(['SR', 'SR', 'UR', 'UR', 'UR', 'UR']);
      expect(drops).toContain(d.signature);
    });
  });

  it('las fusiones cargan sin problemas y las recetas nuevas funcionan', () => {
    expect(fusionDb.problems).toEqual([]);
    for (const c of set.cards) for (const [a, b] of c.recipes ?? []) {
      expect(fusionDb.tryFuse(cardDb.get(a), cardDb.get(b))?.id, c.name).toBe(c.id);
    }
    // sacerdote + fuego ya da algo
    expect(fusionDb.tryFuse(cardDb.get(181), cardDb.get(186))).not.toBeNull();
  });

  it('las cartas nuevas no empeoran ninguna fusión de las cartas base', () => {
    const baseDb = new CardDatabase(cardsJson as CardDef[]);
    const baseFusion = new FusionDatabase(fusionsJson as FusionData, baseDb);
    const mons = baseDb.all().filter(c => c.type === 'monster');
    for (const a of mons) for (const b of mons) {
      const before = baseFusion.tryFuse(a, b);
      const after = fusionDb.tryFuse(cardDb.get(a.id), cardDb.get(b.id));
      if (before) expect(after!.atk, `${a.name} + ${b.name}`).toBeGreaterThanOrEqual(before.atk);
    }
  });

  it('los duelistas nuevos juegan duelos completos (IA contra IA) y la repetición coincide', () => {
    const boss = getDuelist('mictlantecuhtli')!;
    const rivals = [boss, ...set.duelists.map(d => getDuelist(d.id)!)];
    let games = 0;
    for (const d of set.duelists) for (const r of rivals) {
      if (r.id === d.id) continue;
      for (let seed = 1; seed <= 3; seed++) {
        const setup = { seed: seed * 131 + games, decks: [d.deck, r.deck] as [number[], number[]], levels: [{}, {}] as [Record<number, number>, Record<number, number>] };
        const engine = createPvpDuel(setup, cardDb, fusionDb);
        engine.start();
        const intents: Intent[] = [];
        for (let guard = 0; engine.state.winner === null && guard < 3000; guard++) {
          const p = engine.state.turnPlayer;
          let it: Intent = nextAiIntent(engine.state, p, fusionDb);
          let res = engine.apply(it);
          if (!res.ok) { it = { type: 'endTurn', player: p }; res = engine.apply(it); }
          expect(res.ok).toBe(true);
          intents.push(it);
        }
        expect(engine.state.winner).not.toBeNull();
        const replay = replayPvp(setup, JSON.parse(JSON.stringify(intents)), cardDb, fusionDb);
        expect(replay.ok && replay.winner).toBe(engine.state.winner);
        games++;
      }
    }
    expect(games).toBe(27);
  }, 60_000);
});
