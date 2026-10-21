-- =====================================================================
-- Tienda de jade con dinero real (Mercado Pago) y códigos de regalo
--  - jade_orders: cada compra. La crea la Edge Function "payments" y la paga Mercado Pago.
--    Solo cuando Mercado Pago confirma el pago (status approved) se entrega lo comprado.
--  - redeem_codes: códigos canjeables (de regalo, comprados, o de promoción para TikTok).
--  - code_redemptions: quién canjeó qué (cada cuenta canjea un código una sola vez).
-- Los jugadores solo pueden LEER sus pedidos y canjes. Todo lo demás lo hace el servidor.
-- =====================================================================

create table if not exists public.jade_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  package_id       text not null,
  price            numeric(10, 2) not null check (price > 0),
  currency         text not null default 'MXN',
  gift             boolean not null default false,
  status           text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  mp_preference_id text,
  mp_payment_id    text unique,
  mp_status        text,
  first_bonus      boolean not null default false,
  rewards          jsonb,                        -- lo que se entregó: { jade, gold, cards: [...] }
  code             text,                         -- si fue de regalo: el código generado
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  updated_at       timestamptz not null default now()
);
create index if not exists jade_orders_user on public.jade_orders (user_id, created_at desc);
alter table public.jade_orders enable row level security;
create policy "ver mis compras" on public.jade_orders for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.jade_orders from authenticated, anon;

