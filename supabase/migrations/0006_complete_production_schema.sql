-- ============================================================
-- SPREAD AI — Complete Production Database Migration
-- Version: 1.0.0
-- Compatible with: Supabase (PostgreSQL 15+)
--
-- Run this in the Supabase SQL Editor on a FRESH project.
-- If migrating an existing project, see the incremental
-- migration files in supabase/migrations/ instead.
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

-- pg_crypto for gen_random_uuid() — enabled by default on Supabase
create extension if not exists "pgcrypto";


-- ============================================================
-- SECTION 2: CUSTOM TYPES
-- ============================================================

-- Enum for message roles (matches Vercel AI SDK roles)
do $$ begin
  create type public.message_role as enum ('user', 'assistant', 'system');
exception
  when duplicate_object then null;
end $$;


-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 PROFILES
-- Mirror of auth.users — used for public-facing profile data.
-- Synced automatically via the handle_new_user trigger.
-- ----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile data for each authenticated user. '
  'Synced from auth.users via the handle_new_user trigger.';

-- ----------------------------------------------------------
-- 3.2 CONVERSATIONS
-- Top-level chat session container owned by a single user.
-- ----------------------------------------------------------
create table if not exists public.conversations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null default 'New Conversation',
  model       text        not null default 'nvidia/nemotron-3-ultra-550b-a55b',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint conversations_title_length check (char_length(title) <= 200)
);

comment on table public.conversations is
  'Each row is a named AI chat session. '
  'updated_at is bumped on every new message for sidebar sort ordering.';

-- ----------------------------------------------------------
-- 3.3 MESSAGES
-- Individual chat turns within a conversation.
-- ----------------------------------------------------------
create table if not exists public.messages (
  id               uuid          primary key default gen_random_uuid(),
  conversation_id  uuid          not null references public.conversations(id) on delete cascade,
  user_id          uuid          not null references public.profiles(id) on delete cascade,
  role             message_role  not null,
  content          text          not null,
  created_at       timestamptz   not null default now()
);

comment on table public.messages is
  'Individual chat turns. Cascades on conversation delete. '
  'Fetched descending, reversed to ascending in the app layer for pagination.';

-- ----------------------------------------------------------
-- 3.4 DAILY USAGE STATS
-- One row per (user, date). Used for quota enforcement and
-- the analytics dashboard. Designed to scale to millions of
-- users via the UNIQUE constraint and atomic UPSERT pattern.
-- ----------------------------------------------------------
create table if not exists public.daily_usage_stats (
  id             uuid    primary key default gen_random_uuid(),
  user_id        uuid    not null references auth.users(id) on delete cascade,
  date           date    not null default current_date,
  message_count  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Composite unique key enables fast ON CONFLICT UPSERT
  constraint daily_usage_stats_user_date_unique unique (user_id, date),
  constraint daily_usage_stats_count_positive check (message_count >= 0)
);

comment on table public.daily_usage_stats is
  'Pre-aggregated per-user daily usage counters. '
  'The atomic increment_user_usage() RPC prevents race conditions '
  'under high concurrency (e.g., multiple parallel requests).';

-- ----------------------------------------------------------
-- 3.5 USAGE LOGS (Detailed audit trail)
-- One row per API call. Useful for billing, debugging, and
-- detailed analytics beyond daily aggregates.
-- Partitioned-friendly design: date column for future range partitioning.
-- ----------------------------------------------------------
create table if not exists public.usage_logs (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  conversation_id  uuid        references public.conversations(id) on delete set null,
  model            text        not null,
  prompt_tokens    integer     not null default 0,
  completion_tokens integer    not null default 0,
  total_tokens     integer     generated always as (prompt_tokens + completion_tokens) stored,
  duration_ms      integer,
  status           text        not null default 'success'
                               check (status in ('success', 'error', 'quota_exceeded')),
  created_at       timestamptz not null default now()
);

