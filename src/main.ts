import './html/card.css';
import './html/duel.css';
import './html/screens.css';
import { createRng } from './core/rng.ts';
import { cardDb } from './data/index.ts';
import { GAME_TITLE } from './game/config.ts';
import { duelists, getDuelist, isUnlocked } from './game/duelists.ts';
import { addCards, loadProfile, saveProfile, validatePlayerDeck } from './game/profile.ts';
import { rollRewards } from './game/rewards.ts';
import { renderCampaign } from './html/CampaignView.ts';
import { renderDeckBuilder } from './html/DeckBuilderView.ts';
import { DuelView } from './html/DuelView.ts';
import { renderMenu } from './html/MenuView.ts';

/**
 * Navegación por #hash:
 *   #/            menú
 *   #/mazo        mi mazo y colección
 *   #/campana     campaña
 *   #/libre       duelo libre (rivales desbloqueados)
 *   #/duelo/<id>  duelo contra ese duelista
 */
const app = document.querySelector<HTMLDivElement>('#app')!;
let profile = loadProfile();
document.title = GAME_TITLE;

const go = (hash: string) => { location.hash = hash; };

function route(): void {
  const [, page = '', arg = ''] = location.hash.split('/');
  document.body.classList.toggle('in-duel', page === 'duelo');
  window.scrollTo(0, 0);

  switch (page) {
    case 'mazo': renderDeckBuilder(app, profile, go); return;
    case 'campana': renderCampaign(app, profile, go); return;
    case 'libre': renderCampaign(app, profile, go, true); return;
    case 'duelo': startDuel(arg); return;
    default: renderMenu(app, profile, go, fresh => { profile = fresh; route(); });
  }
}

function startDuel(id: string): void {
  const rival = getDuelist(id);
  if (!rival || !isUnlocked(rival.id, profile.defeated) || validatePlayerDeck(profile, profile.deck, cardDb).length) {
    go('#/campana');
    return;
  }
  new DuelView(app, {
    playerDeck: [...profile.deck],
    opponent: rival,
    onFinish: won => {
      if (!won) {
        profile.losses += 1;
        saveProfile(profile);
        return { rewards: [], notes: [] };
      }
      const firstWin = !profile.defeated.includes(rival.id);
      const rewards = rollRewards(rival, firstWin, createRng(Date.now() % 2 ** 31));
      addCards(profile, rewards);
      profile.wins += 1;
      const notes: string[] = [];
      if (firstWin) {
        profile.defeated.push(rival.id);
        const next = duelists[duelists.findIndex(d => d.id === rival.id) + 1];
        if (next) notes.push(`Nuevo duelista desbloqueado: ${next.name}`);
        else notes.push('¡Venciste a todos los duelistas!');
      }
      saveProfile(profile);
      return { rewards, notes };
    },
    onExit: () => go('#/campana'),
  });
}

window.addEventListener('hashchange', route);
route();