create table if not exists public.redeem_codes (
  code        text primary key check (code ~ '^[A-Z0-9-]{4,24}$'),
  jade        integer not null default 0 check (jade >= 0),
  ur          smallint not null default 0 check (ur between 0 and 10),
  gold        integer not null default 0 check (gold >= 0),
  max_uses    integer not null default 1 check (max_uses >= 1),
  uses        integer not null default 0 check (uses >= 0),
  source      text not null default 'promo' check (source in ('gift', 'promo')),
  order_id    uuid references public.jade_orders (id) on delete set null,
  note        text,
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.redeem_codes enable row level security;   -- sin políticas: nadie desde el navegador
revoke all on public.redeem_codes from authenticated, anon;

create table if not exists public.code_redemptions (
  code        text not null references public.redeem_codes (code) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  rewards     jsonb not null,
  created_at  timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.code_redemptions enable row level security;
create policy "ver mis canjes" on public.code_redemptions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.code_redemptions from authenticated, anon;

-- ---------- Entregar un pedido pagado (solo la Edge Function) ----------
-- Idempotente: si Mercado Pago avisa dos veces, solo entrega una.
-- p_jade_first / p_jade: jade si es la primera compra de ese paquete / si no.
-- Si el pedido es de regalo, no se entrega nada: se crea el código p_code con el jade normal.
-- p_cards: [{"id": 96, "cacao": 30, "jade": 8}, ...]  (UR elegidas por game.js)
create or replace function public.fulfill_jade_order(
  p_order uuid, p_payment text, p_mp_status text, p_amount numeric,
  p_jade_first integer, p_jade integer, p_gold integer, p_ur integer, p_cards jsonb, p_code text
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  o public.jade_orders;
  first_buy boolean;
  give_jade integer;
  c jsonb;
  got jsonb;
  added jsonb := '[]';
  v_rewards jsonb;
begin
  select * into o from public.jade_orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;
  if o.status = 'paid' then return jsonb_build_object('ok', true, 'already', true, 'rewards', o.rewards, 'code', o.code); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'El pedido ya no está activo'); end if;
  if p_amount < o.price then
    update public.jade_orders set mp_status = 'amount_mismatch', updated_at = now() where id = p_order;
    return jsonb_build_object('ok', false, 'error', 'El monto pagado no coincide');
  end if;

  if o.gift then
    insert into public.redeem_codes (code, jade, ur, gold, max_uses, source, order_id, note)
      values (p_code, p_jade, p_ur, p_gold, 1, 'gift', o.id, 'Regalo comprado: ' || o.package_id);
    v_rewards := jsonb_build_object('jade', p_jade, 'gold', p_gold, 'ur', p_ur, 'cards', '[]'::jsonb);
    update public.jade_orders
      set status = 'paid', mp_payment_id = p_payment, mp_status = p_mp_status, paid_at = now(), updated_at = now(),
          rewards = v_rewards, code = p_code
      where id = p_order;
    return jsonb_build_object('ok', true, 'gift', true, 'code', p_code, 'rewards', v_rewards);
  end if;

  -- ¿Primera vez que compra este paquete para sí mismo? (bloqueo del perfil para que dos pagos a la vez no la usen dos veces)
  perform 1 from public.profiles where id = o.user_id for update;
  first_buy := not exists (
    select 1 from public.jade_orders
    where user_id = o.user_id and package_id = o.package_id and status in ('paid', 'refunded') and not gift and first_bonus);
  give_jade := case when first_buy then p_jade_first else p_jade end;

  for c in select * from jsonb_array_elements(coalesce(p_cards, '[]')) loop
    got := public._give_card(o.user_id, (c->>'id')::int, (c->>'cacao')::int, (c->>'jade')::int);
    added := added || jsonb_build_array(got);
  end loop;

  update public.profiles set jade = jade + give_jade, gold_tickets = gold_tickets + p_gold where id = o.user_id;

  v_rewards := jsonb_build_object('jade', give_jade, 'gold', p_gold, 'ur', p_ur, 'cards', added);
  update public.jade_orders
    set status = 'paid', mp_payment_id = p_payment, mp_status = p_mp_status, paid_at = now(), updated_at = now(),
        first_bonus = first_buy, rewards = v_rewards
    where id = p_order;
  return jsonb_build_object('ok', true, 'gift', false, 'first', first_buy, 'rewards', v_rewards);
end;
$$;

-- ---------- Guardar un estado de Mercado Pago que no es "aprobado" ----------
-- pendiente / rechazado: solo se anota (el jugador puede volver a intentar en la misma pantalla de pago).
-- reembolsado / contracargo de un pedido ya entregado: se quita el jade y los tickets oro que queden
-- (sin bajar de 0) y, si era regalo sin canjear, el código deja de servir.
create or replace function public.update_jade_order(p_order uuid, p_payment text, p_mp_status text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  o public.jade_orders;
begin
  select * into o from public.jade_orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;

  if p_mp_status in ('refunded', 'charged_back') then
    if o.status = 'paid' and (o.mp_payment_id is null or o.mp_payment_id = p_payment) then
      if o.gift then
        update public.redeem_codes set active = false where code = o.code;
      else
        update public.profiles
          set jade = greatest(0, jade - coalesce((o.rewards->>'jade')::int, 0)),
              gold_tickets = greatest(0, gold_tickets - coalesce((o.rewards->>'gold')::int, 0))
          where id = o.user_id;
      end if;
      update public.jade_orders set status = 'refunded', mp_status = p_mp_status, updated_at = now() where id = p_order;
      return jsonb_build_object('ok', true, 'status', 'refunded');
    end if;
    return jsonb_build_object('ok', true, 'status', o.status);
  end if;

  if o.status = 'pending' then
    update public.jade_orders set mp_status = p_mp_status, updated_at = now() where id = p_order;
  end if;
  return jsonb_build_object('ok', true, 'status', o.status);
end;
$$;

-- ---------- Canjear un código (solo la Edge Function) ----------
-- p_cards: UR elegidas por game.js; debe traer exactamente las que da el código (si no, 'retry').
create or replace function public.redeem_code(p_user uuid, p_code text, p_cards jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  k public.redeem_codes;
  c jsonb;
  got jsonb;
  added jsonb := '[]';
  v_rewards jsonb;
begin
  select * into k from public.redeem_codes where code = p_code for update;
  if not found or not k.active then return jsonb_build_object('ok', false, 'error', 'Ese código no existe'); end if;
  if k.expires_at is not null and k.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'Ese código ya caducó'); end if;
  if k.uses >= k.max_uses then return jsonb_build_object('ok', false, 'error', 'Ese código ya se usó'); end if;
  if exists (select 1 from public.code_redemptions where code = p_code and user_id = p_user) then
    return jsonb_build_object('ok', false, 'error', 'Ya canjeaste ese código');
  end if;
  if jsonb_array_length(coalesce(p_cards, '[]')) <> k.ur then return jsonb_build_object('ok', false, 'error', 'retry'); end if;

  for c in select * from jsonb_array_elements(coalesce(p_cards, '[]')) loop
    got := public._give_card(p_user, (c->>'id')::int, (c->>'cacao')::int, (c->>'jade')::int);
    added := added || jsonb_build_array(got);
  end loop;
  update public.profiles set jade = jade + k.jade, gold_tickets = gold_tickets + k.gold where id = p_user;
  update public.redeem_codes set uses = uses + 1 where code = p_code;

  v_rewards := jsonb_build_object('jade', k.jade, 'gold', k.gold, 'ur', k.ur, 'cards', added);
  insert into public.code_redemptions (code, user_id, rewards) values (p_code, p_user, v_rewards);
  return jsonb_build_object('ok', true, 'rewards', v_rewards);
end;
$$;

-- ---------- Crear un código de promoción (para TikTok, sorteos, creadores) ----------
-- Úsalo en Supabase → SQL Editor, por ejemplo:
--   select public.create_promo_code('QUINTOSOL50', 500, 0, 1, 100, now() + interval '7 days', 'Live de TikTok');
--   → 500 de jade + 1 ticket oro, para las primeras 100 cuentas, durante 7 días.
create or replace function public.create_promo_code(
  p_code text, p_jade integer, p_ur integer, p_gold integer, p_max_uses integer,
  p_expires timestamptz default null, p_note text default null
) returns text
language sql
security definer set search_path = public
as $$
  insert into public.redeem_codes (code, jade, ur, gold, max_uses, source, note, expires_at)
    values (upper(p_code), p_jade, p_ur, p_gold, p_max_uses, 'promo', p_note, p_expires)
    returning code;
$$;

revoke execute on function public.fulfill_jade_order(uuid, text, text, numeric, integer, integer, integer, integer, jsonb, text) from public, anon, authenticated;
revoke execute on function public.update_jade_order(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.redeem_code(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.create_promo_code(text, integer, integer, integer, integer, timestamptz, text) from public, anon, authenticated;
grant execute on function public.fulfill_jade_order(uuid, text, text, numeric, integer, integer, integer, integer, jsonb, text) to service_role;
grant execute on function public.update_jade_order(uuid, text, text) to service_role;
grant execute on function public.redeem_code(uuid, text, jsonb) to service_role;
grant execute on function public.create_promo_code(text, integer, integer, integer, integer, timestamptz, text) to service_role;
