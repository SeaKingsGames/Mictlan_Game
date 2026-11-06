-- =====================================================================
-- Misiones (diarias y semanales), recompensa por entrar cada día y ofertas de la tienda de jade.
-- Las misiones activas las elige game.js con la fecha (no se guardan aquí); aquí solo va el progreso.
-- =====================================================================

-- ---------- progreso de misiones ----------
create table if not exists public.mission_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  period      text not null,                 -- "2026-11-05" (diaria) o "2026-W45" (semanal)
  mission_id  text not null,
  progress    integer not null default 0 check (progress >= 0),
  target      integer not null check (target > 0),
  claimed     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period, mission_id)
);
alter table public.mission_progress enable row level security;
create policy "ver mis misiones" on public.mission_progress for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.mission_progress from authenticated, anon;

-- ---------- entrada diaria ----------
create table if not exists public.daily_login (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  streak    integer not null default 0,
  last_day  date,
  total     integer not null default 0
);
alter table public.daily_login enable row level security;
create policy "ver mi entrada diaria" on public.daily_login for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.daily_login from authenticated, anon;

-- ---------- dar monedas (uso interno) ----------
create or replace function public._give_reward(p_user uuid, p_cacao integer, p_jade integer, p_tickets integer, p_gold integer)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
    set cacao = cacao + greatest(0, coalesce(p_cacao, 0)),
        jade = jade + greatest(0, coalesce(p_jade, 0)),
        tickets = tickets + greatest(0, coalesce(p_tickets, 0)),
        gold_tickets = gold_tickets + greatest(0, coalesce(p_gold, 0))
    where id = p_user;
$$;
revoke execute on function public._give_reward(uuid, integer, integer, integer, integer) from public, anon, authenticated;

-- ---------- sumar progreso (lo llaman las Edge Functions después de un duelo, sobre, etc.) ----------
-- p_items: [{"period": "2026-11-05", "mission": "d-win-2", "target": 2, "amount": 1}, ...]
create or replace function public.add_mission_progress(p_user uuid, p_items jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  it jsonb;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    insert into public.mission_progress (user_id, period, mission_id, progress, target)
      values (p_user, it->>'period', it->>'mission', least((it->>'target')::int, greatest(0, (it->>'amount')::int)), (it->>'target')::int)
      on conflict (user_id, period, mission_id) do update
        set progress = least(mission_progress.target, mission_progress.progress + greatest(0, (it->>'amount')::int)),
            updated_at = now()
        where not mission_progress.claimed;
  end loop;
end;
$$;

-- ---------- cobrar una misión ----------
create or replace function public.claim_mission(
  p_user uuid, p_period text, p_mission text, p_cacao integer, p_jade integer, p_tickets integer, p_gold integer
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  m public.mission_progress;
  me public.profiles;
begin
  select * into m from public.mission_progress where user_id = p_user and period = p_period and mission_id = p_mission for update;
  if not found or m.progress < m.target then return jsonb_build_object('ok', false, 'error', 'Todavía no completas esa misión'); end if;
  if m.claimed then return jsonb_build_object('ok', false, 'error', 'Ya cobraste esa misión'); end if;
  update public.mission_progress set claimed = true, updated_at = now() where user_id = p_user and period = p_period and mission_id = p_mission;
  perform public._give_reward(p_user, p_cacao, p_jade, p_tickets, p_gold);
  select * into me from public.profiles where id = p_user;
  return jsonb_build_object('ok', true, 'cacao', me.cacao, 'jade', me.jade, 'tickets', me.tickets, 'gold', me.gold_tickets);
end;
$$;

-- ---------- cobrar la entrada del día ----------
-- p_expected_last: el last_day que vio la función (si cambió, alguien cobró al mismo tiempo → 'retry').
create or replace function public.claim_daily(
  p_user uuid, p_today date, p_expected_last date, p_streak integer,
  p_cacao integer, p_jade integer, p_tickets integer, p_gold integer
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  d public.daily_login;
  me public.profiles;
begin
  insert into public.daily_login (user_id) values (p_user) on conflict do nothing;
  select * into d from public.daily_login where user_id = p_user for update;
  if d.last_day = p_today then return jsonb_build_object('ok', false, 'error', 'Ya cobraste hoy. Vuelve mañana.'); end if;
  if d.last_day is distinct from p_expected_last then return jsonb_build_object('ok', false, 'error', 'retry'); end if;
  update public.daily_login set streak = p_streak, last_day = p_today, total = total + 1 where user_id = p_user;
  perform public._give_reward(p_user, p_cacao, p_jade, p_tickets, p_gold);
  select * into me from public.profiles where id = p_user;
  return jsonb_build_object('ok', true, 'cacao', me.cacao, 'jade', me.jade, 'tickets', me.tickets, 'gold', me.gold_tickets);
end;
$$;

revoke execute on function public.add_mission_progress(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.claim_mission(uuid, text, text, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.claim_daily(uuid, date, date, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.add_mission_progress(uuid, jsonb) to service_role;
grant execute on function public.claim_mission(uuid, text, text, integer, integer, integer, integer) to service_role;
grant execute on function public.claim_daily(uuid, date, date, integer, integer, integer, integer, integer) to service_role;

-- =====================================================================
-- OFERTAS de la tienda de jade (las creas tú en el SQL Editor, ver la guía)
--   bonus_pct  → % de jade extra (50 = +50%)
--   extra_gold → tickets oro de regalo
--   price      → precio especial en pesos (vacío = precio normal)
--   starts_at / ends_at → cuándo empieza y termina
-- =====================================================================
create table if not exists public.store_offers (
  id          bigint generated always as identity primary key,
  package_id  text not null,
  label       text not null default 'Oferta',
  bonus_pct   integer not null default 0 check (bonus_pct between 0 and 500),
  extra_gold  integer not null default 0 check (extra_gold between 0 and 20),
  price       numeric(10, 2) check (price is null or price > 0),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.store_offers enable row level security;
-- Las ofertas vigentes las puede ver cualquiera (las muestra la tienda)
create policy "ver ofertas vigentes" on public.store_offers for select to anon, authenticated
  using (active and now() between starts_at and ends_at);
revoke insert, update, delete on public.store_offers from authenticated, anon;

-- Cada pedido guarda la oferta con la que se creó (si la oferta termina mientras pagas, se respeta)
alter table public.jade_orders add column if not exists offer jsonb;
