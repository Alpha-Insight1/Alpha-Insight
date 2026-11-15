-- ============================================================
-- Alpha Insight — FULL SCHEMA (new empty Supabase project only)
-- Run once in SQL Editor, entire file
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  address text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  admission_number text unique not null,
  full_name text not null,
  class_name text not null default '—',
  campus_id uuid references public.campuses(id),
  parent_name text,
  parent_phone text,
  parent_email text,
  address text,
  department text,
  exam_preparing_for text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fee_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  fee_type_id uuid references public.fee_types(id) not null,
  session text not null default '',
  term text not null default '',
  amount numeric(12,2) not null,
  amount_paid numeric(12,2) default 0,
  balance numeric(12,2) generated always as (amount - amount_paid) stored,
  due_date date,
  valid_until date,
  board_deadline date,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  student_fee_id uuid references public.student_fees(id),
  amount numeric(12,2) not null,
  payment_method text default 'cash',
  payment_date date default current_date,
  receipt_number text unique,
  notes text,
  recorded_by uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'secretary' check (role in ('admin', 'secretary')),
  campus_id uuid references public.campuses(id),
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id),
  category text,
  description text,
  amount numeric(12,2) not null,
  expense_date date default current_date,
  payment_method text default 'cash',
  recorded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id),
  full_name text not null,
  role text,
  salary numeric(12,2) default 0,
  phone text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.teacher_daily_pay (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id),
  teacher_name text not null,
  amount numeric(12,2) not null,
  pay_date date default current_date,
  period_taught text,
  payment_method text default 'cash',
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.ai_assistant_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day date not null default current_date,
  question_count int default 0,
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_students_campus on public.students(campus_id);
create index if not exists idx_students_name on public.students(full_name);
create index if not exists idx_payments_date on public.payments(payment_date);
create index if not exists idx_payments_student on public.payments(student_id);

-- RLS open for authenticated (simple school app)
alter table public.campuses enable row level security;
alter table public.students enable row level security;
alter table public.fee_types enable row level security;
alter table public.student_fees enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.staff enable row level security;
alter table public.teacher_daily_pay enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

do $$ begin
  execute 'create policy "auth all campuses" on public.campuses for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all students" on public.students for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all fee_types" on public.fee_types for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all student_fees" on public.student_fees for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all payments" on public.payments for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all profiles" on public.profiles for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all expenses" on public.expenses for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all staff" on public.staff for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all teacher_pay" on public.teacher_daily_pay for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all conversations" on public.conversations for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all conv_members" on public.conversation_members for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'create policy "auth all messages" on public.messages for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')';
exception when duplicate_object then null; end $$;

-- Seed Main campus + fee types
insert into public.campuses (name, short_name, is_active)
select 'Main School', 'MAIN', true
where not exists (select 1 from public.campuses where short_name = 'MAIN');

insert into public.fee_types (name, description)
select v.name, v.description from (values
  ('School Fees', 'Term school fees'),
  ('Tuition (Monthly)', 'Monthly tuition'),
  ('Uniform', 'School uniform'),
  ('WAEC', 'WAEC'),
  ('NECO', 'NECO'),
  ('JAMB', 'JAMB / UTME'),
  ('Testimonial', 'Testimonial')
) as v(name, description)
where not exists (select 1 from public.fee_types ft where lower(ft.name) = lower(v.name));
