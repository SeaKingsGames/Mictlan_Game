-- =====================================================================
-- Multijugador: salas con código. Las jugadas las escribe SOLO la Edge Function "pvp",
-- que repite la partida y rechaza lo inválido. Los jugadores solo leen su sala.
-- =====================================================================

create table public.pvp_matches (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  host_id       uuid not null references auth.users (id) on delete cascade,
  guest_id      uuid references auth.users (id) on delete cascade,
  host_name     text,
  guest_name    text,
  status        text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'cancelled')),
  seed          bigint,
  host_deck     integer[] not null,
  guest_deck    integer[],
  host_levels   jsonb not null default '{}',
  guest_levels  jsonb,
  data_version  text not null,
  intents       jsonb not null default '[]',
  winner        smallint check (winner in (0, 1)),
  rewards       jsonb,
  created_at    timestamptz not null default now(),
  last_move_at  timestamptz not null default now()
);
-- Un código solo puede estar en una sala abierta a la vez
create unique index pvp_open_code on public.pvp_matches (code) where status in ('waiting', 'playing');
create index pvp_by_host on public.pvp_matches (host_id, created_at desc);
create index pvp_by_guest on public.pvp_matches (guest_id, created_at desc);

alter table public.pvp_matches enable row level security;
create policy "ver mis salas" on public.pvp_matches for select to authenticated
  using (host_id = auth.uid() or guest_id = auth.uid());
revoke insert, update, delete on public.pvp_matches from authenticated, anon;

-- Realtime: cada jugador recibe al instante los cambios de su sala
alter publication supabase_realtime add table public.pvp_matches;

-- ---------- Agregar una jugada (todo o nada; si alguien más jugó primero, falla) ----------
create or replace function public.pvp_append(p_match uuid, p_expected integer, p_intents jsonb, p_winner smallint)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.pvp_matches
    set intents = p_intents, last_move_at = now(),
        winner = p_winner,
        status = case when p_winner is null then status else 'finished' end
    where id = p_match and status = 'playing' and jsonb_array_length(intents) = p_expected;
  return found;
end;
$$;

-- ---------- Premio al ganador (una sola vez, con límite diario) ----------
create or replace function public.settle_pvp(p_match uuid, p_cacao integer, p_daily integer, p_same_rival integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  m public.pvp_matches;
  winner_id uuid;
  loser_id uuid;
  today_wins integer;
  vs_rival integer;
  pay integer := 0;
  reason text := null;
begin
  select * into m from public.pvp_matches where id = p_match for update;
  if not found or m.status <> 'finished' or m.winner is null then return jsonb_build_object('ok', false, 'error', 'La partida no ha terminado'); end if;
  if m.rewards is not null then return m.rewards; end if;   -- ya se pagó

  winner_id := case when m.winner = 0 then m.host_id else m.guest_id end;
  loser_id  := case when m.winner = 0 then m.guest_id else m.host_id end;

  select count(*) into today_wins from public.pvp_matches
    where status = 'finished' and rewards ->> 'paid_to' = winner_id::text and (rewards ->> 'cacao')::int > 0
      and last_move_at > now() - interval '1 day';
  select count(*) into vs_rival from public.pvp_matches
    where status = 'finished' and rewards ->> 'paid_to' = winner_id::text and (rewards ->> 'cacao')::int > 0
      and (host_id = loser_id or guest_id = loser_id) and last_move_at > now() - interval '1 day';

  if today_wins >= p_daily then reason := 'daily';
  elsif vs_rival >= p_same_rival then reason := 'same_rival';
  else pay := p_cacao;
  end if;

  update public.profiles set cacao = cacao + pay, wins = wins + 1 where id = winner_id;
  update public.profiles set losses = losses + 1 where id = loser_id;
  update public.pvp_matches
    set rewards = jsonb_build_object('paid_to', winner_id, 'cacao', pay, 'limit', reason)
    where id = p_match
    returning rewards into m.rewards;
  return m.rewards;
end;
$$;

revoke execute on function public.pvp_append(uuid, integer, jsonb, smallint) from public, anon, authenticated;
revoke execute on function public.settle_pvp(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.pvp_append(uuid, integer, jsonb, smallint) to service_role;
grant execute on function public.settle_pvp(uuid, integer, integer, integer) to service_role;
