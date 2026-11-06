-- DC Predio — 0002: helpers de autorización, auditoría y reglas de integridad

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  )
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  )
$$;

revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

-- Auditoría genérica
create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, new_data, changed_by)
    values (tg_table_name, to_jsonb(new) ->> 'id', 'INSERT', to_jsonb(new), (select auth.uid()));
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) is distinct from to_jsonb(old) then
      insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
      values (tg_table_name, to_jsonb(new) ->> 'id', 'UPDATE', to_jsonb(old), to_jsonb(new), (select auth.uid()));
    end if;
  else
    insert into public.audit_log (table_name, record_id, action, old_data, changed_by)
    values (tg_table_name, to_jsonb(old) ->> 'id', 'DELETE', to_jsonb(old), (select auth.uid()));
  end if;
  return null;
end $$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

create trigger audit after insert or update or delete on public.profiles for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.venue_settings for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.courts for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.operating_hours for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.special_days for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.blocked_slots for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.bookings for each row execute function public.audit_row_change();
create trigger audit after insert or update or delete on public.payments for each row execute function public.audit_row_change();

-- Código legible de reserva (ej: DC-7K3QWA). Aleatorio criptográfico, alfabeto sin caracteres ambiguos.
create function public.generate_booking_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 caracteres
  bytes bytea := extensions.gen_random_bytes(6);
  result text := 'DC-';
  i int;
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

revoke execute on function public.generate_booking_code() from public, anon, authenticated;

-- Reglas de disponibilidad (se ejecutan SIEMPRE, sin importar quién escriba).
-- Códigos de error: DC001 turno no disponible · DC002 horario bloqueado · DC003 capacidad excedida
create function public.bookings_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cap int;
  v_overlap int;
  v_taken int;
  v_range tstzrange;
begin
  if new.status = 'cancelled' then
    if tg_op = 'INSERT' or old.status <> 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status <> 'cancelled' and
     (new.court_id, new.start_at, new.end_at, new.mode, new.players)
       is not distinct from (old.court_id, old.start_at, old.end_at, old.mode, old.players) then
    return new; -- nada que afecte la disponibilidad
  end if;

  new.cancelled_at := null;
  v_range := tstzrange(new.start_at, new.end_at, '[)');

  -- Serializa las altas/ediciones por cancha: evita que dos personas tomen el mismo turno.
  perform pg_advisory_xact_lock(hashtextextended('booking:' || new.court_id::text, 0));

  select max_players into v_cap from public.venue_settings where id = 1;
  if new.players > v_cap then
    raise exception 'capacity_exceeded' using errcode = 'DC003';
  end if;

  if exists (
    select 1 from public.blocked_slots bs
    where bs.court_id = new.court_id and tstzrange(bs.start_at, bs.end_at, '[)') && v_range
  ) then
    raise exception 'slot_blocked' using errcode = 'DC002';
  end if;

  if new.mode = 'group' then
    select count(*) into v_overlap from public.bookings b
    where b.court_id = new.court_id and b.id <> new.id and b.status <> 'cancelled'
      and tstzrange(b.start_at, b.end_at, '[)') && v_range;
    if v_overlap > 0 then
      raise exception 'slot_unavailable' using errcode = 'DC001';
    end if;
  else
    if exists (
      select 1 from public.bookings b
      where b.court_id = new.court_id and b.id <> new.id and b.status <> 'cancelled'
        and b.mode = 'group' and tstzrange(b.start_at, b.end_at, '[)') && v_range
    ) then
      raise exception 'slot_unavailable' using errcode = 'DC001';
    end if;
    select coalesce(sum(b.players), 0) into v_taken from public.bookings b
    where b.court_id = new.court_id and b.id <> new.id and b.status <> 'cancelled'
      and b.mode = 'individual' and tstzrange(b.start_at, b.end_at, '[)') && v_range;
    if v_taken + new.players > v_cap then
      raise exception 'capacity_exceeded' using errcode = 'DC003';
    end if;
  end if;

  return new;
end $$;

revoke execute on function public.bookings_before_write() from public, anon, authenticated;

create trigger bookings_before_write before insert or update on public.bookings
  for each row execute function public.bookings_before_write();

-- Pagos: nunca superar el total de la reserva; los pagos no se borran, se anulan.
-- Código de error: DC011 el pago supera el saldo
create function public.payments_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_total numeric;
  v_paid numeric;
begin
  if tg_op = 'DELETE' then
    raise exception 'payments_cannot_be_deleted: anulá el pago en su lugar' using errcode = 'DC012';
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

  -- Bloquea la reserva para serializar pagos concurrentes sobre la misma reserva.
  select b.total_price into v_total from public.bookings b where b.id = new.booking_id for update;
  select coalesce(sum(p.amount), 0) into v_paid from public.payments p
  where p.booking_id = new.booking_id and not p.is_voided and p.id <> new.id;

  if v_paid + new.amount > v_total then
    raise exception 'payment_exceeds_balance' using errcode = 'DC011';
  end if;

  new.voided_at := null;
  new.voided_by := null;
  return new;
end $$;

revoke execute on function public.payments_before_write() from public, anon, authenticated;

create trigger payments_before_write before insert or update or delete on public.payments
  for each row execute function public.payments_before_write();

-- Resumen financiero por reserva (cobrado, saldo, estado de pago). Respeta RLS del usuario.
create view public.booking_financials with (security_invoker = true) as
select
  b.id as booking_id,
  b.total_price,
  coalesce(sum(p.amount) filter (where not p.is_voided), 0)::numeric(12,2) as total_paid,
  (b.total_price - coalesce(sum(p.amount) filter (where not p.is_voided), 0))::numeric(12,2) as balance,
  case
    when coalesce(sum(p.amount) filter (where not p.is_voided), 0) >= b.total_price then 'paid'
    when coalesce(sum(p.amount) filter (where not p.is_voided), 0) = 0 then 'unpaid'
    else 'partial'
  end as payment_status
from public.bookings b
left join public.payments p on p.booking_id = b.id
group by b.id, b.total_price;
