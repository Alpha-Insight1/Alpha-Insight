-- Alpha Insight COMPLETE SCHEMA — run once on empty Supabase project
-- Generated for redeploy

-- =============================================
-- SUXESS SCHOOLS - FEE MANAGEMENT SYSTEM
-- Run this entire file in Supabase SQL Editor
-- =============================================

-- Enable UUID
create extension if not exists "uuid-ossp";

-- Campuses / Branches
create table public.campuses (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  short_name text,
  address text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Students
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  admission_number text unique not null,
  full_name text not null,
  class_name text not null,
  campus_id uuid references public.campuses(id),
  parent_name text,
  parent_phone text,
  parent_email text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fee Types
create table public.fee_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Student Fees (what is owed)
create table public.student_fees (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  fee_type_id uuid references public.fee_types(id) not null,
  session text not null,
  term text not null,
  amount numeric(12,2) not null,
  amount_paid numeric(12,2) default 0,
  balance numeric(12,2) generated always as (amount - amount_paid) stored,
  due_date date,
  status text default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payments
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  student_fee_id uuid references public.student_fees(id),
  amount numeric(12,2) not null,
  payment_method text default 'cash' check (payment_method in ('cash', 'transfer', 'pos', 'cheque', 'other')),
  payment_date date default current_date,
  receipt_number text unique,
  notes text,
  recorded_by uuid references auth.users(id),
  deleted_at timestamptz default null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_students_campus on public.students(campus_id);
create index idx_students_class on public.students(class_name);
create index idx_student_fees_student on public.student_fees(student_id);
create index idx_student_fees_status on public.student_fees(status);
create index idx_payments_student on public.payments(student_id);
create index idx_payments_date on public.payments(payment_date);
create index idx_payments_deleted_at on public.payments(deleted_at);

-- Auto update amount_paid when payment is recorded
create or replace function update_student_fee_paid()
returns trigger as $$
begin
  if new.student_fee_id is not null then
    update public.student_fees
    set 
      amount_paid = amount_paid + new.amount,
      status = case 
        when (amount_paid + new.amount) >= amount then 'paid'
        when (amount_paid + new.amount) > 0 then 'partial'
        else 'pending'
      end,
      updated_at = now()
    where id = new.student_fee_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_payment_insert
  after insert on public.payments
  for each row execute function update_student_fee_paid();

-- Auto generate receipt number: SUX-YYYYMMDD-00001
create sequence if not exists receipt_seq start 1;

create or replace function generate_receipt_number()
returns trigger as $$
begin
  if new.receipt_number is null then
    new.receipt_number := 'SUX-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('receipt_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_receipt_number
  before insert on public.payments
  for each row execute function generate_receipt_number();

-- Row Level Security
alter table public.campuses enable row level security;
alter table public.students enable row level security;
alter table public.fee_types enable row level security;
alter table public.student_fees enable row level security;
alter table public.payments enable row level security;

create policy "Authenticated full access campuses" on public.campuses for all using (auth.role() = 'authenticated');
create policy "Authenticated full access students" on public.students for all using (auth.role() = 'authenticated');
create policy "Authenticated full access fee_types" on public.fee_types for all using (auth.role() = 'authenticated');
create policy "Authenticated full access student_fees" on public.student_fees for all using (auth.role() = 'authenticated');
create policy "Authenticated full access payments" on public.payments for all using (auth.role() = 'authenticated');

-- Seed data: Campuses
insert into public.campuses (name, short_name) values
  ('Suxess Schools', 'Main'),
  ('Suxess Tutorial - Arepo', 'Arepo'),
  ('Suxess Tutorial - Ofada Mowe', 'Ofada Mowe');

-- Seed data: Fee Types
insert into public.fee_types (name, description) values
  ('Tuition', 'School tuition fees'),
  ('PTA Levy', 'Parent Teacher Association levy'),
  ('Development Levy', 'School development levy'),
  ('Examination Fee', 'Exam and assessment fees'),
  ('Uniform', 'School uniform'),
  ('Books & Materials', 'Textbooks and learning materials');

-- Soft delete / restore: reverse amount_paid when payment is voided or restored
create or replace function reverse_student_fee_on_payment_void()
returns trigger as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and new.student_fee_id is not null then
    update public.student_fees
    set
      amount_paid = greatest(0, amount_paid - new.amount),
      status = case
        when greatest(0, amount_paid - new.amount) >= amount then 'paid'
        when greatest(0, amount_paid - new.amount) > 0 then 'partial'
        else 'pending'
      end,
      updated_at = now()
    where id = new.student_fee_id;
  end if;

  if old.deleted_at is not null and new.deleted_at is null and new.student_fee_id is not null then
    update public.student_fees
    set
      amount_paid = amount_paid + new.amount,
      status = case
        when (amount_paid + new.amount) >= amount then 'paid'
        when (amount_paid + new.amount) > 0 then 'partial'
        else 'pending'
      end,
      updated_at = now()
    where id = new.student_fee_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger on_payment_void_or_restore
  after update of deleted_at on public.payments
  for each row execute function reverse_student_fee_on_payment_void();

-- =============================================
-- EXPENSES (daily expenses per campus)
-- =============================================
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  campus_id uuid references public.campuses(id) on delete cascade not null,
  expense_date date default current_date not null,
  category text not null default 'general',
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text default 'cash' check (payment_method in ('cash', 'transfer', 'pos', 'cheque', 'other')),
  recorded_by uuid references auth.users(id),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_expenses_campus on public.expenses(campus_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);

-- =============================================
-- STAFF (salaries per campus)
-- =============================================
create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  campus_id uuid references public.campuses(id) on delete cascade not null,
  full_name text not null,
  role text,
  phone text,
  salary numeric(12,2) not null default 0 check (salary >= 0),
  status text default 'active' check (status in ('active', 'inactive')),
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_staff_campus on public.staff(campus_id);
create index if not exists idx_staff_status on public.staff(status);

-- RLS
alter table public.expenses enable row level security;
alter table public.staff enable row level security;

create policy "Authenticated full access expenses" on public.expenses for all using (auth.role() = 'authenticated');
create policy "Authenticated full access staff" on public.staff for all using (auth.role() = 'authenticated');

-- User profiles / RBAC
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'secretary' check (role in ('admin', 'secretary')),
  campus_id uuid references public.campuses(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_campus on public.profiles(campus_id);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can manage profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Exam preparing for (tutorial campuses)
alter table public.students add column if not exists exam_preparing_for text;

create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text default 'Textbook',
  quantity integer not null default 0 check (quantity >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  unit text default 'pcs',
  campus_id uuid references public.campuses(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.inventory_items enable row level security;
create policy "Authenticated full access inventory" on public.inventory_items
  for all using (auth.role() = 'authenticated');

-- ========== EXTRA MODULES ==========

-- >>> migration-soft-delete-payments.sql
-- =============================================
-- Run this once in Supabase SQL Editor
-- Soft delete / restore for payments
-- =============================================

-- 1. Add deleted_at column
alter table public.payments
  add column if not exists deleted_at timestamptz default null;

create index if not exists idx_payments_deleted_at on public.payments(deleted_at);

-- 2. When a payment is soft-deleted, reverse the amount on student_fees
create or replace function reverse_student_fee_on_payment_void()
returns trigger as $$
begin
  -- Soft delete: deleted_at went from null to a timestamp
  if old.deleted_at is null and new.deleted_at is not null and new.student_fee_id is not null then
    update public.student_fees
    set
      amount_paid = greatest(0, amount_paid - new.amount),
      status = case
        when greatest(0, amount_paid - new.amount) >= amount then 'paid'
        when greatest(0, amount_paid - new.amount) > 0 then 'partial'
        else 'pending'
      end,
      updated_at = now()
    where id = new.student_fee_id;
  end if;

  -- Restore: deleted_at went from a timestamp back to null
  if old.deleted_at is not null and new.deleted_at is null and new.student_fee_id is not null then
    update public.student_fees
    set
      amount_paid = amount_paid + new.amount,
      status = case
        when (amount_paid + new.amount) >= amount then 'paid'
        when (amount_paid + new.amount) > 0 then 'partial'
        else 'pending'
      end,
      updated_at = now()
    where id = new.student_fee_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists on_payment_void_or_restore on public.payments;
create trigger on_payment_void_or_restore
  after update of deleted_at on public.payments
  for each row execute function reverse_student_fee_on_payment_void();

-- >>> migration-profiles-rbac.sql
-- =============================================
-- Run once in Supabase SQL Editor
-- User roles: admin (all campuses) or secretary (one campus)
-- =============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'secretary' check (role in ('admin', 'secretary')),
  campus_id uuid references public.campuses(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Admin has campus_id = null; secretary must have a campus_id
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_campus on public.profiles(campus_id);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Allow authenticated users to read campuses (already have policy)

-- Helper: after creating a user in Authentication → Users,
-- insert their profile, e.g.:
--
-- insert into public.profiles (id, full_name, role, campus_id)
-- values (
--   '<user-uuid-from-auth>',
--   'Admin Name',
--   'admin',
--   null
-- );
--
-- For a Main campus secretary:
-- insert into public.profiles (id, full_name, role, campus_id)
-- values (
--   '<user-uuid>',
--   'Main Secretary',
--   'secretary',
--   (select id from public.campuses where short_name = 'Main' limit 1)
-- );

-- >>> migration-fix-profiles-rls.sql
-- Fix profiles RLS so every user can ALWAYS read their own row
-- Run once in Supabase SQL Editor

alter table public.profiles enable row level security;

-- Drop old policies that can recurse / block reads
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_all_admin" on public.profiles;
drop policy if exists "Authenticated full access profiles" on public.profiles;

-- Anyone logged in can read their own profile (required for login role)
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Users can update their own row (optional)
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can manage all profiles (no recursive subquery)
-- Uses JWT claim is hard; simple approach: authenticated can insert own only
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Service / table editor still works as postgres / service_role (bypasses RLS)

-- Ensure director row is admin (edit email if needed)
-- update public.profiles set role = 'admin', campus_id = null
-- where id = (select id from auth.users where email = 'director@example.com');

-- >>> migration-expenses-staff.sql
-- =============================================
-- Run once in Supabase SQL Editor
-- Expenses + Staff for multi-campus tracking
-- =============================================

create extension if not exists "uuid-ossp";

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  campus_id uuid references public.campuses(id) on delete cascade not null,
  expense_date date default current_date not null,
  category text not null default 'general',
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text default 'cash' check (payment_method in ('cash', 'transfer', 'pos', 'cheque', 'other')),
  recorded_by uuid references auth.users(id),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_expenses_campus on public.expenses(campus_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);

create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  campus_id uuid references public.campuses(id) on delete cascade not null,
  full_name text not null,
  role text,
  phone text,
  salary numeric(12,2) not null default 0 check (salary >= 0),
  status text default 'active' check (status in ('active', 'inactive')),
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_staff_campus on public.staff(campus_id);
create index if not exists idx_staff_status on public.staff(status);

alter table public.expenses enable row level security;
alter table public.staff enable row level security;

drop policy if exists "Authenticated full access expenses" on public.expenses;
create policy "Authenticated full access expenses" on public.expenses for all using (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access staff" on public.staff;
create policy "Authenticated full access staff" on public.staff for all using (auth.role() = 'authenticated');

-- >>> migration-teacher-daily-pay.sql
-- Daily teacher payments (Arepo / Ofada tutorial centres)
-- Run once in Supabase SQL Editor

create table if not exists public.teacher_payments (
  id uuid primary key default uuid_generate_v4(),
  campus_id uuid references public.campuses(id) on delete cascade not null,
  teacher_name text not null,
  period_taught text not null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text default 'cash' check (payment_method in ('cash', 'transfer', 'pos', 'other')),
  payment_date date not null default current_date,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_teacher_payments_campus on public.teacher_payments (campus_id);
create index if not exists idx_teacher_payments_date on public.teacher_payments (payment_date);

alter table public.teacher_payments enable row level security;

drop policy if exists "Authenticated full access teacher_payments" on public.teacher_payments;
create policy "Authenticated full access teacher_payments" on public.teacher_payments
  for all using (auth.role() = 'authenticated');

-- >>> migration-staff-loans.sql
-- Teacher / staff loans with monthly salary deduction
-- Run once in Supabase SQL Editor

create table if not exists public.staff_loans (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  principal numeric(12,2) not null check (principal > 0),
  monthly_deduction numeric(12,2) not null check (monthly_deduction > 0),
  amount_remaining numeric(12,2) not null check (amount_remaining >= 0),
  reason text default 'Loan',
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_staff_loans_staff on public.staff_loans(staff_id);
create index if not exists idx_staff_loans_status on public.staff_loans(status);

alter table public.staff_loans enable row level security;

drop policy if exists "Authenticated full access staff_loans" on public.staff_loans;
create policy "Authenticated full access staff_loans" on public.staff_loans
  for all using (auth.role() = 'authenticated');

-- >>> migration-exam-inventory.sql
-- =============================================
-- Exam field (Arepo/Ofada) + Inventory (Main)
-- Run once in Supabase SQL Editor
-- =============================================

-- Exam the student is preparing for (tutorial centres)
alter table public.students
  add column if not exists exam_preparing_for text;

-- Inventory items (textbooks, materials, etc.)
create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text default 'Textbook',
  quantity integer not null default 0 check (quantity >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  unit text default 'pcs',
  campus_id uuid references public.campuses(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_inventory_name on public.inventory_items (name);
create index if not exists idx_inventory_qty on public.inventory_items (quantity);

alter table public.inventory_items enable row level security;

drop policy if exists "Authenticated full access inventory" on public.inventory_items;
create policy "Authenticated full access inventory" on public.inventory_items
  for all using (auth.role() = 'authenticated');

-- >>> migration-exam-registration.sql
-- Required for Exam Register "Mark board registered" button
-- Run once in Supabase SQL Editor

alter table public.student_fees
  add column if not exists board_registered boolean not null default false;

alter table public.student_fees
  add column if not exists board_registered_at timestamptz;

create index if not exists idx_student_fees_board_registered
  on public.student_fees (board_registered);

-- >>> migration-exam-fee-types.sql

-- Ensure exam registration fee types exist (for Arepo / Ofada)
-- Run once in Supabase SQL Editor

insert into public.fee_types (name, description)
select v.name, v.description
from (values
  ('JAMB Registration', 'JAMB / UTME exam registration fee'),
  ('WAEC Registration', 'WAEC / SSCE exam registration fee'),
  ('NECO Registration', 'NECO exam registration fee'),
  ('GCE Registration', 'GCE exam registration fee'),
  ('SSCE Form', 'SSCE registration form fee'),
  ('Tuition (Monthly)', 'Tutorial centre monthly tuition')
) as v(name, description)
where not exists (
  select 1 from public.fee_types ft where lower(ft.name) = lower(v.name)
);

-- >>> migration-inventory-pricing-sales.sql
-- Inventory cost/selling price + sales log
-- Run once in Supabase SQL Editor

alter table public.inventory_items
  add column if not exists cost_price numeric(12,2) not null default 0 check (cost_price >= 0);

alter table public.inventory_items
  add column if not exists selling_price numeric(12,2) not null default 0 check (selling_price >= 0);

create table if not exists public.inventory_sales (
  id uuid primary key default uuid_generate_v4(),
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  unit_price numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  payment_method text default 'cash' check (payment_method in ('cash', 'transfer', 'pos', 'other')),
  student_id uuid references public.students(id) on delete set null,
  buyer_name text,
  campus_id uuid references public.campuses(id) on delete set null,
  notes text,
  sold_by uuid references auth.users(id),
  sale_date date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_sales_date on public.inventory_sales (sale_date);
create index if not exists idx_inventory_sales_item on public.inventory_sales (inventory_item_id);

alter table public.inventory_sales enable row level security;

drop policy if exists "Authenticated full access inventory_sales" on public.inventory_sales;
create policy "Authenticated full access inventory_sales" on public.inventory_sales
  for all using (auth.role() = 'authenticated');

-- >>> migration-private-lessons.sql
-- Private lessons (all campuses / admin + secretaries)
create table if not exists public.private_lessons (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id),
  parent_name text not null,
  parent_phone text,
  student_name text,
  amount_paid numeric(12,2) not null default 0,
  teacher_name text not null,
  teacher_amount numeric(12,2) not null default 0,
  lesson_date date not null default current_date,
  due_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_private_lessons_date on public.private_lessons(lesson_date);
create index if not exists idx_private_lessons_campus on public.private_lessons(campus_id);

alter table public.private_lessons enable row level security;

drop policy if exists "Authenticated full access private_lessons" on public.private_lessons;
create policy "Authenticated full access private_lessons"
  on public.private_lessons for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- >>> migration-private-lessons-teachers.sql
-- Multiple teachers per private lesson
alter table public.private_lessons
  add column if not exists teachers jsonb default '[]'::jsonb;

-- teacher_name / teacher_amount remain as summary (first teacher / total)
comment on column public.private_lessons.teachers is
  'Array of {name, amount} for each teacher on the lesson';

-- >>> migration-scholarships.sql
-- Scholarships granted by director
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  campus_id uuid references public.campuses(id),
  session text not null default '2025/2026',
  term text not null default 'First Term',
  coverage text not null default 'full'
    check (coverage in ('full', 'partial')),
  amount_covered numeric(12,2) default 0,
  reason text,
  status text not null default 'active'
    check (status in ('active', 'ended', 'cancelled')),
  granted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_scholarships_student on public.scholarships(student_id);
create index if not exists idx_scholarships_session on public.scholarships(session, term);
create index if not exists idx_scholarships_status on public.scholarships(status);

alter table public.scholarships enable row level security;

drop policy if exists "Authenticated full access scholarships" on public.scholarships;
create policy "Authenticated full access scholarships"
  on public.scholarships for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- >>> migration-scholarship-approvals.sql
-- Allow pending scholarships awaiting director approval
alter table public.scholarships
  drop constraint if exists scholarships_status_check;

alter table public.scholarships
  add constraint scholarships_status_check
  check (status in ('active', 'ended', 'cancelled', 'pending_approval'));

alter table public.scholarships
  add column if not exists prior_fees_paid numeric(12,2) default 0;

alter table public.scholarships
  add column if not exists approved_at timestamptz;

alter table public.scholarships
  add column if not exists approved_by uuid references auth.users(id);

-- Director notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_role text not null default 'admin',
  title text not null,
  body text,
  link text,
  related_scholarship_id uuid references public.scholarships(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_role on public.notifications(target_role, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Authenticated full access notifications" on public.notifications;
create policy "Authenticated full access notifications"
  on public.notifications for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- >>> migration-school-bus.sql
-- School bus module (Alpha Insight)
create table if not exists public.school_buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text,
  driver_name text,
  driver_phone text,
  route_name text,
  capacity int default 0,
  bus_fee numeric(12,2) default 0,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.student_bus_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  bus_id uuid not null references public.school_buses(id) on delete cascade,
  pickup_point text,
  status text not null default 'active'
    check (status in ('active', 'ended')),
  assigned_at date default current_date,
  notes text,
  created_at timestamptz default now(),
  unique (student_id, bus_id, status)
);

create index if not exists idx_bus_assignments_student
  on public.student_bus_assignments(student_id);
create index if not exists idx_bus_assignments_bus
  on public.student_bus_assignments(bus_id);

alter table public.school_buses enable row level security;
alter table public.student_bus_assignments enable row level security;

drop policy if exists "Authenticated full access school_buses" on public.school_buses;
create policy "Authenticated full access school_buses"
  on public.school_buses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access student_bus" on public.student_bus_assignments;
create policy "Authenticated full access student_bus"
  on public.student_bus_assignments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- >>> migration-ai-assistant.sql
-- Admin AI assistant daily usage tracking
create table if not exists public.ai_assistant_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  question_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, usage_date)
);

alter table public.ai_assistant_usage enable row level security;

drop policy if exists "Users manage own ai usage" on public.ai_assistant_usage;
create policy "Users manage own ai usage"
  on public.ai_assistant_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- >>> migration-student-department.sql

alter table public.students
  add column if not exists address text;

alter table public.students
  add column if not exists department text;

-- >>> migration-address-exam-deadline-fees.sql
-- Student address + exam board deadline + standard fee types
-- Run once in Supabase SQL Editor

alter table public.students
  add column if not exists address text;

alter table public.student_fees
  add column if not exists board_deadline date;

-- Ensure standard fee types exist
insert into public.fee_types (name, description)
select v.name, v.description
from (values
  ('WAEC', 'WAEC examination'),
  ('NECO', 'NECO examination'),
  ('GCE', 'GCE examination'),
  ('BECE', 'BECE examination'),
  ('Primary 6 Leaving Certificate', 'Primary 6 leaving certificate'),
  ('WAEC Result', 'WAEC result processing'),
  ('Testimonial', 'School testimonial'),
  ('School Fees', 'School fees'),
  ('Tuition (Monthly)', 'Monthly tutorial tuition'),
  ('JAMB', 'JAMB / UTME'),
  ('NECO GCE', 'NECO GCE'),
  ('WAEC GCE', 'WAEC GCE'),
  ('Uniform', 'School uniform')
) as v(name, description)
where not exists (
  select 1 from public.fee_types ft where lower(ft.name) = lower(v.name)
);

-- >>> migration-performance-indexes.sql
-- Run once in Supabase SQL Editor to speed up common queries
create index if not exists idx_students_full_name on public.students (full_name);
create index if not exists idx_students_admission on public.students (admission_number);
create index if not exists idx_students_parent_phone on public.students (parent_phone);
create index if not exists idx_students_status_campus on public.students (status, campus_id);
create index if not exists idx_profiles_id on public.profiles (id);

-- Authenticated access on core tables (if missing)
do $$ begin null; end $$;
