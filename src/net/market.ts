import { DATA_VERSION } from '../data/index.ts';
import type { Profile } from '../game/profile.ts';
import type { CardGot, Market, MarketState, MarketWallet, SpinResult } from '../html/MarketView.ts';
import { invoke } from './cloud.ts';

/** Ruleta y mercado en la nube: todo lo decide la Edge Function "market"; aquí solo se refleja en el perfil. */
export function cloudMarket(p: Profile): Market {
  const call = <T>(action: string, extra: Record<string, unknown> = {}) => invoke<T>('market', { action, dataVersion: DATA_VERSION, ...extra });
  const setWallet = (w?: MarketWallet) => {
    if (!w || !p.account) return;
    p.account.cacao = w.cacao; p.account.jade = w.jade; p.account.tickets = w.tickets; p.account.gold = w.gold;
  };
  const gotCard = (c: CardGot | null | undefined) => { if (c && !c.converted) p.collection[c.id] = (p.collection[c.id] ?? 0) + 1; };
  return {
    local: false,
    async state() {
      const r = await call<{ wallet: MarketWallet; roulette: { featured: number }; shop: MarketState['shop'] }>('state');
      setWallet(r.wallet);
      return { featured: r.roulette.featured, shop: r.shop };
    },
    async buyGold(count) { setWallet((await call<{ wallet: MarketWallet }>('buyGold', { count })).wallet); },
    async spin() {
      const r = await call<SpinResult & { wallet: MarketWallet; roulette: { featured: number } }>('spin');
      setWallet(r.wallet);
      gotCard(r.card);
      return { index: r.index, prize: r.prize, card: r.card, featured: r.roulette.featured };
    },
    async refresh() {
      const r = await call<{ wallet: MarketWallet; shop: MarketState['shop'] }>('refresh');
      setWallet(r.wallet);
      return r.shop;
    },
    async buy(slot) {
      const r = await call<{ wallet: MarketWallet; shop: MarketState['shop']; card: number }>('buy', { slot });
      setWallet(r.wallet);
      gotCard({ id: r.card, converted: false });
      return r.shop;
    },
  };
}