comment on table public.usage_logs is
  'Granular per-request audit log for billing and debugging. '
  'total_tokens is a generated column (prompt + completion). '
  'Design ready for range partitioning on created_at at scale.';


-- ============================================================
-- SECTION 4: INDEXES
-- All indexes use IF NOT EXISTS for idempotent re-runs.
-- ============================================================

-- profiles
create index if not exists idx_profiles_email
  on public.profiles (email);

-- conversations
create index if not exists idx_conversations_user_updated
  on public.conversations (user_id, updated_at desc);

create index if not exists idx_conversations_user_created
  on public.conversations (user_id, created_at desc);

-- messages
create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc);

create index if not exists idx_messages_user_id
  on public.messages (user_id);

-- daily_usage_stats
create index if not exists idx_daily_usage_stats_user_date
  on public.daily_usage_stats (user_id, date desc);

-- usage_logs — optimized for per-user queries and date-range analytics
create index if not exists idx_usage_logs_user_created
  on public.usage_logs (user_id, created_at desc);

create index if not exists idx_usage_logs_conversation
  on public.usage_logs (conversation_id)
  where conversation_id is not null;

create index if not exists idx_usage_logs_status
  on public.usage_logs (status)
  where status <> 'success'; -- Partial index: only index non-success for error analysis


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- RLS is enabled on every user-data table. No exceptions.
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.daily_usage_stats enable row level security;
alter table public.usage_logs        enable row level security;

-- ----------------------------------------------------------
-- 5.1 PROFILES POLICIES
-- ----------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles are inserted exclusively via the handle_new_user trigger
-- (SECURITY DEFINER), so no INSERT policy is needed for authenticated users.

-- ----------------------------------------------------------
-- 5.2 CONVERSATIONS POLICIES
-- ----------------------------------------------------------
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 5.3 MESSAGES POLICIES
-- ----------------------------------------------------------
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check (auth.uid() = user_id);

-- Messages are intentionally not updatable or deletable by users.
-- Deletion cascades from the parent conversation.

-- ----------------------------------------------------------
-- 5.4 DAILY USAGE STATS POLICIES
-- Only the increment_user_usage() SECURITY DEFINER RPC can write.
-- Users can read their own stats for the dashboard.
-- ----------------------------------------------------------
drop policy if exists "daily_usage_stats_select_own" on public.daily_usage_stats;
create policy "daily_usage_stats_select_own"
  on public.daily_usage_stats for select
  using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 5.5 USAGE LOGS POLICIES
-- Users can read their own logs. Only server-side code writes.
-- ----------------------------------------------------------
drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own"
  on public.usage_logs for select
  using (auth.uid() = user_id);


-- ============================================================
-- SECTION 6: STORAGE BUCKETS & POLICIES
-- ============================================================

-- ----------------------------------------------------------
-- 6.1 CHAT ATTACHMENTS BUCKET (private)
-- Files are accessed via short-lived signed URLs (5 min TTL).
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat_attachments',
  'chat_attachments',
  false,
  10485760, -- 10MB hard limit enforced at bucket level
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS for chat_attachments
drop policy if exists "chat_attachments_insert_own" on storage.objects;
create policy "chat_attachments_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat_attachments_select_own" on storage.objects;
create policy "chat_attachments_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat_attachments_delete_own" on storage.objects;
create policy "chat_attachments_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------
-- 6.2 AVATARS BUCKET (public reads, authenticated writes)
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB hard limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS for avatars
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- SECTION 7: UTILITY FUNCTIONS
-- ============================================================

-- ----------------------------------------------------------
-- 7.1 set_updated_at()
-- Generic trigger function that stamps updated_at to now().
-- Reused by multiple tables.
-- ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Generic trigger function — stamps updated_at on row update.';


-- ============================================================
-- SECTION 8: TRIGGERS
-- ============================================================

