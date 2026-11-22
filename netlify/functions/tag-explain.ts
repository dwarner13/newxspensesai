/**
 * Tag Explain Netlify Function
 * 
 * Explains how Tag categorized a specific transaction.
 * Used by Prime/Crystal/Byte to answer questions like "Why is this Groceries?"
 * 
 * Endpoint: POST /.netlify/functions/tag-explain
 * 
 * Auth (S0 Batch 2): requires `Authorization: Bearer <Supabase access token>`. The customer
 * identity comes ONLY from that verified token. An `x-user-id` header or body `userId`, if sent,
 * must match it (403 otherwise) and is never used as identity.
 *
 * Request body:
 * {
 *   "transactionId": "required"
 * }
 * 
 * Response:
 * {
 *   "category": "Groceries",
 *   "categorySource": "learned",
 *   "confidence": 0.95,
 *   "learnedCount": 3,
 *   "lastLearnedAt": "2025-01-28T12:34:56Z",
 *   "message": "I used your past 3 corrections..."
 * }
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { explainTransactionCategory } from './_shared/tag_explain.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  // S0 Batch 2: identity comes only from the verified Supabase JWT, before any data access.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = authn.principal.userId;

  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
    const { transactionId } = body as { transactionId?: string };

    // x-user-id and body userId are never proof of identity; if present they must match.
    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedHeaderUserId, userId) || !claimedUserIdMatches(body?.userId, userId)) {
      safeLog('tag-explain.authDenied', { code: 'identity_mismatch' });
      return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    if (!transactionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing transactionId',
          message: 'Please provide transactionId in request body.',
        }),
      };
    }

    safeLog('tag-explain.start', {});

    // Get Supabase client (service role: every query below is scoped to the VERIFIED userId)
    const supabase = serverSupabase();

    // Get explanation
    const explanation = await explainTransactionCategory(
      supabase,
      userId,
      String(transactionId)
    );

    safeLog('tag-explain.success', {
      categorySource: explanation.categorySource,
    });

    // Return explanation
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(explanation),
    };

  } catch (error: any) {
    safeLog('tag-explain.error', { error: error.message });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      }),
    };
  }
};







