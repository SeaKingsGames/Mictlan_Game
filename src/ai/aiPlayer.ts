import type { CardInstance } from '../core/CardInstance.ts';
import { FIRST_TURN_CAN_ATTACK } from '../core/DuelEngine.ts';
import { opponentOf, type DuelState, type Intent, type PlayerIndex } from '../core/DuelState.ts';
import { bestFusion, type FusionResolver } from '../core/fusion.ts';

/**
 * IA sencilla: decide UNA intención a la vez (se llama en bucle hasta que termina el turno).
 * Solo usa información que un jugador puede ver: no espía cartas boca abajo ni la mano rival.
 */
export function nextAiIntent(state: DuelState, me: PlayerIndex, fusion?: FusionResolver): Intent {
  const mine = state.players[me];
  const foe = state.players[opponentOf(me)];
  const foeMonsters = foe.field.filter((c): c is CardInstance => c !== null);
  const strongestFoeAtk = Math.max(0, ...foeMonsters.filter(c => !c.faceDown && c.position === 'attack').map(c => c.atk));

  // 1) Fase principal. Orden de la regla: primero (opcional) una mágica/trampa, luego un monstruo.
  if (state.phase === 'main' && mine.hand.length > 0) {
    const myMonsters = mine.field.filter((c): c is CardInstance => c !== null);
    const monsterPlay = state.monsterPlayedThisTurn ? null : chooseMonsterPlay(mine.hand, mine.field, strongestFoeAtk, me, fusion);

    if (!state.supportUsedThisTurn && !state.monsterPlayedThisTurn) {
      const support = chooseSupportPlay(state, me, myMonsters, monsterPlay !== null);
      if (support) return support;
    }
    if (monsterPlay) return monsterPlay.intent;
  }

  // 2) Batalla: atacar donde gane.
  const canAttackThisTurn = (state.turn > 1 || FIRST_TURN_CAN_ATTACK) && state.turn > state.attackLockUntil[me];
  if (canAttackThisTurn) {
    const attackers = mine.field
      .filter((c): c is CardInstance => c !== null && c.position === 'attack' && !c.hasAttackedThisTurn)
      .sort((a, b) => b.atk - a.atk);
    for (const attacker of attackers) {
      if (foeMonsters.length === 0) {
        return { type: 'attack', player: me, attackerId: attacker.instanceId, targetId: null };
      }
      const target = pickTarget(attacker, foeMonsters);
      if (target) return { type: 'attack', player: me, attackerId: attacker.instanceId, targetId: target.instanceId };
      if (attacker.hasKeyword('directAttack')) return { type: 'attack', player: me, attackerId: attacker.instanceId, targetId: null };
    }
  }

  // 3) Nada más que hacer.
  return { type: 'endTurn', player: me };
}

function pickTarget(attacker: CardInstance, targets: CardInstance[]): CardInstance | null {
  // Prefiere destruir monstruos en ataque (hacen daño), del más fuerte que pueda vencer.
  const beatable = targets
    .filter(t => !t.faceDown)
    .filter(t => (t.position === 'attack' ? t.atk < attacker.atk : t.defense < attacker.atk))
    .sort((a, b) => (b.position === 'attack' ? 1 : 0) - (a.position === 'attack' ? 1 : 0) || b.atk - a.atk);
  if (beatable[0]) return beatable[0];
  // Boca abajo = desconocido: se arriesga solo con monstruos fuertes.
  const hidden = targets.find(t => t.faceDown);
  if (hidden && attacker.atk >= 1500) return hidden;
  return null;
}

/** Mejor jugada de monstruo (sola o fusión de 2) y su ATK, o null si no hay dónde ponerla. */
function chooseMonsterPlay(
  hand: CardInstance[], field: (CardInstance | null)[], strongestFoeAtk: number, me: PlayerIndex, fusion?: FusionResolver,
): { intent: Intent; atk: number } | null {
  const monsters = hand.filter(c => c.def.type === 'monster');
  const strongest = [...monsters].sort((a, b) => b.atk - a.atk)[0];
  if (!strongest) return null;
  let play = { ids: [strongest.instanceId], atk: strongest.atk, fused: false };
  if (fusion) {
    for (const a of monsters) {
      for (const b of monsters) {
        if (a === b) continue;
        const result = bestFusion(fusion, a.def, b.def);
        if (result && result.atk > play.atk) play = { ids: [a.instanceId, b.instanceId], atk: result.atk, fused: true };
      }
    }
  }
  let slot = field.findIndex(c => c === null);
  if (slot < 0) {
    // Campo lleno: el monstruo de la zona sería el primer material y cambiaría la fusión,
    // así que aquí la IA solo juega una carta, y solo si es mejor que su monstruo más débil.
    play = { ids: [strongest.instanceId], atk: strongest.atk, fused: false };
    const weakest = field.reduce((w, c, i) => (c && c.atk < (field[w]?.atk ?? Infinity) ? i : w), 0);
    if ((field[weakest]?.atk ?? 0) < play.atk) slot = weakest;
  }
  if (slot < 0) return null;
  const position = play.atk >= strongestFoeAtk ? 'attack' : 'defense';
  return {
    atk: play.atk,
    intent: { type: 'play', player: me, handIds: play.ids, slot, position, faceDown: position === 'defense' && !play.fused },
  };
}

