import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env';

/**
 * NVIDIA NIM-compatible OpenAI client via Vercel AI SDK.
 * Server-only: env.NVIDIA_API_KEY is never exposed to the client bundle.
 */
export const nvidiaClient = createOpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: env.NVIDIA_API_KEY,
});

/**
 * Model constants — single source of truth.
 * "Spread Creative" maps to the ultra 550B reasoning model.
 * Vision model activates automatically when image attachments are detected.
 */
export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b' as const;
export const DEFAULT_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct' as const;

export type NvidiaModel = typeof DEFAULT_NVIDIA_MODEL | typeof DEFAULT_VISION_MODEL;
