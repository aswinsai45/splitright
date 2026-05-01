-- Add support for guest payers on expenses.
-- Run this in Supabase SQL editor.

alter table public.expenses
  add column if not exists paid_by_guest_id uuid;

alter table public.expenses
  add constraint expenses_paid_by_guest_id_fkey
  foreign key (paid_by_guest_id) references public.group_guests(id)
  on delete set null;

-- Exactly one payer must be set: either a real user (paid_by) or a guest (paid_by_guest_id).
alter table public.expenses
  add constraint expenses_exactly_one_payer_chk
  check (
    (paid_by is not null and paid_by_guest_id is null)
    or
    (paid_by is null and paid_by_guest_id is not null)
  ) not valid;

-- After confirming there are no legacy rows with both columns NULL/non-NULL, you can validate:
-- alter table public.expenses validate constraint expenses_exactly_one_payer_chk;
