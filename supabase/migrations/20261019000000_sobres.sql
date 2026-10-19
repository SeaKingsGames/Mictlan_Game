-- =====================================================================
-- Tienda de sobres (jade)
--  - packs_since_ur: sobres seguidos sin UR (a los 10, UR garantizada)
--  - las cuentas nuevas empiezan con 300 de jade; las que ya existen reciben 300 de regalo (una vez)
--  - pack_opens: historial de lo que salió en cada compra
-- =====================================================================

alter table public.profiles add column if not exists packs_since_ur smallint not null default 0 check (packs_since_ur >= 0);
alter table public.profiles alter column jade set default 300;
update public.profiles set jade = jade + 300;   -- regalo de bienvenida a la tienda (se corre una sola vez)

create table if not exists public.pack_opens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  pack_id     text not null,
  count       smallint not null,
  price       integer not null,
  cards       jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists pack_opens_user on public.pack_opens (user_id, created_at desc);
alter table public.pack_opens enable row level security;
create policy "ver mis sobres" on public.pack_opens for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.pack_opens from authenticated, anon;

-- ---------- Abrir sobres (solo la Edge Function pack-open) ----------
-- Todo en una transacción: cobra el jade, mete las cartas (si ya tienes 3, se vuelven cacao/jade
-- como en los duelos) y actualiza la garantía. p_expected_since evita que dos compras al mismo
-- tiempo usen la misma garantía.
-- p_cards: [{"id": 12, "cacao": 2, "jade": 1}, ...]
create or replace function public.open_packs(
  p_user uuid, p_pack text, p_count smallint, p_price integer, p_cards jsonb,
  p_expected_since smallint, p_new_since smallint
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  me public.profiles;
  c jsonb;
  have integer;
  extra_cacao integer := 0;
  extra_jade integer := 0;
  added jsonb := '[]';
begin
  select * into me from public.profiles where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Perfil no encontrado'); end if;
  if me.packs_since_ur <> p_expected_since then return jsonb_build_object('ok', false, 'error', 'retry'); end if;
  if me.jade < p_price then return jsonb_build_object('ok', false, 'error', 'No te alcanza el jade'); end if;

  for c in select * from jsonb_array_elements(coalesce(p_cards, '[]')) loop
    insert into public.collection (user_id, card_id, count) values (p_user, (c->>'id')::int, 0)
      on conflict do nothing;
    select count into have from public.collection
      where user_id = p_user and card_id = (c->>'id')::int for update;
    if have < 3 then
      update public.collection set count = count + 1 where user_id = p_user and card_id = (c->>'id')::int;
      added := added || jsonb_build_array(jsonb_build_object('id', (c->>'id')::int, 'converted', false));
    else
      extra_cacao := extra_cacao + (c->>'cacao')::int;
      extra_jade  := extra_jade  + (c->>'jade')::int;
      added := added || jsonb_build_array(jsonb_build_object('id', (c->>'id')::int, 'converted', true,
                 'cacao', (c->>'cacao')::int, 'jade', (c->>'jade')::int));
    end if;
  end loop;

  update public.profiles
    set jade = jade - p_price + extra_jade,
        cacao = cacao + extra_cacao,
        packs_since_ur = p_new_since
    where id = p_user
    returning * into me;

  insert into public.pack_opens (user_id, pack_id, count, price, cards)
    values (p_user, p_pack, p_count, p_price, added);

  return jsonb_build_object('ok', true, 'cards', added, 'jade', me.jade, 'cacao', me.cacao,
    'sinceUr', me.packs_since_ur, 'extraCacao', extra_cacao, 'extraJade', extra_jade);
end;
$$;

revoke execute on function public.open_packs(uuid, text, smallint, integer, jsonb, smallint, smallint) from public, anon, authenticated;
grant execute on function public.open_packs(uuid, text, smallint, integer, jsonb, smallint, smallint) to service_role;
