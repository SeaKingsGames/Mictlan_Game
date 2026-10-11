import type { CardInstance } from '../core/CardInstance.ts';
import { FIRST_TURN_CAN_ATTACK } from '../core/DuelEngine.ts';
import { opponentOf, type DuelState, type Intent, type PlayerIndex } from '../core/DuelState.ts';

/**
 * IA sencilla: decide UNA intención a la vez (se llama en bucle hasta que termina el turno).
 * Solo usa información que un jugador puede ver: no espía cartas boca abajo ni la mano rival.
 */
export function nextAiIntent(state: DuelState, me: PlayerIndex): Intent {
  const mine = state.players[me];
  const foe = state.players[opponentOf(me)];
  const foeMonsters = foe.field.filter((c): c is CardInstance => c !== null);
  const strongestFoeAtk = Math.max(0, ...foeMonsters.filter(c => !c.faceDown && c.position === 'attack').map(c => c.atk));

  // 1) Fase principal: jugar el monstruo más fuerte de la mano.
  if (state.phase === 'main' && !state.hasPlayedThisTurn && mine.hand.length > 0) {
    const best = [...mine.hand].filter(c => c.def.type === 'monster').sort((a, b) => b.atk - a.atk)[0];
    if (best) {
      let slot = mine.field.findIndex(c => c === null);
      if (slot < 0) {
        // Campo lleno: reemplaza al más débil si la carta nueva es mejor.
        const weakest = mine.field.reduce((w, c, i) => (c && c.atk < (mine.field[w]?.atk ?? Infinity) ? i : w), 0);
        if ((mine.field[weakest]?.atk ?? 0) < best.atk) slot = weakest;
      }
      if (slot >= 0) {
        const position = best.atk >= strongestFoeAtk ? 'attack' : 'defense';
        return { type: 'play', player: me, handIds: [best.instanceId], slot, position, faceDown: position === 'defense' };
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
