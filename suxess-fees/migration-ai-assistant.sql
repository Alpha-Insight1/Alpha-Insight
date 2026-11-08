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
