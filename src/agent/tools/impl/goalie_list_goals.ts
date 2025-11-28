import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goalie_list_goals';

export const inputSchema = z.object({
  status: z.enum(['active', 'completed', 'paused', 'cancelled', 'archived', 'all']).optional().default('all'),
  goalType: z.string().optional(),
});

export const outputSchema = z.object({
  totalGoals: z.number(),
  activeGoals: z.number(),
  completedGoals: z.number(),
  goals: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    goalType: z.string(),
    targetAmount: z.number(),
    currentAmount: z.number(),
    targetDate: z.string().nullable(),
    status: z.string(),
    priority: z.string().nullable(),
    progressPercent: z.number().nullable(),
  })),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * List user financial goals with progress tracking
 * 
 * Use this when users ask about their goals, want to see progress, or need a summary of all goals.
 * Returns all goals filtered by status and type, with calculated progress percentages.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie List Goals] Executing for userId: ${userId}, status: ${input.status}, goalType: ${input.goalType || 'all'}`);
    }

    const supabase = getSupabaseServerClient();

    // Build query
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (input.status !== 'all') {
      query = query.eq('status', input.status);
    }
    if (input.goalType) {
      query = query.eq('goal_type', input.goalType);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('[Goalie List Goals] Query error:', error);
      // If table doesn't exist, return empty result gracefully
      if (error.code === '42P01') {
        return Ok({
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          goals: [],
        });
      }
      return Err(new Error(`Failed to query goals: ${error.message}`));
    }

    // Log query results (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie List Goals] Found ${goals?.length || 0} goals`);
    }

    const goalsList = (goals || []).map(g => {
      const targetAmount = Number(g.target_amount) || 0;
      const currentAmount = Number(g.current_amount) || 0;
      
      // Calculate progress percent safely
      let progressPercent: number | null = null;
      if (targetAmount > 0) {
        progressPercent = Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));
        progressPercent = Math.round(progressPercent * 100) / 100; // Round to 2 decimals
      }

      return {
        id: g.id,
        name: g.name || '',
        description: g.description || null,
        goalType: g.goal_type || '',
        targetAmount,
        currentAmount,
        targetDate: g.target_date || null,
        status: g.status || 'active',
        priority: g.priority || null,
        progressPercent,
      };
    });

    // Calculate summary stats
    const totalGoals = goalsList.length;
    const activeGoals = goalsList.filter(g => g.status === 'active').length;
    const completedGoals = goalsList.filter(g => g.status === 'completed').length;

    return Ok({
      totalGoals,
      activeGoals,
      completedGoals,
      goals: goalsList,
    });
  } catch (error) {
    console.error('[Goalie List Goals] Error:', error);
    return Err(error as Error);
  }
}




