/**
 * Hook to handle post-import handoff flow:
 * - Runs Tag + Crystal silently on BYTE_IMPORT_COMPLETED
 * - Prepares Prime summary (stores in memory, doesn't send)
 * - Manages "Prime Summary Ready" UI state
 */

import { useEffect, useState, useRef } from 'react';
import { onBus } from '../lib/bus';
import { getSupabase } from '../lib/supabase';
import { log, error } from '../lib/logger';
import { isPostImportTriggersDisabled } from '../lib/featureFlags';

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

interface UsePostImportHandoffOptions {
  /**
   * If true, bypass the quiet-mode gate so summaries still appear in chat.
   */
  bypassQuietMode?: boolean;
}

export function usePostImportHandoff(userId: string | undefined, options: UsePostImportHandoffOptions = {}) {
  const { bypassQuietMode = false } = options;
  const [primeSummaryReady, setPrimeSummaryReady] = useState<string | null>(null); // importId when ready
  const [latestSummary, setLatestSummary] = useState<PrimeSummary | null>(null);
  const processingImportsRef = useRef<Set<string>>(new Set());
  const summaryRetryRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!userId) return;

    const handleByteImportCompleted = async (payload: { importId: string; userId: string; timestamp: string }) => {
      // Guard: Only process once per import
      if (processingImportsRef.current.has(payload.importId)) {
        return;
      }
      processingImportsRef.current.add(payload.importId);

      // QUIET MODE GATE: Skip post-import triggers if disabled
      if (isPostImportTriggersDisabled() && !bypassQuietMode) {
        // Skip silently to avoid console spam during OCR debugging
        processingImportsRef.current.delete(payload.importId);
        return;
      }

      log('[usePostImportHandoff] BYTE_IMPORT_COMPLETED received', payload);

      try {
        // STEP 3: Run Tag + Crystal silently (no chat messages, no UI changes)
        await Promise.all([
          // Tag categorization (silent)
          fetch('/.netlify/functions/categorize-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ importId: payload.importId }),
          }).catch((err) => {
            error('[usePostImportHandoff] Tag categorization failed (silent):', err);
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
              error('[usePostImportHandoff] Crystal analysis failed (silent):', err);
            }
          })(),
        ]);

        // STEP 4: Prepare Prime summary (store in memory, do NOT send yet)
        // Wrap in try/catch to ensure summary is always prepared even if preparePrimeSummary fails
        let summaryContent: string;
        try {
          summaryContent = await preparePrimeSummary(payload.importId, payload.userId);
        } catch (err: any) {
          error('[usePostImportHandoff] Error preparing summary, using fallback:', err);
          summaryContent = "Your categorized results and insights are available.";
        }

        // Stable key: Use importId (threadId can be added later if needed for multi-thread support)
        const stableKey = payload.importId; // Future: `${threadId}:${importId}` if multi-thread needed

        // Guard: Don't overwrite existing summary if already prepared
        const existingSummary = primeSummaryStore.get(stableKey);
        if (existingSummary && !existingSummary.consumed) {
          // Summary already exists and not consumed - keep it
          if (import.meta.env.DEV) {
            log('[usePostImportHandoff] Summary already exists, skipping re-preparation', { importId: payload.importId });
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
        await persistSummaryToDb(summary, payload.userId);
        setLatestSummary(summary);

        // STEP 5: Show "Prime Summary Ready" strip
        setPrimeSummaryReady(payload.importId);

        // If summary is generic, retry after OCR/normalization completes
        if (isGenericSummary(summaryContent)) {
          scheduleSummaryRetry(payload.importId, payload.userId);
        }
      } catch (err: any) {
        error('[usePostImportHandoff] Error processing import completion:', err);
        // Remove from processing set on error so it can retry
        processingImportsRef.current.delete(payload.importId);
      }
    };

    const unsubscribe = onBus('BYTE_IMPORT_COMPLETED', handleByteImportCompleted);
    return unsubscribe;
  }, [userId, bypassQuietMode]);

  const isGenericSummary = (content: string) => {
    return (
      content.includes('ready for your review') ||
      content.includes('categorized results and insights are available')
    );
  };

  const scheduleSummaryRetry = (importId: string, retryUserId: string) => {
    const attempts = summaryRetryRef.current.get(importId) ?? 0;
    if (attempts >= 5) {
      return;
    }
    summaryRetryRef.current.set(importId, attempts + 1);
    setTimeout(async () => {
      try {
        const updatedContent = await preparePrimeSummary(importId, retryUserId);
        if (!updatedContent) {
          scheduleSummaryRetry(importId, retryUserId);
          return;
        }

        const existing = primeSummaryStore.get(importId);
        if (!existing) {
          scheduleSummaryRetry(importId, retryUserId);
          return;
        }

        // Update only if we got a better summary
        if (updatedContent !== existing.content && !isGenericSummary(updatedContent)) {
          const updatedSummary: PrimeSummary = {
            ...existing,
            content: updatedContent,
            preparedAt: new Date().toISOString(),
          };
          primeSummaryStore.set(importId, updatedSummary);
          setLatestSummary(updatedSummary);
          setPrimeSummaryReady(importId);
        } else if (isGenericSummary(updatedContent)) {
          scheduleSummaryRetry(importId, retryUserId);
        }
      } catch (err: any) {
        error('[usePostImportHandoff] Summary retry failed:', err);
      }
    }, 1500);
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const loadLatestSummary = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error: loadError } = await supabase
          .from('import_summaries')
          .select('import_id, summary_text, created_at, employee, version')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (loadError || !data || cancelled) return;
        setLatestSummary({
          importId: data.import_id,
          content: data.summary_text,
          preparedAt: data.created_at,
          consumed: false,
        });
      } catch (err: any) {
        error('[usePostImportHandoff] Failed to load latest summary:', err);
      }
    };
    loadLatestSummary();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Get Prime summary for an import (if prepared)
   */
  const getPrimeSummary = (importId: string): PrimeSummary | null => {
    return primeSummaryStore.get(importId) || null;
  };

  /**
   * Get the latest prepared summary (if any)
   */
  const getLatestPrimeSummary = (): PrimeSummary | null => {
    if (latestSummary) return latestSummary;
    let latest: PrimeSummary | null = null;
    primeSummaryStore.forEach((summary) => {
      if (!latest) {
        latest = summary;
        return;
      }
      const latestTime = Date.parse(latest.preparedAt);
      const currentTime = Date.parse(summary.preparedAt);
      if (currentTime > latestTime) {
        latest = summary;
      }
    });
    return latest;
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
        if (import.meta.env.DEV) {
          log('[usePostImportHandoff] Summary already consumed, skipping', { importId });
        }
        return;
      }
      summary.consumed = true;
      primeSummaryStore.set(importId, summary);
      setPrimeSummaryReady(null);
      if (import.meta.env.DEV) {
        log('[usePostImportHandoff] Summary consumed', { importId });
      }
    }
  };

  return {
    primeSummaryReady,
    getPrimeSummary,
    getLatestPrimeSummary,
    consumePrimeSummary,
  };
}

