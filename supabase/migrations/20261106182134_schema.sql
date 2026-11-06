-- DC Predio — 0001: esquema base (tipos, tablas, índices)
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'staff');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
create type public.booking_mode as enum ('individual', 'group');
create type public.payment_method as enum ('cash', 'transfer', 'other');
create type public.notification_status as enum ('pending', 'sent', 'failed');

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Administradores / personal. Un usuario de Auth SIN fila aquí no tiene acceso a nada.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  role public.app_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configuración general (una sola fila, id = 1)
create table public.venue_settings (
  id smallint primary key default 1 check (id = 1),
  venue_name text not null default 'DC Predio' check (char_length(btrim(venue_name)) between 1 and 80),
  logo_url text,
  address text,
  contact_phone text,
  contact_email text,
  contact_whatsapp text,                 -- público (se muestra en la web)
  notification_whatsapp_number text,     -- PRIVADO: recibe los avisos de reservas
  currency char(3) not null default 'ARS',
  timezone text not null default 'America/Argentina/Cordoba',
  price_individual numeric(12,2) not null default 5000 check (price_individual >= 0),
  price_group numeric(12,2) not null default 40000 check (price_group >= 0),
  max_players smallint not null default 10 check (max_players between 1 and 50),
  slot_duration_minutes smallint not null default 60 check (slot_duration_minutes between 15 and 480),
  slot_gap_minutes smallint not null default 0 check (slot_gap_minutes between 0 and 120),
  booking_window_days smallint not null default 30 check (booking_window_days between 1 and 365),
  require_confirmation boolean not null default false,
  primary_color text not null default '#B6D61A' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Horario semanal (0 = domingo ... 6 = sábado).
-- Si close_time <= open_time se interpreta como día siguiente (00:00 = medianoche).
create table public.operating_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null unique check (weekday between 0 and 6),
  is_open boolean not null default true,
  open_time time not null,
  close_time time not null,
  updated_at timestamptz not null default now(),
  check (open_time <> close_time)
);

-- Cierres excepcionales y horarios especiales (feriados). Tienen prioridad sobre operating_hours.
create table public.special_days (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_closed or (open_time is not null and close_time is not null and open_time <> close_time))
);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  court_id uuid not null references public.courts (id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  booking_date date generated always as (((start_at at time zone 'America/Argentina/Cordoba')::date)) stored,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 100),
  customer_phone text not null check (customer_phone ~ '^\+?[0-9]{8,15}$'),
  mode public.booking_mode not null,
  players smallint not null default 1 check (players >= 1),
  notes text check (char_length(notes) <= 500),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  status public.booking_status not null default 'confirmed',
  source text not null default 'web' check (source in ('web', 'admin')),
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  -- Respaldo a nivel base de datos: nunca dos turnos grupales superpuestos en la misma cancha.
  constraint bookings_group_no_overlap exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (mode = 'group' and status <> 'cancelled')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method public.payment_method not null,
  notes text check (char_length(notes) <= 500),
  is_voided boolean not null default false,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text check (char_length(void_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_voided or voided_at is not null)
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  recipient_type text not null check (recipient_type in ('venue', 'customer')),
  recipient_number text,
  template_name text,
  status public.notification_status not null default 'pending',
  attempts smallint not null default 0,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz
);

-- Historial de operaciones y modificaciones (lo escriben triggers; nadie edita desde la API).
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

-- Índices
create index bookings_court_start_idx on public.bookings (court_id, start_at);
create index bookings_date_idx on public.bookings (booking_date);
create index bookings_status_idx on public.bookings (status);
create index bookings_phone_idx on public.bookings (customer_phone);
create index bookings_created_by_idx on public.bookings (created_by);
create index payments_booking_idx on public.payments (booking_id);
create index payments_paid_at_idx on public.payments (paid_at) where not is_voided;
create index payments_created_by_idx on public.payments (created_by);
create index payments_voided_by_idx on public.payments (voided_by);
create index blocked_slots_court_start_idx on public.blocked_slots (court_id, start_at);
create index blocked_slots_created_by_idx on public.blocked_slots (created_by);
create index notification_logs_booking_idx on public.notification_logs (booking_id);
create index notification_logs_status_idx on public.notification_logs (status);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);

-- updated_at automático
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.venue_settings for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.courts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.operating_hours for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.special_days for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payments for each row execute function public.set_updated_at();
