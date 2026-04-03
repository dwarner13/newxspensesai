import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'byte_rename_import';

export const inputSchema = z.object({
  importId: z.string().min(1, 'Import ID is required'),
  displayName: z.string().min(1, 'Display name is required').max(100, 'Name too long'),
});

export const outputSchema = z.object({
  success: z.boolean(),
  importId: z.string(),
  oldName: z.string().nullable(),
  newName: z.string(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(
  input: Input,
  ctx: { userId: string }
): Promise<Result<Output>> {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch current import to verify ownership and get old name
    const { data: existing, error: fetchError } = await supabase
      .from('imports')
      .select('id, filename, file_url')
      .eq('id', input.importId)
      .eq('user_id', ctx.userId)
      .single();

    if (fetchError || !existing) {
      return Err(new Error('Import not found or access denied.'));
    }

    const oldName = existing.filename
      || decodeURIComponent((existing.file_url || '').split('/').pop() || '')
      || null;

    // Update filename
    const { error: updateError } = await supabase
      .from('imports')
      .update({
        filename: input.displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.importId)
      .eq('user_id', ctx.userId);

    if (updateError) {
      return Err(new Error(`Failed to rename: ${updateError.message}`));
    }

    return Ok({
      success: true,
      importId: input.importId,
      oldName,
      newName: input.displayName,
      message: `Renamed "${oldName}" to "${input.displayName}".`,
    });

  } catch (error) {
    console.error('[byte_rename_import] Error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Byte Rename Import',
  description: 'Rename a statement import display name. Use when user says "rename this to X", "call this BMO January 2025", or "change the name of this statement".',
  requiresConfirmation: false,
  dangerous: false,
  category: 'import',
};
