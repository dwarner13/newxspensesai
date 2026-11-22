/**
 * Sync Recurring Obligations
 * 
 * Scans user transactions to detect recurring payment patterns and
 * upserts them into the recurring_obligations table.
 * 
 * POST /.netlify/functions/sync-recurring-obligations
 * Auth (S0 Batch 2): requires `Authorization: Bearer <Supabase access token>`. The customer
 * identity comes ONLY from that verified token. An `x-user-id` header or body `userId`, if sent,
 * must match it (403 otherwise) and is never used as identity.
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';
import { detectRecurringPatternsForUser } from '../../src/services/recurringDetection.js';
import type { Transaction } from '../../src/types/database.types.js';
import { logActivityEvent } from './_shared/activity-logger.js';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // S0 Batch 2: identity comes only from the verified Supabase JWT, before any data access.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = authn.principal.userId;

  try {
    // x-user-id and body userId are never proof of identity; if present they must match.
    let body: Record<string, unknown> = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }
    }
    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedHeaderUserId, userId) || !claimedUserIdMatches(body?.userId, userId)) {
      console.warn('[Sync Recurring] authDenied: identity_mismatch');
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    console.log('[Sync Recurring] Starting sync');

    const supabase = admin();

    // Load transactions from last 12-18 months (use 18 months for better pattern detection)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 18);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (txError) {
      console.error('[Sync Recurring] Error fetching transactions:', txError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Failed to fetch transactions: ${txError.message}` }),
      };
    }

    const transactionsAnalyzed = transactions?.length || 0;
    console.log(`[Sync Recurring] Loaded ${transactionsAnalyzed} transactions`);

    if (transactionsAnalyzed === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          transactionsAnalyzed: 0,
          patternsDetected: 0,
          obligationsUpserted: 0,
        }),
      };
    }

    // Detect patterns
    const patterns = detectRecurringPatternsForUser(transactions as Transaction[]);
    console.log(`[Sync Recurring] Detected ${patterns.length} recurring patterns`);

    // Upsert each pattern into recurring_obligations
    let obligationsUpserted = 0;
    const errors: string[] = [];

    for (const pattern of patterns) {
      try {
        // Calculate next estimated date
        const lastDate = new Date(pattern.last_seen_date);
        const nextEstimatedDate = calculateNextEstimatedDate(
          lastDate,
          pattern.interval_days,
          pattern.frequency,
          pattern.day_of_month
        );

        // Check if obligation already exists
        const { data: existing } = await supabase
          .from('recurring_obligations')
          .select('id')
          .eq('user_id', userId)
          .eq('merchant_name', pattern.merchant_name)
          .eq('is_active', true)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('recurring_obligations')
            .update({
              avg_amount: pattern.avg_amount,
              frequency: pattern.frequency,
              day_of_month: pattern.day_of_month,
              weekday: pattern.weekday,
              interval_days: pattern.interval_days,
              next_estimated_date: nextEstimatedDate?.toISOString().split('T')[0] || null,
              last_seen_date: pattern.last_seen_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .eq('user_id', userId); // defense in depth: never touch another customer's row

          if (updateError) throw updateError;
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('recurring_obligations')
            .insert({
              user_id: userId,
              merchant_name: pattern.merchant_name,
              obligation_type: pattern.obligation_type,
              avg_amount: pattern.avg_amount,
              currency: 'CAD', // TODO: detect from transactions
              frequency: pattern.frequency,
              day_of_month: pattern.day_of_month,
              weekday: pattern.weekday,
              interval_days: pattern.interval_days,
              next_estimated_date: nextEstimatedDate?.toISOString().split('T')[0] || null,
              last_seen_date: pattern.last_seen_date,
              first_seen_date: pattern.first_seen_date,
              source: 'transactions',
              metadata: {},
              is_active: true,
            });

          if (insertError) throw insertError;
        }

        obligationsUpserted++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to upsert ${pattern.merchant_name}: ${errorMsg}`);
        console.error('[Sync Recurring] Error upserting an obligation:', errorMsg); // no merchant names in logs
      }
    }

    // Mark old obligations as inactive if they haven't been seen in > 6 * interval_days
    await deactivateStaleObligations(supabase, userId);

    console.log(`[Sync Recurring] Completed: ${obligationsUpserted} obligations upserted`);

    // Log activity event if obligations were updated
    if (obligationsUpserted > 0) {
      try {
        await logActivityEvent(userId, {
          actorSlug: 'liberty-ai',
          actorLabel: 'Liberty',
          title: 'Liberty updated your debt payoff plan',
          description: `Detected ${obligationsUpserted} recurring payment${obligationsUpserted !== 1 ? 's' : ''} and updated your payoff schedule.`,
          category: 'debt',
          severity: 'info',
          metadata: { obligationsUpserted, patternsDetected: patterns.length },
        });
      } catch (error: any) {
        console.warn('[Sync Recurring] Failed to log activity event:', error);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        transactionsAnalyzed,
        patternsDetected: patterns.length,
        obligationsUpserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
    };
  } catch (error) {
    console.error('[Sync Recurring] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

/**
 * Calculate next estimated payment date
 */
function calculateNextEstimatedDate(
  lastDate: Date,
  intervalDays: number | null,
  frequency: string,
  dayOfMonth: number | null
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

  // Adjust for monthly patterns (use day_of_month if available)
  if (frequency === 'monthly' && dayOfMonth) {
    nextDate.setDate(dayOfMonth);
    // If that date has passed this month, move to next month
    if (nextDate < now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(dayOfMonth);
    }
  }

  return nextDate;
}

/**
 * Deactivate obligations that haven't been seen recently
 */
async function deactivateStaleObligations(supabase: any, userId: string): Promise<void> {
  const { data: activeObligations } = await supabase
    .from('recurring_obligations')
    .select('id, last_seen_date, interval_days')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!activeObligations) return;

  const now = new Date();
  const toDeactivate: string[] = [];

  for (const obligation of activeObligations) {
    if (!obligation.interval_days) continue;

    const lastSeen = new Date(obligation.last_seen_date);
    const daysSinceLastSeen = Math.round(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If haven't seen in > 6 * interval_days, mark as inactive
    if (daysSinceLastSeen > obligation.interval_days * 6) {
      toDeactivate.push(obligation.id);
    }
  }

  if (toDeactivate.length > 0) {
    await supabase
      .from('recurring_obligations')
      .update({ is_active: false })
      .in('id', toDeactivate)
      .eq('user_id', userId); // defense in depth

    console.log(`[Sync Recurring] Deactivated ${toDeactivate.length} stale obligations`);
  }
}



