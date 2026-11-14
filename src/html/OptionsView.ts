import { cardDb } from '../data/index.ts';
import { duelists } from '../game/duelists.ts';
import { resetProfile, saveProfile, type Profile } from '../game/profile.ts';
import { versionLabel } from '../version.ts';
import { h } from './dom.ts';
import { canPromptInstall, installHelpText, isInstalled, promptInstall } from './install.ts';
import { clearResources, downloadResources, mb, resourceStatus, type ResourceStatus } from './resources.ts';
import {
  getMusicVolume, getSfxVolume, isMusicOn, isMuted, setMusicOn, setMusicVolume, setMuted, setSfxVolume, sfx,
} from './sound.ts';
import { resetTutorial } from './tutorial.ts';
import { applyUpdate, checkForUpdate } from './update.ts';

/** Lo que el menú puede hacer con la cuenta. */
export interface MenuActions {
  onReset: (p: Profile) => void;     // modo local: reiniciar progreso
  onSignOut?: () => void;            // con cuenta: cerrar sesión
  onUpgrade?: () => void;            // invitado: guardar con correo
  onRename?: (name: string) => Promise<string>;   // con cuenta: cambiar nombre de jugador
}

/**
 * Ventana sobre el menú (Opciones, Perfil). Se cierra con ✕, con Esc o tocando fuera.
 * Devuelve el cuerpo para llenarlo y una función para cerrarla.
 */
function sheet(title: string, cls: string, onClose?: () => void): { body: HTMLElement; close: () => void } {
  const body = h('div', { class: 'sheet__body' });
  const dlg = h('dialog', { class: `sheet ${cls}`, 'aria-label': title },
    h('header', { class: 'sheet__head' },
      h('h2', { class: 'sheet__title', tabindex: -1, autofocus: true }, title),
      h('button', { class: 'sheet__close', type: 'button', 'aria-label': 'Cerrar', onclick: () => close() }, '✕')),
    body);
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  dlg.addEventListener('click', ev => { if (ev.target === dlg) close(); });   // toque fuera del recuadro
  document.body.append(dlg);
  dlg.showModal();
  return { body, close };
}

const section = (title: string, ...rows: (Node | string)[]) =>
  h('section', { class: 'opt-sec' }, h('h3', { class: 'opt-sec__title' }, title), ...rows);
const row = (label: string, control: Node | string, hint?: string) =>
  h('div', { class: 'opt-row' }, h('div', { class: 'opt-row__text' }, h('span', { class: 'opt-row__label' }, label), hint ? h('small', {}, hint) : ''), control);

function toggle(on: boolean, label: string, onChange: (on: boolean) => void): HTMLButtonElement {
  const b = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': label });
  b.addEventListener('click', () => {
    on = !on;
    b.setAttribute('aria-checked', String(on));
    onChange(on);
  });
  return b;
}

function slider(value: number, label: string, onInput: (v: number) => void): HTMLInputElement {
  const s = h('input', { class: 'range', type: 'range', min: 0, max: 100, step: 5, value: Math.round(value * 100), 'aria-label': label });
  const paint = () => s.style.setProperty('--fill', `${s.value}%`);
  s.addEventListener('input', () => { paint(); onInput(Number(s.value) / 100); });
  s.addEventListener('change', () => sfx('click'));
  paint();
  return s;
}

