import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const fileSchema = z.object({
  file: z
    .instanceof(File, { message: 'A valid file is required.' })
    .refine((f) => f.size <= MAX_FILE_SIZE, {
      message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    })
    .refine((f) => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type), {
      message: `Unsupported file type. Allowed: PDF, DOCX, TXT, JPEG, PNG, GIF, WebP.`,
    }),
});
