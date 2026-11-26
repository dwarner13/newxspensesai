/**
 * Tag Learning API
 * Receives category correction feedback from the frontend and stores it for Tag AI learning
 * 
 * This helps Tag learn from user corrections to improve future categorizations
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
// AI Fluency: Event logging
import { logUserEvent, recalcFluency } from '../../src/lib/ai/userActivity.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';
import { learnFromCorrection } from './_shared/tag-learning.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * P0-C2c: the corrected transaction must belong to the verified user, in either the committed
 * transactions table or staging (tx-update-category passes ids from both). Fails closed.
 */
async function transactionBelongsToUser(
  supabase: ReturnType<typeof serverSupabase>,
  userId: string,
  transactionId: string
): Promise<boolean | 'error'> {
  for (const table of ['transactions', 'transactions_staging']) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return 'error';
    if (data?.id) return true;
  }
  return false;
}

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  // P0-C2c: identity comes only from the verified Supabase JWT, before any read or write.
  // x-user-id and body userId are never proof of identity; if present they must match.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedHeaderUserId, authn.principal.userId) || !claimedUserIdMatches(body?.userId, authn.principal.userId)) {
      safeLog('tag-learn.authDenied', { code: 'identity_mismatch' });
      return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    const { transactionId, merchant, description, oldCategory, newCategory } = body;

    // Validate required fields
    if (!transactionId || !oldCategory || !newCategory) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['transactionId', 'oldCategory', 'newCategory'],
        }),
      };
    }

    // Verified identity only (name kept to minimise churn below).
    const userIdFromHeader = authn.principal.userId;

    // The corrected transaction must belong to this user before any feedback, memory or
    // retroactive staging update is written.
    const owned = await transactionBelongsToUser(serverSupabase(), userIdFromHeader, String(transactionId));
    if (owned !== true) {
      safeLog('tag-learn.authDenied', { code: owned === 'error' ? 'lookup_failed' : 'not_owned' });
      return owned === 'error'
        ? { statusCode: 503, headers: JSON_HEADERS, body: JSON.stringify({ error: 'processing_unavailable', retryable: true }) }
        : { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    // Reliability round 2 (owner GO 2026-11-25): one shared learning implementation; Tag reports that
    // it LEARNED only when the merchant memory was actually saved.
    const outcome = await learnFromCorrection(serverSupabase(), {
      userId: userIdFromHeader, transactionId: String(transactionId), merchant: merchant || null,
      description: description || null, oldCategory: String(oldCategory), newCategory: String(newCategory),
    });
    if (!outcome.feedbackSaved) {
      safeLog('tag-learn.insertError', { userId: userIdFromHeader, transactionId });
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Failed to save feedback', learned: false }) };
    }
    safeLog('tag-learn.outcome', { userId: userIdFromHeader, transactionId, memory: outcome.memory });

    // AI Fluency: Log category correction event (non-blocking)
    logUserEvent({
      userId: userIdFromHeader,
      eventType: 'category_correction',
      eventValue: 1,
      meta: { transactionId, oldCategory, newCategory, merchant, description }
    }).then(() => {
      // Recalculate fluency after logging event (non-blocking)
      recalcFluency(userIdFromHeader).catch(err => {
        console.error('[tag-learn] Error recalculating fluency:', err);
      });
    }).catch(err => {
      console.error('[tag-learn] Error logging event:', err);
      // Don't block response - logging failures are non-fatal
    });

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        feedbackId: outcome.feedbackId,
        learned: outcome.memory === 'saved',
        memory: outcome.memory,
        message: outcome.memory === 'saved'
          ? 'Correction saved, and Tag learned this merchant for next time.'
          : outcome.memory === 'failed'
            ? "Correction saved, but Tag couldn't save what it learned about this merchant."
            : 'Correction saved.',
      }),
    };
  } catch (error: any) {
    safeLog('tag-learn.error', { error: error.message });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};


