/**
 * Update Vendor Category API
 * Allows users to categorize vendors and learn from their choices
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';

const MAX_TRANSACTION_IDS = 500;
/** Owner safeguard 5 (2026-11-27): this endpoint is retired; see the handler. */
export const UPDATE_VENDOR_CATEGORY_RETIRED = true as boolean;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // P0-C2c: identity comes only from the verified Supabase JWT, before any read or write.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = authn.principal.userId;

  try {
    const body = JSON.parse(event.body || '{}');
    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedHeaderUserId, userId) || !claimedUserIdMatches(body?.userId, userId)) {
      safeLog('updateVendorCategory.authDenied', { code: 'identity_mismatch' });
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    // Owner safeguard 5 (FINAL A-2, 2026-11-27): RETIRED. This legacy endpoint rewrote any listed
    // transactions' category (customer-set ones included, no provenance recorded, no confirmation) and
    // reported success even when nothing was saved. Its only callers are unrouted legacy screens.
    // Category changes go through Tag's proposal → confirmation (tag-action) or the customer's own
    // drawer edit (tx-update-category). Nothing is read or written here any more.
    if (UPDATE_VENDOR_CATEGORY_RETIRED) {
      safeLog('updateVendorCategory.retired', { userId });
      return {
        statusCode: 410,
        body: JSON.stringify({ error: 'retired', message: "This way of changing categories is no longer available. Ask Tag on the Transactions page; it will show you the change and wait for your yes." }),
      };
    }
    const { documentId, vendor, category, transactionIds } = body;

    if (!vendor || !category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: vendor, category' }),
      };
    }
    if (
      transactionIds !== undefined &&
      (!Array.isArray(transactionIds) ||
        transactionIds.length > MAX_TRANSACTION_IDS ||
        !transactionIds.every((id: unknown) => typeof id === 'string' && id.length > 0))
    ) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid transactionIds' }) };
    }

    safeLog('updateVendorCategory.start', { userId, vendor, category, documentId, transactionCount: transactionIds?.length });

    const supabase = serverSupabase();

    // Every requested transaction must belong to the verified user before anything is written;
    // a single foreign or unknown id rejects the whole request (no partial cross-user effects).
    if (Array.isArray(transactionIds) && transactionIds.length > 0) {
      const uniqueIds = Array.from(new Set(transactionIds as string[]));
      const { data: ownedRows, error: ownedError } = await supabase
        .from('transactions')
        .select('id')
        .in('id', uniqueIds)
        .eq('user_id', userId);
      if (ownedError) {
        const msg = String(ownedError.message || '').toLowerCase();
        const tableMissing = msg.includes('transactions') && (msg.includes('schema cache') || msg.includes('relation'));
        if (!tableMissing) {
          safeLog('updateVendorCategory.ownershipLookupFailed', { userId });
          return { statusCode: 503, body: JSON.stringify({ error: 'processing_unavailable', retryable: true }) };
        }
      } else if ((ownedRows || []).length !== uniqueIds.length) {
        safeLog('updateVendorCategory.authDenied', { code: 'not_owned' });
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
      }
    }

    // Update transactions in the document
    let updatedCount = 0;
    if (transactionIds && transactionIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .update({ category })
          .in('id', transactionIds)
          .eq('user_id', userId);

        if (error) {
          // If table doesn't exist, simulate success
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('transactions') && (errorMsg.includes('schema cache') || errorMsg.includes('relation'))) {
            safeLog('updateVendorCategory.transactionsTableMissing', { userId, vendor, category });
            updatedCount = transactionIds.length; // Simulate success
          } else {
            throw error;
          }
        } else {
          updatedCount = data?.length || transactionIds.length;
        }
      } catch (updateError: any) {
        const errorMsg = updateError.message?.toLowerCase() || '';
        if (errorMsg.includes('transactions') && (errorMsg.includes('schema cache') || errorMsg.includes('relation'))) {
          safeLog('updateVendorCategory.transactionsTableMissing', { userId, vendor, category });
          updatedCount = transactionIds.length; // Simulate success
        } else {
          throw updateError;
        }
      }
    }

    // Save vendor->category rule for future use
    try {
      const { error: ruleError } = await supabase
        .from('categorization_rules')
        .upsert({
          user_id: userId,
          keyword: vendor.toLowerCase(),
          category,
          match_count: 1,
        }, {
          onConflict: 'user_id,keyword',
        });

      if (ruleError) {
        // If table doesn't exist, simulate success
        const errorMsg = ruleError.message.toLowerCase();
        if (errorMsg.includes('categorization_rules') && (errorMsg.includes('schema cache') || errorMsg.includes('relation'))) {
          safeLog('updateVendorCategory.rulesTableMissing', { userId, vendor, category });
        } else {
          // Log but don't fail - rule saving is nice-to-have
          safeLog('updateVendorCategory.ruleSaveFailed', { error: ruleError.message });
        }
      } else {
        safeLog('updateVendorCategory.ruleSaved', { userId, vendor, category });
      }
    } catch (ruleError: any) {
      const errorMsg = ruleError.message?.toLowerCase() || '';
      if (!errorMsg.includes('categorization_rules') || (!errorMsg.includes('schema cache') && !errorMsg.includes('relation'))) {
        safeLog('updateVendorCategory.ruleSaveError', { error: ruleError.message });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        vendor,
        category,
        updatedCount,
        message: `Updated ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''} from ${vendor} to ${category}`,
      }),
    };
  } catch (error: any) {
    safeLog('updateVendorCategory.error', { error: error?.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update vendor category' }),
    };
  }
};

