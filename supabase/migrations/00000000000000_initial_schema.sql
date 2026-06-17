-- ==========================================
-- 1. Tables Definition
-- ==========================================

create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default 'New Conversation',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create type message_role as enum ('user', 'assistant', 'system');

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role message_role not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. Indexes for Performance
-- ==========================================

create index idx_conversations_user_id on public.conversations(user_id);
create index idx_conversations_created_at on public.conversations(created_at desc);
create index idx_conversations_updated_at on public.conversations(updated_at desc);

create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_user_id on public.messages(user_id);
create index idx_messages_created_at on public.messages(created_at desc);

-- ==========================================
-- 3. Row Level Security (RLS)
-- ==========================================

alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Users RLS
create policy "Users can view own profile" on public.users for select using ( auth.uid() = id );
create policy "Users can update own profile" on public.users for update using ( auth.uid() = id );

-- Conversations RLS
create policy "Users can view own conversations" on public.conversations for select using ( auth.uid() = user_id );
create policy "Users can insert own conversations" on public.conversations for insert with check ( auth.uid() = user_id );
create policy "Users can update own conversations" on public.conversations for update using ( auth.uid() = user_id );
create policy "Users can delete own conversations" on public.conversations for delete using ( auth.uid() = user_id );

-- Messages RLS
create policy "Users can view own messages" on public.messages for select using ( auth.uid() = user_id );
create policy "Users can insert own messages" on public.messages for insert with check ( auth.uid() = user_id );

-- ==========================================
-- 4. Storage Policies
-- ==========================================

insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false) on conflict do nothing;

create policy "Users can upload their own attachments" 
  on storage.objects for insert 
  with check ( bucket_id = 'attachments' and auth.uid() = owner );

create policy "Users can view their own attachments" 
  on storage.objects for select 
  using ( bucket_id = 'attachments' and auth.uid() = owner );

create policy "Users can delete their own attachments" 
  on storage.objects for delete 
  using ( bucket_id = 'attachments' and auth.uid() = owner );

-- ==========================================
-- 5. Functions & Triggers
-- ==========================================

-- Trigger to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Trigger for new auth user sync
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 6. RPC Functions
-- ==========================================

-- Function to safely delete a conversation and all its messages
create or replace function public.delete_conversation(target_id uuid)
returns void as $$
begin
  -- RLS will enforce the user can only delete if auth.uid() matches
  delete from public.conversations where id = target_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;
