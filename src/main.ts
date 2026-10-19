import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import './html/card.css';
import './html/duel.css';
import './html/screens.css';
import './html/app.css';
import { createRng } from './core/rng.ts';
import { cardDb } from './data/index.ts';
import { CURRENCY, GAME_TITLE } from './game/config.ts';
import { duelists, getDuelist, isUnlocked, type Duelist } from './game/duelists.ts';
import { addCards, ascendLocal, levelUpLocal, levelsForDeck, loadProfile, saveProfile, validatePlayerDeck, type Profile } from './game/profile.ts';
import { rollRewards } from './game/rewards.ts';
import { renderCampaign } from './html/CampaignView.ts';
import { renderDeckBuilder, type CardUpgrades } from './html/DeckBuilderView.ts';
import { h } from './html/dom.ts';
import { DuelView, type DuelResult } from './html/DuelView.ts';
import { renderLogin } from './html/LoginView.ts';
import { renderMenu } from './html/MenuView.ts';
import { renderFreeDuel } from './html/FreeDuelView.ts';
import { renderLibrary } from './html/LibraryView.ts';
import { renderShop, type PackShop } from './html/ShopView.ts';
import { openPacks } from './game/packs.ts';
import { renderCardMarket, renderRoulette, type Market } from './html/MarketView.ts';
import { cloudMarket } from './net/market.ts';
import { pickFeatured, ROULETTE_PRIZES, spinIndex } from './game/roulette.ts';
import { rollShop, shopDay } from './game/cardShop.ts';
import { MAX_COPIES, rarityOf } from './data/types.ts';
import { DUPLICATE_VALUE } from './game/config.ts';
import { renderPvpLobby } from './html/PvpLobbyView.ts';
import { setupInstall } from './html/install.ts';
import { getMatch, myUserId, remoteFor, waitForResult } from './net/pvp.ts';
import type { Intent } from './core/DuelState.ts';
import {
  ascendCloud, finishCloudDuel, openPacksCloud, flushDeck, hasSession, levelUpCloud, loadCloudProfile, queueDeckSave, signOut, startCloudDuel,
} from './net/cloud.ts';
import { cloudEnabled, supabase } from './net/supabase.ts';

/**
 * Navegación por #hash:
 *   #/            menú
 *   #/mazo        mi mazo y colección
 *   #/campana     campaña
 *   #/libre       duelo libre (rivales desbloqueados)
 *   #/tienda      tienda de sobres
 *   #/biblioteca  todas las cartas del juego
 *   #/ruleta      ruleta de premios (tickets oro)
 *   #/mercado     mercado de cartas (6 cartas al azar por cacao)
 *   #/duelo/<id>  duelo contra ese duelista
 *   #/cuenta      (invitado) guardar cuenta con correo
 *   #/pvp         multijugador: crear sala o unirse con código
 *   #/pvp/<id>    duelo contra otro jugador
 *
 * Dos modos:
 *   - NUBE (si hay VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY): cuenta, y los premios los da el servidor.
 *   - LOCAL (sin esas variables): todo en el navegador, como antes. Útil para probar.
 */
const app = document.querySelector<HTMLDivElement>('#app')!;
setupInstall();
document.title = GAME_TITLE;
let profile: Profile | null = cloudEnabled ? null : loadProfile();
let leaveScreen: (() => void) | null = null;   // limpia escuchas de la pantalla anterior (salas)

const go = (hash: string) => { location.hash = hash; };

function loading(text = 'Cargando…'): void {
  app.replaceChildren(h('main', { class: 'screen menu' },
    h('div', { class: 'menu__sun', 'aria-hidden': 'true' }, '✺'),
    h('p', { class: 'menu__subtitle' }, text)));
}

