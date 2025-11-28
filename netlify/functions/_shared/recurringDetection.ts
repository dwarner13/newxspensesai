/**
 * Recurring Payment Detection Helper
 * 
 * Analyzes transactions to detect recurring payment patterns and upserts
 * them into the recurring_obligations table.
 * 
 * Guardrails:
 * - All queries scoped by user_id
 * - No PII in logs (only masked user IDs)
 * - Safe error handling
 */

import { admin } from './supabase.js';
import { safeLog } from './safeLog.js';

export interface RecurringCandidate {
  userId: string;
  merchantName: string;
  category?: string;
  transactions: {
    id: string;
    date: string;      // ISO date string
    amount: number;
  }[];
}

export interface RecurringObligationUpsertResult {
  obligationId: string;
  isNew: boolean;
}

/**
 * Detect recurring payment patterns from transaction candidates and upsert into database
 * 
 * Algorithm:
 * 1. Group by (userId, merchantName, category) and sort by date
 * 2. Analyze date gaps to determine frequency (weekly/biweekly/monthly)
 * 3. Calculate average amount, variance, last amount, confidence
 * 4. Upsert into recurring_obligations table
 * 
 * Requirements:
 * - At least 3 transactions per merchant to consider recurring
 * - Reasonably consistent date gaps
 * - Amounts within ~15% variance for higher confidence
 */
export async function detectAndUpsertRecurringObligations(
  candidates: RecurringCandidate[]
): Promise<RecurringObligationUpsertResult[]> {
  const results: RecurringObligationUpsertResult[] = [];
  const supabase = admin();

  for (const candidate of candidates) {
    try {
      // Require at least 3 transactions
      if (candidate.transactions.length < 3) {
        continue;
      }

      // Sort transactions by date
      const sorted = [...candidate.transactions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Analyze pattern
      const analysis = analyzeRecurringPattern(sorted);

      // Skip if pattern is not confident enough
      if (analysis.confidence < 0.5 || analysis.frequency === 'unknown') {
        continue;
      }

      // Calculate next estimated date
      const lastDate = new Date(sorted[sorted.length - 1].date);
      const nextEstimatedDate = calculateNextEstimatedDate(
        lastDate,
        analysis.intervalDays,
        analysis.frequency
      );

      // Check if obligation already exists
      let query = supabase
        .from('recurring_obligations')
        .select('id')
        .eq('user_id', candidate.userId)
        .eq('merchant_name', candidate.merchantName);

      if (candidate.category) {
        query = query.eq('category', candidate.category);
      } else {
        query = query.is('category', null);
      }

      const { data: existing, error: checkError } = await query.maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
        safeLog('[RecurringDetection] Error checking existing obligation', {
          userId: maskUserId(candidate.userId),
          merchant: candidate.merchantName.substring(0, 20),
          error: checkError.message,
        });
        continue;
      }

      const obligationData = {
        user_id: candidate.userId,
        merchant_name: candidate.merchantName,
        category: candidate.category || null,
        average_amount: analysis.averageAmount,
        avg_amount: analysis.averageAmount, // For backward compatibility
        amount_variance: analysis.variance,
        last_amount: sorted[sorted.length - 1].amount,
        frequency: analysis.frequency,
        next_estimated_date: nextEstimatedDate?.toISOString().split('T')[0] || null,
        last_observed_date: sorted[sorted.length - 1].date.split('T')[0],
        last_seen_date: sorted[sorted.length - 1].date.split('T')[0], // For backward compatibility
        first_seen_date: sorted[0].date.split('T')[0], // For backward compatibility
        source: 'transactions',
        confidence: analysis.confidence,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing
        const { data: updated, error: updateError } = await supabase
          .from('recurring_obligations')
          .update(obligationData)
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError) {
          safeLog('[RecurringDetection] Error updating obligation', {
            userId: maskUserId(candidate.userId),
            merchant: candidate.merchantName.substring(0, 20),
            error: updateError.message,
          });
          continue;
        }

        results.push({
          obligationId: updated.id,
          isNew: false,
        });
      } else {
        // Insert new
        const { data: inserted, error: insertError } = await supabase
          .from('recurring_obligations')
          .insert({
            ...obligationData,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          safeLog('[RecurringDetection] Error inserting obligation', {
            userId: maskUserId(candidate.userId),
            merchant: candidate.merchantName.substring(0, 20),
            error: insertError.message,
          });
          continue;
        }

        results.push({
          obligationId: inserted.id,
          isNew: true,
        });
      }
    } catch (error: any) {
      safeLog('[RecurringDetection] Unexpected error processing candidate', {
        userId: maskUserId(candidate.userId),
        merchant: candidate.merchantName.substring(0, 20),
        error: error?.message || String(error),
      });
      continue;
    }
  }

  return results;
}

