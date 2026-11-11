alter table public.training_settings
  add column coach_photo_url text,
  add column coach_photo_path text,
  add column coach_photo_zoom numeric(3,2) not null default 1 check (coach_photo_zoom between 1 and 3),
  add column coach_photo_x smallint not null default 50 check (coach_photo_x between 0 and 100),
  add column coach_photo_y smallint not null default 50 check (coach_photo_y between 0 and 100);
