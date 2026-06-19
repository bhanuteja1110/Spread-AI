import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This route reads/writes auth cookies via next/headers, so it MUST be
// dynamic. Without this, Next.js would try to prerender the page and
// the cookie writes would silently no-op.
export const dynamic = 'force-dynamic';

/**
 * OAuth callback handler.
 *
 * Google OAuth (and any other OAuth provider) redirects the user here with
 * `?code=…` after they authenticate. We exchange the code for a session,
 * which writes the Supabase auth cookies to the response. The next page
 * load (after our `NextResponse.redirect`) will pass through the middleware
 * with valid cookies, so the user lands authenticated.
 *
 * The default `next` redirect is `/dashboard`. The user may also pass
 * `?next=/path` to redirect elsewhere (URL-encoded).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Open-redirect guard: only allow same-origin relative paths
  if (!next.startsWith('/') || next.startsWith('//')) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing+authorization+code`);
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  } catch (err) {
    console.error('[auth/callback] unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`);
  }
}
