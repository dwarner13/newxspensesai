import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'tag_update_transaction_category';

export const inputSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  merchantName: z.string().optional(), // Optional merchant name for learning
  oldCategory: z.string().optional(), // Optional old category (will be fetched if not provided)
  newCategory: z.string().min(1, 'New category is required'),
  reason: z.string().optional(),
});

export const outputSchema = z.object({
  success: z.boolean(),
  transactionId: z.string(),
  merchantName: z.string().nullable(),
  oldCategory: z.string().nullable(),
  newCategory: z.string(),
  learningSaved: z.boolean(),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Update the category of an existing transaction
 * 
 * Allows Tag to fix mis-categorized transactions when users request changes.
 * Always verifies the transaction belongs to the user before updating.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { transactionId, merchantName, oldCategory: providedOldCategory, newCategory, reason } = input;
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[TagUpdateCategory] Executing for transactionId: "${transactionId}", newCategory: "${newCategory}", userId: ${userId}`);
    }

    const supabase = getSupabaseServerClient();

    // Step 1: Verify transaction exists and belongs to user
    const { data: existingTx, error: fetchError } = await supabase
      .from('transactions')
      .select('id, category, description, merchant, merchant_name, amount, date')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingTx) {
      return Err(new Error(`Transaction not found or access denied. Make sure the transaction ID is correct and belongs to you.`));
    }

    // Use provided oldCategory or fetch from transaction
    const oldCategory = providedOldCategory || existingTx.category || null;
    const merchant = merchantName || existingTx.merchant || existingTx.merchant_name || null;

    // Step 2: Update the transaction category
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        category: newCategory,
        category_source: 'manual', // Mark as user correction
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('user_id', userId); // Double-check user_id in update for security

    if (updateError) {
      console.error('[TagUpdateCategory] Update error:', updateError);
      return Err(new Error(`Failed to update transaction category: ${updateError.message}`));
    }

    // Step 3: Save correction to learning table (tag_category_corrections)
    let learningSaved = false;
    try {
      const { error: learningError } = await supabase
        .from('tag_category_corrections')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          merchant_name: merchant,
          old_category: oldCategory || 'Uncategorized',
          new_category: newCategory,
          source: 'manual_edit',
          reason: reason || null,
        });

      if (learningError) {
        console.error('[TagUpdateCategory] Failed to save learning correction:', learningError);
        // Don't fail the whole operation if learning save fails
      } else {
        learningSaved = true;
        if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
          console.log(`[TagUpdateCategory] Learning correction saved for merchant: "${merchant}", old: "${oldCategory}", new: "${newCategory}"`);
        }
      }
    } catch (learningErr) {
      console.error('[TagUpdateCategory] Exception saving learning correction:', learningErr);
      // Continue - learning failure shouldn't break the update
    }

    // Step 4: Build success message
    const message = reason
      ? `Successfully updated transaction "${existingTx.description || transactionId}" from "${oldCategory || 'Uncategorized'}" to "${newCategory}". Reason: ${reason}${learningSaved ? ' Tag has learned from this correction.' : ''}`
      : `Successfully updated transaction "${existingTx.description || transactionId}" from "${oldCategory || 'Uncategorized'}" to "${newCategory}".${learningSaved ? ' Tag has learned from this correction.' : ''}`;

    return Ok({
      success: true,
      transactionId,
      merchantName: merchant,
      oldCategory,
      newCategory,
      learningSaved,
      message,
    });

  } catch (error) {
    console.error('[TagUpdateCategory] Unexpected error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Update Transaction Category',
  description: 'Update the category of an existing transaction and save the correction for learning. Use this when users say things like "move this to Income", "change this category to X", "this is in the wrong category", or "fix the category for transaction Y". Always confirm which transaction and which category before calling this tool. This tool automatically saves corrections to Tag\'s learning system so future categorizations improve.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};


