-- DC Predio — 0004: generación de horarios, disponibilidad y alta atómica de reservas públicas
-- Estas funciones corren en el servidor de la base. La creación pública solo la puede invocar
-- service_role (la app, desde Server Actions, después de validar y limitar abusos).
-- Códigos de error: DC001 turno no disponible, DC002 bloqueado, DC003 capacidad, DC004 cancha inexistente,
-- DC005 nombre inválido, DC006 horario inválido, DC007 teléfono inválido, DC008 turno pasado,
-- DC009 fuera de ventana de reserva, DC010 cantidad de jugadores inválida.

create function public.day_slots(p_date date)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.venue_settings;
  sd public.special_days;
  v_is_open boolean;
  v_open time;
  v_close time;
  v_from timestamp;
  v_to timestamp;
  v_dur interval;
begin
  select * into s from public.venue_settings where id = 1;
  select * into sd from public.special_days where day = p_date;
  if found then
    v_is_open := not sd.is_closed;
    v_open := sd.open_time;
    v_close := sd.close_time;
  else
    select oh.is_open, oh.open_time, oh.close_time into v_is_open, v_open, v_close
    from public.operating_hours oh where oh.weekday = extract(dow from p_date)::smallint;
    if not found then return; end if;
  end if;
  if not coalesce(v_is_open, false) then return; end if;

  v_from := p_date + v_open;
  v_to := p_date + v_close;
  if v_close <= v_open then v_to := v_to + interval '1 day'; end if;
  v_dur := make_interval(mins => s.slot_duration_minutes);

  return query
    select (g at time zone s.timezone), ((g + v_dur) at time zone s.timezone)
    from generate_series(v_from, v_to - v_dur,
                         make_interval(mins => s.slot_duration_minutes + s.slot_gap_minutes)) g;
end $$;

-- state: available | partial (quedan lugares individuales) | full | blocked | past
create function public.get_day_availability(p_court_id uuid, p_date date)
returns table (slot_start timestamptz, slot_end timestamptz, state text,
               spots_left int, capacity int, has_pending boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cap int;
begin
  select max_players into v_cap from public.venue_settings where id = 1;
  return query
  select
    d.slot_start,
    d.slot_end,
    case
      when d.slot_start <= now() then 'past'
      when exists (select 1 from public.blocked_slots bs
                   where bs.court_id = p_court_id
                     and tstzrange(bs.start_at, bs.end_at, '[)') && tstzrange(d.slot_start, d.slot_end, '[)')) then 'blocked'
      when grp.cnt > 0 or coalesce(ind.players, 0) >= v_cap then 'full'
      when coalesce(ind.players, 0) > 0 then 'partial'
      else 'available'
    end,
    case when grp.cnt > 0 then 0 else greatest(v_cap - coalesce(ind.players, 0), 0) end,
    v_cap,
    coalesce(pend.flag, false)
  from public.day_slots(p_date) d
  left join lateral (
    select count(*) as cnt from public.bookings b
    where b.court_id = p_court_id and b.status <> 'cancelled' and b.mode = 'group'
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(d.slot_start, d.slot_end, '[)')
  ) grp on true
  left join lateral (
    select sum(b.players)::int as players from public.bookings b
    where b.court_id = p_court_id and b.status <> 'cancelled' and b.mode = 'individual'
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(d.slot_start, d.slot_end, '[)')
  ) ind on true
  left join lateral (
    select true as flag from public.bookings b
    where b.court_id = p_court_id and b.status = 'pending'
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(d.slot_start, d.slot_end, '[)')
    limit 1
  ) pend on true
  order by d.slot_start;
end $$;

create function public.get_month_availability(p_court_id uuid, p_year int, p_month int)
returns table (day date, is_open boolean, total_slots int, free_slots int)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
  select g::date, (t.total > 0), t.total, t.free
  from generate_series(make_date(p_year, p_month, 1)::timestamp,
                       (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::timestamp,
                       interval '1 day') g
  cross join lateral (
    select count(*)::int as total,
           (count(*) filter (where a.state in ('available', 'partial')))::int as free
    from public.get_day_availability(p_court_id, g::date) a
  ) t;
end $$;

create function public.create_public_booking(
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

revoke execute on function public.day_slots(date) from public, anon, authenticated;
revoke execute on function public.get_day_availability(uuid, date) from public, anon;
revoke execute on function public.get_month_availability(uuid, int, int) from public, anon;
revoke execute on function public.create_public_booking(uuid, timestamptz, text, text, public.booking_mode, int, text)
  from public, anon, authenticated;

grant execute on function public.day_slots(date) to service_role;
grant execute on function public.get_day_availability(uuid, date) to authenticated, service_role;
grant execute on function public.get_month_availability(uuid, int, int) to authenticated, service_role;
grant execute on function public.create_public_booking(uuid, timestamptz, text, text, public.booking_mode, int, text)
  to service_role;
