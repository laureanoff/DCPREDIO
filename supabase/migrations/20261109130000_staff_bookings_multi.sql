-- Reserva de varios turnos de una vez (ej. cumpleaños): todo o nada, en una sola transacción.
create or replace function public.create_staff_bookings(
  p_court_id uuid,
  p_starts timestamptz[],
  p_customer_name text,
  p_customer_phone text,
  p_notes text default null,
  p_status public.booking_status default 'confirmed'
) returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
begin
  if not (select private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_starts is null or coalesce(array_length(p_starts, 1), 0) not between 1 and 12 then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;
  for v_start in select distinct x from unnest(p_starts) as x order by x loop
    return next public.create_staff_booking(p_court_id, v_start, p_customer_name, p_customer_phone, p_notes, p_status);
  end loop;
  return;
end $$;

revoke all on function public.create_staff_bookings(uuid, timestamptz[], text, text, text, public.booking_status) from public, anon;
grant execute on function public.create_staff_bookings(uuid, timestamptz[], text, text, text, public.booking_status) to authenticated, service_role;
