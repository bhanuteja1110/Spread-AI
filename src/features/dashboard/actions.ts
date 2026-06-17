'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(50),
});

export async function updateProfileSettingsAction(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const fullName = formData.get('fullName') as string;
    const file = formData.get('avatar') as File | null;

    // Validate name securely on the server
    const validation = profileSchema.safeParse({ fullName });
    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    let avatarUrl = user.user_metadata?.avatar_url;

    // Process Avatar Upload if a new file is provided
    if (file && file.size > 0) {
      if (!file.type.startsWith('image/')) {
        return { error: 'Avatar must be a valid image file.' };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { error: 'Avatar must be less than 5MB.' };
      }

      const fileExt = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Extract the permanent public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      avatarUrl = publicUrl;
    }

    // Persist changes to the global Supabase Auth Metadata layer
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl
      }
    });

    if (updateError) throw updateError;

    revalidatePath('/dashboard');
    return { success: true, avatarUrl, fullName };
  } catch (error: any) {
    console.error('Profile update error:', error);
    return { error: error.message || 'An error occurred while updating your profile.' };
  }
}
