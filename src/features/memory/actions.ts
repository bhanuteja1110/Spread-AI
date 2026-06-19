'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { memoryService } from '@/services/memory.service';

export type MemoryActionResult = { error?: string; success?: true };

export async function addMemoryAction(content: string, category?: string): Promise<MemoryActionResult> {
  try {
    if (!content?.trim()) return { error: 'Memory content is required.' };
    await memoryService.add(content, category);
    revalidatePath('/settings');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Failed to save memory.' };
  }
}

export async function forgetMemoryAction(id: string): Promise<MemoryActionResult> {
  try {
    if (!id) return { error: 'Memory id is required.' };
    await memoryService.forget(id);
    revalidatePath('/settings');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Failed to delete memory.' };
  }
}

export async function clearAllMemoriesAction(): Promise<MemoryActionResult> {
  try {
    await memoryService.clearAll();
    revalidatePath('/settings');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Failed to clear memories.' };
  }
}
