import type { CardTag, EffectAction, EffectCondition, EffectDef, EffectTarget, EffectTrigger, Keyword } from './types.ts';

/** Textos en español para mostrar los efectos (inspector, editor). */

export const TRIGGER_TEXT: Record<EffectTrigger, string> = {
  onSummon: 'Al ser invocado',
  onFusionSummon: 'Al ser invocado por fusión',
  onAttack: 'Al atacar',
  onDestroyed: 'Al ser destruido',
  onTurnStart: 'Al inicio de tu turno',
  continuous: 'Mientras esté en el campo',
  onActivate: 'Al activarse',
  onOpponentAttack: 'Cuando el rival ataca',
  onOpponentSummon: 'Cuando el rival invoca un monstruo',
  onOpponentFusion: 'Cuando el rival invoca por fusión',
  onBattleDestroy: 'Al destruir a un monstruo en batalla',
  onDirectDamage: 'Al hacer daño directo',
  onAttacked: 'Al ser atacado',
  onFusionMaterial: 'Al usarse como material de fusión',
};

export const TARGET_TEXT: Record<EffectTarget, string> = {
  self: 'este monstruo',
  equipTarget: 'el monstruo equipado',
  allAllies: 'tus monstruos',
  otherAllies: 'tus otros monstruos',
  alliesWithTag: 'tus monstruos de la etiqueta',
  otherAlliesWithTag: 'tus otros monstruos de la etiqueta',
  allEnemies: 'los monstruos rivales',
  highestAtkEnemy: 'el monstruo rival más fuerte',
  lowestAtkEnemy: 'el monstruo rival más débil',
  attacker: 'el monstruo atacante',
  randomEnemy: 'un monstruo rival al azar',
  randomMonster: 'un monstruo del campo al azar',
  allMonsters: 'todos los monstruos del campo',
  summoned: 'el monstruo invocado',
};

export const KEYWORD_TEXT: Record<Keyword, string> = {
  piercing: 'daño perforante (atraviesa la defensa)',
  doubleAttack: 'ataca dos veces por turno',
  directAttack: 'puede atacar directo aunque el rival tenga monstruos',
  battleImmune: 'no puede ser destruido en batalla (una vez)',
};

export const CONDITION_TEXT: Record<EffectCondition['type'], string> = {
  isNight: 'si es de noche',
  isDay: 'si es de día',
  isPhase: 'en una fase del Reloj Solar',
  lifeBelow: 'si tienes menos de N PV',
  hasTagOnField: 'si tienes otro monstruo de la etiqueta',
  opponentHasMoreMonsters: 'si el rival tiene más monstruos',
};

export const ACTION_TEXT: Record<EffectAction['type'], string> = {
  modifyAtk: 'Cambiar ATK',
  modifyDef: 'Cambiar DEF',
  damage: 'Hacer daño',
  heal: 'Recuperar PV',
  draw: 'Robar cartas',
  destroy: 'Destruir',
  revive: 'Revivir del Mictlán',
  negateAttack: 'Detener el ataque',
  returnToHand: 'Regresar a la mano',
  forceDefense: 'Poner en defensa',
  takeControl: 'Tomar el control (este turno)',
  preventAttack: 'El rival no puede atacar',
  grantKeyword: 'Dar habilidad de combate',
  destroySupport: 'Destruir trampas colocadas',
  summonFromDeck: 'Invocar desde tu mazo',
};

function targetText(target: EffectTarget, tag?: CardTag): string {
  const base = TARGET_TEXT[target].replace(' de la etiqueta', '');
  return tag ? `${base} de ${tag}` : base;
}

function conditionText(c: EffectCondition): string {
  switch (c.type) {
    case 'lifeBelow': return `si tienes menos de ${c.amount} PV`;
    case 'isPhase': return `durante ${({ alba: 'el Alba', mediodia: 'el Mediodía', ocaso: 'el Ocaso', medianoche: 'la Medianoche' } as const)[c.phase]}`;
    case 'hasTagOnField': return `si tienes otro monstruo de ${c.tag}`;
    default: return CONDITION_TEXT[c.type];
  }
}

function actionText(a: EffectAction): string {
  switch (a.type) {
    case 'modifyAtk':
    case 'modifyDef': {
      const stat = a.type === 'modifyAtk' ? 'ATK' : 'DEF';
      const verb = a.amount >= 0 ? `gana${plural(a.target)} +${a.amount}` : `pierde${plural(a.target)} ${-a.amount}`;
      return `${targetText(a.target, a.tag)} ${verb} ${stat}${a.untilEndOfTurn ? ' hasta el final del turno' : ''}`;
    }
    case 'damage': return a.who === 'self' ? `recibes ${a.amount} de daño` : `hace ${a.amount} de daño al rival`;
    case 'heal': return `recuperas ${a.amount} PV`;
    case 'draw': return a.amount === 1 ? 'robas 1 carta' : `robas ${a.amount} cartas`;
    case 'destroy': return `destruye a ${targetText(a.target, a.tag)}`.replace(' a el ', ' al ');
    case 'revive': return `revive a tu monstruo${a.tag ? ` de ${a.tag}` : ''} más fuerte del Mictlán`;
    case 'negateAttack': return 'detiene el ataque';
    case 'returnToHand': return `regresa a ${targetText(a.target, a.tag)} a la mano de su dueño`.replace(' a el ', ' al ');
    case 'forceDefense': return `pone en defensa a ${targetText(a.target, a.tag)}`.replace(' a el ', ' al ');
    case 'takeControl': return `tomas el control de ${targetText(a.target, a.tag)} hasta el final del turno`.replace(' de el ', ' del ');
    case 'preventAttack': return 'el rival no puede atacar en su siguiente turno';
    case 'grantKeyword': return `${targetText(a.target, a.tag)} obtiene${plural(a.target)} ${KEYWORD_TEXT[a.keyword]}${a.untilEndOfTurn ? ' este turno' : ''}`;
    case 'destroySupport': return a.who === 'all' ? 'destruye todas las trampas colocadas' : 'destruye las trampas colocadas del rival';
    case 'summonFromDeck': {
      const which = a.sameTag ? ' del mismo tipo' : a.tag ? ` de ${a.tag}` : '';
      return `invoca de tu mazo otro monstruo${which} con ${a.maxAtk} ATK o menos`;
    }
  }
}

/** "tus monstruos ganan" vs "este monstruo gana" */
function plural(target: EffectTarget): string {
  return ['allAllies', 'otherAllies', 'alliesWithTag', 'otherAlliesWithTag', 'allEnemies', 'allMonsters'].includes(target) ? 'n' : '';
}

/** Ej.: "Al ser invocado, si es de noche: destruye al monstruo rival más débil." */
export function describeEffect(e: EffectDef): string {
  const conds = (e.conditions ?? []).map(conditionText);
  const head = TRIGGER_TEXT[e.trigger] + (conds.length ? `, ${conds.join(' y ')}` : '');
  const body = e.actions.map(actionText).join('; ');
  return `${head}: ${body || '(sin acciones)'}.`;
}

export function describeEffects(effects: readonly EffectDef[] | undefined): string {
  return (effects ?? []).map(describeEffect).join(' ');
}
