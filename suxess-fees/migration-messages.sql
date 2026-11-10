-- In-app messages: director (admin) <-> secretaries
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_conversation_members_user on public.conversation_members(user_id);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Authenticated full access conversations" on public.conversations;
create policy "Authenticated full access conversations"
  on public.conversations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access conversation_members" on public.conversation_members;
create policy "Authenticated full access conversation_members"
  on public.conversation_members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated full access messages" on public.messages;
create policy "Authenticated full access messages"
  on public.messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
