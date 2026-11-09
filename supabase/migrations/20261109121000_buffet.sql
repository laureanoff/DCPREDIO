-- Buffet: catálogo de productos y ventas (sueltas o asociadas a una reserva).

create table public.buffet_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  price numeric(12, 2) not null check (price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.buffet_products
  for each row execute function public.set_updated_at();

create table public.buffet_sales (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  total numeric(12, 2) not null check (total >= 0),
  method public.payment_method not null,
  note text check (char_length(note) <= 200),
  is_voided boolean not null default false,
  void_reason text check (char_length(void_reason) <= 300),
  voided_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index buffet_sales_created_at_idx on public.buffet_sales (created_at desc);
create index buffet_sales_booking_idx on public.buffet_sales (booking_id);
create index buffet_sales_created_by_idx on public.buffet_sales (created_by);
create index buffet_sales_voided_by_idx on public.buffet_sales (voided_by);

create table public.buffet_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.buffet_sales(id) on delete cascade,
  product_id uuid references public.buffet_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 999)
);
create index buffet_sale_items_sale_idx on public.buffet_sale_items (sale_id);
create index buffet_sale_items_product_idx on public.buffet_sale_items (product_id);

alter table public.buffet_products enable row level security;
alter table public.buffet_sales enable row level security;
alter table public.buffet_sale_items enable row level security;

create policy buffet_products_staff_read on public.buffet_products for select to authenticated using ((select private.is_staff()));
create policy buffet_products_admin_insert on public.buffet_products for insert to authenticated with check ((select private.is_admin()));
create policy buffet_products_admin_update on public.buffet_products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy buffet_products_admin_delete on public.buffet_products for delete to authenticated using ((select private.is_admin()));
create policy buffet_sales_staff_read on public.buffet_sales for select to authenticated using ((select private.is_staff()));
create policy buffet_items_staff_read on public.buffet_sale_items for select to authenticated using ((select private.is_staff()));

grant select, insert, update, delete on public.buffet_products to authenticated;
grant select on public.buffet_sales, public.buffet_sale_items to authenticated;

-- Las ventas se crean SOLO con esta función: el precio sale de la tabla de productos, nunca del navegador.
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
  select count(*), count(p.id), sum(p.price * r.quantity)
    into v_requested, v_found, v_total
  from req r left join public.buffet_products p on p.id = r.product_id and p.is_active;

  if v_requested = 0 or v_requested <> v_found then
    raise exception 'product_unavailable' using errcode = 'DC022';
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

-- Anular una venta: el administrador siempre; el empleado solo las suyas y dentro de las 2 horas.
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
  update public.buffet_sales
  set is_voided = true, void_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      voided_at = now(), voided_by = (select auth.uid())
  where id = p_id and not is_voided;
end $$;

-- Totales del buffet por período (zona horaria del predio). Respeta RLS (solo personal).
create or replace function public.buffet_summary(p_from date, p_to date)
returns table(sales bigint, total numeric, cash numeric, transfer numeric, other numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*), coalesce(sum(s.total), 0),
         coalesce(sum(s.total) filter (where s.method = 'cash'), 0),
         coalesce(sum(s.total) filter (where s.method = 'transfer'), 0),
         coalesce(sum(s.total) filter (where s.method = 'other'), 0)
  from public.buffet_sales s
  where not s.is_voided
    and (s.created_at at time zone (select v.timezone from public.venue_settings v where v.id = 1))::date between p_from and p_to
$$;

create or replace function public.buffet_top_products(p_from date, p_to date)
returns table(product_name text, quantity bigint, total numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.product_name, sum(i.quantity)::bigint, sum(i.unit_price * i.quantity)
  from public.buffet_sale_items i join public.buffet_sales s on s.id = i.sale_id
  where not s.is_voided
    and (s.created_at at time zone (select v.timezone from public.venue_settings v where v.id = 1))::date between p_from and p_to
  group by i.product_name
  order by sum(i.unit_price * i.quantity) desc
  limit 10
$$;

revoke all on function public.create_buffet_sale(jsonb, public.payment_method, uuid, text) from public, anon;
revoke all on function public.void_buffet_sale(uuid, text) from public, anon;
revoke all on function public.buffet_summary(date, date) from public, anon;
revoke all on function public.buffet_top_products(date, date) from public, anon;
grant execute on function public.create_buffet_sale(jsonb, public.payment_method, uuid, text) to authenticated;
grant execute on function public.void_buffet_sale(uuid, text) to authenticated;
grant execute on function public.buffet_summary(date, date) to authenticated;
grant execute on function public.buffet_top_products(date, date) to authenticated;
