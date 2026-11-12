-- Reseñas enviadas por el público desde la web: entran ocultas y se publican cuando el administrador las aprueba.
alter table public.training_testimonials add column source text not null default 'admin' check (source in ('admin', 'public'));
create index training_testimonials_pending_idx on public.training_testimonials (source, is_active, created_at);
