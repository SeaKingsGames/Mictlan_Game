import './html/card.css';
import './html/screens.css';
import { canPromptInstall, installHelpText, isInstalled, onInstallChange, promptInstall, setupInstall } from './html/install.ts';

setupInstall();
const btn = document.querySelector<HTMLButtonElement>('#instalar')!;
const help = document.querySelector<HTMLElement>('#ayuda')!;

function render(): void {
  if (isInstalled()) {
    btn.hidden = true;
    help.textContent = 'Ya tienes el juego instalado. ¡A jugar!';
    return;
  }
  btn.hidden = false;
  help.textContent = canPromptInstall() ? '' : installHelpText();
}
btn.addEventListener('click', async () => {
  if (canPromptInstall()) {
    const ok = await promptInstall();
    help.textContent = ok ? '¡Listo! Búscalo en tu pantalla de inicio o en tus apps.' : '';
  } else {
    help.textContent = installHelpText();
  }
});
onInstallChange(render);
render();
