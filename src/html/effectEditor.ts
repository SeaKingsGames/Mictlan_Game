import { ACTION_TEXT, CONDITION_TEXT, TARGET_TEXT, TRIGGER_TEXT, describeEffect, describeEffects } from '../data/effectText.ts';
import {
  CARD_TAGS, EFFECT_TARGETS, EFFECT_TRIGGERS,
  type CardTag, type CardType, type EffectAction, type EffectCondition, type EffectDef, type EffectTarget, type EffectTrigger,
} from '../data/types.ts';

/**
 * Editor visual de efectos (se usa dentro del editor de cartas).
 * Todo se elige de listas; abajo se ve el texto del efecto en español.
 */

// Versiones editables (sin readonly) de los tipos de efecto
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
export type EditableEffect = { trigger: EffectTrigger; conditions?: EffectCondition[]; actions: EffectAction[] };

interface EditableCard {
  type: CardType;
  description: string;
  effects?: EditableEffect[];
}

// ---------------------------------------------------------------- valores por defecto

function defaultTrigger(type: CardType): EffectTrigger {
  if (type === 'trap') return 'onOpponentAttack';
  if (type === 'spell' || type === 'equip') return 'onActivate';
  return 'onSummon';
}

function defaultAction(type: EffectAction['type'], cardType: CardType): EffectAction {
  switch (type) {
    case 'modifyAtk':
    case 'modifyDef':
      return { type, amount: 300, target: cardType === 'equip' ? 'equipTarget' : cardType === 'trap' ? 'attacker' : 'self' };
    case 'damage': return { type, amount: 500, who: 'opponent' };
    case 'heal': return { type, amount: 500 };
    case 'draw': return { type, amount: 1 };
    case 'destroy': return { type, target: cardType === 'trap' ? 'attacker' : 'lowestAtkEnemy' };
    case 'revive': return { type };
    case 'negateAttack': return { type };
  }
}

function defaultCondition(type: EffectCondition['type']): EffectCondition {
  switch (type) {
    case 'lifeBelow': return { type, amount: 3000 };
    case 'hasTagOnField': return { type, tag: 'guerrero' };
    case 'isPhase': return { type, phase: 'medianoche' };
    default: return { type } as EffectCondition;
  }
}

/** Qué opciones tienen sentido según el tipo de carta. */
function triggersFor(type: CardType): EffectTrigger[] {
  if (type === 'trap') return ['onOpponentAttack'];
  if (type === 'spell' || type === 'equip') return ['onActivate'];
  return EFFECT_TRIGGERS.filter(t => t !== 'onActivate' && t !== 'onOpponentAttack');
}
function targetsFor(type: CardType): EffectTarget[] {
  return EFFECT_TARGETS.filter(t => (t !== 'equipTarget' || type === 'equip') && (t !== 'attacker' || type === 'trap'));
}
function actionsFor(type: CardType): EffectAction['type'][] {
  const all = Object.keys(ACTION_TEXT) as EffectAction['type'][];
  return all.filter(a => a !== 'negateAttack' || type === 'trap');
}

// ---------------------------------------------------------------- DOM

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function select<T extends string>(options: { value: T; label: string }[], value: T, onChange: (v: T) => void): HTMLSelectElement {
  const s = el('select');
  for (const o of options) {
    const opt = el('option', '', o.label);
    opt.value = o.value;
    opt.selected = o.value === value;
    s.append(opt);
  }
  s.addEventListener('change', () => onChange(s.value as T));
  return s;
}

function numberInput(value: number, onChange: (v: number) => void, step = 100): HTMLInputElement {
  const i = el('input');
  i.type = 'number';
  i.step = String(step);
  i.value = String(value);
  i.className = 'fx-num';
  i.addEventListener('change', () => onChange(Math.round(Number(i.value) || 0)));
  return i;
}

function tagSelect(value: CardTag | undefined, onChange: (v: CardTag | undefined) => void, allowAny: boolean): HTMLSelectElement {
  const opts = [
    ...(allowAny ? [{ value: '', label: '— cualquiera —' }] : []),
    ...CARD_TAGS.map(t => ({ value: t as string, label: t as string })),
  ];
  return select(opts, value ?? '', v => onChange((v || undefined) as CardTag | undefined));
}

function label(text: string, control: HTMLElement): HTMLElement {
  const l = el('label', 'fx-field');
  l.append(el('span', '', text), control);
  return l;
}

