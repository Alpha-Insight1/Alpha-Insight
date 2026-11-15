-- ============================================================
-- Alpha Insight — FIX YOUR CURRENT DATABASE (run this now)
-- Supabase → SQL Editor → paste all → Run
-- Fixes: missing address column, Main campus, admin role, messages
-- ============================================================

-- 1) Student columns (fixes "address column" error)
alter table public.students add column if not exists address text;
alter table public.students add column if not exists department text;
alter table public.students add column if not exists exam_preparing_for text;
alter table public.students add column if not exists parent_email text;
alter table public.students add column if not exists parent_name text;
alter table public.students add column if not exists parent_phone text;

-- 2) One Main campus
insert into public.campuses (name, short_name, is_active)
select 'Main School', 'MAIN', true
where not exists (
  select 1 from public.campuses
  where short_name = 'MAIN' or lower(name) in ('main school', 'main')
);

-- 3) Profiles readable by logged-in users
alter table public.profiles enable row level security;
drop policy if exists "Authenticated full access profiles" on public.profiles;
create policy "Authenticated full access profiles"
  on public.profiles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 4) You as Director (change email if needed)
insert into public.profiles (id, full_name, role, campus_id)
select u.id, u.email, 'admin', null
from auth.users u
where lower(u.email) = lower('ayobamiayo234@gmail.com')
on conflict (id) do update
set role = 'admin', campus_id = null;

-- 5) Messages tables (if not already created)
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
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
drop policy if exists "auth all conversations" on public.conversations;
drop policy if exists "Authenticated full access conversations" on public.conversations;
create policy "Authenticated full access conversations"
  on public.conversations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated full access conversation_members" on public.conversation_members;
create policy "Authenticated full access conversation_members"
  on public.conversation_members for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated full access messages" on public.messages;
create policy "Authenticated full access messages"
  on public.messages for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 6) Students must allow insert
alter table public.students enable row level security;
drop policy if exists "Authenticated full access students" on public.students;
drop policy if exists "auth all students" on public.students;
create policy "Authenticated full access students"
  on public.students for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.campuses enable row level security;
drop policy if exists "Authenticated full access campuses" on public.campuses;
drop policy if exists "auth all campuses" on public.campuses;
create policy "Authenticated full access campuses"
  on public.campuses for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Done. Register a student again in the app.
select 'OK — run student registration again' as status;

-- 7) Fee type default prices (admin sets)
alter table public.fee_types add column if not exists default_amount numeric(12,2) default 0;
alter table public.fee_types add column if not exists is_active boolean default true;

-- 8) School bus tables
create table if not exists public.school_buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text,
  capacity int default 30,
  driver_name text,
  driver_phone text,
  route_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.student_bus_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade not null,
  bus_id uuid references public.school_buses(id) on delete cascade not null,
  pickup_point text,
  status text default 'active',
  assigned_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.school_buses enable row level security;
alter table public.student_bus_assignments enable row level security;
drop policy if exists "Authenticated full access school_buses" on public.school_buses;
create policy "Authenticated full access school_buses"
  on public.school_buses for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated full access bus_assignments" on public.student_bus_assignments;
create policy "Authenticated full access bus_assignments"
  on public.student_bus_assignments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.fee_types enable row level security;
drop policy if exists "Authenticated full access fee_types" on public.fee_types;
create policy "Authenticated full access fee_types"
  on public.fee_types for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
