-- =====================================================================
-- Fase B: niveles de carta (con cacao) y ascensión (3 copias → 1 carta nueva)
-- Lo llaman solo las Edge Functions (llave de servicio). El jugador solo lee.
-- =====================================================================

-- Nivel de cada carta de tu colección (todas tus copias comparten nivel)
alter table public.collection add column if not exists level smallint not null default 1 check (level between 1 and 5);

-- Niveles con los que se jugó cada duelo (el servidor los usa al repetirlo)
alter table public.duels add column if not exists levels jsonb not null default '{}';

-- ---------- Subir de nivel: cobra cacao y sube 1 nivel, todo o nada ----------
create or replace function public.level_up_card(p_user uuid, p_card integer, p_cost integer, p_from_level smallint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  c public.collection;
  money integer;
begin
  select * into c from public.collection where user_id = p_user and card_id = p_card for update;
  if not found or c.count <= 0 then return jsonb_build_object('ok', false, 'error', 'No tienes esa carta'); end if;
  if c.level <> p_from_level then return jsonb_build_object('ok', false, 'error', 'El nivel cambió, recarga'); end if;
  if c.level >= 5 then return jsonb_build_object('ok', false, 'error', 'Ya está en nivel máximo'); end if;

  select cacao into money from public.profiles where id = p_user for update;
  if money < p_cost then return jsonb_build_object('ok', false, 'error', 'No te alcanza el cacao'); end if;

  update public.profiles set cacao = cacao - p_cost where id = p_user returning cacao into money;
  update public.collection set level = level + 1 where user_id = p_user and card_id = p_card;
  return jsonb_build_object('ok', true, 'level', c.level + 1, 'cacao', money);
end;
$$;

-- ---------- Ascender: gasta 3 copias y da 1 de la carta resultado ----------
create or replace function public.ascend_card(p_user uuid, p_card integer, p_result integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  have integer;
  have_result integer;
begin
  select count into have from public.collection where user_id = p_user and card_id = p_card for update;
  if coalesce(have, 0) < 3 then return jsonb_build_object('ok', false, 'error', 'Necesitas 3 copias'); end if;

  insert into public.collection (user_id, card_id, count) values (p_user, p_result, 0) on conflict do nothing;
  select count into have_result from public.collection where user_id = p_user and card_id = p_result for update;
  if have_result >= 3 then return jsonb_build_object('ok', false, 'error', 'Ya tienes 3 de esa carta'); end if;

  update public.collection set count = count - 3 where user_id = p_user and card_id = p_card;
  update public.collection set count = count + 1 where user_id = p_user and card_id = p_result;
  return jsonb_build_object('ok', true, 'base', have - 3, 'result', have_result + 1);
end;
$$;

revoke execute on function public.level_up_card(uuid, integer, integer, smallint) from public, anon, authenticated;
revoke execute on function public.ascend_card(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.level_up_card(uuid, integer, integer, smallint) to service_role;
grant execute on function public.ascend_card(uuid, integer, integer) to service_role;