/** Opciones: sonido, descarga de recursos, juego, cuenta. */
export function openOptions(profile: Profile, go: (hash: string) => void, actions: MenuActions): void {
  const { body, close } = sheet('Opciones', 'sheet--options');
  const acc = profile.account;

  // ---- Sonido
  const sfxRange = slider(getSfxVolume(), 'Volumen de efectos', setSfxVolume);
  const musicRange = slider(getMusicVolume(), 'Volumen de música', setMusicVolume);
  const paintSound = () => {
    sfxRange.disabled = isMuted();
    musicRange.disabled = isMuted() || !isMusicOn();
  };
  const sound = section('Sonido',
    row('Sonido del juego', toggle(!isMuted(), 'Sonido del juego', on => { setMuted(!on); if (on) sfx('click'); paintSound(); })),
    row('Efectos', sfxRange),
    row('Música', h('div', { class: 'opt-pair' }, musicRange, toggle(isMusicOn(), 'Música', on => { setMusicOn(on); paintSound(); }))));
  paintSound();

  // ---- Descargas
  const downloads = section('Descargas', downloadBlock());

  // ---- Juego
  const updateMsg = h('small', { class: 'opt-note', role: 'status' });
  const updateBtn = h('button', { class: 'opt-btn', type: 'button' }, 'Buscar actualización');
  updateBtn.addEventListener('click', async () => {
    sfx('click');
    updateBtn.disabled = true;
    updateMsg.textContent = 'Buscando…';
    const st = await checkForUpdate();
    if (st === 'new') { updateMsg.textContent = 'Hay versión nueva. Actualizando…'; await applyUpdate(); return; }
    updateMsg.textContent = st === 'same' ? 'Ya tienes la última versión.' : 'Sin conexión. Intenta más tarde.';
    updateBtn.disabled = false;
  });
  const game = section('Juego',
    row('Cómo jugar', h('button', { class: 'opt-btn', type: 'button', onclick: () => { resetTutorial(); sfx('click'); close(); go('#/campana'); } }, 'Ver tutorial'),
      'El tutorial sale en tu siguiente duelo de campaña.'),
    isInstalled() ? '' : installRow(),
    h('div', { class: 'opt-row' }, h('div', { class: 'opt-row__text' }, h('span', { class: 'opt-row__label' }, 'Versión'), h('small', {}, versionLabel()), updateMsg), updateBtn));

  // ---- Cuenta
  const account = acc ? section('Cuenta',
    row(acc.guest ? 'Cuenta de invitado' : 'Cuenta guardada',
      h('div', { class: 'opt-pair' },
        acc.guest && actions.onUpgrade ? h('button', { class: 'opt-btn opt-btn--main', type: 'button', onclick: () => { close(); actions.onUpgrade!(); } }, 'Guardar mi cuenta') : '',
        actions.onSignOut ? h('button', { class: 'opt-btn', type: 'button', onclick: () => {
          if (acc.guest && !confirm('Eres invitado: si cierras sesión perderás este progreso. ¿Cerrar sesión?')) return;
          close(); actions.onSignOut!();
        } }, 'Cerrar sesión') : ''),
      acc.guest ? 'Guárdala con tu correo para no perder tus cartas si cambias de teléfono.' : undefined))
    : section('Cuenta', row('Modo local', '', 'Sin cuenta: tu progreso se guarda solo en este navegador.'));

  // ---- Herramientas (solo en tu compu con npm run dev)
  const tools = !import.meta.env.DEV ? '' : section('Herramientas',
    h('div', { class: 'opt-links' },
      h('a', { href: '/editor-cartas.html' }, 'Editor de cartas'),
      h('a', { href: '/fusiones.html' }, 'Editor de fusiones'),
      h('a', { href: '/cartas.html' }, 'Galería'),
      acc ? '' : h('button', { class: 'opt-btn', type: 'button', onclick: () => {
        if (!confirm('¿Borrar todo tu progreso (colección, mazo y campaña)?')) return;
        const fresh = resetProfile();
        saveProfile(fresh);
        close();
        actions.onReset(fresh);
      } }, 'Reiniciar progreso')));

  body.append(sound, downloads, game, account, tools);
}

function installRow(): HTMLElement {
  const help = h('small', { class: 'opt-note', role: 'status' });
  const btn = h('button', { class: 'opt-btn', type: 'button' }, 'Instalar');
  btn.addEventListener('click', async () => {
    sfx('click');
    if (canPromptInstall()) { if (await promptInstall()) btn.disabled = true; }
    else help.textContent = installHelpText();
  });
  return h('div', { class: 'opt-row' },
    h('div', { class: 'opt-row__text' }, h('span', { class: 'opt-row__label' }, 'Instalar juego'), h('small', {}, 'Ábrelo como app, sin la barra del navegador.'), help), btn);
}

