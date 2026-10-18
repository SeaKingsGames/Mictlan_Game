import { cardDb } from '../data/index.ts';
import { validatePlayerDeck, type Profile } from '../game/profile.ts';
import { createRoom, joinRoom, leaveRoom, watchMatch } from '../net/pvp.ts';
import { flushDeck } from '../net/cloud.ts';
import { h } from './dom.ts';

/** Duelo entre jugadores: crear sala (y compartir el código) o entrar con un código. */
export function renderPvpLobby(root: HTMLElement, profile: Profile, go: (hash: string) => void, cloud: boolean): () => void {
  let stop: (() => void) | null = null;
  const cleanup = () => { stop?.(); stop = null; };

  const head = h('header', { class: 'screen__head' },
    h('button', { class: 'link-btn', onclick: () => { cleanup(); go('#/'); } }, '← Menú'),
    h('h1', {}, 'Duelo entre jugadores'),
    h('span', {}));

  if (!cloud) {
    root.replaceChildren(h('main', { class: 'screen' }, head,
      h('p', { class: 'warn-box' }, 'El multijugador necesita cuentas en la nube (Supabase). En modo local no está disponible.')));
    return cleanup;
  }

  const deckErrors = validatePlayerDeck(profile, profile.deck, cardDb);
  const status = h('p', { class: 'pvp__status', role: 'status' });
  const fail = (e: unknown) => { status.textContent = e instanceof Error ? e.message : String(e); status.classList.add('pvp__status--error'); setBusy(false); };
  const buttons: HTMLButtonElement[] = [];
  const setBusy = (on: boolean) => buttons.forEach(b => { b.disabled = on || deckErrors.length > 0; });

  const createBtn = h('button', { class: 'big-btn big-btn--main' }, 'Crear sala');
  const codeInput = h('input', { type: 'text', class: 'pvp__code-input', placeholder: 'CÓDIGO', maxlength: '5', autocomplete: 'off', 'aria-label': 'Código de sala' });
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  const joinBtn = h('button', { class: 'big-btn' }, 'Entrar');
  buttons.push(createBtn, joinBtn);
  setBusy(false);

  createBtn.addEventListener('click', async () => {
    setBusy(true); status.classList.remove('pvp__status--error'); status.textContent = 'Creando sala…';
    try {
      await flushDeck();
      const room = await createRoom();
      showWaiting(room.matchId, room.code);
    } catch (e) { fail(e); }
  });

  const join = async () => {
    const code = codeInput.value.trim();
    if (code.length !== 5) { fail(new Error('El código tiene 5 letras')); return; }
    setBusy(true); status.classList.remove('pvp__status--error'); status.textContent = 'Entrando…';
    try {
      await flushDeck();
      const { matchId } = await joinRoom(code);
      cleanup();
      go(`#/pvp/${matchId}`);
    } catch (e) { fail(e); }
  };
  joinBtn.addEventListener('click', join);
  codeInput.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') void join(); });

  function showWaiting(matchId: string, code: string): void {
    const copy = h('button', { class: 'link-btn' }, 'Copiar código');
    copy.addEventListener('click', () => { void navigator.clipboard?.writeText(code); copy.textContent = '¡Copiado!'; });
    const cancel = h('button', { class: 'big-btn' }, 'Cancelar sala');
    cancel.addEventListener('click', async () => { cleanup(); await leaveRoom(matchId).catch(() => {}); renderPvpLobby(root, profile, go, cloud); });
    root.replaceChildren(h('main', { class: 'screen pvp' }, head,
      h('section', { class: 'pvp__card pvp__waiting' },
        h('p', {}, 'Comparte este código con tu rival:'),
        h('p', { class: 'pvp__code' }, code),
        copy,
        h('p', { class: 'pvp__dots' }, 'Esperando rival'),
        cancel)));
    stop = watchMatch(matchId, m => {
      if (m.status === 'playing') { cleanup(); go(`#/pvp/${matchId}`); }
      if (m.status === 'cancelled') { cleanup(); renderPvpLobby(root, profile, go, cloud); }
    });
  }

  root.replaceChildren(h('main', { class: 'screen pvp' }, head,
    h('p', { class: 'screen__hint' }, 'Juegas con tu mazo activo y tus cartas con sus niveles. Ganar da cacao (con límite diario). Si tu rival no juega en 2 minutos, puedes reclamar la victoria.'),
    deckErrors.length
      ? h('div', { class: 'warn-box' }, h('b', {}, 'Tu mazo no está listo: '), deckErrors[0] + '. ',
          h('button', { class: 'link-btn', onclick: () => go('#/mazo') }, 'Arreglar mazo →'))
      : '',
    h('div', { class: 'pvp__options' },
      h('section', { class: 'pvp__card' },
        h('h2', {}, 'Crear sala'),
        h('p', {}, 'Te damos un código de 5 letras para que se lo pases a tu rival.'),
        createBtn),
      h('section', { class: 'pvp__card' },
        h('h2', {}, 'Unirse'),
        h('p', {}, 'Escribe el código que te pasaron.'),
        codeInput, joinBtn)),
    status));
  return cleanup;
}
