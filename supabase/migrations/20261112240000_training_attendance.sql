-- Asistencia de los alumnos a cada clase (presente / ausente / justificó), una fila por inscripción y día.
create table public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.training_enrollments(id) on delete cascade,
  class_date date not null,
  status text not null check (status in ('present', 'absent', 'justified')),
  created_at timestamptz not null default now(),
  unique (enrollment_id, class_date)
);
create index training_attendance_date_idx on public.training_attendance (class_date);
alter table public.training_attendance enable row level security;
create policy tr_att_read on public.training_attendance for select to authenticated using ((select private.is_staff()));
create policy tr_att_ins on public.training_attendance for insert to authenticated with check ((select private.is_staff()));
create policy tr_att_upd on public.training_attendance for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy tr_att_del on public.training_attendance for delete to authenticated using ((select private.is_staff()));
grant select, insert, update, delete on public.training_attendance to authenticated;
