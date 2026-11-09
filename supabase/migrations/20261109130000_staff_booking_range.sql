-- Una sola reserva que ocupa varios turnos seguidos (ej. cumpleaños de 16 a 20).
-- Precio total = precio del turno × cantidad de turnos. Todos los turnos incluidos quedan ocupados.
drop function if exists public.create_staff_bookings(uuid, timestamptz[], text, text, text, public.booking_status);

create or replace function public.create_staff_booking_range(
  p_court_id uuid,
  p_first_start timestamptz,
  p_last_start timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_notes text default null,
  p_status public.booking_status default 'confirmed'
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.venue_settings;
  v_date date;
  v_first record;
  v_last record;
  v_count int;
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[\s\-\(\)\.]', '', 'g');
  v_row public.bookings;
  v_try int := 0;
begin
  if not (select private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'confirmed') then
    raise exception 'invalid_status' using errcode = 'DC016';
  end if;
  select * into s from public.venue_settings where id = 1;

  if not exists (select 1 from public.courts where id = p_court_id and is_active) then
    raise exception 'court_not_found' using errcode = 'DC004';
  end if;
  if char_length(v_name) not between 2 and 100 then
    raise exception 'invalid_name' using errcode = 'DC005';
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'invalid_phone' using errcode = 'DC007';
  end if;
  if p_last_start < p_first_start then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;

  v_date := (p_first_start at time zone s.timezone)::date;
  select d.slot_start, d.slot_end into v_first from public.day_slots(v_date) d where d.slot_start = p_first_start;
  select d.slot_start, d.slot_end into v_last from public.day_slots(v_date) d where d.slot_start = p_last_start;
  if v_first.slot_start is null or v_last.slot_start is null then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;

  -- Los turnos del rango tienen que ser seguidos (sin huecos) y entre 1 y 12.
  select count(*) into v_count
  from public.day_slots(v_date) d where d.slot_start >= p_first_start and d.slot_start <= p_last_start;
  if v_count not between 1 and 12
     or (select count(*) from public.day_slots(v_date) d
         where d.slot_start >= p_first_start and d.slot_start <= p_last_start
           and (d.slot_start = p_first_start
                or exists (select 1 from public.day_slots(v_date) q where q.slot_end = d.slot_start))) <> v_count then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;
  if v_last.slot_end <= now() then
    raise exception 'slot_in_past' using errcode = 'DC008';
  end if;

  loop
    begin
      insert into public.bookings (code, court_id, start_at, end_at, customer_name, customer_phone,
                                   mode, players, notes, unit_price, total_price, status, source, created_by)
      values (public.generate_booking_code(), p_court_id, v_first.slot_start, v_last.slot_end, v_name,
              v_phone, 'group', s.max_players, nullif(btrim(coalesce(p_notes, '')), ''),
              s.price_group, s.price_group * v_count, p_status, 'admin', (select auth.uid()))
      returning * into v_row;
      return v_row;
    exception
      when unique_violation then
        v_try := v_try + 1;
        if v_try >= 5 then raise; end if;
      when exclusion_violation then
        raise exception 'slot_unavailable' using errcode = 'DC001';
    end;
  end loop;
end $$;

revoke all on function public.create_staff_booking_range(uuid, timestamptz, timestamptz, text, text, text, public.booking_status) from public, anon;
grant execute on function public.create_staff_booking_range(uuid, timestamptz, timestamptz, text, text, text, public.booking_status) to authenticated, service_role;
