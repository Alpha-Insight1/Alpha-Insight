-- Run if school bus assign fails or fee prices won't save
alter table public.fee_types add column if not exists default_amount numeric(12,2) default 0;
alter table public.fee_types add column if not exists is_active boolean default true;

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
alter table public.fee_types enable row level security;

drop policy if exists "Authenticated full access school_buses" on public.school_buses;
create policy "Authenticated full access school_buses" on public.school_buses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access bus_assignments" on public.student_bus_assignments;
create policy "Authenticated full access bus_assignments" on public.student_bus_assignments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access fee_types" on public.fee_types;
create policy "Authenticated full access fee_types" on public.fee_types
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