/** Modo nube: baja el perfil (o pide iniciar sesión) y dibuja la pantalla actual. */
async function boot(): Promise<void> {
  if (!cloudEnabled) { route(); return; }
  loading();
  try {
    if (!(await hasSession())) { profile = null; renderLogin(app, () => void boot()); return; }
    profile = await loadCloudProfile();
    route();
  } catch (e) {
    app.replaceChildren(h('main', { class: 'screen menu' },
      h('p', { class: 'warn-box' }, `No se pudo conectar: ${e instanceof Error ? e.message : String(e)}`),
      h('button', { class: 'big-btn', onclick: () => void boot() }, 'Reintentar')));
  }
}

function route(): void {
  if (!profile) { void boot(); return; }
  const p = profile;
  const [, page = '', arg = ''] = location.hash.split('/');
  leaveScreen?.(); leaveScreen = null;
  document.body.classList.toggle('in-duel', page === 'duelo' || (page === 'pvp' && !!arg));
  window.scrollTo(0, 0);

  switch (page) {
    case 'mazo': renderDeckBuilder(app, p, go, cloudEnabled ? pr => queueDeckSave(pr.deck) : saveProfile, upgradesFor(p)); return;
    case 'campana': renderCampaign(app, p, go); return;
    case 'libre': renderFreeDuel(app, p, go); return;
    case 'tienda': renderShop(app, p, go, shopFor(p)); return;
    case 'biblioteca': renderLibrary(app, p, go); return;
    case 'ruleta': renderRoulette(app, p, go, marketFor(p)); return;
    case 'mercado': renderCardMarket(app, p, go, marketFor(p)); return;
    case 'duelo': startDuel(p, arg); return;
    case 'pvp':
      if (arg) void startPvp(p, arg);
      else leaveScreen = renderPvpLobby(app, p, go, cloudEnabled);
      return;
    case 'cuenta':
      if (p.account?.guest) { renderLogin(app, () => { go('#/'); void boot(); }, 'upgrade', () => go('#/')); return; }
      go('#/'); return;
    default:
      renderMenu(app, p, go, {
        onReset: fresh => { profile = fresh; route(); },
        onSignOut: cloudEnabled ? () => { void signOut().then(() => { profile = null; go('#/'); void boot(); }); } : undefined,
        onUpgrade: cloudEnabled ? () => go('#/cuenta') : undefined,
      });
  }
}

/** Subir de nivel y ascender: en la nube lo decide el servidor; en modo local, el navegador. */
function upgradesFor(p: Profile): CardUpgrades {
  if (!cloudEnabled) {
    return {
      cacao: () => null,
      levelUp: async card => { const err = levelUpLocal(p, card); if (err) throw new Error(err); saveProfile(p); },
      ascend: async card => {
        const err = ascendLocal(p, card, cardDb);
        if (err) throw new Error(err);
        saveProfile(p);
        return cardDb.get(card.ascendsTo!);
      },
    };
  }
  return {
    cacao: () => p.account?.cacao ?? 0,
    levelUp: async card => {
      const r = await levelUpCloud(card.id);
      p.levels = { ...p.levels, [card.id]: r.level };
      if (p.account) p.account.cacao = r.cacao;
    },
    ascend: async card => {
      const r = await ascendCloud(card.id);
      if (r.base > 0) p.collection[r.cardId] = r.base; else delete p.collection[r.cardId];
      p.collection[r.resultId] = r.result;
      p.deck = r.deck;
      return cardDb.get(r.resultId);
    },
  };
}

/** Sobres: en la nube los abre el servidor (cobra jade); en modo local, gratis en el navegador. */
function shopFor(p: Profile): PackShop {
  if (!cloudEnabled) {
    return {
      jade: () => null,
      open: async (pack, count) => {
        const r = openPacks(pack, cardDb, createRng((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0), p.packsSinceUr ?? 0, count);
        p.packsSinceUr = r.sinceUr;
        const result = r.packs.map(o => ({
          pity: o.pity,
          cards: o.cards.map(id => {
            if ((p.collection[id] ?? 0) < MAX_COPIES) { p.collection[id] = (p.collection[id] ?? 0) + 1; return { id, converted: false }; }
            return { id, converted: true, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] };
          }),
        }));
        saveProfile(p);
        return { packs: result };
      },
    };
  }
  return {
    jade: () => p.account?.jade ?? 0,
    open: async (pack, count) => {
      const r = await openPacksCloud(pack.id, count);
      if (p.account) { p.account.jade = r.jade; p.account.cacao = r.cacao; }
      p.packsSinceUr = r.sinceUr;
      for (const c of r.packs.flatMap(x => x.cards)) if (!c.converted) p.collection[c.id] = (p.collection[c.id] ?? 0) + 1;
      return r;
    },
  };
}

