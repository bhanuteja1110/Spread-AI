'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'

// Server-action timing. Server actions are batched and serialized by
// Next.js, so logging here is cheap and a single point of truth.
function tag(label: string, start: number, extra?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[auth-action] ${label}`, {
    dur: `${(performance.now() - start).toFixed(1)}ms`,
    ...extra,
  });
}

export async function signInWithEmail(formData: FormData) {
  const t0 = performance.now();
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    tag('signInWithEmail.error', t0, { err: error.message });
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return {
        error: 'Please confirm your email address before signing in. Check your inbox for a verification link.',
      }
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Incorrect email or password. Please try again.' }
    }
    return { error: error.message }
  }

  tag('signInWithEmail.ok', t0);
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUpWithEmail(formData: FormData) {
  const t0 = performance.now();
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password || !fullName) {
    return { error: 'All fields are required' }
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    tag('signUpWithEmail.error', t0, { err: error.message });
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists. Try signing in instead.' }
    }
    return { error: error.message }
  }

  if (data?.user && !data.session) {
    tag('signUpWithEmail.needsConfirm', t0);
    return {
      success: true,
      requiresConfirmation: true,
      message: 'Account created! Please check your email and click the confirmation link to activate your account.',
    }
  }

  tag('signUpWithEmail.ok', t0);
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=%2Fsettings`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password reset link sent to your email.' }
}

export async function signInWithGoogle() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
