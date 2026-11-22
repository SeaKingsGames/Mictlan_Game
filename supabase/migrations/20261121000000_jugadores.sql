-- =====================================================================
-- Contador de jugadores para el menú ("+50 jugadores").
-- Cuenta las cuentas que ya jugaron al menos un duelo (campaña, libre o multijugador),
-- no a los que están conectados. Devuelve el número redondeado hacia abajo a una
-- cifra bonita (10, 25, 50, 100, 250...). Con menos de 10 devuelve 0 y el menú no muestra nada.
-- Cualquiera puede llamarla (también sin cuenta): solo da ese número, ningún dato de nadie.
-- =====================================================================
create or replace function public.player_count()
returns integer
language sql
stable
security definer set search_path = public
as $$
  select coalesce(max(m), 0)::int
  from (select count(*)::int as c from public.profiles where wins + losses > 0) n,
       unnest(array[10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]) as m
  where m <= n.c;
$$;

revoke execute on function public.player_count() from public;
grant execute on function public.player_count() to anon, authenticated;
