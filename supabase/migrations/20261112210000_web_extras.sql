-- Galería con ubicación (inicio / entrenamientos), Instagram del predio y cifras editables de Entrenamientos.
alter table public.gallery_items add column placement text not null default 'home' check (placement in ('home', 'trainings'));
alter table public.venue_settings add column instagram_url text check (instagram_url is null or (char_length(instagram_url) <= 200 and instagram_url ~* '^https://(www\.)?instagram\.com/'));
grant select (instagram_url) on public.venue_settings to anon;
alter table public.training_settings add column stats jsonb not null default '[]'::jsonb check (jsonb_typeof(stats) = 'array' and jsonb_array_length(stats) <= 4);
update public.venue_settings set instagram_url = 'https://www.instagram.com/dcpredio/' where id = 1;
