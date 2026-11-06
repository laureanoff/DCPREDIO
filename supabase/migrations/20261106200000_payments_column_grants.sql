-- Los pagos no se editan ni se borran: solo se registran y se anulan.
-- El personal únicamente puede escribir las columnas que la aplicación usa; created_by lo fija la base (auth.uid()).
revoke insert, update on public.payments from authenticated;
grant insert (booking_id, amount, method, paid_at, notes) on public.payments to authenticated;
grant update (is_voided, void_reason) on public.payments to authenticated;
