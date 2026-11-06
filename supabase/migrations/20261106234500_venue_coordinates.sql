-- Coordenadas del predio para el mapa 3D. Se calculan al guardar la dirección en el panel.
alter table public.venue_settings
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180);

grant select (latitude, longitude) on public.venue_settings to anon;
