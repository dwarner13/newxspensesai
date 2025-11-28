/**
 * Tag Explain Netlify Function
 * 
 * Explains how Tag categorized a specific transaction.
 * Used by Prime/Crystal/Byte to answer questions like "Why is this Groceries?"
 * 
 * Endpoint: POST /.netlify/functions/tag-explain
 * 
 * Request body:
 * {
 *   "userId": "optional-if-in-header",
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

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId: userIdFromBody, transactionId } = body;

    // Get userId from header or body (same pattern as tag-learn.ts)
    const userId = event.headers['x-user-id'] || userIdFromBody;

    // Validate required fields
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing userId',
          message: 'Please provide userId in x-user-id header or request body.',
        }),
      };
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

    safeLog('tag-explain.start', {
      userId,
      transactionId,
    });

    // Get Supabase client
    const supabase = serverSupabase();

    // Get explanation
    const explanation = await explainTransactionCategory(
      supabase,
      userId,
      transactionId
    );

    safeLog('tag-explain.success', {
      userId,
      transactionId,
      category: explanation.category,
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







