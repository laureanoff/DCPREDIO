alter table public.training_settings add column coach_story text not null default '' check (char_length(coach_story) <= 3000);

-- Agenda semanal de entrenamientos (qué se entrena, qué día y a qué hora).
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time,
  title text not null check (char_length(title) between 1 and 80),
  details text check (details is null or char_length(details) <= 500),
  activity_id uuid references public.training_activities(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time is null or end_time > start_time)
);
create index training_sessions_day_idx on public.training_sessions (weekday, start_time);
alter table public.training_sessions enable row level security;
create policy tr_ses_read_anon on public.training_sessions for select to anon using (is_active);
create policy tr_ses_read_staff on public.training_sessions for select to authenticated using ((select private.is_staff()));
create policy tr_ses_ins on public.training_sessions for insert to authenticated with check ((select private.is_staff()));
create policy tr_ses_upd on public.training_sessions for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy tr_ses_del on public.training_sessions for delete to authenticated using ((select private.is_staff()));
grant select on public.training_sessions to anon;
grant select, insert, update, delete on public.training_sessions to authenticated;
