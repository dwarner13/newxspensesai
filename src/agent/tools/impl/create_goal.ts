import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'create_goal';

export const inputSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().optional(), // YYYY-MM-DD format
  goalType: z.enum(['savings', 'debt_payoff', 'investment', 'purchase', 'other']).optional().default('savings'),
  currentAmount: z.number().optional().default(0),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  goalId: z.string().optional(),
  goal: z.object({
    id: z.string(),
    name: z.string(),
    targetAmount: z.number(),
    currentAmount: z.number(),
    targetDate: z.string().nullable(),
    progress: z.number(),
  }).optional(),
  error: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Create a new financial goal
 * 
 * Use this when Finley needs to help users set up goals for forecasting
 * or tracking progress.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    const goalData: any = {
      user_id: userId,
      name: input.name,
      description: input.description || null,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount || 0,
      target_date: input.targetDate || null,
      goal_type: input.goalType || 'savings',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: goal, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error) {
      // If goals table doesn't exist, return error
      return Ok({
        ok: false,
        error: `Goals table not available: ${error.message}`,
      });
    }

    const progress = input.targetAmount > 0 
      ? Math.min(100, ((input.currentAmount || 0) / input.targetAmount) * 100)
      : 0;

    return Ok({
      ok: true,
      goalId: goal.id,
      goal: {
        id: goal.id,
        name: goal.name || input.name,
        targetAmount: goal.target_amount || input.targetAmount,
        currentAmount: goal.current_amount || 0,
        targetDate: goal.target_date || input.targetDate || null,
        progress: Math.round(progress * 100) / 100,
      },
    });
  } catch (error) {
    console.error('[create_goal] Error:', error);
    return Ok({
      ok: false,
      error: (error as Error).message,
    });
  }
}






