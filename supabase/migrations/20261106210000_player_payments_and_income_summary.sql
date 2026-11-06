-- Cobro por jugador dentro de una reserva (turno de cancha completa): cada jugador paga su parte.
alter table public.payments
  add column player_slot smallint check (player_slot is null or player_slot between 1 and 50);

-- Un jugador solo puede tener un pago vigente por reserva (los anulados no cuentan).
create unique index payments_one_active_per_player
  on public.payments (booking_id, player_slot)
  where player_slot is not null and not is_voided;

grant insert (player_slot) on public.payments to authenticated;

create or replace function public.payments_before_write()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_total numeric;
  v_players int;
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

-- Ingresos por fecha de PAGO (no por fecha de la reserva), en la zona horaria del predio.
create or replace function public.income_summary(
  p_from date,
  p_to date,
  p_group text,
  p_method public.payment_method default null
)
returns table (bucket date, total numeric, payments bigint)
language sql
stable
security invoker
set search_path to ''
as $$
  select
    (case when p_group = 'month'
          then date_trunc('month', p.paid_at at time zone 'America/Argentina/Cordoba')
          else date_trunc('day', p.paid_at at time zone 'America/Argentina/Cordoba') end)::date as bucket,
    sum(p.amount)::numeric as total,
    count(*) as payments
  from public.payments p
  where not p.is_voided
    and (p.paid_at at time zone 'America/Argentina/Cordoba')::date between p_from and p_to
    and (p_method is null or p.method = p_method)
  group by 1
  order by 1;
$$;

revoke all on function public.income_summary(date, date, text, public.payment_method) from public, anon;
grant execute on function public.income_summary(date, date, text, public.payment_method) to authenticated;
