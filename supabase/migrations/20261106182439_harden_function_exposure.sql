-- Mueve los helpers de autorización a un esquema privado (no expuesto por la API REST)
-- y quita la ejecución directa de las funciones de disponibilidad a usuarios autenticados.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;

revoke execute on function public.get_day_availability(uuid, date) from authenticated;
revoke execute on function public.get_month_availability(uuid, int, int) from authenticated;
