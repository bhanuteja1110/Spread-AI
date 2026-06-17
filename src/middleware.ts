import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
    }
  );

  // Touching the user to reliably check session state
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  
  const isAuthRoute = url.pathname.startsWith('/login') || 
                      url.pathname.startsWith('/signup') || 
                      url.pathname.startsWith('/forgot-password');
                      
  const isProtectedRoute = url.pathname.startsWith('/dashboard') || 
                           url.pathname.startsWith('/settings');

  // Guard: Authenticated users should not see auth pages
  if (isAuthRoute && user) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Guard: Unauthenticated users should not see protected pages
  if (isProtectedRoute && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Apply default session update to seamlessly refresh tokens
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any static assets (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
