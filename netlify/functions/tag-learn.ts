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

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { userId, transactionId, merchant, description, oldCategory, newCategory } = body;

    // Validate required fields
    if (!userId || !transactionId || !oldCategory || !newCategory) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['userId', 'transactionId', 'oldCategory', 'newCategory'],
        }),
      };
    }

    // Get user_id from headers if not in body (for consistency with other endpoints)
    const userIdFromHeader = event.headers['x-user-id'] || userId;

    safeLog('tag-learn.start', {
      userId: userIdFromHeader,
      transactionId,
      merchant: merchant || 'N/A',
      oldCategory,
      newCategory,
    });

    // Get Supabase client
    const supabase = serverSupabase();

    // Insert feedback into tag_category_feedback table
    const { data, error } = await supabase
      .from('tag_category_feedback')
      .insert({
        user_id: userIdFromHeader,
        transaction_id: transactionId,
        merchant: merchant || null,
        description: description || null,
        old_category: oldCategory,
        new_category: newCategory,
      })
      .select()
      .single();

    if (error) {
      safeLog('tag-learn.insertError', { error: error.message, userId: userIdFromHeader, transactionId });
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to save feedback',
          message: error.message,
        }),
      };
    }

    safeLog('tag-learn.success', {
      feedbackId: data?.id,
      userId: userIdFromHeader,
      transactionId,
      oldCategory,
      newCategory,
    });

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
        feedbackId: data?.id,
        message: 'Feedback saved successfully',
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
        message: error.message || 'An unexpected error occurred',
      }),
    };
  }
};


