-- 1) Reservas cargadas a mano por el personal (pedidos por teléfono/WhatsApp).
-- 2) Cancelación por el cliente: configuración.

alter table public.venue_settings
  add column if not exists allow_customer_cancellation boolean not null default true,
  add column if not exists cancellation_cutoff_hours smallint not null default 3
    check (cancellation_cutoff_hours between 0 and 168);

create or replace function public.create_staff_booking(
  p_court_id uuid,
  p_start_at timestamptz,
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
  v_slot record;
  v_local_date date;
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

  v_local_date := (p_start_at at time zone s.timezone)::date;
  select d.slot_start, d.slot_end into v_slot from public.day_slots(v_local_date) d
  where d.slot_start = p_start_at;
  if not found then
    raise exception 'invalid_slot' using errcode = 'DC006';
  end if;
  -- El personal puede cargar un turno que ya empezó, pero no uno que ya terminó.
  if v_slot.slot_end <= now() then
    raise exception 'slot_in_past' using errcode = 'DC008';
  end if;

  loop
    begin
      insert into public.bookings (code, court_id, start_at, end_at, customer_name, customer_phone,
                                   mode, players, notes, unit_price, total_price, status, source, created_by)
      values (public.generate_booking_code(), p_court_id, v_slot.slot_start, v_slot.slot_end, v_name,
              v_phone, 'group', s.max_players, nullif(btrim(coalesce(p_notes, '')), ''),
              s.price_group, s.price_group, p_status, 'admin', (select auth.uid()))
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

revoke all on function public.create_staff_booking(uuid, timestamptz, text, text, text, public.booking_status) from public, anon;
grant execute on function public.create_staff_booking(uuid, timestamptz, text, text, text, public.booking_status) to authenticated, service_role;
