-- Elimina reservas CANCELADAS y sin ningún pago registrado (los pagos son registro contable y no se borran).
-- Solo administradores. p_ids null = todas las que cumplan. Devuelve cuántas se borraron y cuántas se omitieron.
create or replace function public.delete_cancelled_bookings(p_ids uuid[] default null)
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

revoke all on function public.delete_cancelled_bookings(uuid[]) from public, anon;
grant execute on function public.delete_cancelled_bookings(uuid[]) to authenticated, service_role;
