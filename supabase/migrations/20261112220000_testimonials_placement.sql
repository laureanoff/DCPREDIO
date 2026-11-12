-- Los testimonios se cargan por separado: los de quienes reservan la cancha (inicio) y los de entrenamientos.
alter table public.training_testimonials add column placement text not null default 'trainings' check (placement in ('courts', 'trainings'));
