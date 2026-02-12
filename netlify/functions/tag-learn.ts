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

function normalizeVendorKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVendorFromDataJson(dataJson: any): string {
  return String(
    dataJson?.description ||
    dataJson?.merchant ||
    dataJson?.vendor ||
    dataJson?.payee ||
    dataJson?.memo ||
    dataJson?.name ||
    dataJson?.details ||
    ''
  ).trim();
}

async function countHistoricalVendorUses(supabase: any, userId: string, vendorKey: string): Promise<number> {
  const pageSize = 1000;
  let offset = 0;
  let totalMatches = 0;

  // Safety cap avoids unbounded scans during peak traffic.
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('transactions_staging')
      .select('data_json')
      .eq('user_id', userId)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = data || [];
    for (const row of rows) {
      const rowVendor = normalizeVendorKey(extractVendorFromDataJson(row?.data_json));
      if (rowVendor === vendorKey) totalMatches += 1;
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return totalMatches;
}

async function applyMemoryRetroactiveToNeedsReviewRows(params: {
  supabase: any;
  userId: string;
  vendorKey: string;
  category: string;
}) {
  const { supabase, userId, vendorKey, category } = params;
  const pageSize = 500;
  let offset = 0;

  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from('transactions_staging')
      .select('id, data_json, tag_status')
      .eq('user_id', userId)
      .eq('tag_status', 'needs_review')
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) break;

    const matchingIds: string[] = [];
    for (const row of rows) {
      const rowVendor = normalizeVendorKey(extractVendorFromDataJson(row?.data_json));
      if (rowVendor === vendorKey) matchingIds.push(row.id);
    }

    for (const id of matchingIds) {
      const { error: updateError } = await supabase
        .from('transactions_staging')
        .update({
          tag_category: category,
          tag_rule_source: 'vendor_memory',
          tag_confidence: 0.95,
          tag_status: 'auto',
          tag_reason: 'Learned from confirmed correction',
          tag_version: 'v1',
          tag_updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .eq('tag_status', 'needs_review');

      if (updateError) {
        safeLog('tag-learn.retroactiveUpdateError', {
          userId,
          vendorKey,
          id,
          message: updateError.message,
        });
      }
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }
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

    // Auto-learn: persist merchant -> category memory from explicit correction.
    // Includes confidence state and non-blocking retroactive apply for needs_review rows.
    if (merchant && String(merchant).trim()) {
      const vendorKey = normalizeVendorKey(String(merchant));
      if (vendorKey) {
        try {
          const historicalUseCount = await countHistoricalVendorUses(supabase, userIdFromHeader, vendorKey);
          const memoryConfidence = historicalUseCount >= 3 ? 'high' : 'learning';

          // Try metadata merge first (if metadata column exists).
          let existingMetadata: Record<string, any> = {};
          const { data: existingRow, error: existingRowError } = await supabase
            .from('vendor_category_memory')
            .select('metadata')
            .eq('user_id', userIdFromHeader)
            .eq('vendor_key', vendorKey)
            .maybeSingle();
          if (!existingRowError && existingRow?.metadata && typeof existingRow.metadata === 'object') {
            existingMetadata = existingRow.metadata;
          }

          const metadataPayload = {
            ...existingMetadata,
            memory_confidence: memoryConfidence,
            historical_use_count: historicalUseCount,
            learned_from: 'tag_learn',
            learned_at: new Date().toISOString(),
          };

          let { error: memoryError } = await supabase
            .from('vendor_category_memory')
            .upsert({
              user_id: userIdFromHeader,
              vendor_key: vendorKey,
              category: newCategory,
              subcategory: null,
              metadata: metadataPayload,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,vendor_key' });

          if (memoryError) {
            // Safe fallback where metadata column is unavailable.
            ({ error: memoryError } = await supabase
              .from('vendor_category_memory')
              .upsert({
                user_id: userIdFromHeader,
                vendor_key: vendorKey,
                category: newCategory,
                subcategory: null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,vendor_key' }));
          }

          if (memoryError) {
            safeLog('tag-learn.memoryUpsertError', {
              userId: userIdFromHeader,
              vendorKey,
              message: memoryError.message,
            });
          } else {
            safeLog('tag-learn.memoryUpsertSuccess', {
              userId: userIdFromHeader,
              vendorKey,
              category: newCategory,
              memoryConfidence,
              historicalUseCount,
            });

            // Non-blocking retroactive apply. Never throws to caller.
            applyMemoryRetroactiveToNeedsReviewRows({
              supabase,
              userId: userIdFromHeader,
              vendorKey,
              category: newCategory,
            }).catch((retroError: any) => {
              safeLog('tag-learn.retroactiveApplyError', {
                userId: userIdFromHeader,
                vendorKey,
                message: retroError?.message || String(retroError),
              });
            });
          }
        } catch (memoryBoostError: any) {
          safeLog('tag-learn.memoryBoostError', {
            userId: userIdFromHeader,
            merchant,
            message: memoryBoostError?.message || String(memoryBoostError),
          });
        }
      }
    }

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


