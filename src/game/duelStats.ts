import type { DuelEngine } from '../core/DuelEngine.ts';
import { isNightTurn, type DuelEvent, type PlayerIndex } from '../core/DuelState.ts';

/** Lo que hizo un jugador en un duelo (para las misiones). Lo calcula el servidor al repetir el duelo. */
export interface DuelStats {
  won: boolean;
  turns: number;
  fusions: number;      // fusiones hechas
  spells: number;       // mágicas y equipos usados
  traps: number;        // trampas que saltaron
  destroyed: number;    // monstruos del rival destruidos
  damage: number;       // daño total al rival
  lifeLeft: number;
  nightWin: boolean;    // ganó de noche
}

export class StatsCollector {
  private s: DuelStats = { won: false, turns: 0, fusions: 0, spells: 0, traps: 0, destroyed: 0, damage: 0, lifeLeft: 0, nightWin: false };
  private readonly me: PlayerIndex;
  constructor(me: PlayerIndex) { this.me = me; }

  add(events: readonly DuelEvent[], engine: DuelEngine): void {
    const foe = this.me === 0 ? 1 : 0;
    for (const e of events) {
      if (e.type === 'fusion' && e.player === this.me) this.s.fusions++;
      else if (e.type === 'activated' && e.player === this.me) this.s.spells++;
      else if (e.type === 'trapActivated' && e.player === this.me) this.s.traps++;
      else if (e.type === 'damage' && e.player === foe) this.s.damage += e.amount;
      else if (e.type === 'sentToMictlan' && (e.reason === 'battle' || e.reason === 'effect')) {
        if (engine.state.players[foe].mictlan.some(c => c.instanceId === e.instanceId && c.def.type === 'monster')) this.s.destroyed++;
      }
    }
  }

  result(engine: DuelEngine): DuelStats {
    const st = engine.state;
    return {
      ...this.s,
      won: st.winner === this.me,
      turns: st.turn,
      lifeLeft: st.players[this.me].life,
      nightWin: st.winner === this.me && isNightTurn(st.turn),
    };
  }
}
