-- 1) Lista de espera por turno. 2) Stock del buffet (descuento atómico al vender, reposición, anulación).

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 100),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9]{8,15}$'),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  unique (court_id, start_at, customer_phone)
);
create index waitlist_entries_start_idx on public.waitlist_entries (start_at);

alter table public.waitlist_entries enable row level security;
create policy waitlist_staff_read on public.waitlist_entries for select to authenticated using ((select private.is_staff()));
create policy waitlist_staff_delete on public.waitlist_entries for delete to authenticated using ((select private.is_staff()));
grant select, delete on public.waitlist_entries to authenticated;

alter table public.buffet_products
  add column track_stock boolean not null default false,
  add column stock integer not null default 0 check (stock >= 0),
  add column low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0);

-- Venta: igual que antes, pero descuenta stock de forma atómica (no se puede vender más de lo que hay).
create or replace function public.create_buffet_sale(
  p_items jsonb,
  p_method public.payment_method,
  p_booking_id uuid default null,
  p_note text default null
) returns public.buffet_sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.buffet_sales;
  v_total numeric(12, 2);
  v_requested int;
  v_found int;
  v_tracked int;
  v_updated int;
begin
  if not (select private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'empty_sale' using errcode = 'DC020';
  end if;
  if p_booking_id is not null and not exists (select 1 from public.bookings where id = p_booking_id) then
    raise exception 'booking_not_found' using errcode = 'DC021';
  end if;

  with req as (
    select x.product_id, sum(x.quantity)::int as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity int)
    where x.product_id is not null and x.quantity between 1 and 999
    group by x.product_id
  )
  select count(*), count(p.id), sum(p.price * r.quantity), count(p.id) filter (where p.track_stock)
    into v_requested, v_found, v_total, v_tracked
  from req r left join public.buffet_products p on p.id = r.product_id and p.is_active;

  if v_requested = 0 or v_requested <> v_found then
    raise exception 'product_unavailable' using errcode = 'DC022';
  end if;

  -- Descuento atómico: solo actualiza si alcanza el stock; si algún producto no alcanza, se aborta toda la venta.
  with req as (
    select x.product_id, sum(x.quantity)::int as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity int)
    where x.product_id is not null and x.quantity between 1 and 999
    group by x.product_id
  ), upd as (
    update public.buffet_products p set stock = p.stock - r.quantity
    from req r
    where p.id = r.product_id and p.track_stock and p.stock >= r.quantity
    returning p.id
  )
  select count(*) into v_updated from upd;
  if v_updated <> v_tracked then
    raise exception 'insufficient_stock' using errcode = 'DC024';
  end if;

  insert into public.buffet_sales (booking_id, total, method, note, created_by)
  values (p_booking_id, v_total, p_method, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning * into v_sale;

  insert into public.buffet_sale_items (sale_id, product_id, product_name, unit_price, quantity)
  select v_sale.id, p.id, p.name, p.price, r.quantity
  from (
    select x.product_id, sum(x.quantity)::int as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity int)
    where x.product_id is not null and x.quantity between 1 and 999
    group by x.product_id
  ) r join public.buffet_products p on p.id = r.product_id;

  return v_sale;
end $$;

-- Anular: devuelve el stock.
create or replace function public.void_buffet_sale(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.buffet_sales;
begin
  if not (select private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_sale from public.buffet_sales where id = p_id for update;
  if not found then
    raise exception 'sale_not_found' using errcode = 'DC023';
  end if;
  if not (select private.is_admin())
     and not (v_sale.created_by = (select auth.uid()) and v_sale.created_at > now() - interval '2 hours') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_sale.is_voided then
    return;
  end if;
  update public.buffet_sales
  set is_voided = true, void_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      voided_at = now(), voided_by = (select auth.uid())
  where id = p_id;
  update public.buffet_products p set stock = p.stock + i.q
  from (select product_id, sum(quantity)::int as q from public.buffet_sale_items where sale_id = p_id and product_id is not null group by product_id) i
  where p.id = i.product_id and p.track_stock;
end $$;

-- Borrar (solo admin): si la venta seguía vigente, devuelve el stock antes de borrarla.
create or replace function public.delete_buffet_sale(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.buffet_sales;
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_sale from public.buffet_sales where id = p_id for update;
  if not found then
    raise exception 'sale_not_found' using errcode = 'DC023';
  end if;
  if not v_sale.is_voided then
    update public.buffet_products p set stock = p.stock + i.q
    from (select product_id, sum(quantity)::int as q from public.buffet_sale_items where sale_id = p_id and product_id is not null group by product_id) i
    where p.id = i.product_id and p.track_stock;
  end if;
  delete from public.buffet_sales where id = p_id;
end $$;

-- Reponer / corregir stock (suma o resta). Devuelve el stock nuevo.
create or replace function public.adjust_buffet_stock(p_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer;
begin
  if not (select private.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'invalid_quantity' using errcode = 'DC024';
  end if;
  update public.buffet_products set stock = stock + p_delta
  where id = p_id and track_stock and stock + p_delta >= 0
  returning stock into v_new;
  if not found then
    raise exception 'insufficient_stock' using errcode = 'DC024';
  end if;
  return v_new;
end $$;

revoke all on function public.create_buffet_sale(jsonb, public.payment_method, uuid, text) from public, anon;
revoke all on function public.void_buffet_sale(uuid, text) from public, anon;
revoke all on function public.delete_buffet_sale(uuid) from public, anon;
revoke all on function public.adjust_buffet_stock(uuid, integer) from public, anon;
grant execute on function public.create_buffet_sale(jsonb, public.payment_method, uuid, text) to authenticated, service_role;
grant execute on function public.void_buffet_sale(uuid, text) to authenticated, service_role;
grant execute on function public.delete_buffet_sale(uuid) to authenticated, service_role;
grant execute on function public.adjust_buffet_stock(uuid, integer) to authenticated, service_role;
