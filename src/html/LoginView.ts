import { GAME_SUBTITLE, GAME_TITLE } from '../game/config.ts';
import { setUsername, signIn, signInGuest, signUp, upgradeGuest, usernameError } from '../net/cloud.ts';
import { h } from './dom.ts';

type Mode = 'login' | 'register' | 'upgrade';

/**
 * Entrar al juego: iniciar sesión, crear cuenta o jugar como invitado.
 * Con mode 'upgrade' sirve para que un invitado guarde su progreso con correo.
 */
export function renderLogin(root: HTMLElement, onDone: () => void, mode: Mode = 'login', onCancel?: () => void): void {
  const email = h('input', { type: 'email', placeholder: 'Correo', autocomplete: 'email', required: true });
  const password = h('input', { type: 'password', placeholder: 'Contraseña (mínimo 6)', autocomplete: mode === 'login' ? 'current-password' : 'new-password', required: true, minlength: '6' });
  const username = h('input', { type: 'text', placeholder: 'Nombre de jugador', autocomplete: 'nickname', minlength: '3', maxlength: '20' });
  const status = h('p', { class: 'login__status', role: 'status' });
  const submit = h('button', { class: 'big-btn big-btn--main', type: 'submit' },
    mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Guardar cuenta');

  const busy = (on: boolean, text = '') => {
    for (const b of root.querySelectorAll('button')) (b as HTMLButtonElement).disabled = on;
    status.textContent = text;
    status.classList.remove('login__status--error');
  };
  const fail = (e: unknown) => {
    busy(false);
    status.textContent = e instanceof Error ? e.message : String(e);
    status.classList.add('login__status--error');
  };

  const form = h('form', { class: 'login__form' },
    mode !== 'login' ? username : '',
    email, password, submit, status);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    busy(true, 'Un momento…');
    try {
      if (mode === 'login') {
        await signIn(email.value.trim(), password.value);
      } else if (mode === 'register') {
        const name = username.value.trim();
        if (name && usernameError(name)) throw new Error(usernameError(name)!);
        const mustConfirm = await signUp(email.value.trim(), password.value, name);
        if (mustConfirm) {
          busy(false, 'Te enviamos un correo. Confírmalo y luego inicia sesión.');
          return;
        }
      } else {
        const name = username.value.trim();
        if (name && usernameError(name)) throw new Error(usernameError(name)!);
        if (name) await setUsername(name);
        await upgradeGuest(email.value.trim(), password.value);
        busy(false, 'Listo. Si te llega un correo de confirmación, ábrelo para terminar.');
        setTimeout(onDone, 1500);
        return;
      }
      onDone();
    } catch (e) { fail(e); }
  });

  const switcher = mode === 'upgrade'
    ? h('button', { class: 'link-btn', type: 'button', onclick: () => onCancel?.() }, '← Volver')
    : h('button', { class: 'link-btn', type: 'button', onclick: () => renderLogin(root, onDone, mode === 'login' ? 'register' : 'login') },
        mode === 'login' ? '¿No tienes cuenta? Crea una' : '¿Ya tienes cuenta? Inicia sesión');

  const guest = mode === 'upgrade' ? '' : h('div', { class: 'login__guest' },
    h('button', { class: 'big-btn', type: 'button', onclick: async () => {
      busy(true, 'Entrando como invitado…');
      try { await signInGuest(); onDone(); } catch (e) { fail(e); }
    } }, 'Jugar como invitado'),
    h('p', { class: 'login__fine' }, 'Como invitado tu progreso se guarda en la nube, pero solo en este navegador. Puedes guardarlo con correo después.'));

  root.replaceChildren(h('main', { class: 'screen menu login' },
    h('div', { class: 'menu__sun', 'aria-hidden': 'true' }, '✺'),
    h('h1', { class: 'menu__title' }, GAME_TITLE),
    h('p', { class: 'menu__subtitle' }, mode === 'upgrade' ? 'Guarda tu progreso con correo y contraseña' : GAME_SUBTITLE),
    form,
    switcher,
    guest,
  ));
  (mode === 'register' ? username : email).focus();
}
