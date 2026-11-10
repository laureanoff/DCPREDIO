-- Avisos push para clientes: se suscriben desde la pantalla de espera de su reserva.
create table public.customer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, endpoint)
);
create index customer_push_booking_idx on public.customer_push_subscriptions (booking_id);
alter table public.customer_push_subscriptions enable row level security;
-- Sin políticas ni permisos: solo se usa desde el servidor con la clave de servicio.
revoke all on public.customer_push_subscriptions from anon, authenticated;
