-- =====================================================================
-- Spread AI — User Memory System
-- Persists long-term user facts the AI can recall across all chats.
-- =====================================================================

create table if not exists public.memories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  content      text not null,
  category     text not null default 'fact',
  source_message text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_memories_user_id on public.memories(user_id);
create index if not exists idx_memories_active  on public.memories(user_id, is_active);

-- Reuse the existing updated_at trigger if present, otherwise create one.
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_memories'
  ) then
    create trigger set_updated_at_memories
      before update on public.memories
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.memories enable row level security;

drop policy if exists "Users can view own memories"   on public.memories;
drop policy if exists "Users can insert own memories" on public.memories;
drop policy if exists "Users can update own memories" on public.memories;
drop policy if exists "Users can delete own memories" on public.memories;

create policy "Users can view own memories"
  on public.memories for select
  using (auth.uid() = user_id);

create policy "Users can insert own memories"
  on public.memories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own memories"
  on public.memories for update
  using (auth.uid() = user_id);

create policy "Users can delete own memories"
  on public.memories for delete
  using (auth.uid() = user_id);

-- Convenience RPC: fetch the active memory block for a user as one round-trip.
create or replace function public.get_active_memories(p_user_id uuid)
returns table (
  id uuid,
  content text,
  category text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, content, category, created_at
  from public.memories
  where user_id = p_user_id and is_active = true
  order by created_at desc
  limit 100;
$$;

revoke all on function public.get_active_memories(uuid) from public;
grant execute on function public.get_active_memories(uuid) to authenticated;