/** Ruleta y mercado: en la nube el servidor; en modo local, gratis en el navegador (para probar). */
function marketFor(p: Profile): Market {
  if (cloudEnabled) return cloudMarket(p);
  const rnd = () => createRng((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0);
  const m = (p.market ??= { featured: pickFeatured(cardDb, rnd()), shop: { slots: rollShop(cardDb, rnd()), day: shopDay() } });
  const give = (id: number) => {
    if ((p.collection[id] ?? 0) >= MAX_COPIES) return { id, converted: true, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] };
    p.collection[id] = (p.collection[id] ?? 0) + 1;
    return { id, converted: false };
  };
  return {
    local: true,
    async state() {
      if (m.shop.day !== shopDay()) m.shop = { slots: rollShop(cardDb, rnd()), day: shopDay() };
      saveProfile(p);
      return { featured: m.featured, shop: m.shop };
    },
    async buyGold() { /* en modo local no hace falta */ },
    async spin() {
      const rng = rnd();
      const index = spinIndex(rng);
      const prize = ROULETTE_PRIZES[index];
      const card = prize.kind === 'card' ? give(m.featured) : null;
      m.featured = pickFeatured(cardDb, rng, m.featured);
      saveProfile(p);
      return { index, prize: { kind: prize.kind, amount: prize.amount, card: card?.id ?? null }, card, featured: m.featured };
    },
    async refresh() { m.shop = { slots: rollShop(cardDb, rnd()), day: shopDay() }; saveProfile(p); return m.shop; },
    async buy(slot) {
      const s = m.shop.slots[slot];
      if (!s || s.sold) throw new Error('Esa carta ya no está');
      if ((p.collection[s.card] ?? 0) >= MAX_COPIES) throw new Error('Ya tienes 3 copias de esa carta');
      give(s.card);
      s.sold = true;
      saveProfile(p);
      return m.shop;
    },
  };
}

function startDuel(p: Profile, id: string): void {
  const rival = getDuelist(id);
  if (!rival || !isUnlocked(rival.id, p.defeated) || validatePlayerDeck(p, p.deck, cardDb).length) {
    go('#/campana');
    return;
  }
  const deck = [...p.deck];
  let duelId = '';
  new DuelView(app, {
    playerDeck: deck,
    opponent: rival,
    levels: levelsForDeck(p, deck),
    newSeed: cloudEnabled ? async () => {
      await flushDeck();
      const d = await startCloudDuel(rival.id);
      if (d.deck.length !== deck.length || d.deck.some((c, i) => c !== deck[i])) {
        throw new Error('Tu mazo en la nube no coincide. Vuelve a abrir "Mi mazo" y reintenta.');
      }
      duelId = d.duelId;
      return { seed: d.seed, levels: d.levels };
    } : undefined,
    onFinish: cloudEnabled
      ? (_won, intents) => finishInCloud(p, rival, duelId, intents)
      : won => finishLocally(p, rival, won),
    onExit: () => go('#/campana'),
  });
}

