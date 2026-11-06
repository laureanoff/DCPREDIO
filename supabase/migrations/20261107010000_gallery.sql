-- Galería del carrusel de la web pública (videos y fotos) + bucket de almacenamiento.
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video', 'image')),
  url text not null,                 -- archivo (ruta pública o URL del bucket)
  poster_url text,                   -- imagen de portada del video
  storage_path text,                 -- ruta dentro del bucket (null = archivo estático del sitio)
  poster_storage_path text,
  title text not null default '' check (char_length(title) <= 120),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index gallery_items_order_idx on public.gallery_items (sort_order, created_at);
create index gallery_items_created_by_idx on public.gallery_items (created_by);

alter table public.gallery_items enable row level security;

-- Visitantes: solo lo activo. Personal: ve todo. Solo admin modifica.
create policy gallery_public_read on public.gallery_items for select to anon using (is_active);
create policy gallery_staff_read on public.gallery_items for select to authenticated using ((select private.is_staff()));
create policy gallery_admin_insert on public.gallery_items for insert to authenticated with check ((select private.is_admin()));
create policy gallery_admin_update on public.gallery_items for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy gallery_admin_delete on public.gallery_items for delete to authenticated using ((select private.is_admin()));

grant select on public.gallery_items to anon;
grant select, insert, update, delete on public.gallery_items to authenticated;

-- Archivos de ejemplo que ya vienen con el sitio.
insert into public.gallery_items (kind, url, poster_url, title, sort_order) values
  ('video', '/media/se-juega.mp4', '/media/se-juega-poster.jpg', 'Se juega', 1),
  ('video', '/media/el-verde-es-protagonista.mp4', '/media/el-verde-es-protagonista-poster.jpg', 'El verde ya es protagonista', 2);

-- Bucket público de lectura; solo administradores suben o borran archivos (máx. 50 MB cada uno).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 52428800,
        array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy gallery_objects_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (select private.is_admin()));
create policy gallery_objects_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and (select private.is_admin()));
