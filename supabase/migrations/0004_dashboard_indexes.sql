-- 0004_dashboard_indexes.sql

-- Add performance indexes for scalable analytics queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
ON public.conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages (conversation_id);

-- Analytics RPC for the Dashboard (Reduces massive row fetching to a single fast database aggregation)
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_conversations bigint;
    v_total_messages bigint;
    v_usage_history json;
BEGIN
    -- 1. Fast aggregation of total conversations
    SELECT count(*) INTO v_total_conversations
    FROM public.conversations
    WHERE user_id = p_user_id;

    -- 2. Fast aggregation of total messages (summing up the pre-sharded usage stats)
    SELECT COALESCE(SUM(message_count), 0) INTO v_total_messages
    FROM public.daily_usage_stats
    WHERE user_id = p_user_id;

    -- 3. Retrieve the past 7 days of usage for the Recharts graph
    SELECT json_agg(t) INTO v_usage_history
    FROM (
        SELECT date, message_count
        FROM public.daily_usage_stats
        WHERE user_id = p_user_id
          AND date >= CURRENT_DATE - INTERVAL '6 days'
        ORDER BY date ASC
    ) t;

    RETURN json_build_object(
        'total_conversations', v_total_conversations,
        'total_messages', v_total_messages,
        'usage_history', COALESCE(v_usage_history, '[]'::json)
    );
END;
$$;
