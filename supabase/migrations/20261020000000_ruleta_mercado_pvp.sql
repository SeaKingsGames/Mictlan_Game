-- =====================================================================
-- Ruleta de premios, mercado de cartas, tickets y multijugador con información oculta.
-- Córrelo UNA vez, después de los archivos anteriores.
-- =====================================================================

-- ---------- Monedas nuevas ----------
alter table public.profiles add column if not exists tickets integer not null default 0 check (tickets >= 0);        -- tickets estándar
alter table public.profiles add column if not exists gold_tickets integer not null default 0 check (gold_tickets >= 0); -- tickets oro (giros)
alter table public.profiles add column if not exists roulette_featured integer;                                       -- carta a la vista

-- ---------- Dar una carta (si ya tienes 3, se vuelve cacao/jade). Uso interno. ----------
create or replace function public._give_card(p_user uuid, p_card integer, p_cacao integer, p_jade integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  have integer;
begin
  insert into public.collection (user_id, card_id, count) values (p_user, p_card, 0) on conflict do nothing;
  select count into have from public.collection where user_id = p_user and card_id = p_card for update;
  if have < 3 then
    update public.collection set count = count + 1 where user_id = p_user and card_id = p_card;
    return jsonb_build_object('id', p_card, 'converted', false);
  end if;
  update public.profiles set cacao = cacao + p_cacao, jade = jade + p_jade where id = p_user;
  return jsonb_build_object('id', p_card, 'converted', true, 'cacao', p_cacao, 'jade', p_jade);
end;
$$;
revoke execute on function public._give_card(uuid, integer, integer, integer) from public, anon, authenticated;

-- ---------- Liquidar duelo: igual que antes + tickets por ganar (vienen en p_rewards.tickets) ----------
create or replace function public.settle_duel(
  p_duel uuid, p_won boolean, p_cacao integer, p_jade integer, p_cards jsonb, p_rewards jsonb
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  d public.duels;
  c jsonb;
  have integer;
  first_win boolean := false;
  extra_cacao integer := 0;
  extra_jade integer := 0;
  added jsonb := '[]';
  win_tickets integer := greatest(0, coalesce((p_rewards ->> 'tickets')::int, 0));
begin
  update public.duels set status = 'finishing'
    where id = p_duel and status = 'active'
    returning * into d;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'already_settled');
  end if;

  if p_won then
    for c in select * from jsonb_array_elements(coalesce(p_cards, '[]')) loop
      insert into public.collection (user_id, card_id, count) values (d.user_id, (c->>'id')::int, 0)
        on conflict do nothing;
      select count into have from public.collection
        where user_id = d.user_id and card_id = (c->>'id')::int for update;
      if have < 3 then
        update public.collection set count = count + 1 where user_id = d.user_id and card_id = (c->>'id')::int;
        added := added || jsonb_build_array(jsonb_build_object('id', (c->>'id')::int, 'converted', false));
      else
        extra_cacao := extra_cacao + (c->>'cacao')::int;
        extra_jade  := extra_jade  + (c->>'jade')::int;
        added := added || jsonb_build_array(jsonb_build_object('id', (c->>'id')::int, 'converted', true,
                   'cacao', (c->>'cacao')::int, 'jade', (c->>'jade')::int));
      end if;
    end loop;
  end if;

  insert into public.campaign_progress (user_id, duelist_id) values (d.user_id, d.duelist_id)
    on conflict do nothing;
  update public.campaign_progress
    set wins = wins + (case when p_won then 1 else 0 end),
        losses = losses + (case when p_won then 0 else 1 end),
        first_win_at = coalesce(first_win_at, case when p_won then now() end)
    where user_id = d.user_id and duelist_id = d.duelist_id
    returning (p_won and wins = 1) into first_win;

  update public.profiles
    set cacao   = cacao + case when p_won then p_cacao + extra_cacao else 0 end,
        jade    = jade  + case when p_won then p_jade  + extra_jade  else 0 end,
        tickets = tickets + case when p_won then win_tickets else 0 end,
        wins    = wins   + (case when p_won then 1 else 0 end),
        losses  = losses + (case when p_won then 0 else 1 end)
    where id = d.user_id;

  update public.duels
    set status = 'finished', winner = case when p_won then 0 else 1 end, finished_at = now(),
        rewards = coalesce(p_rewards, '{}') || jsonb_build_object('cards', added,
                    'cacao', case when p_won then p_cacao + extra_cacao else 0 end,
                    'jade',  case when p_won then p_jade + extra_jade else 0 end)
    where id = p_duel;

  return jsonb_build_object('ok', true, 'firstWin', first_win, 'cards', added,
    'cacao', case when p_won then p_cacao + extra_cacao else 0 end,
    'jade',  case when p_won then p_jade + extra_jade else 0 end,
    'tickets', case when p_won then win_tickets else 0 end);
end;
$$;
revoke execute on function public.settle_duel(uuid, boolean, integer, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.settle_duel(uuid, boolean, integer, integer, jsonb, jsonb) to service_role;

-- =====================================================================
-- Ruleta
-- =====================================================================

-- Comprar tickets oro con cacao
create or replace function public.buy_gold_tickets(p_user uuid, p_count integer, p_price integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  me public.profiles;
begin
  if p_count <= 0 then return jsonb_build_object('ok', false, 'error', 'Cantidad inválida'); end if;
  select * into me from public.profiles where id = p_user for update;
  if me.cacao < p_count * p_price then return jsonb_build_object('ok', false, 'error', 'No te alcanza el cacao'); end if;
  update public.profiles set cacao = cacao - p_count * p_price, gold_tickets = gold_tickets + p_count
    where id = p_user returning * into me;
  return jsonb_build_object('ok', true, 'cacao', me.cacao, 'gold', me.gold_tickets);
end;
$$;

-- Poner la primera carta a la vista (solo si no había)
create or replace function public.set_roulette_featured(p_user uuid, p_card integer)
returns integer
language sql
security definer set search_path = public
as $$
  update public.profiles set roulette_featured = coalesce(roulette_featured, p_card) where id = p_user returning roulette_featured;
$$;

-- Girar: gasta 1 ticket oro, entrega el premio y cambia la carta a la vista.
-- p_expected_featured evita que dos giros al mismo tiempo usen la misma carta.
create or replace function public.spin_roulette(
  p_user uuid, p_expected_featured integer, p_kind text, p_amount integer,
  p_card integer, p_card_cacao integer, p_card_jade integer, p_next_featured integer
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  me public.profiles;
  got jsonb := null;
begin
  select * into me from public.profiles where id = p_user for update;
  if me.gold_tickets < 1 then return jsonb_build_object('ok', false, 'error', 'Necesitas 1 ticket oro'); end if;
  if me.roulette_featured is distinct from p_expected_featured then return jsonb_build_object('ok', false, 'error', 'retry'); end if;

  update public.profiles set gold_tickets = gold_tickets - 1, roulette_featured = p_next_featured where id = p_user;
  if p_kind = 'cacao' then update public.profiles set cacao = cacao + p_amount where id = p_user;
  elsif p_kind = 'jade' then update public.profiles set jade = jade + p_amount where id = p_user;
  elsif p_kind = 'tickets' then update public.profiles set tickets = tickets + p_amount where id = p_user;
  elsif p_kind = 'gold' then update public.profiles set gold_tickets = gold_tickets + p_amount where id = p_user;
  elsif p_kind = 'card' then got := public._give_card(p_user, p_card, p_card_cacao, p_card_jade);
  end if;

  select * into me from public.profiles where id = p_user;
  return jsonb_build_object('ok', true, 'card', got, 'cacao', me.cacao, 'jade', me.jade,
    'tickets', me.tickets, 'gold', me.gold_tickets, 'featured', me.roulette_featured);
end;
$$;

-- =====================================================================
-- Mercado de cartas (6 cartas al azar, se compran con cacao)
-- =====================================================================
create table if not exists public.card_shops (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  slots       jsonb not null,          -- [{"card": 12, "price": 800, "sold": false}, ...]
  day         text not null,           -- día de la última renovación gratis (hora de México)
  updated_at  timestamptz not null default now()
);
alter table public.card_shops enable row level security;
create policy "ver mi mercado" on public.card_shops for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.card_shops from authenticated, anon;

-- Poner cartas nuevas. p_cost = tickets que cuesta (0 si es la renovación gratis del día).
-- Si es gratis, solo procede si el día cambió (p_day distinto al guardado).
create or replace function public.shop_set(p_user uuid, p_slots jsonb, p_day text, p_cost integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  me public.profiles;
  cur public.card_shops;
begin
  select * into me from public.profiles where id = p_user for update;
  select * into cur from public.card_shops where user_id = p_user for update;
  if p_cost = 0 and found and cur.day = p_day then
    return jsonb_build_object('ok', true, 'slots', cur.slots, 'day', cur.day, 'tickets', me.tickets, 'unchanged', true);
  end if;
  if me.tickets < p_cost then return jsonb_build_object('ok', false, 'error', 'No te alcanzan los tickets'); end if;
  update public.profiles set tickets = tickets - p_cost where id = p_user returning * into me;
  insert into public.card_shops (user_id, slots, day) values (p_user, p_slots, p_day)
    on conflict (user_id) do update set slots = excluded.slots, day = excluded.day, updated_at = now();
  return jsonb_build_object('ok', true, 'slots', p_slots, 'day', p_day, 'tickets', me.tickets);
end;
$$;

-- Comprar la carta del lugar p_slot (0-5). Se revisa que sea la misma carta y precio que se mostró.
create or replace function public.shop_buy(p_user uuid, p_slot integer, p_card integer, p_price integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  me public.profiles;
  cur public.card_shops;
  s jsonb;
  have integer;
begin
  select * into me from public.profiles where id = p_user for update;
  select * into cur from public.card_shops where user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Abre el mercado primero'); end if;
  s := cur.slots -> p_slot;
  if s is null or (s ->> 'card')::int <> p_card or (s ->> 'price')::int <> p_price then
    return jsonb_build_object('ok', false, 'error', 'El mercado cambió, recarga');
  end if;
  if (s ->> 'sold')::boolean then return jsonb_build_object('ok', false, 'error', 'Esa carta ya la compraste'); end if;
  select count into have from public.collection where user_id = p_user and card_id = p_card;
  if coalesce(have, 0) >= 3 then return jsonb_build_object('ok', false, 'error', 'Ya tienes 3 copias de esa carta'); end if;
  if me.cacao < p_price then return jsonb_build_object('ok', false, 'error', 'No te alcanza el cacao'); end if;

  update public.profiles set cacao = cacao - p_price where id = p_user returning * into me;
  perform public._give_card(p_user, p_card, 0, 0);
  update public.card_shops set slots = jsonb_set(slots, array[p_slot::text, 'sold'], 'true'::jsonb), updated_at = now()
    where user_id = p_user returning * into cur;
  return jsonb_build_object('ok', true, 'slots', cur.slots, 'cacao', me.cacao);
end;
$$;

revoke execute on function public.buy_gold_tickets(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.set_roulette_featured(uuid, integer) from public, anon, authenticated;
revoke execute on function public.spin_roulette(uuid, integer, text, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.shop_set(uuid, jsonb, text, integer) from public, anon, authenticated;
revoke execute on function public.shop_buy(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.buy_gold_tickets(uuid, integer, integer) to service_role;
grant execute on function public.set_roulette_featured(uuid, integer) to service_role;
grant execute on function public.spin_roulette(uuid, integer, text, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.shop_set(uuid, jsonb, text, integer) to service_role;
grant execute on function public.shop_buy(uuid, integer, integer, integer) to service_role;

-- =====================================================================
-- Multijugador con información oculta
--  Antes cada navegador recibía la semilla, los dos mazos y todas las jugadas (se podía ver la mano
--  del rival). Ahora solo la Edge Function "pvp" los lee y le manda a cada jugador SU vista.
-- =====================================================================
alter table public.pvp_matches add column if not exists move_count integer not null default 0;

-- Los jugadores ya no pueden leer semilla, mazos, niveles ni jugadas
revoke select on public.pvp_matches from authenticated, anon;
grant select (id, code, host_id, guest_id, host_name, guest_name, status, winner, rewards, created_at, last_move_at, move_count)
  on public.pvp_matches to authenticated;

-- Realtime ya no manda la fila completa; en su lugar, una "señal" sin secretos
alter publication supabase_realtime drop table public.pvp_matches;

create table if not exists public.pvp_signals (
  match_id      uuid primary key references public.pvp_matches (id) on delete cascade,
  host_id       uuid not null,
  guest_id      uuid,
  status        text not null,
  move_count    integer not null default 0,
  last_move_at  timestamptz not null default now()
);
alter table public.pvp_signals enable row level security;
create policy "ver señales de mis salas" on public.pvp_signals for select to authenticated
  using (host_id = auth.uid() or guest_id = auth.uid());
revoke insert, update, delete on public.pvp_signals from authenticated, anon;
alter publication supabase_realtime add table public.pvp_signals;

create or replace function public._pvp_signal()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.pvp_signals (match_id, host_id, guest_id, status, move_count, last_move_at)
    values (new.id, new.host_id, new.guest_id, new.status, new.move_count, new.last_move_at)
  on conflict (match_id) do update set guest_id = excluded.guest_id, status = excluded.status,
    move_count = excluded.move_count, last_move_at = excluded.last_move_at;
  return new;
end;
$$;
drop trigger if exists pvp_signal on public.pvp_matches;
create trigger pvp_signal after insert or update on public.pvp_matches
  for each row execute function public._pvp_signal();
-- Señales de las salas que ya existían
insert into public.pvp_signals (match_id, host_id, guest_id, status, move_count, last_move_at)
  select id, host_id, guest_id, status, jsonb_array_length(intents), last_move_at from public.pvp_matches
  on conflict do nothing;

-- Agregar jugada: ahora también guarda cuántas jugadas van (move_count)
create or replace function public.pvp_append(p_match uuid, p_expected integer, p_intents jsonb, p_winner smallint)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.pvp_matches
    set intents = p_intents, move_count = jsonb_array_length(p_intents), last_move_at = now(),
        winner = p_winner,
        status = case when p_winner is null then status else 'finished' end
    where id = p_match and status = 'playing' and jsonb_array_length(intents) = p_expected;
  return found;
end;
$$;
revoke execute on function public.pvp_append(uuid, integer, jsonb, smallint) from public, anon, authenticated;
grant execute on function public.pvp_append(uuid, integer, jsonb, smallint) to service_role;
