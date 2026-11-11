-- El rol anónimo no puede ejecutar private.is_staff(): la lectura pública y la del personal van en políticas separadas.
drop policy tr_act_read on public.training_activities;
drop policy tr_pack_read on public.training_packs;
drop policy tr_price_read on public.training_pack_prices;

create policy tr_act_read_anon on public.training_activities for select to anon using (is_active);
create policy tr_act_read_staff on public.training_activities for select to authenticated using ((select private.is_staff()));

create policy tr_pack_read_anon on public.training_packs for select to anon
  using (is_active and exists (select 1 from public.training_activities a where a.id = activity_id and a.is_active));
create policy tr_pack_read_staff on public.training_packs for select to authenticated using ((select private.is_staff()));

create policy tr_price_read_anon on public.training_pack_prices for select to anon
  using (exists (select 1 from public.training_packs p where p.id = pack_id and p.is_active));
create policy tr_price_read_staff on public.training_pack_prices for select to authenticated using ((select private.is_staff()));
