import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goalie_update_goal_progress';

export const inputSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  newCurrentAmount: z.number().nonnegative().optional(),
  newStatus: z.enum(['active', 'completed', 'paused', 'cancelled', 'archived']).optional(),
  note: z.string().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  goal: z.object({
    id: z.string(),
    name: z.string(),
    goalType: z.string(),
    status: z.string(),
    currentAmount: z.number(),
    targetAmount: z.number(),
    progressPercent: z.number().nullable(),
  }).optional(),
  error: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Update goal progress or status
 * 
 * Use this when users want to update their goal progress, mark a goal as completed,
 * or adjust the current amount saved toward a goal.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Update Goal Progress] Executing for userId: ${userId}, goalId: ${input.goalId}`);
    }

    const supabase = getSupabaseServerClient();

    // First, verify the goal exists and belongs to the user
    const { data: existingGoal, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', input.goalId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingGoal) {
      console.error('[Goalie Update Goal Progress] Goal not found or access denied:', fetchError);
      return Ok({
        ok: false,
        error: 'Goal not found or you do not have permission to update it',
      });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.newCurrentAmount !== undefined) {
      updateData.current_amount = input.newCurrentAmount;
    }
    if (input.newStatus !== undefined) {
      updateData.status = input.newStatus;
    }

    // Update the goal
    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', input.goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Goalie Update Goal Progress] Update error:', updateError);
      return Ok({
        ok: false,
        error: `Failed to update goal: ${updateError.message}`,
      });
    }

    // Calculate progress percent
    const targetAmount = Number(updatedGoal.target_amount) || 0;
    const currentAmount = Number(updatedGoal.current_amount) || 0;
    let progressPercent: number | null = null;
    if (targetAmount > 0) {
      progressPercent = Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));
      progressPercent = Math.round(progressPercent * 100) / 100; // Round to 2 decimals
    }

    // Log success (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Update Goal Progress] Successfully updated goal ${input.goalId}`);
    }

    return Ok({
      ok: true,
      goal: {
        id: updatedGoal.id,
        name: updatedGoal.name || '',
        goalType: updatedGoal.goal_type || '',
        status: updatedGoal.status || 'active',
        currentAmount,
        targetAmount,
        progressPercent,
      },
    });
  } catch (error) {
    console.error('[Goalie Update Goal Progress] Error:', error);
    return Ok({
      ok: false,
      error: (error as Error).message,
    });
  }
}




