import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goalie_summarize_goals';

export const inputSchema = z.object({
  statusFilter: z.enum(['in_progress', 'completed', 'all']).optional().default('all'),
});

export const outputSchema = z.object({
  summary: z.object({
    totalGoals: z.number(),
    inProgressGoals: z.number(),
    completedGoals: z.number(),
    pausedGoals: z.number(),
    totalTargetAmount: z.number(), // Sum of target_amount for savings/debt goals
    totalCurrentAmount: z.number(), // Sum of current_amount
    overallProgressPercent: z.number().nullable(), // Weighted average progress
  }),
  closestTargetDate: z.object({
    goalId: z.string(),
    goalTitle: z.string(),
    targetDate: z.string(),
    daysUntil: z.number(),
  }).nullable(),
  topGoals: z.array(z.object({
    id: z.string(),
    title: z.string(),
    goalType: z.string(),
    progressPercent: z.number().nullable(),
    targetDate: z.string().nullable(),
  })),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Summarize user's goals with aggregated statistics
 * 
 * Use this when users ask for an overview of their goals, want to see
 * overall progress, or need a high-level summary. Returns structured data
 * that Goalie can turn into a friendly, encouraging summary.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Summarize Goals] Executing for userId: ${userId}, statusFilter: ${input.statusFilter}`);
    }

    const supabase = getSupabaseServerClient();

    // Build query
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    // Apply status filter
    if (input.statusFilter !== 'all') {
      // Map 'in_progress' to 'active' (database uses 'active')
      const dbStatus = input.statusFilter === 'in_progress' ? 'active' : input.statusFilter;
      query = query.eq('status', dbStatus);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('[Goalie Summarize Goals] Query error:', error);
      // If table doesn't exist, return empty summary
      if (error.code === '42P01') {
        return Ok({
          summary: {
            totalGoals: 0,
            inProgressGoals: 0,
            completedGoals: 0,
            pausedGoals: 0,
            totalTargetAmount: 0,
            totalCurrentAmount: 0,
            overallProgressPercent: null,
          },
          closestTargetDate: null,
          topGoals: [],
        });
      }
      return Err(new Error(`Failed to query goals: ${error.message}`));
    }

    const goalsList = goals || [];

    // Calculate summary statistics
    const totalGoals = goalsList.length;
    const inProgressGoals = goalsList.filter(g => g.status === 'active').length;
    const completedGoals = goalsList.filter(g => g.status === 'completed').length;
    const pausedGoals = goalsList.filter(g => g.status === 'paused').length;

    // Calculate totals for goals with amounts
    let totalTargetAmount = 0;
    let totalCurrentAmount = 0;
    let goalsWithAmounts = 0;

    goalsList.forEach(g => {
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      if (target > 0) {
        totalTargetAmount += target;
        totalCurrentAmount += current;
        goalsWithAmounts++;
      }
    });

    // Calculate overall progress percent (weighted average)
    let overallProgressPercent: number | null = null;
    if (totalTargetAmount > 0) {
      overallProgressPercent = Math.min(100, (totalCurrentAmount / totalTargetAmount) * 100);
      overallProgressPercent = Math.round(overallProgressPercent * 100) / 100;
    }

    // Find closest target date
    let closestTarget: {
      goalId: string;
      goalTitle: string;
      targetDate: string;
      daysUntil: number;
    } | null = null;

    const now = new Date();
    const goalsWithDates = goalsList
      .filter(g => g.target_date && g.status === 'active')
      .map(g => {
        const targetDate = new Date(g.target_date);
        const daysUntil = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          goalId: g.id,
          goalTitle: g.name || 'Untitled Goal',
          targetDate: g.target_date,
          daysUntil,
        };
      })
      .filter(g => g.daysUntil >= 0) // Only future dates
      .sort((a, b) => a.daysUntil - b.daysUntil);

    if (goalsWithDates.length > 0) {
      closestTarget = goalsWithDates[0];
    }

    // Get top goals (by progress or closest date)
    const topGoals = goalsList
      .filter(g => g.status === 'active')
      .map(g => {
        const targetAmount = Number(g.target_amount) || 0;
        const currentAmount = Number(g.current_amount) || 0;
        let progressPercent: number | null = null;
        if (targetAmount > 0) {
          progressPercent = Math.min(100, (currentAmount / targetAmount) * 100);
          progressPercent = Math.round(progressPercent * 100) / 100;
        }
        return {
          id: g.id,
          title: g.name || 'Untitled Goal',
          goalType: g.goal_type || 'other',
          progressPercent,
          targetDate: g.target_date || null,
        };
      })
      .sort((a, b) => {
        // Sort by progress (highest first), then by target date (soonest first)
        if (a.progressPercent !== null && b.progressPercent !== null) {
          return b.progressPercent - a.progressPercent;
        }
        if (a.targetDate && b.targetDate) {
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        }
        return 0;
      })
      .slice(0, 5); // Top 5 goals

    return Ok({
      summary: {
        totalGoals,
        inProgressGoals,
        completedGoals,
        pausedGoals,
        totalTargetAmount: Math.round(totalTargetAmount * 100) / 100,
        totalCurrentAmount: Math.round(totalCurrentAmount * 100) / 100,
        overallProgressPercent,
      },
      closestTargetDate: closestTarget,
      topGoals,
    });
  } catch (error) {
    console.error('[Goalie Summarize Goals] Error:', error);
    return Err(error as Error);
  }
}




