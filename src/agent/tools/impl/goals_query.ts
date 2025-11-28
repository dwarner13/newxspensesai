import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goals_query';

export const inputSchema = z.object({
  status: z.enum(['active', 'completed', 'archived', 'all']).optional().default('all'),
  goalType: z.string().optional(),
});

export const outputSchema = z.object({
  goals: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    targetAmount: z.number().nullable(),
    currentAmount: z.number().nullable(),
    targetDate: z.string().nullable(),
    status: z.string().nullable(),
    goalType: z.string().nullable(),
    progress: z.number(), // 0-100
  })),
  summary: z.object({
    totalGoals: z.number(),
    activeGoals: z.number(),
    completedGoals: z.number(),
    totalTargetAmount: z.number(),
    totalCurrentAmount: z.number(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Query user financial goals
 * 
 * Use this when Finley needs to understand user goals for forecasting
 * or scenario planning.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    // Check if goals table exists
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (input.status !== 'all') {
      query = query.eq('status', input.status);
    }
    if (input.goalType) {
      query = query.eq('goal_type', input.goalType);
    }

    const { data: goals, error } = await query;

    // If goals table doesn't exist, return empty result
    if (error || !goals || goals.length === 0) {
      return Ok({
        goals: [],
        summary: {
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          totalTargetAmount: 0,
          totalCurrentAmount: 0,
        },
      });
    }

    // Process goals
    const goalsList = goals.map(g => {
      const targetAmount = g.target_amount || g.targetAmount || 0;
      const currentAmount = g.current_amount || g.currentAmount || 0;
      const progress = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

      return {
        id: g.id,
        name: g.name || g.title || null,
        description: g.description || null,
        targetAmount,
        currentAmount,
        targetDate: g.target_date || g.targetDate || null,
        status: g.status || 'active',
        goalType: g.goal_type || g.goalType || null,
        progress: Math.round(progress * 100) / 100, // Round to 2 decimals
      };
    });

    const summary = {
      totalGoals: goalsList.length,
      activeGoals: goalsList.filter(g => g.status === 'active').length,
      completedGoals: goalsList.filter(g => g.status === 'completed').length,
      totalTargetAmount: goalsList.reduce((sum, g) => sum + (g.targetAmount || 0), 0),
      totalCurrentAmount: goalsList.reduce((sum, g) => sum + (g.currentAmount || 0), 0),
    };

    return Ok({
      goals: goalsList,
      summary,
    });
  } catch (error) {
    console.error('[goals_query] Error:', error);
    // Return empty result if table doesn't exist
    return Ok({
      goals: [],
      summary: {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
      },
    });
  }
}






