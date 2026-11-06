-- DC Predio — 0003: permisos y políticas RLS
-- Principio: el público (anon) NO accede a reservas, pagos, clientes ni auditoría.
-- Solo ve la configuración pública, canchas y horarios. La disponibilidad se obtiene
-- mediante funciones de servidor que no devuelven datos personales.

alter table public.profiles enable row level security;
alter table public.venue_settings enable row level security;
alter table public.courts enable row level security;
alter table public.operating_hours enable row level security;
alter table public.special_days enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.notification_logs enable row level security;
alter table public.audit_log enable row level security;

-- Partimos de cero: ningún permiso para anon/authenticated, luego se otorga lo estrictamente necesario.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---- anon (visitantes): solo columnas públicas de la configuración, canchas y horarios
grant select (
  venue_name, logo_url, address, contact_phone, contact_email, contact_whatsapp,
  currency, timezone, price_individual, price_group, max_players,
  slot_duration_minutes, slot_gap_minutes, booking_window_days,
  require_confirmation, primary_color, id
) on public.venue_settings to anon;
grant select on public.courts, public.operating_hours, public.special_days to anon;

create policy venue_settings_public_read on public.venue_settings for select to anon using (true);
create policy courts_public_read on public.courts for select to anon using (is_active);
create policy operating_hours_public_read on public.operating_hours for select to anon using (true);
create policy special_days_public_read on public.special_days for select to anon using (true);

-- ---- authenticated (solo personal con perfil activo; sin registro público)
grant select, update on public.profiles to authenticated;
grant select, update on public.venue_settings to authenticated;
grant select, insert, update, delete on public.courts to authenticated;
grant select, insert, update, delete on public.operating_hours to authenticated;
grant select, insert, update, delete on public.special_days to authenticated;
grant select, insert, update, delete on public.blocked_slots to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.payments to authenticated;
grant select, insert, update on public.notification_logs to authenticated;
grant select on public.audit_log to authenticated;
grant select on public.booking_financials to authenticated;

-- profiles: cada persona ve su fila; el admin ve y edita todas. Altas/bajas solo por service_role.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- venue_settings: personal lee todo; solo admin modifica
create policy venue_settings_staff_read on public.venue_settings for select to authenticated
  using ((select public.is_staff()));
create policy venue_settings_admin_update on public.venue_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- canchas / horarios / días especiales: personal lee, admin escribe
create policy courts_staff_read on public.courts for select to authenticated using ((select public.is_staff()));
create policy courts_admin_write on public.courts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy operating_hours_staff_read on public.operating_hours for select to authenticated using ((select public.is_staff()));
create policy operating_hours_admin_write on public.operating_hours for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy special_days_staff_read on public.special_days for select to authenticated using ((select public.is_staff()));
create policy special_days_admin_write on public.special_days for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- operación diaria: cualquier personal activo
create policy blocked_slots_staff on public.blocked_slots for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy bookings_staff_read on public.bookings for select to authenticated using ((select public.is_staff()));
create policy bookings_staff_insert on public.bookings for insert to authenticated with check ((select public.is_staff()));
create policy bookings_staff_update on public.bookings for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy payments_staff_read on public.payments for select to authenticated using ((select public.is_staff()));
create policy payments_staff_insert on public.payments for insert to authenticated with check ((select public.is_staff()));
create policy payments_staff_update on public.payments for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy notification_logs_staff_read on public.notification_logs for select to authenticated using ((select public.is_staff()));
create policy notification_logs_staff_insert on public.notification_logs for insert to authenticated with check ((select public.is_staff()));
create policy notification_logs_staff_update on public.notification_logs for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- auditoría: solo lectura para admin (la escriben los triggers)
create policy audit_log_admin_read on public.audit_log for select to authenticated using ((select public.is_admin()));
