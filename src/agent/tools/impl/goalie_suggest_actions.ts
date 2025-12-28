import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'goalie_suggest_actions';

export const inputSchema = z.object({
  focusGoalId: z.string().optional(),
  horizon: z.enum(['short_term', 'medium_term', 'long_term']).optional().default('short_term'),
});

export const outputSchema = z.object({
  summary: z.string(),
  nextActions: z.array(z.object({
    goalId: z.string().nullable(),
    title: z.string(),
    suggestedChange: z.string(),
    impact: z.string(),
    timeFrame: z.string(),
  })),
  notes: z.array(z.string()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Suggest actionable next steps based on user goals and spending patterns
 * 
 * Use this when users ask "what should I do next?", "how can I reach my goal faster?",
 * or want recommendations based on their goals and current spending.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Goalie Suggest Actions] Executing for userId: ${userId}, focusGoalId: ${input.focusGoalId || 'none'}, horizon: ${input.horizon}`);
    }

    const supabase = getSupabaseServerClient();

    // Get all active goals
    let goalsQuery = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const { data: goals, error: goalsError } = await goalsQuery;

    if (goalsError) {
      console.error('[Goalie Suggest Actions] Goals query error:', goalsError);
      // If table doesn't exist, return empty suggestions
      if (goalsError.code === '42P01') {
        return Ok({
          summary: 'No goals found. Create a goal to get personalized action suggestions.',
          nextActions: [],
          notes: ['Start by creating a financial goal to track your progress.'],
        });
      }
      return Err(new Error(`Failed to query goals: ${goalsError.message}`));
    }

    const activeGoals = goals || [];

    if (activeGoals.length === 0) {
      return Ok({
        summary: 'You don\'t have any active goals yet. Create a goal to start tracking your progress!',
        nextActions: [
          {
            goalId: null,
            title: 'Create Your First Goal',
            suggestedChange: 'Set up a savings goal, debt payoff goal, or spending habit goal',
            impact: 'You\'ll be able to track progress and get personalized recommendations',
            timeFrame: 'today',
          },
        ],
        notes: ['Examples: emergency fund, vacation savings, debt payoff, reduce dining out spending'],
      });
    }

    // If focusGoalId is provided, prioritize that goal
    let focusGoal = null;
    if (input.focusGoalId) {
      focusGoal = activeGoals.find(g => g.id === input.focusGoalId);
    }

    // Get recent spending data for context (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, type, category')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startDate);

    // Calculate total spending in last 30 days
    const totalSpending = (recentTransactions || []).reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    // Generate action suggestions based on goals
    const nextActions: Array<{
      goalId: string | null;
      title: string;
      suggestedChange: string;
      impact: string;
      timeFrame: string;
    }> = [];

    const notes: string[] = [];

    // Process each goal (or focus goal if specified)
    const goalsToProcess = focusGoal ? [focusGoal] : activeGoals.slice(0, 3); // Limit to top 3 if no focus

    for (const goal of goalsToProcess) {
      const targetAmount = Number(goal.target_amount) || 0;
      const currentAmount = Number(goal.current_amount) || 0;
      const goalType = goal.goal_type || '';
      const progressPercent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      const remaining = targetAmount - currentAmount;
      const targetDate = goal.target_date ? new Date(goal.target_date) : null;

      // Calculate time-based recommendations
      if (goalType === 'savings' || goalType === 'emergency_fund') {
        // Savings goal: suggest weekly/monthly contribution
        if (remaining > 0) {
          let suggestedWeekly: number;
          let timeFrame: string;
          
          if (targetDate) {
            const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const weeksRemaining = daysRemaining / 7;
            suggestedWeekly = weeksRemaining > 0 ? Math.ceil(remaining / weeksRemaining) : remaining;
            timeFrame = weeksRemaining > 4 ? 'this month' : 'this week';
          } else {
            // No target date: suggest based on horizon
            if (input.horizon === 'short_term') {
              suggestedWeekly = Math.ceil(remaining / 12); // 3 months
              timeFrame = 'this week';
            } else if (input.horizon === 'medium_term') {
              suggestedWeekly = Math.ceil(remaining / 26); // 6 months
              timeFrame = 'this month';
            } else {
              suggestedWeekly = Math.ceil(remaining / 52); // 1 year
              timeFrame = 'this month';
            }
          }

          if (suggestedWeekly > 0) {
            nextActions.push({
              goalId: goal.id,
              title: goal.name || 'Savings Goal',
              suggestedChange: `Add $${suggestedWeekly.toFixed(0)} per week to your ${goal.name || 'savings goal'}`,
              impact: progressPercent < 50 
                ? `You'll reach ${Math.min(100, progressPercent + 10).toFixed(0)}% progress in about ${Math.ceil(remaining / suggestedWeekly / 4)} weeks`
                : `You're ${progressPercent.toFixed(0)}% there! Keep the momentum going.`,
              timeFrame,
            });
          }
        }
      } else if (goalType === 'debt_payoff') {
        // Debt payoff: suggest extra payment
        if (remaining > 0 && totalSpending > 0) {
          // Suggest cutting spending by 5-10% and applying to debt
          const suggestedCut = Math.min(remaining, totalSpending * 0.1);
          if (suggestedCut > 0) {
            nextActions.push({
              goalId: goal.id,
              title: goal.name || 'Debt Payoff Goal',
              suggestedChange: `Apply an extra $${suggestedCut.toFixed(0)} toward your debt this month`,
              impact: `This could reduce your payoff time by approximately ${Math.ceil(suggestedCut / (remaining / 12))} months`,
              timeFrame: 'this month',
            });
          }
        }
      } else if (goalType === 'purchase' || goalType === 'other') {
        // Generic goal: suggest progress update
        if (progressPercent < 100) {
          nextActions.push({
            goalId: goal.id,
            title: goal.name || 'Goal',
            suggestedChange: `Review your progress and adjust your plan if needed`,
            impact: `You're ${progressPercent.toFixed(0)}% toward your goal`,
            timeFrame: 'this week',
          });
        }
      }
    }

    // Add general spending optimization if we have transaction data
    if (totalSpending > 0 && activeGoals.length > 0) {
      const avgMonthlySpending = totalSpending;
      const potentialSavings = avgMonthlySpending * 0.05; // 5% reduction
      
      if (potentialSavings > 50) { // Only suggest if meaningful
        notes.push(`You spent $${avgMonthlySpending.toFixed(2)} in the last 30 days. A 5% reduction could free up $${potentialSavings.toFixed(2)}/month for your goals.`);
      }
    }

    // Generate summary
    let summary = '';
    if (focusGoal) {
      const progress = focusGoal.target_amount > 0 
        ? ((focusGoal.current_amount || 0) / focusGoal.target_amount * 100).toFixed(0)
        : '0';
      summary = `Focusing on "${focusGoal.name}": You're ${progress}% there. Here are ${nextActions.length} action${nextActions.length !== 1 ? 's' : ''} to accelerate your progress.`;
    } else {
      summary = `You have ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}. Here are ${nextActions.length} recommended action${nextActions.length !== 1 ? 's' : ''} to move forward.`;
    }

    // If no actions generated, add a generic one
    if (nextActions.length === 0) {
      nextActions.push({
        goalId: null,
        title: 'Review Your Goals',
        suggestedChange: 'Take time to review your goals and update progress',
        impact: 'Regular check-ins help maintain momentum',
        timeFrame: 'this week',
      });
    }

    return Ok({
      summary,
      nextActions,
      notes,
    });
  } catch (error) {
    console.error('[Goalie Suggest Actions] Error:', error);
    return Err(error as Error);
  }
}




