-- Cobros por alumno (inscripción) de entrenamientos. Se cobran en el predio; acá solo se registran.
create table public.training_payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.training_enrollments (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method public.payment_method not null,
  concept text check (char_length(concept) <= 100),
  notes text check (char_length(notes) <= 500),
  is_voided boolean not null default false,
  voided_at timestamptz,
  void_reason text check (char_length(void_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (not is_voided or voided_at is not null)
);
create index training_payments_enrollment_idx on public.training_payments (enrollment_id);
create index training_payments_paid_idx on public.training_payments (paid_at);
create index training_payments_created_by_idx on public.training_payments (created_by);

alter table public.training_payments enable row level security;
create policy tr_pay_staff_read on public.training_payments for select to authenticated using ((select private.is_staff()));
create policy tr_pay_staff_ins on public.training_payments for insert to authenticated with check ((select private.is_staff()));
create policy tr_pay_staff_upd on public.training_payments for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy tr_pay_admin_del on public.training_payments for delete to authenticated using ((select private.is_admin()));
grant select, insert, update, delete on public.training_payments to authenticated;
