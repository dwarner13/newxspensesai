import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'update_goal';

export const inputSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().optional(),
  targetDate: z.string().optional(), // YYYY-MM-DD format
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  goal: z.object({
    id: z.string(),
    name: z.string(),
    targetAmount: z.number(),
    currentAmount: z.number(),
    targetDate: z.string().nullable(),
    progress: z.number(),
    status: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Update an existing financial goal
 * 
 * Use this when Finley needs to update goal progress or details
 * based on user requests or forecast updates.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.targetAmount !== undefined) updateData.target_amount = input.targetAmount;
    if (input.currentAmount !== undefined) updateData.current_amount = input.currentAmount;
    if (input.targetDate !== undefined) updateData.target_date = input.targetDate;
    if (input.status !== undefined) updateData.status = input.status;

    const { data: goal, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', input.goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return Ok({
        ok: false,
        error: `Failed to update goal: ${error.message}`,
      });
    }

    if (!goal) {
      return Ok({
        ok: false,
        error: 'Goal not found',
      });
    }

    const targetAmount = goal.target_amount || goal.targetAmount || 0;
    const currentAmount = goal.current_amount || goal.currentAmount || 0;
    const progress = targetAmount > 0 
      ? Math.min(100, (currentAmount / targetAmount) * 100)
      : 0;

    return Ok({
      ok: true,
      goal: {
        id: goal.id,
        name: goal.name || '',
        targetAmount,
        currentAmount,
        targetDate: goal.target_date || goal.targetDate || null,
        progress: Math.round(progress * 100) / 100,
        status: goal.status || 'active',
      },
    });
  } catch (error) {
    console.error('[update_goal] Error:', error);
    return Ok({
      ok: false,
      error: (error as Error).message,
    });
  }
}