function smallButton(text: string, onClick: () => void, extra = ''): HTMLButtonElement {
  const b = el('button', `ebtn ebtn--icon ${extra}`, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// ---------------------------------------------------------------- editor

export function renderEffectEditor(container: HTMLElement, card: EditableCard, onChange: () => void): void {
  const changed = () => { onChange(); renderEffectEditor(container, card, onChange); };
  const effects = card.effects ?? [];

  const header = el('div', 'fx-header');
  header.append(el('h2', '', 'Efectos'));
  const hint = el('p', 'hint',
    card.type === 'monster'
      ? 'Elige cuándo se activa, las condiciones (opcional) y qué hace. Puedes poner varios efectos.'
      : card.type === 'trap'
        ? 'Las trampas se activan solas cuando el rival te ataca.'
        : 'Las mágicas y equipos hacen su efecto al activarse.');
  const boxes = effects.map((fx, i) => effectBox(fx, i));

  const add = el('button', 'ebtn', '+ Agregar efecto');
  add.type = 'button';
  add.addEventListener('click', () => {
    card.effects = [...effects, { trigger: defaultTrigger(card.type), actions: [defaultAction(card.type === 'trap' ? 'destroy' : 'modifyAtk', card.type)] }];
    changed();
  });
  const useText = el('button', 'ebtn', 'Usar el texto como descripción');
  useText.type = 'button';
  useText.disabled = effects.length === 0;
  useText.addEventListener('click', () => { card.description = describeEffects(card.effects); onChange(); });
  const actions = el('div', 'actions-row');
  actions.append(add, useText);

  container.replaceChildren(header, hint, ...boxes, actions);

  function effectBox(fx: EditableEffect, index: number): HTMLElement {
    const box = el('div', 'fx-box');

    // Encabezado: cuándo + borrar
    const top = el('div', 'fx-row');
    top.append(
      el('b', 'fx-n', `${index + 1}.`),
      label('Cuándo', select(triggersFor(card.type).map(t => ({ value: t, label: TRIGGER_TEXT[t] })), fx.trigger, v => { fx.trigger = v; changed(); })),
      el('span', 'grow'),
      smallButton('✕', () => { card.effects = effects.filter(x => x !== fx); changed(); }, 'ebtn--danger'),
    );
    box.append(top);

    // Condiciones
    const conds = fx.conditions ?? [];
    conds.forEach((c, ci) => {
      const row = el('div', 'fx-row fx-sub');
      row.append(el('span', 'fx-tag', 'Condición'),
        select((Object.keys(CONDITION_TEXT) as EffectCondition['type'][]).map(t => ({ value: t, label: CONDITION_TEXT[t] })), c.type, v => {
          conds[ci] = defaultCondition(v); fx.conditions = conds; changed();
        }));
      if (c.type === 'lifeBelow') row.append(label('PV', numberInput(c.amount, v => { (c as Mutable<typeof c>).amount = v; changed(); })));
      if (c.type === 'isPhase') row.append(label('Fase', select([
        { value: 'alba', label: '🌅 Alba' }, { value: 'mediodia', label: '☀ Mediodía' },
        { value: 'ocaso', label: '🌇 Ocaso' }, { value: 'medianoche', label: '☾ Medianoche' },
      ] as const, c.phase, v => { (c as Mutable<typeof c>).phase = v; changed(); })));
      if (c.type === 'hasTagOnField') row.append(label('Etiqueta', tagSelect(c.tag, v => { (c as Mutable<typeof c>).tag = v ?? 'guerrero'; changed(); }, false)));
      row.append(el('span', 'grow'), smallButton('✕', () => {
        fx.conditions = conds.filter(x => x !== c);
        if (fx.conditions.length === 0) delete fx.conditions;
        changed();
      }, 'ebtn--danger'));
      box.append(row);
    });

    // Acciones
    fx.actions.forEach((a, ai) => {
      const row = el('div', 'fx-row fx-sub');
      row.append(el('span', 'fx-tag fx-tag--do', 'Hace'),
        select(actionsFor(card.type).map(t => ({ value: t, label: ACTION_TEXT[t] })), a.type, v => {
          fx.actions[ai] = defaultAction(v, card.type); changed();
        }));
      const m = a as Mutable<EffectAction> & Record<string, unknown>;
      if ('amount' in a) {
        row.append(label(a.type === 'draw' ? 'Cartas' : a.type === 'modifyAtk' || a.type === 'modifyDef' ? 'Cantidad (+/-)' : 'Cantidad',
          numberInput(a.amount, v => { m.amount = v; changed(); }, a.type === 'draw' ? 1 : 100)));
      }
      if ('target' in a) {
        row.append(label('A quién', select(targetsFor(card.type).map(t => ({ value: t, label: TARGET_TEXT[t] })), a.target, v => {
          m.target = v;
          if (v === 'alliesWithTag' || v === 'otherAlliesWithTag') m.tag = (m.tag as CardTag | undefined) ?? 'agua';
          changed();
        })));
        const needsTag = a.target === 'alliesWithTag' || a.target === 'otherAlliesWithTag';
        const canTag = needsTag || ['allAllies', 'otherAllies', 'allEnemies'].includes(a.target);
        if (canTag) {
          row.append(label('Etiqueta', tagSelect(a.tag, v => {
            if (v) m.tag = v; else delete m.tag;
            changed();
          }, !needsTag)));
        }
      }
      if (a.type === 'modifyAtk' || a.type === 'modifyDef') {
        const chk = el('input');
        chk.type = 'checkbox';
        chk.checked = !!a.untilEndOfTurn;
        chk.addEventListener('change', () => { if (chk.checked) m.untilEndOfTurn = true; else delete m.untilEndOfTurn; changed(); });
        row.append(label('Solo este turno', chk));
      }
      if (a.type === 'damage') {
        row.append(label('A quién', select([{ value: 'opponent', label: 'al rival' }, { value: 'self', label: 'a ti' }], a.who, v => { m.who = v; changed(); })));
      }
      if (a.type === 'revive') {
        row.append(label('Etiqueta', tagSelect(a.tag, v => { if (v) m.tag = v; else delete m.tag; changed(); }, true)));
      }
      row.append(el('span', 'grow'), smallButton('✕', () => {
        if (fx.actions.length === 1) return;     // un efecto necesita al menos una acción
        fx.actions = fx.actions.filter(x => x !== a);
        changed();
      }, 'ebtn--danger'));
      box.append(row);
    });

    // Botones + texto
    const more = el('div', 'actions-row');
    if (card.type === 'monster') {
      more.append(smallButton('+ Condición', () => { fx.conditions = [...conds, defaultCondition('isNight')]; changed(); }));
    }
    more.append(smallButton('+ Acción', () => { fx.actions = [...fx.actions, defaultAction('damage', card.type)]; changed(); }));
    box.append(more, el('p', 'fx-text', describeEffect(fx as EffectDef)));
    return box;
  }
}