/**
 * Analyze a group of transactions to detect recurring pattern
 */
function analyzeRecurringPattern(transactions: { date: string; amount: number }[]): {
  averageAmount: number;
  variance: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'unknown';
  intervalDays: number | null;
  confidence: number;
} {
  const amounts = transactions.map(t => Math.abs(t.amount));
  const dates = transactions.map(t => new Date(t.date));

  // Calculate average amount
  const averageAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

  // Calculate variance
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - averageAmount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / averageAmount;

  // Calculate date intervals
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }

  if (intervals.length === 0) {
    return {
      averageAmount: Math.round(averageAmount * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      frequency: 'unknown',
      intervalDays: null,
      confidence: 0,
    };
  }

  // Find median interval (more robust than average)
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  // Determine frequency based on median gap
  let frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'unknown' = 'unknown';
  let intervalDays: number | null = null;

  if (medianInterval >= 5 && medianInterval <= 9) {
    frequency = 'weekly';
    intervalDays = Math.round(medianInterval);
  } else if (medianInterval >= 10 && medianInterval <= 18) {
    frequency = 'biweekly';
    intervalDays = Math.round(medianInterval);
  } else if (medianInterval >= 26 && medianInterval <= 35) {
    frequency = 'monthly';
    intervalDays = Math.round(medianInterval);
  } else if (medianInterval >= 85 && medianInterval <= 95) {
    frequency = 'quarterly';
    intervalDays = Math.round(medianInterval);
  } else {
    intervalDays = Math.round(medianInterval);
  }

  // Calculate confidence score
  // Factors: number of occurrences, amount consistency, interval consistency
  const occurrenceScore = Math.min(transactions.length / 6, 1); // Max at 6+ occurrences
  const amountConsistency = Math.max(0, 1 - coefficientOfVariation); // Lower CV = higher consistency
  const intervalConsistency = calculateIntervalConsistency(intervals, medianInterval);

  const confidence = (
    occurrenceScore * 0.4 +
    amountConsistency * 0.3 +
    intervalConsistency * 0.3
  );

  return {
    averageAmount: Math.round(averageAmount * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    frequency,
    intervalDays,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Calculate how consistent the intervals are (0-1, higher is better)
 */
function calculateIntervalConsistency(intervals: number[], medianInterval: number): number {
  if (intervals.length === 0 || medianInterval === 0) {
    return 0;
  }

  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - medianInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / medianInterval;

  // Convert to 0-1 score (lower CV = higher score)
  return Math.max(0, 1 - coefficientOfVariation);
}

/**
 * Calculate next estimated payment date
 */
function calculateNextEstimatedDate(
  lastDate: Date,
  intervalDays: number | null,
  frequency: string
): Date | null {
  if (!intervalDays) {
    return null;
  }

  const now = new Date();
  let nextDate = new Date(lastDate);

  // Add interval days
  nextDate.setDate(nextDate.getDate() + intervalDays);

  // If next date is in the past, add another interval
  while (nextDate < now) {
    nextDate.setDate(nextDate.getDate() + intervalDays);
  }

  return nextDate;
}

/**
 * Mask user ID for safe logging (only show first 8 chars)
 */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) {
    return 'user_****';
  }
  return `user_${userId.substring(0, 8)}...`;
}



