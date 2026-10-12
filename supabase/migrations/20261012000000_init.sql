-- =====================================================================
-- Cartas del Quinto Sol · esquema inicial
-- Regla de oro: el jugador puede LEER sus datos, pero todo lo que da recursos
-- (cartas, cacao, jade, victorias) lo escriben solo las Edge Functions.
-- =====================================================================

-- ---------- Perfil: nombre y monedas ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique check (username is null or char_length(username) between 3 and 20),
  cacao       integer not null default 0 check (cacao >= 0),
  jade        integer not null default 0 check (jade >= 0),
  wins        integer not null default 0,
  losses      integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Colección: cuántas copias tienes de cada carta (máximo 3) ----------
create table public.collection (
  user_id  uuid not null references auth.users (id) on delete cascade,
  card_id  integer not null,
  count    integer not null check (count between 0 and 3),
  primary key (user_id, card_id)
);

-- ---------- Mazos (el jugador sí los edita; el servidor revisa que tengas las cartas) ----------
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Mi mazo' check (char_length(name) between 1 and 40),
  cards       integer[] not null default '{}' check (cardinality(cards) <= 40),
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create unique index decks_one_active on public.decks (user_id) where is_active;

-- ---------- Progreso contra cada duelista (para desbloqueos y, más adelante, tiers de drop) ----------
create table public.campaign_progress (
  user_id       uuid not null references auth.users (id) on delete cascade,
  duelist_id    text not null,
  wins          integer not null default 0,
  losses        integer not null default 0,
  first_win_at  timestamptz,
  primary key (user_id, duelist_id)
);

-- ---------- Duelos: semilla que da el servidor y resultado verificado ----------
create table public.duels (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  duelist_id    text not null,
  seed          bigint not null,
  deck          integer[] not null,
  data_version  text not null,
  status        text not null default 'active' check (status in ('active', 'finishing', 'finished', 'rejected')),
  winner        smallint,
  rewards       jsonb,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index duels_user on public.duels (user_id, created_at desc);

-- ---------- Seguridad (RLS) ----------
alter table public.profiles          enable row level security;
alter table public.collection        enable row level security;
alter table public.decks             enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.duels             enable row level security;

create policy "ver mi perfil"        on public.profiles          for select to authenticated using (id = auth.uid());
create policy "cambiar mi nombre"    on public.profiles          for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "ver mi colección"     on public.collection        for select to authenticated using (user_id = auth.uid());
create policy "ver mis mazos"        on public.decks             for select to authenticated using (user_id = auth.uid());
create policy "crear mis mazos"      on public.decks             for insert to authenticated with check (user_id = auth.uid());
create policy "editar mis mazos"     on public.decks             for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "borrar mis mazos"     on public.decks             for delete to authenticated using (user_id = auth.uid());
create policy "ver mi progreso"      on public.campaign_progress for select to authenticated using (user_id = auth.uid());
create policy "ver mis duelos"       on public.duels             for select to authenticated using (user_id = auth.uid());

-- Del perfil, el jugador solo puede cambiar su nombre (nunca su cacao, jade o victorias)
revoke update on public.profiles from authenticated, anon;
grant update (username) on public.profiles to authenticated;
-- Nada de escribir directo en colección, progreso o duelos
revoke insert, update, delete on public.collection, public.campaign_progress, public.duels from authenticated, anon;

-- ---------- Alta de jugador: perfil + colección inicial + mazo inicial ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'username'), ''));

  insert into public.collection (user_id, card_id, count) values
    (new.id, 1, 3),
    (new.id, 2, 3),
    (new.id, 3, 2),
    (new.id, 4, 1),
    (new.id, 5, 1),
    (new.id, 9, 3),
    (new.id, 10, 3),
    (new.id, 11, 3),
    (new.id, 12, 3),
    (new.id, 13, 3),
    (new.id, 15, 1),
    (new.id, 16, 3),
    (new.id, 17, 1),
    (new.id, 18, 2),
    (new.id, 19, 1),
    (new.id, 20, 2),
    (new.id, 21, 1),
    (new.id, 22, 1),
    (new.id, 23, 1),
    (new.id, 24, 1),
    (new.id, 25, 1);

  insert into public.decks (user_id, name, cards, is_active)
  values (new.id, 'Mazo inicial', '{1,1,1,2,2,2,9,9,9,10,10,10,11,11,11,12,12,12,13,13,13,16,16,16,3,3,5,15,17,4,18,18,19,20,20,21,22,23,24,25}', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Liquidar un duelo (solo lo llama la Edge Function con la llave de servicio) ----------
-- Todo en una transacción: si el duelo ya no está 'active', no paga nada (evita cobrar dos veces).
-- p_cards: [{"id": 12, "cacao": 2, "jade": 1}, ...] = carta ganada y lo que vale si ya tienes 3.
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
    set cacao  = cacao + case when p_won then p_cacao + extra_cacao else 0 end,
        jade   = jade  + case when p_won then p_jade  + extra_jade  else 0 end,
        wins   = wins   + (case when p_won then 1 else 0 end),
        losses = losses + (case when p_won then 0 else 1 end)
    where id = d.user_id;

  update public.duels
    set status = 'finished', winner = case when p_won then 0 else 1 end, finished_at = now(),
        rewards = coalesce(p_rewards, '{}') || jsonb_build_object('cards', added,
                    'cacao', case when p_won then p_cacao + extra_cacao else 0 end,
                    'jade',  case when p_won then p_jade + extra_jade else 0 end)
    where id = p_duel;

  return jsonb_build_object('ok', true, 'firstWin', first_win, 'cards', added,
    'cacao', case when p_won then p_cacao + extra_cacao else 0 end,
    'jade',  case when p_won then p_jade + extra_jade else 0 end);
end;
$$;

revoke execute on function public.settle_duel(uuid, boolean, integer, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.settle_duel(uuid, boolean, integer, integer, jsonb, jsonb) to service_role;
