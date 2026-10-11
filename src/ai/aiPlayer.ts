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

  // 1) Fase principal: jugar el monstruo más fuerte de la mano, o una fusión de 2 si sale mejor.
  if (state.phase === 'main' && !state.hasPlayedThisTurn && mine.hand.length > 0) {
    const monsters = mine.hand.filter(c => c.def.type === 'monster');
    const strongest = [...monsters].sort((a, b) => b.atk - a.atk)[0];
    if (strongest) {
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
      let slot = mine.field.findIndex(c => c === null);
      if (slot < 0) {
        // Campo lleno: el monstruo de la zona sería el primer material y cambiaría la fusión,
        // así que aquí la IA solo juega una carta.
        play = { ids: [strongest.instanceId], atk: strongest.atk, fused: false };
        // Reemplaza al más débil si lo nuevo es mejor.
        const weakest = mine.field.reduce((w, c, i) => (c && c.atk < (mine.field[w]?.atk ?? Infinity) ? i : w), 0);
        if ((mine.field[weakest]?.atk ?? 0) < play.atk) slot = weakest;
      }
      if (slot >= 0) {
        const position = play.atk >= strongestFoeAtk ? 'attack' : 'defense';
        return { type: 'play', player: me, handIds: play.ids, slot, position, faceDown: position === 'defense' && !play.fused };
      }
    }
  }

  // 2) Batalla: atacar donde gane.
  const canAttackThisTurn = state.turn > 1 || FIRST_TURN_CAN_ATTACK;
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
