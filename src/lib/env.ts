import { z } from 'zod';

/**
 * Typed, validated environment configuration.
 *
 * IMPORTANT: env is a lazy getter — it is only validated when first accessed
 * at runtime, NOT at build time.
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

let _env: Env | undefined;

const parseEnv = (): Env => {
  if (_env) return _env;

  const isServer = typeof window === 'undefined';

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Next.js completely removes non-NEXT_PUBLIC variables from the browser bundle.
    // To prevent Zod from crashing the client app because NVIDIA_API_KEY is missing,
    // we provide dummy values when running in the browser. They will never be used anyway.
    SUPABASE_SERVICE_ROLE_KEY: isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : 'client-side-dummy',
    NVIDIA_API_KEY: isServer ? process.env.NVIDIA_API_KEY : 'client-side-dummy',
  });

  if (!parsed.success) {
    // Throw a descriptive message listing exactly which variables are broken
    const errors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${missing}`);
  }

  _env = parsed.data;
  return _env;
};

/**
 * Lazy env accessor — validated on first access at request time, not build time.
 * This allows Vercel to collect static page data without env vars being present.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return parseEnv()[prop as keyof Env];
  },
});
