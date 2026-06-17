import { z } from 'zod';

/**
 * Typed, validated environment configuration.
 * Throws at startup if any required variable is missing — fail fast, fail loudly.
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Supabase (public — safe to expose to client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Supabase Service Role (server-only — NEVER expose to client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // NVIDIA AI (server-only — NEVER expose to client)
  NVIDIA_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  });

  if (!parsed.success) {
    // Throw a descriptive message listing exactly which variables are broken
    const errors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${missing}`);
  }

  return parsed.data;
};

export const env = parseEnv();
