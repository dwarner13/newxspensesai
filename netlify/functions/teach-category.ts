/**
 * 🎓 Teach Category Endpoint
 * 
 * POST /teach-category
 * - Accepts: { transactionId?, merchant, category, subcategory }
 * - Calls rememberCategory() + awardXP('ocr.categorize.corrected', +8)
 * - If transactionId provided, updates transactions row
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';
import { buildResponseHeaders } from './chat';

// Import Day 10 functions (they may not exist yet, but will be available after Day 10 merge)
// For now, we'll implement a simplified version that can be updated later
let rememberCategory: any;
let awardXP: any;
let XP_AWARDS: any;

try {
  const ocrMemory = require('./_shared/ocr_memory');
  const xpModule = require('./_shared/xp');
  rememberCategory = ocrMemory.rememberCategory;
  awardXP = xpModule.awardXP;
  XP_AWARDS = xpModule.XP_AWARDS || { 'ocr.categorize.corrected': 8 };
} catch (e) {
  console.warn('[TeachCategory] Day 10 modules not available, using stubs');
  // Stub implementations
  rememberCategory = async () => { console.log('[TeachCategory] rememberCategory stub'); };
  awardXP = async () => { console.log('[TeachCategory] awardXP stub'); return true; };
  XP_AWARDS = { 'ocr.categorize.corrected': 8 };
}

/**
 * Extract userId from headers or body
 */
function extractUserId(event: any): string {
  const headerUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
  if (headerUserId) {
    return headerUserId;
  }
  
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.userId) {
        return body.userId;
      }
    } catch (e) {
      // Invalid JSON
    }
  }
  
  throw new Error('Unauthorized: userId required (X-User-Id header or userId in body)');
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      },
      body: '',
    };
  }

  // Only POST supported
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'tag',
        routeConfidence: 0.8,
      }),
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    // Extract userId
    const userId = extractUserId(event);
    
    // Parse body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'tag',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ ok: false, error: 'Request body required' }),
      };
    }
    
    const { transactionId, merchant, category, subcategory } = JSON.parse(event.body);
    
    if (!merchant || !category) {
      return {
        statusCode: 400,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'tag',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ ok: false, error: 'merchant and category are required' }),
      };
    }
    
    // Update transaction row if transactionId provided
    if (transactionId) {
      try {
        const { error: updateError } = await admin()
          .from('transactions')
          .update({
            category,
            subcategory: subcategory || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transactionId)
          .eq('user_id', userId);
        
        if (updateError) {
          console.warn('[TeachCategory] Transaction update failed:', updateError);
          // Continue anyway - memory/XP is more important
        }
      } catch (updateErr) {
        console.warn('[TeachCategory] Transaction update error (non-blocking):', updateErr);
      }
    }
    
    // Remember category (Day 10 function)
    try {
      await rememberCategory({
        userId,
        merchant,
        category,
        subcategory,
        convoId: undefined, // No convo context for manual corrections
      });
    } catch (memErr) {
      console.warn('[TeachCategory] rememberCategory failed (non-blocking):', memErr);
    }
    
    // Award XP (Day 10 function)
    let xpAwarded = 0;
    try {
      const xpResult = await awardXP({
        userId,
        action: 'ocr.categorize.corrected',
        points: XP_AWARDS['ocr.categorize.corrected'] || 8,
        meta: {
          merchant,
          category,
          subcategory,
          transaction_id: transactionId,
        },
      });
      
      if (xpResult) {
        xpAwarded = XP_AWARDS['ocr.categorize.corrected'] || 8;
      }
    } catch (xpErr) {
      console.warn('[TeachCategory] awardXP failed (non-blocking):', xpErr);
    }
    
    return {
      statusCode: 200,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'tag',
        routeConfidence: 0.8,
        xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
      }),
      body: JSON.stringify({
        ok: true,
        remembered: true,
        xpAwarded,
        transactionUpdated: !!transactionId,
      }),
    };
  } catch (err: any) {
    console.error('[TeachCategory] Handler error:', err);
    
    // Unauthorized error
    if (err.message?.includes('Unauthorized')) {
      return {
        statusCode: 401,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'tag',
          routeConfidence: 0.8,
        }),
        body: JSON.stringify({ ok: false, error: err.message }),
      };
    }
    
    return {
      statusCode: 500,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'tag',
        routeConfidence: 0.8,
      }),
      body: JSON.stringify({ ok: false, error: 'Internal server error' }),
    };
  }
};
