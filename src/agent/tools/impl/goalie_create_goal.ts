import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goalie_create_goal';

export const inputSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().optional(),
  goalType: z.enum(['debt', 'savings', 'income', 'habit', 'other']).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().optional(), // YYYY-MM-DD format
  category: z.string().optional(), // e.g., "credit card", "vacation"
  startDate: z.string().optional(), // YYYY-MM-DD format, defaults to today
});

export const outputSchema = z.object({
  ok: z.boolean(),
  goalId: z.string().optional(),
  goal: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    goalType: z.string().nullable(),
    targetAmount: z.number().nullable(),
    currentAmount: z.number(),
    targetDate: z.string().nullable(),
    startDate: z.string().nullable(),
    status: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Create a new financial goal
 * 
 * Use this when users want to set up a new goal. Goalie helps them define
 * clear, achievable goals with realistic timelines.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Create Goal] Executing for userId: ${userId}, title: ${input.title}`);
    }

    const supabase = getSupabaseServerClient();

    // Map goalType enum to database values
    // Database uses: 'savings', 'debt_payoff', 'investment', 'purchase', 'emergency_fund', 'other'
    let dbGoalType = 'other';
    if (input.goalType === 'debt') {
      dbGoalType = 'debt_payoff';
    } else if (input.goalType === 'savings') {
      dbGoalType = 'savings';
    } else if (input.goalType === 'income') {
      dbGoalType = 'other'; // Map income goals to 'other' for now
    } else if (input.goalType === 'habit') {
      dbGoalType = 'other'; // Habit goals might not have amounts
    }

    const goalData: any = {
      user_id: userId,
      name: input.title, // Database uses 'name' column
      description: input.description || null,
      goal_type: dbGoalType,
      target_amount: input.targetAmount || null,
      current_amount: 0,
      target_date: input.targetDate || null,
      status: 'active', // Start as 'active' (maps to 'in_progress' concept)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Note: The goals table doesn't have 'category' or 'start_date' columns
    // If needed, we could extend the schema, but for now we'll store category in description if provided
    if (input.category) {
      goalData.description = goalData.description 
        ? `${goalData.description} (Category: ${input.category})`
        : `Category: ${input.category}`;
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error) {
      console.error('[Goalie Create Goal] Insert error:', error);
      return Ok({
        ok: false,
        error: `Failed to create goal: ${error.message}`,
      });
    }

    // Log success (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Create Goal] Successfully created goal ${goal.id}`);
    }

    return Ok({
      ok: true,
      goalId: goal.id,
      goal: {
        id: goal.id,
        title: goal.name || input.title,
        description: goal.description || null,
        goalType: goal.goal_type || null,
        targetAmount: goal.target_amount || null,
        currentAmount: goal.current_amount || 0,
        targetDate: goal.target_date || null,
        startDate: goal.created_at ? goal.created_at.split('T')[0] : null, // Extract date from created_at
        status: goal.status || 'active',
      },
    });
  } catch (error) {
    console.error('[Goalie Create Goal] Error:', error);
    return Ok({
      ok: false,
      error: (error as Error).message,
    });
  }
}




