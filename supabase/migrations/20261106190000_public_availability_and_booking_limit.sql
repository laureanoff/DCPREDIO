-- Disponibilidad pública (sin datos personales) y tope configurable de reservas activas por teléfono (DC014).
alter table public.venue_settings
  add column max_active_bookings_per_phone smallint not null default 3
  check (max_active_bookings_per_phone between 1 and 20);

grant execute on function public.get_day_availability(uuid, date) to anon;
grant execute on function public.get_month_availability(uuid, int, int) to anon;

create or replace function public.create_public_booking(
  p_court_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_mode public.booking_mode,
  p_players int,
  p_notes text default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  s public.venue_settings;
  v_slot record;
  v_local_date date;
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[\s\-\(\)\.]', '', 'g');
  v_unit numeric;
  v_total numeric;
  v_status public.booking_status;
  v_row public.bookings;
  v_try int := 0;
begin
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
  if p_players is null or p_players < 1 or p_players > s.max_players then
    raise exception 'invalid_players' using errcode = 'DC010';
  end if;

  if (select count(*) from public.bookings b
      where b.customer_phone = v_phone and b.status in ('pending', 'confirmed') and b.start_at > now())
     >= s.max_active_bookings_per_phone then
    raise exception 'too_many_active_bookings' using errcode = 'DC014';
  end if;

  v_local_date := (p_start_at at time zone s.timezone)::date;
  select d.slot_start, d.slot_end into v_slot from public.day_slots(v_local_date) d
  where d.slot_start = p_start_at;
  if not found then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;
  if v_slot.slot_start <= now() then
    raise exception 'slot_in_past' using errcode = 'DC008';
  end if;
  if v_local_date > (now() at time zone s.timezone)::date + s.booking_window_days then
    raise exception 'outside_booking_window' using errcode = 'DC009';
  end if;

  if p_mode = 'group' then
    v_unit := s.price_group;
    v_total := s.price_group;
  else
    v_unit := s.price_individual;
    v_total := s.price_individual * p_players;
  end if;
  v_status := case when s.require_confirmation then 'pending' else 'confirmed' end;

  loop
    begin
      insert into public.bookings (code, court_id, start_at, end_at, customer_name, customer_phone,
                                   mode, players, notes, unit_price, total_price, status, source)
      values (public.generate_booking_code(), p_court_id, v_slot.slot_start, v_slot.slot_end, v_name,
              v_phone, p_mode, p_players, nullif(btrim(coalesce(p_notes, '')), ''), v_unit, v_total,
              v_status, 'web')
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
