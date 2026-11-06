-- Quien tiene sesión iniciada (staff) también debe ver la disponibilidad en la página pública.
-- Sin esto, un admin logueado veía "No pudimos cargar la disponibilidad" (403).
grant execute on function public.get_day_availability(uuid, date) to authenticated;
grant execute on function public.get_month_availability(uuid, integer, integer) to authenticated;