/** Mágica, equipo o trampa que conviene usar ahora (antes de bajar monstruo), o null. */
function chooseSupportPlay(state: DuelState, me: PlayerIndex, myMonsters: CardInstance[], hasMonsterPlay: boolean): Intent | null {
  const mine = state.players[me];
  const cards = mine.hand.filter(c => c.def.type !== 'monster');
  if (cards.length === 0) return null;
  const activate = (c: CardInstance, targetId?: number): Intent => ({ type: 'activate', player: me, handId: c.instanceId, targetId });
  const strongest = [...myMonsters].sort((a, b) => b.atk - a.atk)[0];
  const canAttack = state.turn > 1 || FIRST_TURN_CAN_ATTACK;
  const find = (k: ReturnType<typeof spellKind>) => cards.find(c => spellKind(c) === k);

  const trap = find('trap');
  if (trap && mine.support.some(c => c === null)) return activate(trap);
  const equip = find('equip');
  if (equip && strongest) return activate(equip, strongest.instanceId);
  // Mágicas: la que más convenga ahora (las que hoy perjudican, como un Agujero Negro con ventaja, no)
  const spells = cards.filter(c => c.def.type === 'spell')
    .map(c => ({ c, v: spellValue(c, state, me, canAttack) }))
    .sort((a, b) => b.v - a.v);
  if (spells[0] && spells[0].v > 0) return activate(spells[0].c);
  // Para no atorarse con la mano llena de mágicas: si no hay monstruo que bajar, usa cualquiera que no estorbe.
  if (!hasMonsterPlay) {
    const harmless = spells.find(x => x.v >= 0)?.c;
    const any = harmless ?? cards.find(c => spellKind(c) === 'trap' && mine.support.some(z => z === null)) ?? (strongest ? equip : undefined);
    if (any) return activate(any, spellKind(any) === 'equip' ? strongest?.instanceId : undefined);
  }
  return null;
}

/** Qué tan buena es una mágica AHORA (positivo = úsala; negativo = te perjudica). */
function spellValue(card: CardInstance, state: DuelState, me: PlayerIndex, canAttack: boolean): number {
  const mine = state.players[me];
  const foe = state.players[opponentOf(me)];
  const myMon = mine.field.filter((c): c is CardInstance => c !== null);
  const foeMon = foe.field.filter((c): c is CardInstance => c !== null);
  const power = (list: CardInstance[]) => list.reduce((n, c) => n + Math.max(c.atk, c.defense), 0);
  const freeSlot = mine.field.some(c => c === null);
  const enemyTargets = ['allEnemies', 'highestAtkEnemy', 'lowestAtkEnemy', 'randomEnemy'];
  let v = 0;
  for (const a of (card.def.effects ?? []).flatMap(e => e.actions)) {
    switch (a.type) {
      case 'damage': v += a.who === 'self' ? -a.amount / 200 : a.amount / 100; break;
      case 'heal': v += mine.life < 6000 ? a.amount / 200 : 0; break;
      case 'draw': v += 2 * a.amount; break;
      case 'modifyAtk': case 'modifyDef':
        if (enemyTargets.includes(a.target)) v += foeMon.length && a.amount < 0 ? 2 : 0;
        else v += canAttack && myMon.some(c => c.position === 'attack') ? Math.max(0, a.amount) / 100 : 0;
        break;
      case 'destroy': case 'returnToHand': case 'takeControl': case 'forceDefense':
        if (enemyTargets.includes(a.target)) v += foeMon.length ? 2 + power(foeMon) / (a.target === 'allEnemies' ? 400 : 1200) : 0;
        else if (a.target === 'allMonsters') v += (power(foeMon) - power(myMon)) / 400;
        else if (a.target === 'randomMonster') v += (foeMon.length - myMon.length) * 1.5;
        break;
      case 'destroySupport': {
        const theirs = foe.support.filter(Boolean).length, ours = mine.support.filter(Boolean).length;
        v += 3 * (a.who === 'all' ? theirs - ours : theirs);
        break;
      }
      case 'preventAttack': v += foeMon.some(c => c.position === 'attack') ? 3 : 0; break;
      case 'summonFromDeck': v += freeSlot ? 2 : 0; break;
      case 'revive': v += freeSlot && mine.mictlan.some(c => c.def.type === 'monster') ? 3 : 0; break;
      case 'grantKeyword': v += myMon.length ? 1 : 0; break;
      default: break;
    }
  }
  return v;
}

/** Qué hace una mágica, equipo o trampa, para que la IA decida cuándo usarla. */
function spellKind(card: CardInstance): 'equip' | 'trap' | 'damage' | 'heal' | 'buff' | 'other' {
  if (card.def.type === 'equip') return 'equip';
  if (card.def.type === 'trap') return 'trap';
  const actions = (card.def.effects ?? []).flatMap(e => e.actions);
  if (actions.some(a => a.type === 'damage' || a.type === 'destroy')) return 'damage';
  if (actions.some(a => a.type === 'heal')) return 'heal';
  if (actions.some(a => a.type === 'modifyAtk')) return 'buff';
  return 'other';
}
