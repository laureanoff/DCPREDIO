-- Datos del profe que se muestran en la página de entrenamientos (editables desde Configuración).
create table public.training_settings (
  id boolean primary key default true check (id),
  coach_name text not null default '' check (char_length(coach_name) <= 80),
  coach_title text not null default '' check (char_length(coach_title) <= 120),
  coach_bio text not null default '' check (char_length(coach_bio) <= 500),
  show_coach boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.training_settings (coach_name, coach_title, coach_bio)
values ('Diego Capitani', 'Profe y dueño de DC Predio', '');

alter table public.training_settings enable row level security;
create policy tr_set_read_anon on public.training_settings for select to anon using (true);
create policy tr_set_read_staff on public.training_settings for select to authenticated using (true);
create policy tr_set_admin_upd on public.training_settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
