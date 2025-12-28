import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'chime_summarize_upcoming_obligations';

export const inputSchema = z.object({
  days_ahead: z.number().int().min(1).max(90).optional().default(7),
  max_items: z.number().int().min(1).max(20).optional().default(5),
});

export const outputSchema = z.object({
  upcoming: z.array(z.object({
    merchant_name: z.string(),
    obligation_type: z.string(),
    next_estimated_date: z.string().nullable(),
    avg_amount: z.number(),
    frequency: z.string(),
    human_label: z.string(),
  })),
  total_upcoming: z.number(),
  date_range: z.object({
    start: z.string(), // ISO date
    end: z.string(), // ISO date
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Summarize upcoming recurring payment obligations
 * 
 * Returns a list of recurring payments (mortgages, car loans, credit cards,
 * subscriptions, etc.) that are due within the specified time window.
 * 
 * Use this when users ask about:
 * - "What bills are coming up?"
 * - "What payments are due soon?"
 * - "Remind me about upcoming payments"
 * - "What's due in the next X days?"
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const { days_ahead, max_items } = input;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Chime Summarize Upcoming] Executing for userId: ${userId}, days_ahead: ${days_ahead}, max_items: ${max_items}`);
    }

    const supabase = getSupabaseServerClient();

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() + days_ahead);

    // Query recurring_obligations
    let query = supabase
      .from('recurring_obligations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('next_estimated_date', { ascending: true, nullsLast: true });

    // Filter by next_estimated_date if available
    // Include obligations with NULL next_estimated_date (they'll be deprioritized)
    const { data: obligations, error } = await query;

    if (error) {
      console.error('[Chime Summarize Upcoming] Query error:', error);
      // If table doesn't exist, return empty list
      if (error.code === '42P01') {
        return Ok({
          upcoming: [],
          total_upcoming: 0,
          date_range: {
            start: today.toISOString().split('T')[0],
            end: cutoffDate.toISOString().split('T')[0],
          },
        });
      }
      return Err(new Error(`Failed to query recurring obligations: ${error.message}`));
    }

    const obligationsList = obligations || [];

    // Filter and sort obligations
    const now = new Date();
    const upcoming = obligationsList
      .map(ob => {
        // Calculate next date if not set
        let nextDate: Date | null = null;
        if (ob.next_estimated_date) {
          nextDate = new Date(ob.next_estimated_date);
        } else if (ob.last_seen_date && ob.interval_days) {
          // Estimate next date from last_seen_date + interval_days
          nextDate = new Date(ob.last_seen_date);
          nextDate.setDate(nextDate.getDate() + ob.interval_days);
          // If in the past, add another interval
          while (nextDate < now) {
            nextDate.setDate(nextDate.getDate() + ob.interval_days);
          }
        }

        return {
          ...ob,
          computed_next_date: nextDate,
        };
      })
      .filter(ob => {
        // Include if next date is within range, or if no date but recently seen
        if (ob.computed_next_date) {
          return ob.computed_next_date >= today && ob.computed_next_date <= cutoffDate;
        }
        // Include obligations without dates if they were seen recently (within last 60 days)
        if (ob.last_seen_date) {
          const lastSeen = new Date(ob.last_seen_date);
          const daysSinceLastSeen = Math.round((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceLastSeen <= 60;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by next date (soonest first), then by amount (highest first)
        if (a.computed_next_date && b.computed_next_date) {
          return a.computed_next_date.getTime() - b.computed_next_date.getTime();
        }
        if (a.computed_next_date) return -1;
        if (b.computed_next_date) return 1;
        return Number(b.avg_amount) - Number(a.avg_amount);
      })
      .slice(0, max_items)
      .map(ob => ({
        merchant_name: ob.merchant_name,
        obligation_type: ob.obligation_type,
        next_estimated_date: ob.computed_next_date?.toISOString().split('T')[0] || null,
        avg_amount: Number(ob.avg_amount),
        frequency: ob.frequency,
        human_label: getHumanLabel(ob.obligation_type),
      }));

    return Ok({
      upcoming,
      total_upcoming: upcoming.length,
      date_range: {
        start: today.toISOString().split('T')[0],
        end: cutoffDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[Chime Summarize Upcoming] Error:', error);
    return Err(error as Error);
  }
}

/**
 * Get human-readable label for obligation type
 */
function getHumanLabel(obligationType: string): string {
  switch (obligationType) {
    case 'mortgage':
      return 'Mortgage payment';
    case 'car_loan':
      return 'Car payment';
    case 'credit_card':
      return 'Credit card payment';
    case 'subscription':
      return 'Subscription';
    case 'utility':
      return 'Utility bill';
    case 'insurance':
      return 'Insurance payment';
    default:
      return 'Recurring payment';
  }
}

export const metadata = {
  name: 'Chime Summarize Upcoming Obligations',
  description: 'Get a list of upcoming recurring payment obligations (mortgages, loans, subscriptions, etc.) within a specified time window. Use when users ask about upcoming bills, payments due soon, or want reminders about recurring expenses.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'notifications',
};



