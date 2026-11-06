-- Separa las políticas de escritura del admin por acción (evita políticas permisivas superpuestas en SELECT).
drop policy courts_admin_write on public.courts;
create policy courts_admin_insert on public.courts for insert to authenticated with check ((select private.is_admin()));
create policy courts_admin_update on public.courts for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy courts_admin_delete on public.courts for delete to authenticated using ((select private.is_admin()));

drop policy operating_hours_admin_write on public.operating_hours;
create policy operating_hours_admin_insert on public.operating_hours for insert to authenticated with check ((select private.is_admin()));
create policy operating_hours_admin_update on public.operating_hours for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy operating_hours_admin_delete on public.operating_hours for delete to authenticated using ((select private.is_admin()));

drop policy special_days_admin_write on public.special_days;
create policy special_days_admin_insert on public.special_days for insert to authenticated with check ((select private.is_admin()));
create policy special_days_admin_update on public.special_days for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy special_days_admin_delete on public.special_days for delete to authenticated using ((select private.is_admin()));
