-- Permite al ADMIN eliminar reservas canceladas aunque tengan pagos (p. ej. un pago marcado por error).
-- Los pagos siguen sin poder borrarse por ninguna otra vía: el borrado solo se habilita dentro de
-- delete_cancelled_bookings (bandera de sesión que solo esa función activa) y queda registrado en audit_log.

create or replace function public.payments_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_total numeric;
  v_players int;
  v_paid numeric;
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('private.allow_payment_delete', true), '') <> 'on' then
      raise exception 'payments_cannot_be_deleted: anulá el pago en su lugar' using errcode = 'DC012';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.booking_id <> old.booking_id then
    raise exception 'payment_booking_immutable' using errcode = 'DC013';
  end if;

  if new.is_voided then
    if tg_op = 'INSERT' or not old.is_voided then
      new.voided_at := coalesce(new.voided_at, now());
      new.voided_by := coalesce(new.voided_by, (select auth.uid()));
    end if;
    return new;
  end if;

  select b.total_price, b.players into v_total, v_players from public.bookings b where b.id = new.booking_id for update;
  select coalesce(sum(p.amount), 0) into v_paid from public.payments p
  where p.booking_id = new.booking_id and not p.is_voided and p.id <> new.id;

  if new.player_slot is not null and new.player_slot > v_players then
    raise exception 'player_slot_out_of_range' using errcode = 'DC015';
  end if;

  if v_paid + new.amount > v_total then
    raise exception 'payment_exceeds_balance' using errcode = 'DC011';
  end if;

  new.voided_at := null;
  new.voided_by := null;
  return new;
end $function$;

drop function if exists public.delete_cancelled_bookings(uuid[]);

create or replace function public.delete_cancelled_bookings(p_ids uuid[] default null, p_include_paid boolean default false)
returns table(deleted integer, skipped integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
  v_candidates integer := 0;
begin
  if not (select private.is_admin()) then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;

  select count(*) into v_candidates
  from public.bookings b
  where b.status = 'cancelled' and (p_ids is null or b.id = any(p_ids));

  if p_include_paid then
    perform set_config('private.allow_payment_delete', 'on', true); -- solo dentro de esta transacción
    delete from public.payments p
    using public.bookings b
    where p.booking_id = b.id and b.status = 'cancelled' and (p_ids is null or b.id = any(p_ids));
    perform set_config('private.allow_payment_delete', 'off', true);
  end if;

  with del as (
    delete from public.bookings b
    where b.status = 'cancelled'
      and (p_ids is null or b.id = any(p_ids))
      and not exists (select 1 from public.payments p where p.booking_id = b.id)
    returning 1
  )
  select count(*) into v_deleted from del;

  return query select v_deleted, v_candidates - v_deleted;
end;
$$;

revoke all on function public.delete_cancelled_bookings(uuid[], boolean) from public, anon;
grant execute on function public.delete_cancelled_bookings(uuid[], boolean) to authenticated, service_role;
