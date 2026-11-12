-- «Lo que vas a lograr» de la página de Entrenamientos, editable desde el panel.
alter table public.training_settings
  add column benefits_title text not null default 'Entrená mejor, sentite mejor' check (char_length(benefits_title) <= 100),
  add column benefits jsonb not null default '[
    {"icon":"dumbbell","title":"Fuerza y estabilidad","text":"Trabajo con el propio cuerpo y con pesas para ganar fuerza de forma progresiva y segura."},
    {"icon":"zap","title":"Coordinación y agilidad","text":"Ejercicios de movimiento, escalera y balón que mejoran reflejos, equilibrio y control del cuerpo."},
    {"icon":"heart","title":"Resistencia","text":"Más energía para el día a día y para rendir mejor cuando te toca jugar al fútbol."},
    {"icon":"shield","title":"Postura y prevención","text":"Movilidad y técnica correcta para moverte mejor y cuidar articulaciones y espalda."},
    {"icon":"medal","title":"Confianza y constancia","text":"Objetivos claros y una rutina que se sostiene: ver el progreso motiva a seguir."},
    {"icon":"smile","title":"Diversión en grupo","text":"Clases dinámicas, en un ambiente cómodo, donde entrenar es parte de lo que más se disfruta."}
  ]'::jsonb check (jsonb_typeof(benefits) = 'array' and jsonb_array_length(benefits) <= 12);
