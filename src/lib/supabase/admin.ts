import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Supabase Admin Client.
 * 
 * IMPORTANT: This client bypasses RLS (Row Level Security).
 * Never expose this client to the browser.
 * Only use this in secure server environments (e.g., Background Jobs, Webhooks)
 * where you explicitly need system-level access.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