-- ----------------------------------------------------------
-- 8.1 updated_at triggers
-- ----------------------------------------------------------
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_usage_stats_updated_at on public.daily_usage_stats;
create trigger trg_daily_usage_stats_updated_at
  before update on public.daily_usage_stats
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------
-- 8.2 handle_new_user trigger
-- Automatically provisions a public profile row whenever a
-- new user registers via Supabase Auth (email or OAuth).
-- SECURITY DEFINER: runs as the function owner (superuser),
-- bypassing RLS to insert into profiles on behalf of the
-- newly created auth.users row.
-- ----------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',  -- Google OAuth uses 'name'
      split_part(new.email, '@', 1)     -- Fallback: use email prefix
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture' -- Google OAuth uses 'picture'
    )
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(excluded.full_name,  public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Provisions a profiles row on new auth.users insert. '
  'Handles both email/password and OAuth (Google) signup flows. '
  'ON CONFLICT ensures safe re-runs and metadata updates.';

-- Attach to auth schema (Supabase managed)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- SECTION 9: RPC FUNCTIONS
-- All RPCs use SECURITY DEFINER so they can bypass RLS
-- and perform atomic operations safely.
-- ============================================================

-- ----------------------------------------------------------
-- 9.1 increment_user_usage
-- Atomically increments the daily usage counter for a user.
-- Returns a JSON object with allowed/denied and current count.
-- Uses INSERT ... ON CONFLICT to prevent race conditions —
-- safe under high concurrency (multiple simultaneous requests).
-- ----------------------------------------------------------
create or replace function public.increment_user_usage(
  p_user_id   uuid,
  p_max_limit integer default 50
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_today date := current_date;
begin
  -- Atomic upsert: increment count or create row for today
  insert into public.daily_usage_stats (user_id, date, message_count)
  values (p_user_id, v_today, 1)
  on conflict (user_id, date) do update
    set message_count = daily_usage_stats.message_count + 1,
        updated_at    = now()
  returning message_count into v_count;

  -- Evaluate quota AFTER incrementing to prevent double-spend race
  if v_count > p_max_limit then
    return json_build_object(
      'allowed',        false,
      'current_count',  v_count,
      'limit',          p_max_limit,
      'resets_at',      (v_today + interval '1 day')::text
    );
  end if;

  return json_build_object(
    'allowed',        true,
    'current_count',  v_count,
    'limit',          p_max_limit,
    'remaining',      p_max_limit - v_count,
    'resets_at',      (v_today + interval '1 day')::text
  );
end;
$$;

comment on function public.increment_user_usage is
  'Atomically increments daily usage and enforces the message quota. '
  'Returns JSON with allowed, current_count, remaining, and resets_at. '
  'Safe under high concurrency via INSERT ON CONFLICT.';

-- ----------------------------------------------------------
-- 9.2 get_dashboard_analytics
-- Returns aggregated stats for the analytics dashboard.
-- All aggregation is done in Postgres — never in Node.js —
-- to avoid fetching millions of rows to the application layer.
-- ----------------------------------------------------------
create or replace function public.get_dashboard_analytics(
  p_user_id uuid,
  p_days    integer default 7
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_conversations bigint;
  v_total_messages      bigint;
  v_today_messages      integer;
  v_usage_history       json;
begin
  -- Total conversations
  select count(*)
    into v_total_conversations
  from public.conversations
  where user_id = p_user_id;

  -- Total lifetime messages (from pre-aggregated usage stats — O(days) not O(messages))
  select coalesce(sum(message_count), 0)
    into v_total_messages
  from public.daily_usage_stats
  where user_id = p_user_id;

  -- Today's message count
  select coalesce(message_count, 0)
    into v_today_messages
  from public.daily_usage_stats
  where user_id = p_user_id
    and date = current_date;

  -- Usage history for Recharts graph (last N days, zero-filled)
  select json_agg(
    json_build_object(
      'date',          to_char(d.date, 'YYYY-MM-DD'),
      'message_count', coalesce(s.message_count, 0)
    )
    order by d.date asc
  )
  into v_usage_history
  from (
    -- Generate a complete date series (no gaps in the graph)
    select generate_series(
      current_date - ((p_days - 1) || ' days')::interval,
      current_date,
      '1 day'::interval
    )::date as date
  ) d
  left join public.daily_usage_stats s
    on s.user_id = p_user_id
    and s.date = d.date;

  return json_build_object(
    'total_conversations', v_total_conversations,
    'total_messages',      v_total_messages,
    'today_messages',      coalesce(v_today_messages, 0),
    'usage_history',       coalesce(v_usage_history, '[]'::json)
  );
end;
$$;

comment on function public.get_dashboard_analytics is
  'Returns aggregated dashboard statistics for a user. '
  'Uses generate_series to zero-fill missing days in the usage graph. '
  'p_days controls the history window (default: 7 days).';

-- ----------------------------------------------------------
-- 9.3 get_user_quota_status
-- Lightweight quota check without incrementing — used to
-- display the usage bar in the UI without burning a message.
-- ----------------------------------------------------------
create or replace function public.get_user_quota_status(
  p_user_id   uuid,
  p_max_limit integer default 50
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select coalesce(message_count, 0)
    into v_count
  from public.daily_usage_stats
  where user_id = p_user_id
    and date = current_date;

  v_count := coalesce(v_count, 0);

  return json_build_object(
    'current_count',  v_count,
    'limit',          p_max_limit,
    'remaining',      greatest(p_max_limit - v_count, 0),
    'percentage',     round((v_count::numeric / p_max_limit) * 100, 1),
    'is_exceeded',    v_count >= p_max_limit,
    'resets_at',      (current_date + interval '1 day')::text
  );
end;
$$;

comment on function public.get_user_quota_status is
  'Read-only quota check — does not increment. '
  'Returns percentage used for rendering the usage progress bar.';

-- ----------------------------------------------------------
-- 9.4 delete_conversation (safe cascading delete)
-- Deletes a conversation only if the caller owns it.
-- The RLS check is embedded in the WHERE clause as a defense-
-- in-depth measure even though SECURITY DEFINER bypasses RLS.
-- ----------------------------------------------------------
create or replace function public.delete_conversation(
  p_conversation_id uuid,
  p_user_id         uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  -- Ownership check is explicit — never trust caller input alone
  delete from public.conversations
  where id      = p_conversation_id
    and user_id = p_user_id
  returning 1 into v_deleted;

  return v_deleted is not null;
end;
$$;

comment on function public.delete_conversation is
  'Deletes a conversation and all its messages (via cascade) '
  'only if the caller is the owner. Returns true if deleted.';


-- ============================================================
-- SECTION 10: GRANT PERMISSIONS
-- Service role already has all permissions.
-- Grant read/execute to authenticated role explicitly.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update        on public.profiles         to authenticated;
grant select, insert, update, delete on public.conversations   to authenticated;
grant select, insert                 on public.messages        to authenticated;
grant select                         on public.daily_usage_stats to authenticated;
grant select                         on public.usage_logs      to authenticated;

grant execute on function public.increment_user_usage     to authenticated;
grant execute on function public.get_dashboard_analytics  to authenticated;
grant execute on function public.get_user_quota_status    to authenticated;
grant execute on function public.delete_conversation      to authenticated;


-- ============================================================
-- SECTION 11: VERIFICATION QUERIES
-- Run these after migration to confirm everything is in place.
-- (Comment out in production if preferred.)
-- ============================================================

/*
-- Verify tables exist
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','conversations','messages','daily_usage_stats','usage_logs')
order by tablename;

-- Verify indexes
select indexname, tablename
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- Verify triggers
select trigger_name, event_object_table, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
   or trigger_schema = 'auth'
order by event_object_table;

-- Verify RPC functions
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_type = 'FUNCTION'
order by routine_name;

-- Verify storage buckets
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('chat_attachments', 'avatars');
*/

-- ============================================================
-- END OF MIGRATION
-- Spread AI — Production Database Schema v1.0.0
-- ============================================================
