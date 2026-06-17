'use server';

import { createClient } from '@/lib/supabase/server';
import { fileSchema } from '@/lib/validations/file';
import { fileService } from '@/services/file.service';

interface UploadSuccessResult {
  success: true;
  url: string;
  extractedText: string;
  filename: string;
  type: string;
}

interface UploadErrorResult {
  error: string;
}

export type UploadActionResult = UploadSuccessResult | UploadErrorResult;

export async function uploadAndExtractAction(formData: FormData): Promise<UploadActionResult> {
  try {
    // Auth guard — server action must verify session independently
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be logged in to upload files.' };

    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No file provided.' };

    // Zod validation firewall
    const validation = fileSchema.safeParse({ file });
    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    // Upload to private bucket
    const url = await fileService.uploadAttachment(file);

    // Server-side text extraction (heavy parsers dynamically imported inside service)
    const extractedText = await fileService.extractText(file);

    return {
      success: true,
      url,
      extractedText,
      filename: file.name,
      type: file.type,
    };
  } catch (error: unknown) {
    console.error('Upload action error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: message };
  }
}
