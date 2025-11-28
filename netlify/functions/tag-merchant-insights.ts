/**
 * Tag Merchant Insights Netlify Function
 * 
 * Provides insights about how a user categorizes a specific merchant.
 * Used by Prime/Crystal/Byte to answer questions like "What do I usually categorize Sobeys as?"
 * 
 * Endpoint: POST /.netlify/functions/tag-merchant-insights
 * 
 * Request body:
 * {
 *   "userId": "optional-if-in-header",
 *   "merchant": "required"
 * }
 * 
 * Response:
 * {
 *   "merchant": "SOBEYS #4059EDMONTONAB",
 *   "topCategory": "Groceries",
 *   "totalCorrections": 5,
 *   "lastCorrectedAt": "2025-01-28T12:34:56Z"
 * }
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { getMerchantCategoryInsight } from './_shared/tag_explain.js';

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
    const { userId: userIdFromBody, merchant } = body;

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

    if (!merchant) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing merchant',
          message: 'Please provide merchant name in request body.',
        }),
      };
    }

    safeLog('tag-merchant-insights.start', {
      userId,
      merchant,
    });

    // Get Supabase client
    const supabase = serverSupabase();

    // Get merchant insights
    const insight = await getMerchantCategoryInsight(
      supabase,
      userId,
      merchant
    );

    safeLog('tag-merchant-insights.success', {
      userId,
      merchant,
      topCategory: insight.topCategory,
      totalCorrections: insight.totalCorrections,
    });

    // Return insight
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(insight),
    };

  } catch (error: any) {
    safeLog('tag-merchant-insights.error', { error: error.message });
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







