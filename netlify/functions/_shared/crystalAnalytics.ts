/**
 * Crystal Analytics Integration
 * 
 * Downstream consumer of Byte imports that runs analytics exactly once per import_run_id.
 * Only runs after:
 * 1) Byte completion event exists (byte.import.completed)
 * 2) Custodian verification is VERIFIED (integrity_verified=true)
 */

import { admin } from './supabase.js';
import { logAiActivity } from './logAiActivity.js';
import {
  getByteCompletionEvent,
  getImportMetadata,
  getTransactions,
  isCustodianVerified,
} from './crystalQueries.js';

export interface CrystalAnalyticsResult {
  success: boolean;
  crystalRunId?: string;
  error?: string;
}

/**
 * Trigger Crystal Analytics for a completed Byte import
 * 
 * Steps:
 * 1) Verify Byte completion exists
 * 2) Verify Custodian VERIFIED signal exists
 * 3) Read safe data via views ONLY
 * 4) Compute summary, metrics, flags
 * 5) Insert into crystal_analytics_runs (idempotent)
 * 6) Emit crystal.analytics.completed event (idempotent)
 * 
 * @param userId - User ID
 * @param importRunId - Import run ID
 * @returns Result with crystalRunId if successful
 */
export async function triggerCrystalAnalytics(
  userId: string,
  importRunId: string
): Promise<CrystalAnalyticsResult> {
  if (!userId || !importRunId) {
    console.warn('[triggerCrystalAnalytics] Missing required fields:', { userId, importRunId });
    return { success: false, error: 'Missing userId or importRunId' };
  }

  try {
    const sb = admin();

    // Step 1: Verify Byte completion exists
    const byteEvent = await getByteCompletionEvent(userId, importRunId);
    if (!byteEvent) {
      console.log(`[triggerCrystalAnalytics] Byte completion event not found for importRunId: ${importRunId}`);
      return { success: false, error: 'Byte completion event not found' };
    }

    // Step 2: Verify Custodian VERIFIED signal exists
    const verified = await isCustodianVerified(userId, importRunId);
    if (!verified) {
      console.log(`[triggerCrystalAnalytics] Custodian verification not found or not verified for importRunId: ${importRunId}`);
      return { success: false, error: 'Custodian verification not found or not verified' };
    }

    // Step 3: Read safe data via views ONLY (no raw OCR/PII)
    const [importMetadata, transactions] = await Promise.all([
      getImportMetadata(userId, importRunId),
      getTransactions(userId, importRunId),
    ]);

    if (importMetadata.length === 0) {
      console.log(`[triggerCrystalAnalytics] No import metadata found for importRunId: ${importRunId}`);
      return { success: false, error: 'No import metadata found' };
    }

    // Step 4: Compute analytics
    const analytics = computeAnalytics(transactions, importMetadata);

    // Step 5: Insert into crystal_analytics_runs (idempotent via UNIQUE constraint)
    const { data: crystalRun, error: insertError } = await sb
      .from('crystal_analytics_runs')
      .insert({
        user_id: userId,
        import_run_id: importRunId,
        status: 'completed',
        summary: analytics.summary,
        metrics: analytics.metrics,
        flags: analytics.flags,
      })
      .select('id')
      .single();

    if (insertError) {
      // Check if error is due to unique constraint violation (idempotency)
      if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
        console.log(`[triggerCrystalAnalytics] Crystal run already exists (DB constraint), skipping: ${importRunId}`);
        
        // Fetch existing run ID for event emission
        const { data: existingRun } = await sb
          .from('crystal_analytics_runs')
          .select('id')
          .eq('user_id', userId)
          .eq('import_run_id', importRunId)
          .maybeSingle();
        
        if (existingRun) {
          return { success: true, crystalRunId: existingRun.id };
        }
        return { success: true }; // Silent success on duplicate
      }
      // Re-throw other errors
      throw insertError;
    }

    const crystalRunId = crystalRun?.id;

    // Step 6: Emit crystal.analytics.completed event (idempotent)
    try {
      // Use admin client for event logging (bypasses RLS)
      const { error: eventError } = await sb
        .from('ai_activity_events')
        .insert({
          user_id: userId,
          employee_id: 'crystal-analytics',
          event_type: 'crystal.analytics.completed',
          status: 'completed',
          label: 'Crystal: Analytics ready',
          details: {
            import_run_id: importRunId,
            crystal_run_id: crystalRunId,
            metrics_preview: {
              total_transactions: analytics.metrics.total_transactions,
              total_amount: analytics.metrics.total_amount,
              category_count: analytics.metrics.category_count,
            },
            flags_preview: {
              uncategorized_count: analytics.flags.uncategorized_count,
              duplicates_detected: analytics.flags.duplicates_detected,
              anomalies_detected: analytics.flags.anomalies_detected,
            },
          },
        });

      if (eventError) {
        // Check if error is due to unique constraint violation (idempotency)
        if (eventError.code === '23505' || eventError.message?.includes('unique') || eventError.message?.includes('duplicate')) {
          console.log(`[triggerCrystalAnalytics] Crystal completion event already exists (DB constraint), skipping: ${importRunId}`);
        } else {
          console.error('[triggerCrystalAnalytics] Error emitting completion event:', eventError);
          // Don't fail - analytics run succeeded, event is secondary
        }
      }
    } catch (eventErr: any) {
      console.error('[triggerCrystalAnalytics] Error emitting completion event:', eventErr);
      // Don't fail - analytics run succeeded, event is secondary
    }

    console.log(`[triggerCrystalAnalytics] Crystal analytics completed for importRunId: ${importRunId}, crystalRunId: ${crystalRunId}`);
    return { success: true, crystalRunId };
  } catch (error: any) {
    console.error('[triggerCrystalAnalytics] Error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Compute analytics from transactions and import metadata
 */
function computeAnalytics(
  transactions: any[],
  importMetadata: any[]
): {
  summary: string;
  metrics: Record<string, any>;
  flags: Record<string, any>;
} {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  
  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  let uncategorizedCount = 0;
  
  transactions.forEach((tx) => {
    if (!tx.category || tx.category === 'uncategorized' || tx.category === '') {
      uncategorizedCount++;
    } else {
      categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
    }
  });

  // Duplicate detection (simple heuristic: same amount + same merchant + same date)
  const seenKeys = new Set<string>();
  let duplicatesDetected = 0;
  
  transactions.forEach((tx) => {
    const key = `${tx.posted_at}-${tx.amount}-${tx.merchant || ''}`;
    if (seenKeys.has(key)) {
      duplicatesDetected++;
    } else {
      seenKeys.add(key);
    }
  });

  // Anomaly detection (simple heuristic: unusually large amounts)
  const amounts = transactions.map((tx) => Math.abs(tx.amount || 0)).filter((a) => a > 0);
  const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const threshold = avgAmount * 3; // 3x average is considered anomaly
  const anomaliesDetected = amounts.filter((a) => a > threshold).length;

  // Generate summary
  const summary = `Analyzed ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''} totaling $${totalAmount.toFixed(2)}. ${uncategorizedCount > 0 ? `${uncategorizedCount} uncategorized. ` : ''}${duplicatesDetected > 0 ? `${duplicatesDetected} potential duplicate${duplicatesDetected !== 1 ? 's' : ''}. ` : ''}${anomaliesDetected > 0 ? `${anomaliesDetected} anomaly${anomaliesDetected !== 1 ? 'ies' : ''} detected.` : ''}`.trim();

  return {
    summary,
    metrics: {
      total_transactions: totalTransactions,
      total_amount: totalAmount,
      category_count: Object.keys(categoryCounts).length,
      category_breakdown: categoryCounts,
      average_amount: avgAmount,
      income_count: transactions.filter((tx) => tx.type === 'income').length,
      expense_count: transactions.filter((tx) => tx.type === 'expense').length,
    },
    flags: {
      uncategorized_count: uncategorizedCount,
      duplicates_detected: duplicatesDetected,
      anomalies_detected: anomaliesDetected,
    },
  };
}

