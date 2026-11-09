-- Borrar definitivamente una venta de buffet (solo administrador). Los renglones se borran en cascada.
create or replace function public.delete_buffet_sale(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.buffet_sales where id = p_id;
  if not found then
    raise exception 'sale_not_found' using errcode = 'DC023';
  end if;
end $$;

revoke all on function public.delete_buffet_sale(uuid) from public, anon;
grant execute on function public.delete_buffet_sale(uuid) to authenticated, service_role;
