-- 0003_usage_tracking.sql

CREATE TABLE public.daily_usage_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    message_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Optimize analytics queries scaling to millions of records
CREATE INDEX idx_daily_usage_stats_user_id ON public.daily_usage_stats(user_id);
CREATE INDEX idx_daily_usage_stats_date ON public.daily_usage_stats(date);

-- Atomic RPC for absolute race-condition prevention
CREATE OR REPLACE FUNCTION public.increment_user_usage(p_user_id uuid, p_max_limit integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count integer;
    v_today date := CURRENT_DATE;
BEGIN
    -- Atomically insert or update the daily usage row for this specific user/date
    INSERT INTO public.daily_usage_stats (user_id, date, message_count)
    VALUES (p_user_id, v_today, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        message_count = daily_usage_stats.message_count + 1,
        updated_at = now()
    RETURNING message_count INTO v_current_count;

    -- Evaluate Quota internally inside Postgres to avoid Next.js race conditions
    IF v_current_count > p_max_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'current_count', v_current_count,
            'limit', p_max_limit
        );
    END IF;

    RETURN json_build_object(
        'allowed', true,
        'current_count', v_current_count,
        'limit', p_max_limit
    );
END;
$$;
