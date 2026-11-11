-- Entrenamientos: actividades, packs (con precios por modalidad de cobro), alumnos e inscripciones.
-- Todo lo que se ofrece y sus precios se administra desde el panel; nada queda fijo en el código.

create table public.training_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 400),
  location text check (char_length(location) <= 60),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.training_packs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.training_activities (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 400),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index training_packs_activity_idx on public.training_packs (activity_id);

create table public.training_pack_prices (
  pack_id uuid not null references public.training_packs (id) on delete cascade,
  billing text not null check (billing in ('per_class', 'monthly', 'quarterly')),
  price numeric(12,2) not null check (price >= 0),
  primary key (pack_id, billing)
);

create table public.training_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  birth_date date check (birth_date is null or (birth_date <= current_date and birth_date > date '1900-01-01')),
  guardian_name text not null check (char_length(btrim(guardian_name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  email text check (char_length(email) <= 150),
  emergency_contact text check (char_length(emergency_contact) <= 200),
  health_notes text check (char_length(health_notes) <= 500),
  created_at timestamptz not null default now()
);
create index training_students_phone_idx on public.training_students (phone);

create table public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.training_students (id) on delete cascade,
  pack_id uuid references public.training_packs (id) on delete set null,
  -- Copia de lo elegido al inscribirse: si después cambian precios o nombres, la inscripción no se altera.
  activity_name text not null,
  pack_name text not null,
  days_per_week smallint not null,
  billing text not null check (billing in ('per_class', 'monthly', 'quarterly')),
  price numeric(12,2) not null check (price >= 0),
  preferred_days smallint[] not null default '{}',
  preferred_time text check (char_length(preferred_time) <= 200),
  notes text check (char_length(notes) <= 500),
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'cancelled')),
  start_date date,
  staff_notes text check (char_length(staff_notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index training_enrollments_status_idx on public.training_enrollments (status, created_at desc);
create index training_enrollments_student_idx on public.training_enrollments (student_id);
create index training_enrollments_pack_idx on public.training_enrollments (pack_id);
create trigger set_updated_at before update on public.training_enrollments for each row execute function public.set_updated_at();

alter table public.training_activities enable row level security;
alter table public.training_packs enable row level security;
alter table public.training_pack_prices enable row level security;
alter table public.training_students enable row level security;
alter table public.training_enrollments enable row level security;

-- Catálogo: lo activo es público (precios incluidos); el personal ve todo; solo el administrador modifica.
create policy tr_act_read on public.training_activities for select to anon, authenticated using (is_active or (select private.is_staff()));
create policy tr_act_admin_ins on public.training_activities for insert to authenticated with check ((select private.is_admin()));
create policy tr_act_admin_upd on public.training_activities for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tr_act_admin_del on public.training_activities for delete to authenticated using ((select private.is_admin()));

create policy tr_pack_read on public.training_packs for select to anon, authenticated
  using ((is_active and exists (select 1 from public.training_activities a where a.id = activity_id and a.is_active)) or (select private.is_staff()));
create policy tr_pack_admin_ins on public.training_packs for insert to authenticated with check ((select private.is_admin()));
create policy tr_pack_admin_upd on public.training_packs for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tr_pack_admin_del on public.training_packs for delete to authenticated using ((select private.is_admin()));

create policy tr_price_read on public.training_pack_prices for select to anon, authenticated
  using (exists (select 1 from public.training_packs p where p.id = pack_id and p.is_active) or (select private.is_staff()));
create policy tr_price_admin_ins on public.training_pack_prices for insert to authenticated with check ((select private.is_admin()));
create policy tr_price_admin_upd on public.training_pack_prices for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tr_price_admin_del on public.training_pack_prices for delete to authenticated using ((select private.is_admin()));

-- Alumnos e inscripciones: solo el personal. Las altas públicas entran únicamente por la función de abajo.
create policy tr_stu_staff_read on public.training_students for select to authenticated using ((select private.is_staff()));
create policy tr_stu_staff_upd on public.training_students for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy tr_enr_staff_read on public.training_enrollments for select to authenticated using ((select private.is_staff()));
create policy tr_enr_staff_upd on public.training_enrollments for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy tr_enr_admin_del on public.training_enrollments for delete to authenticated using ((select private.is_admin()));
create policy tr_stu_admin_del on public.training_students for delete to authenticated using ((select private.is_admin()));

grant select on public.training_activities, public.training_packs, public.training_pack_prices to anon;
grant select, insert, update, delete on public.training_activities, public.training_packs, public.training_pack_prices to authenticated;
grant select, update, delete on public.training_students, public.training_enrollments to authenticated;

-- Alta pública (solo la ejecuta el servidor con la llave de servicio). El precio sale de la base, nunca del navegador.
create or replace function public.create_training_enrollment(
  p_pack_id uuid,
  p_billing text,
  p_student_name text,
  p_birth_date date,
  p_guardian_name text,
  p_phone text,
  p_email text,
  p_emergency text,
  p_health text,
  p_days smallint[],
  p_time text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pack public.training_packs;
  v_act public.training_activities;
  v_price numeric(12,2);
  v_student uuid;
  v_enr uuid;
  v_days smallint[];
begin
  select * into v_pack from public.training_packs where id = p_pack_id and is_active;
  if not found then raise exception 'pack_unavailable' using errcode = 'DC030'; end if;
  select * into v_act from public.training_activities where id = v_pack.activity_id and is_active;
  if not found then raise exception 'pack_unavailable' using errcode = 'DC030'; end if;

  select price into v_price from public.training_pack_prices where pack_id = p_pack_id and billing = p_billing;
  if v_price is null then raise exception 'billing_unavailable' using errcode = 'DC031'; end if;

  if p_phone !~ '^\+?[0-9]{8,15}$' or char_length(btrim(coalesce(p_student_name, ''))) < 2 or char_length(btrim(coalesce(p_guardian_name, ''))) < 2 then
    raise exception 'invalid_data' using errcode = 'DC032';
  end if;

  select coalesce(array_agg(distinct d order by d), '{}') into v_days from unnest(coalesce(p_days, '{}')) d where d between 0 and 6;
  if coalesce(array_length(v_days, 1), 0) < v_pack.days_per_week then
    raise exception 'not_enough_days' using errcode = 'DC034';
  end if;

  if (select count(*) from public.training_enrollments e join public.training_students s on s.id = e.student_id
      where s.phone = p_phone and e.status = 'pending') >= 5 then
    raise exception 'too_many_pending' using errcode = 'DC033';
  end if;

  -- Mismo alumno (mismo teléfono y nombre): se reutiliza la ficha y se actualizan sus datos.
  select id into v_student from public.training_students
    where phone = p_phone and lower(btrim(full_name)) = lower(btrim(p_student_name)) limit 1;
  if v_student is null then
    insert into public.training_students (full_name, birth_date, guardian_name, phone, email, emergency_contact, health_notes)
    values (btrim(p_student_name), p_birth_date, btrim(p_guardian_name), p_phone, nullif(btrim(coalesce(p_email, '')), ''),
            nullif(btrim(coalesce(p_emergency, '')), ''), nullif(btrim(coalesce(p_health, '')), ''))
    returning id into v_student;
  else
    update public.training_students set
      birth_date = coalesce(p_birth_date, birth_date), guardian_name = btrim(p_guardian_name),
      email = coalesce(nullif(btrim(coalesce(p_email, '')), ''), email),
      emergency_contact = coalesce(nullif(btrim(coalesce(p_emergency, '')), ''), emergency_contact),
      health_notes = coalesce(nullif(btrim(coalesce(p_health, '')), ''), health_notes)
    where id = v_student;
  end if;

  insert into public.training_enrollments (student_id, pack_id, activity_name, pack_name, days_per_week, billing, price, preferred_days, preferred_time, notes)
  values (v_student, v_pack.id, v_act.name, v_pack.name, v_pack.days_per_week, p_billing, v_price, v_days,
          nullif(btrim(coalesce(p_time, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_enr;
  return v_enr;
end $$;

revoke all on function public.create_training_enrollment(uuid, text, text, date, text, text, text, text, text, smallint[], text, text) from public, anon, authenticated;
grant execute on function public.create_training_enrollment(uuid, text, text, date, text, text, text, text, text, smallint[], text, text) to service_role;