async function persistSummaryToDb(summary: PrimeSummary, userId: string) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: existing, error: existingError } = await supabase
      .from('import_summaries')
      .select('id')
      .eq('import_id', summary.importId)
      .eq('user_id', userId)
      .eq('version', 1)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      error('[usePostImportHandoff] Error checking summary existence:', existingError);
      return;
    }
    if (existing) return;
    const { error: insertError } = await supabase.from('import_summaries').insert({
      import_id: summary.importId,
      user_id: userId,
      summary_text: summary.content,
      employee: 'prime',
      version: 1,
    });
    if (insertError) {
      error('[usePostImportHandoff] Failed to persist summary:', insertError);
    }
  } catch (err: any) {
    error('[usePostImportHandoff] Failed to persist summary:', err);
  }
}

/**
 * Prepare Prime's recap content based on import data
 * Includes: counts (# docs, # transactions), top categories (3), notable insights (3 short bullets)
 */
async function preparePrimeSummary(importId: string, _userId: string): Promise<string> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return "Your categorized results and insights are available.";
    }

    const isGeneric = (content: string) =>
      content.includes('ready for your review') ||
      content.includes('categorized results and insights are available');

    // Fetch import data
    const { data: importData } = await supabase
      .from('imports')
      .select('id, status, created_at, document_id')
      .eq('id', importId)
      .single();

    if (!importData) {
      return "Your categorized results and insights are available.";
    }

    // Prefer server-side summary (service role) when available
    try {
      const response = await fetch('/.netlify/functions/prime-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId, userId: _userId }),
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.summary && typeof payload.summary === 'string' && !isGeneric(payload.summary)) {
          return payload.summary;
        }
      }
    } catch (err: any) {
      error('[preparePrimeSummary] Server summary failed:', err);
    }

    // Count documents (usually 1 per import, but check)
    const docCount = importData.document_id ? 1 : 0;

    // Fetch transactions from staging first (after normalization)
    const { data: stagingTransactions } = await supabase
      .from('transactions_staging')
      .select('id, data_json')
      .eq('import_id', importId);
    
    let transactions = stagingTransactions;
    // Fallback to committed transactions if staging is empty
    if (!transactions || transactions.length === 0) {
      const { data: committedTransactions } = await supabase
        .from('transactions')
        .select('id, data_json')
        .eq('import_id', importId);
      transactions = committedTransactions;
    }

    const transactionCount = transactions?.length || 0;

    // Generate summary content
    if (transactionCount === 0) {
      // Try server-side summary (service role) for reliable access
      try {
        const response = await fetch('/.netlify/functions/prime-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importId,
            docId: importData.document_id || null,
            userId: _userId,
          }),
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload?.summary && typeof payload.summary === 'string') {
            return payload.summary;
          }
        }
      } catch (err: any) {
        error('[preparePrimeSummary] Server summary failed:', err);
      }

      if (importData.document_id) {
        const { data: docData } = await supabase
          .from('user_documents')
          .select('extracted_data, ocr_text, original_name, pii_types')
          .eq('id', importData.document_id)
          .maybeSingle();

        if (docData?.extracted_data) {
          const extracted = docData.extracted_data as any;
          const lines: string[] = [];
          if (extracted.vendor) lines.push(`Vendor: ${extracted.vendor}`);
          if (extracted.merchant) lines.push(`Merchant: ${extracted.merchant}`);
          if (extracted.invoice_no) lines.push(`Invoice #: ${extracted.invoice_no}`);
          if (extracted.date) lines.push(`Date: ${extracted.date}`);
          if (extracted.statement_period) lines.push(`Statement period: ${extracted.statement_period}`);
          if (extracted.new_balance) lines.push(`New balance: $${extracted.new_balance}`);
          if (extracted.minimum_payment_due) lines.push(`Minimum payment due: $${extracted.minimum_payment_due}`);
          if (extracted.due_date) lines.push(`Payment due date: ${extracted.due_date}`);
          if (extracted.previous_balance) lines.push(`Previous balance: $${extracted.previous_balance}`);
          if (extracted.payments) lines.push(`Payments: -$${extracted.payments}`);
          if (extracted.transactions) lines.push(`Transactions: +$${extracted.transactions}`);
          if (extracted.interest_charged) lines.push(`Interest charged: +$${extracted.interest_charged}`);
          if (extracted.credit_limit) lines.push(`Credit limit: $${extracted.credit_limit}`);
          if (extracted.available_credit) lines.push(`Available credit: $${extracted.available_credit}`);
          if (extracted.total) lines.push(`Total: $${extracted.total}${extracted.currency ? ` ${extracted.currency}` : ''}`);
          if (Array.isArray(docData.pii_types) && docData.pii_types.length > 0) {
            lines.push(`PII redacted: ${docData.pii_types.join(', ')}`);
          }
          if (lines.length > 0) {
            return `I read your document (${docData.original_name || 'upload'}). Here’s what I found:\n${lines.map(l => `• ${l}`).join('\n')}`;
          }
        }

        if (docData?.ocr_text) {
          const trimmed = docData.ocr_text.trim();
          const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
          if (preview) {
            return `I read your document (${docData.original_name || 'upload'}) but couldn’t extract transactions. OCR preview:\n${preview}`;
          }
        }
      }
      return "I've reviewed your import. The document has been processed and is ready for your review.";
    }

    // Calculate totals by category (amount + count)
    const categoryTotals = new Map<string, { amount: number; count: number }>();
    transactions?.forEach((tx: any) => {
      const category = tx.data_json?.category || 'Uncategorized';
      const amount = Math.abs(Number(tx.data_json?.amount || 0));
      const existing = categoryTotals.get(category) || { amount: 0, count: 0 };
      categoryTotals.set(category, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    });

    // Top 3 categories
    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3)
      .map(([cat, stats]) => `${cat} (${stats.count} tx, $${stats.amount.toFixed(2)})`);

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
  } catch (err: any) {
    error('[preparePrimeSummary] Error:', err);
    return "Your categorized results and insights are available.";
  }
}


