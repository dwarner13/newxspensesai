/**
 * Teach Category API Endpoint
 * 
 * POST: Correct a transaction category and store in memory
 * 
 * Body: { merchant, category, subcategory? }
 * Headers: X-User-Id, X-Convo-Id (optional)
 * 
 * Returns: { ok: true, xpAwarded: number }
 */

import { Handler } from '@netlify/functions';
import { rememberCategory } from './_shared/ocr_memory';
import { awardXP, XP_AWARDS } from './_shared/xp';

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Convo-Id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    // Get user ID from header
    const userId = event.headers['x-user-id'] || event.headers['X-User-Id'] || 'anonymous';
    const convoId = event.headers['x-convo-id'] || event.headers['X-Convo-Id'] || 'teach-category';
    
    if (userId === 'anonymous') {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Unauthorized: user ID required' })
      };
    }

    // Parse body
    const body = JSON.parse(event.body || '{}');
    const { merchant, category, subcategory } = body;

    if (!merchant || !category) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Missing required fields: merchant, category' })
      };
    }

    // Remember corrected category
    const remembered = await rememberCategory({
      userId,
      merchant: merchant.trim(),
      category: category.trim(),
      subcategory: subcategory?.trim(),
      convoId
    });

    if (!remembered) {
      console.warn('[Teach Category] Failed to remember category');
    }

    // Award correction XP
    const xpId = await awardXP({
      userId,
      action: 'ocr.categorize.corrected',
      points: XP_AWARDS['ocr.categorize.corrected'],
      meta: {
        merchant: merchant.trim(),
        category: category.trim(),
        subcategory: subcategory?.trim(),
        source: 'transactions_page',
        convo_id: convoId
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'X-XP-Awarded': String(XP_AWARDS['ocr.categorize.corrected'])
      },
      body: JSON.stringify({
        ok: true,
        message: 'Category correction saved',
        xpAwarded: XP_AWARDS['ocr.categorize.corrected'],
        remembered
      })
    };
  } catch (error: any) {
    console.error('[Teach Category] Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: false, error: error?.message || 'Internal server error' })
    };
  }
};

