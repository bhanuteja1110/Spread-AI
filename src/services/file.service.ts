import { createClient } from '@/lib/supabase/server';

export const fileService = {
  /**
   * Uploads a file to the private Supabase Storage bucket.
   * Returns a short-lived signed URL valid for 5 minutes.
   * All filenames are sanitized and namespaced under the user's UUID.
   */
  async uploadAttachment(file: File): Promise<string> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Sanitize filename: strip path traversal characters and whitespace
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.{2,}/g, '_'); // prevent ../../../etc traversal

    const path = `${user.id}/${crypto.randomUUID()}_${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from('chat_attachments')
      .upload(path, file, {
        upsert: false, // never silently overwrite existing objects
        contentType: file.type, // explicit MIME type prevents content sniffing
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    // Short-lived signed URL (5 minutes)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('chat_attachments')
      .createSignedUrl(data.path, 300);

    if (signedError) throw new Error(`Failed to generate signed URL: ${signedError.message}`);
    return signedData.signedUrl;
  },

  /**
   * Extracts plain text from uploaded documents.
   * Heavy parsers (pdf-parse, mammoth) are dynamically imported to prevent
   * them from being bundled into the Edge/Serverless lambda cold-start.
   * 
   * For images: returns empty string (vision is handled separately by the AI model).
   */
  async extractText(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());

    switch (file.type) {
      case 'text/plain':
        return buffer.toString('utf-8');

      case 'application/pdf': {
        // Dynamic import keeps pdf-parse out of the primary lambda bundle
        // eslint-disable-next-line
        const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        return result.text ?? '';
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value ?? '';
      }

      default:
        // Images and unknown types: no text to extract
        return '';
    }
  },
};