/** Explicación + botón + barra de avance para "Descargar recursos". */
function downloadBlock(): HTMLElement {
  const text = h('p', { class: 'opt-text' });
  const state = h('p', { class: 'opt-state', role: 'status' });
  const bar = h('div', { class: 'dl-bar', hidden: true }, h('span', {}));
  const actions = h('div', { class: 'opt-pair' });
  const box = h('div', { class: 'dl' }, text, bar, h('div', { class: 'dl__foot' }, state, actions));
  let running: AbortController | null = null;

  const fill = (done: number, total: number) => (bar.firstElementChild as HTMLElement).style.width = `${total ? (done / total) * 100 : 0}%`;

  async function paint(st?: ResourceStatus): Promise<void> {
    st ??= await resourceStatus();
    text.textContent = `Guarda en tu teléfono el arte de las ${cardDb.all().length} cartas, los retratos de los duelistas, los sonidos y la música (${mb(st.bytes)}). `
      + 'Así el juego abre rápido y las cartas no se quedan en blanco cuando la señal está mala. '
      + 'Se baja una sola vez: si salen cartas nuevas, solo baja esas.';
    if (!st.supported) {
      state.textContent = 'Este navegador no deja guardar archivos. Instala el juego o usa Chrome.';
      actions.replaceChildren();
      return;
    }
    const all = st.have >= st.files;
    bar.hidden = st.have === 0 || all;
    fill(st.haveBytes, st.bytes);
    state.textContent = all ? `✓ Todo descargado (${mb(st.bytes)})`
      : st.have ? `Guardado: ${mb(st.haveBytes)} de ${mb(st.bytes)}`
        : 'Usa Wi-Fi si tu plan de datos es limitado.';
    actions.replaceChildren(
      all ? '' : h('button', { class: 'opt-btn opt-btn--main', type: 'button', onclick: start },
        st.have ? `Descargar lo que falta (${mb(st.bytes - st.haveBytes)})` : `Descargar (${mb(st.bytes)})`),
      st.have ? h('button', { class: 'opt-btn', type: 'button', onclick: async () => {
        if (!confirm('¿Borrar lo descargado? El juego lo volverá a bajar poco a poco mientras juegas.')) return;
        sfx('click');
        await clearResources();
        void paint();
      } }, 'Borrar descargas') : '');
  }

  async function start(): Promise<void> {
    sfx('click');
    running = new AbortController();
    bar.hidden = false;
    actions.replaceChildren(h('button', { class: 'opt-btn', type: 'button', onclick: () => running?.abort() }, 'Detener'));
    try {
      await downloadResources(p => {
        fill(p.bytes, p.totalBytes);
        state.textContent = `Descargando… ${mb(p.bytes)} de ${mb(p.totalBytes)}`;
      }, running.signal);
      sfx('coin');
      await paint();
    } catch (e) {
      await paint();
      state.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      running = null;
    }
  }

  // si cierran la ventana a media descarga, se detiene (lo bajado se queda)
  const obs = new MutationObserver(() => { if (!box.isConnected) { running?.abort(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
  void paint();
  return box;
}

/** Perfil: nombre (se puede cambiar), récord y colección. */
export function openProfile(profile: Profile, actions: MenuActions, onChange: () => void): void {
  const acc = profile.account;
  const { body } = sheet('Perfil', 'sheet--profile', onChange);
  const distinct = Object.keys(profile.collection).filter(id => (profile.collection[id] ?? 0) > 0).length;
  const total = cardDb.all().length;
  const beaten = duelists.filter(d => profile.defeated.includes(d.id)).length;
  const canRename = !!acc && !!actions.onRename;
  const nameBox = h('div', { class: 'prof__who' });

  const paintName = () => nameBox.replaceChildren(
    h('b', { class: 'prof__name' }, acc?.username ?? (acc ? (acc.guest ? 'Invitado' : 'Jugador') : 'Jugador local')),
    h('small', {}, acc ? (acc.guest ? 'Cuenta de invitado' : 'Cuenta guardada') : 'Modo local (este navegador)'),
    canRename ? h('button', { class: 'opt-btn', type: 'button', onclick: editName }, acc?.username ? '✎ Cambiar nombre' : '✎ Ponte un nombre') : '');

  function editName(): void {
    sfx('click');
    const input = h('input', { class: 'field', value: acc?.username ?? '', placeholder: 'Nombre de jugador', maxlength: 20, autocomplete: 'nickname' });
    const msg = h('small', { class: 'opt-note', role: 'status' });
    const save = h('button', { class: 'opt-btn opt-btn--main', type: 'submit' }, 'Guardar');
    const form = h('form', { class: 'prof__rename' }, input,
      h('div', { class: 'opt-pair' }, save, h('button', { class: 'opt-btn', type: 'button', onclick: paintName }, 'Cancelar')), msg);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      save.disabled = true; msg.textContent = 'Guardando…';
      try {
        const n = await actions.onRename!(input.value);
        if (acc) acc.username = n;
        sfx('coin');
        paintName();
      } catch (e) { sfx('error'); msg.textContent = e instanceof Error ? e.message : String(e); save.disabled = false; }
    });
    nameBox.replaceChildren(form);
    input.focus(); input.select();
  }
  paintName();

  body.append(
    h('div', { class: 'prof' },
      h('span', { class: 'prof__avatar', 'aria-hidden': 'true' }, '✺'),
      nameBox),
    h('dl', { class: 'prof__stats' },
      h('div', {}, h('dt', {}, 'Victorias'), h('dd', { class: 'win' }, String(profile.wins))),
      h('div', {}, h('dt', {}, 'Derrotas'), h('dd', { class: 'loss' }, String(profile.losses))),
      h('div', {}, h('dt', {}, 'Rivales vencidos'), h('dd', {}, `${beaten}/${duelists.length}`)),
      h('div', {}, h('dt', {}, 'Cartas'), h('dd', {}, `${distinct}/${total}`))),
    h('div', { class: 'meter', title: 'Colección' }, h('span', { style: `width:${(distinct / total) * 100}%` })));
}