/** Duelo contra otro jugador (la sala ya existe y está en juego). */
async function startPvp(p: Profile, matchId: string): Promise<void> {
  loading('Entrando a la sala…');
  try {
    const [m, uid] = await Promise.all([getMatch(matchId), myUserId()]);
    if (m.status !== 'playing' && m.status !== 'finished') { go('#/pvp'); return; }
    const me = m.host_id === uid ? 0 : 1;
    const rivalName = (me === 0 ? m.guest_name : m.host_name) ?? 'Rival';
    const view = new DuelView(app, {
      playerDeck: [],   // el mazo lo tiene el servidor
      opponent: { id: 'pvp', name: rivalName, glyph: '⚔' },
      remote: remoteFor(m.id, me),
      onFinish: async won => {
        const done = await waitForResult(matchId);
        const r = done.rewards;
        if (won) p.wins += 1; else p.losses += 1;
        const notes: string[] = [];
        if (won && r && r.paid_to === uid) {
          if (r.cacao > 0) {
            if (p.account) p.account.cacao += r.cacao;
            notes.push(`+${r.cacao} ${CURRENCY.common.icon} ${CURRENCY.common.name}`);
          } else {
            notes.push(r.limit === 'same_rival' ? 'Ya ganaste varias veces hoy contra este rival: esta victoria no da cacao.' : 'Llegaste al límite de victorias con premio de hoy.');
          }
        }
        return { rewards: [], notes };
      },
      onExit: () => go('#/pvp'),
    });
    leaveScreen = () => view.destroy();
  } catch (e) {
    app.replaceChildren(h('main', { class: 'screen menu' },
      h('p', { class: 'warn-box' }, e instanceof Error ? e.message : String(e)),
      h('button', { class: 'big-btn', onclick: () => go('#/pvp') }, 'Volver')));
  }
}

function unlockNote(rival: Duelist): string {
  const next = duelists[duelists.findIndex(d => d.id === rival.id) + 1];
  return next ? `Nuevo duelista desbloqueado: ${next.name}` : '¡Venciste a todos los duelistas!';
}

/** Modo nube: el servidor repite el duelo y decide el premio. Aquí solo se refleja. */
async function finishInCloud(p: Profile, rival: Duelist, duelId: string, intents: readonly Intent[]): Promise<DuelResult> {
  const r = await finishCloudDuel(duelId, intents);
  if (p.account) {
    p.account.cacao = r.balance.cacao; p.account.jade = r.balance.jade;
    if (r.balance.tickets !== undefined) p.account.tickets = r.balance.tickets;
  }
  p.wins = r.balance.wins;
  p.losses = r.balance.losses;
  if (!r.won) return { rewards: [], notes: [] };

  const notes: string[] = [];
  for (const c of r.cards) {
    if (!c.converted) { p.collection[c.id] = (p.collection[c.id] ?? 0) + 1; continue; }
    const name = cardDb.tryGet(c.id)?.name ?? `#${c.id}`;
    notes.push(`Ya tenías 3 de ${name}: se convirtió en ${c.cacao ?? 0} ${CURRENCY.common.name}${c.jade ? ` y ${c.jade} ${CURRENCY.premium.name}` : ''}`);
  }
  notes.unshift(`+${r.cacao} ${CURRENCY.common.icon} ${CURRENCY.common.name}${r.jade ? ` · +${r.jade} ${CURRENCY.premium.icon} ${CURRENCY.premium.name}` : ''}${r.tickets ? ` · +${r.tickets} ${CURRENCY.ticket.icon} ticket` : ''}`);
  if (r.firstWin && !p.defeated.includes(rival.id)) {
    p.defeated.push(rival.id);
    notes.push(unlockNote(rival));
  }
  return { rewards: r.cards.map(c => c.id), notes };
}

/** Modo local (sin Supabase): como antes, todo en el navegador. */
function finishLocally(p: Profile, rival: Duelist, won: boolean): DuelResult {
  if (!won) {
    p.losses += 1;
    saveProfile(p);
    return { rewards: [], notes: [] };
  }
  const firstWin = !p.defeated.includes(rival.id);
  const rewards = rollRewards(rival, firstWin, createRng(Date.now() % 2 ** 31));
  addCards(p, rewards);
  p.wins += 1;
  const notes: string[] = [];
  if (firstWin) {
    p.defeated.push(rival.id);
    notes.push(unlockNote(rival));
  }
  saveProfile(p);
  return { rewards, notes };
}

// Si la sesión se cierra en otra pestaña o caduca, volver a la pantalla de entrada.
supabase?.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT' && profile) { profile = null; void boot(); }
});

window.addEventListener('hashchange', route);
void boot();
