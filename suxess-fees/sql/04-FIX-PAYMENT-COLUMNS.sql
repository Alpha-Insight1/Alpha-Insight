-- Fixes: "board_deadline column of student_fees" error when recording payment
alter table public.student_fees add column if not exists board_deadline date;
alter table public.student_fees add column if not exists valid_until date;
alter table public.fee_types add column if not exists default_amount numeric(12,2) default 0;
alter table public.school_buses add column if not exists bus_fee numeric(12,2) default 0;
alter table public.student_bus_assignments add column if not exists amount_paid numeric(12,2) default 0;
alter table public.student_bus_assignments add column if not exists fee_amount numeric(12,2) default 0;

select 'OK — try recording payment again' as status;
