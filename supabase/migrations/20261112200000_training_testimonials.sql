-- Testimonios de la página de Entrenamientos (se cargan desde el panel; sin ninguno, la sección no se muestra).
create table public.training_testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null check (char_length(author) between 1 and 80),
  detail text check (detail is null or char_length(detail) <= 80),
  body text not null check (char_length(body) between 1 and 500),
  rating smallint not null default 5 check (rating between 1 and 5),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.training_testimonials enable row level security;
create policy tr_tes_read_anon on public.training_testimonials for select to anon using (is_active);
create policy tr_tes_read_auth on public.training_testimonials for select to authenticated using ((select private.is_staff()));
create policy tr_tes_ins on public.training_testimonials for insert to authenticated with check ((select private.is_admin()));
create policy tr_tes_upd on public.training_testimonials for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tr_tes_del on public.training_testimonials for delete to authenticated using ((select private.is_admin()));
grant select on public.training_testimonials to anon;
grant select, insert, update, delete on public.training_testimonials to authenticated;
