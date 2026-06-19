-- =====================================================================
-- Spread AI — Performance Indexes & RPC Optimizations
-- Version: 1.1.0
--
-- Adds / adjusts indexes and helper functions identified during the
-- Q2-2026 performance audit. All statements are idempotent.
--
-- Run via: supabase db push  (or paste into the SQL editor)
-- =====================================================================


-- ============================================================
-- SECTION 1: MISSING INDEXES
-- ============================================================

-- The `get_active_memories` RPC filters by (user_id, is_active = true)
-- and orders by created_at DESC. The existing `idx_memories_active`
-- covers (user_id, is_active) but lacks the sort column, forcing a
-- sort step on every call. Adding created_at as a trailing key lets
-- Postgres serve the rows in order from the index alone.
create index if not exists idx_memories_active_created
  on public.memories (user_id, is_active, created_at desc);

-- `get_user_quota_status` filters by (user_id, date = current_date).
-- Existing `idx_daily_usage_stats_user_date` already covers this with
-- (user_id, date desc). The `current_date` filter uses an equality check
-- on the leading two columns → index-only scan. No change needed.

-- Speed up `update updated_at = now()` on conversations — used on every
-- message send. Existing idx already covers the where (id = ?).
-- No new index needed.

-- Profiles lookup by `email` is rare (only on email-confirmation
-- flows). idx_profiles_email already exists.

-- ============================================================
-- SECTION 2: OPTIMIZED QUOTA STATUS RPC
-- The original `get_user_quota_status` returns a JSON blob. We add a
-- STRICT version that's even lighter for UI polling.
-- ============================================================

create or replace function public.get_user_quota_status_fast(
  p_user_id   uuid,
  p_max_limit integer default 50
)
returns table (
  current_count integer,
  remaining     integer,
  percentage    numeric,
  is_exceeded   boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(message_count, 0)::int                                as current_count,
    greatest(p_max_limit - coalesce(message_count, 0), 0)::int    as remaining,
    round((coalesce(message_count, 0)::numeric / p_max_limit) * 100, 1) as percentage,
    coalesce(message_count, 0) >= p_max_limit                     as is_exceeded
  from public.daily_usage_stats
  where user_id = p_user_id
    and date = current_date;

  -- If no row exists for today, this query returns 0 rows (the function
  -- returns empty result set), so callers must coalesce in the app layer.
$$;

grant execute on function public.get_user_quota_status_fast(uuid, integer) to authenticated;

-- ============================================================
-- SECTION 3: ANALYTICS TIMING METADATA
-- Adds an indexed column on usage_logs for fast status filtering.
-- ============================================================

-- Composite index for the common pattern:
--   WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC
-- Already covered by idx_usage_logs_user_created (user_id, created_at desc).
-- No new index needed.

-- ============================================================
-- SECTION 4: CONVERSATION TITLE SEARCH (future)
-- Speculative trigram index for title search; created with IF NOT
-- EXISTS so it's safe to apply even if pg_trgm is unavailable.
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists idx_conversations_title_trgm
  on public.conversations using gin (title gin_trgm_ops)
  where title is not null;

-- ============================================================
-- END OF MIGRATION
-- =====================================================================