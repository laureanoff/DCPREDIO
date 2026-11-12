-- Textos editables de la página de Entrenamientos y qué se muestra al público (precios, días y horarios).
alter table public.training_settings
  add column hero_tagline text not null default 'Entrená. Desarrollá tus capacidades. Evolucioná.' check (char_length(hero_tagline) <= 140),
  add column hero_text text not null default 'Propuestas de entrenamiento para niños, jóvenes y adultos. Integramos desarrollo motor, formación deportiva y preparación física para futbolistas, deportistas de distintas disciplinas y personas que buscan mejorar su condición física y bienestar.' check (char_length(hero_text) <= 700),
  add column proposals_title text not null default 'Propuestas para distintas edades y objetivos' check (char_length(proposals_title) <= 100),
  add column proposals jsonb not null default '[
    {"title":"Infantiles","subtitle":"Nivel Inicial y Primario","text":"Desarrollo motor y formación a través del movimiento y el juego. Propuestas para desarrollar habilidades motrices, coordinación, capacidades físicas y técnica.","tags":["Desarrollo motor","Juego","Técnica individual"]},
    {"title":"Juveniles","subtitle":"Nivel Secundario","text":"Entrenamiento orientado al desarrollo de las capacidades físicas y coordinativas, la formación deportiva y la adquisición de hábitos de entrenamiento.","tags":["Desarrollo físico","Técnica individual y colectiva"]},
    {"title":"Adultos","subtitle":"","text":"Propuestas para mejorar la condición física, desarrollar fuerza, movilidad y resistencia, y favorecer una vida activa y saludable.","tags":["Fuerza","Movilidad","Resistencia","Bienestar"]}
  ]'::jsonb check (jsonb_typeof(proposals) = 'array' and jsonb_array_length(proposals) <= 8),
  add column show_prices boolean not null default false,
  add column show_schedule boolean not null default false;
