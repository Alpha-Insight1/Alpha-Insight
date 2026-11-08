-- ============================================================
-- RUN THIS ENTIRE SCRIPT in Supabase SQL Editor (once)
-- Fixes: still showing Secretary while profiles.role = admin
-- ============================================================

-- 1) Open profiles for logged-in users (stops silent "no row" → secretary)
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_all_admin" on public.profiles;
drop policy if exists "Authenticated full access profiles" on public.profiles;

create policy "Authenticated full access profiles"
  on public.profiles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2) Ensure EVERY auth user has a profile row with correct id
insert into public.profiles (id, full_name, role, campus_id)
select
  u.id,
  coalesce(u.email, 'User'),
  'secretary',
  null
from auth.users u
on conflict (id) do nothing;

-- 3) Make this email DIRECTOR (admin)
update public.profiles
set
  role = 'admin',
  campus_id = null,
  full_name = coalesce(full_name, 'Director')
where id = (
  select id from auth.users
  where lower(email) = lower('ayobamiayo234@gmail.com')
);

-- 4) Verify (you should see role = admin and id matching auth.users)
select
  u.id as auth_id,
  u.email,
  p.id as profile_id,
  p.role,
  p.campus_id,
  (u.id = p.id) as ids_match
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('ayobamiayo234@gmail.com');
