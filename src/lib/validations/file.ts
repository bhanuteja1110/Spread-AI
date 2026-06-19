import { z } from 'zod';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'markdown', 'jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE / 1024 / 1024}MB`;

export const fileSchema = z.object({
  file: z
    .instanceof(File, { message: 'A valid file is required.' })
    .refine((f) => f.size <= MAX_FILE_SIZE, {
      message: `File exceeds the ${MAX_FILE_SIZE_LABEL} limit.`,
    })
    .refine(
      (f) => {
        if ((ALLOWED_MIME_TYPES as readonly string[]).includes(f.type)) return true;
        // Some browsers leave .md with empty MIME type
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ext ? (ALLOWED_EXTENSIONS as readonly string[]).includes(ext) : false;
      },
      {
        message: 'Unsupported file type. Allowed: PDF, DOCX, TXT, MD, JPEG, PNG, GIF, WebP.',
      },
    ),
});
