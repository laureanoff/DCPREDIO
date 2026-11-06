-- DC Predio — 0005: valores iniciales PROVISORIOS (todo editable desde el panel de administración)
-- No son datos de prueba: son la configuración mínima para que el sistema funcione.
-- Precios y horarios son provisionales hasta que Diego los confirme.

insert into public.venue_settings (id, venue_name) values (1, 'DC Predio')
on conflict (id) do nothing;

insert into public.courts (name, sort_order) values ('Cancha 1', 1);

-- Provisorio: todos los días de 16:00 a 00:00
insert into public.operating_hours (weekday, is_open, open_time, close_time)
select d, true, time '16:00', time '00:00' from generate_series(0, 6) d
on conflict (weekday) do nothing;
