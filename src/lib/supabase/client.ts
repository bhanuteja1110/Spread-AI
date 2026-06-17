import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * Creates a Supabase client for use in Client Components.
 * This utilizes the browser's context to automatically handle cookies.
 */
export const createClient = () => {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};
