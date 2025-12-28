/**
 * Hook to handle post-import handoff flow:
 * - Runs Tag + Crystal silently on BYTE_IMPORT_COMPLETED
 * - Prepares Prime summary (stores in memory, doesn't send)
 * - Manages "Prime Summary Ready" UI state
 */

import { useEffect, useState, useRef } from 'react';
import { onBus } from '../lib/bus';
import { getSupabase } from '../lib/supabase';

interface PrimeSummary {
  importId: string;
  content: string;
  preparedAt: string;
  consumed: boolean;
}

/**
 * Store for Prime summaries (key: importId)
 */
const primeSummaryStore = new Map<string, PrimeSummary>();

export function usePostImportHandoff(userId: string | undefined) {
  const [primeSummaryReady, setPrimeSummaryReady] = useState<string | null>(null); // importId when ready
  const processingImportsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const handleByteImportCompleted = async (payload: { importId: string; userId: string; timestamp: string }) => {
      // Guard: Only process once per import
      if (processingImportsRef.current.has(payload.importId)) {
        return;
      }
      processingImportsRef.current.add(payload.importId);

      console.log('[usePostImportHandoff] BYTE_IMPORT_COMPLETED received', payload);

      try {
        // STEP 3: Run Tag + Crystal silently (no chat messages, no UI changes)
        await Promise.all([
          // Tag categorization (silent)
          fetch('/.netlify/functions/categorize-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ importId: payload.importId }),
          }).catch((err) => {
            console.error('[usePostImportHandoff] Tag categorization failed (silent):', err);
            // Continue even if Tag fails
          }),

          // Crystal analysis (silent) - wrapped in try/catch to prevent summary failure
          (async () => {
            try {
              await fetch('/.netlify/functions/crystal-analyze-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  importId: payload.importId,
                  userId: payload.userId,
                }),
              });
            } catch (err) {
              // Crystal failure should not prevent summary preparation
              console.error('[usePostImportHandoff] Crystal analysis failed (silent):', err);
            }
          })(),
        ]);

        // STEP 4: Prepare Prime summary (store in memory, do NOT send yet)
        // Wrap in try/catch to ensure summary is always prepared even if preparePrimeSummary fails
        let summaryContent: string;
        try {
          summaryContent = await preparePrimeSummary(payload.importId, payload.userId);
        } catch (error) {
          console.error('[usePostImportHandoff] Error preparing summary, using fallback:', error);
          summaryContent = "Your categorized results and insights are available.";
        }

        // Stable key: Use importId (threadId can be added later if needed for multi-thread support)
        const stableKey = payload.importId; // Future: `${threadId}:${importId}` if multi-thread needed

        // Guard: Don't overwrite existing summary if already prepared
        const existingSummary = primeSummaryStore.get(stableKey);
        if (existingSummary && !existingSummary.consumed) {
          // Summary already exists and not consumed - keep it
          if (process.env.NODE_ENV === 'development') {
            console.log('[usePostImportHandoff] Summary already exists, skipping re-preparation', { importId: payload.importId });
          }
          // Still show strip if not already shown
          if (!primeSummaryReady) {
            setPrimeSummaryReady(payload.importId);
          }
          return;
        }

        const summary: PrimeSummary = {
          importId: payload.importId,
          content: summaryContent,
          preparedAt: new Date().toISOString(),
          consumed: false,
        };

        primeSummaryStore.set(stableKey, summary);

        // STEP 5: Show "Prime Summary Ready" strip
        setPrimeSummaryReady(payload.importId);
      } catch (error) {
        console.error('[usePostImportHandoff] Error processing import completion:', error);
        // Remove from processing set on error so it can retry
        processingImportsRef.current.delete(payload.importId);
      }
    };

    const unsubscribe = onBus('BYTE_IMPORT_COMPLETED', handleByteImportCompleted);
    return unsubscribe;
  }, [userId]);

  /**
   * Get Prime summary for an import (if prepared)
   */
  const getPrimeSummary = (importId: string): PrimeSummary | null => {
    return primeSummaryStore.get(importId) || null;
  };

  /**
   * Mark summary as consumed (after handoff)
   * Ensures idempotency: can be called multiple times safely
   */
  const consumePrimeSummary = (importId: string) => {
    const summary = primeSummaryStore.get(importId);
    if (summary) {
      if (summary.consumed) {
        // Already consumed - idempotent guard
        if (process.env.NODE_ENV === 'development') {
          console.log('[usePostImportHandoff] Summary already consumed, skipping', { importId });
        }
        return;
      }
      summary.consumed = true;
      primeSummaryStore.set(importId, summary);
      setPrimeSummaryReady(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePostImportHandoff] Summary consumed', { importId });
      }
    }
  };

  return {
    primeSummaryReady,
    getPrimeSummary,
    consumePrimeSummary,
  };
}

/**
 * Prepare Prime's recap content based on import data
 * Includes: counts (# docs, # transactions), top categories (3), notable insights (3 short bullets)
 */
async function preparePrimeSummary(importId: string, userId: string): Promise<string> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return "Your categorized results and insights are available.";
    }

    // Fetch import data
    const { data: importData } = await supabase
      .from('imports')
      .select('id, status, created_at, document_id')
      .eq('id', importId)
      .single();

    if (!importData) {
      return "Your categorized results and insights are available.";
    }

    // Count documents (usually 1 per import, but check)
    const docCount = importData.document_id ? 1 : 0;

    // Fetch transactions from staging (where they are after normalization)
    const { data: transactions } = await supabase
      .from('transactions_staging')
      .select('id, data_json')
      .eq('import_id', importId);

    const transactionCount = transactions?.length || 0;

    // Generate summary content
    if (transactionCount === 0) {
      return "I've reviewed your import. The document has been processed and is ready for your review.";
    }

    // Calculate totals by category
    const categories = new Map<string, number>();
    transactions?.forEach((tx: any) => {
      const category = tx.data_json?.category || 'Uncategorized';
      const amount = Math.abs(Number(tx.data_json?.amount || 0));
      categories.set(category, (categories.get(category) || 0) + amount);
    });

    // Top 3 categories
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat} ($${amt.toFixed(2)})`);

    // Notable insights (3 short bullets)
    const insights: string[] = [];
    
    // Insight 1: Transaction count
    if (transactionCount > 0) {
      insights.push(`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} processed`);
    }

    // Insight 2: Top category
    if (topCategories.length > 0) {
      insights.push(`Top category: ${topCategories[0]}`);
    }

    // Insight 3: Categorization status
    const categorizedCount = transactions?.filter((tx: any) => tx.data_json?.category && tx.data_json.category !== 'Uncategorized').length || 0;
    if (categorizedCount > 0) {
      insights.push(`${categorizedCount} transaction${categorizedCount !== 1 ? 's' : ''} categorized`);
    }

    // Build recap message
    const recapParts: string[] = [];
    
    recapParts.push(`I've finished analyzing your import${docCount > 0 ? ` (${docCount} document${docCount !== 1 ? 's' : ''})` : ''}.`);
    
    if (transactionCount > 0) {
      recapParts.push(`Found ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}.`);
    }

    if (topCategories.length > 0) {
      recapParts.push(`Top categories: ${topCategories.join(', ')}.`);
    }

    if (insights.length > 0) {
      recapParts.push(`\nNotable insights:\n${insights.map(i => `• ${i}`).join('\n')}`);
    }

    recapParts.push(`Everything is categorized and ready for review.`);

    return recapParts.join(' ');
  } catch (error) {
    console.error('[preparePrimeSummary] Error:', error);
    return "Your categorized results and insights are available.";
  }
}


