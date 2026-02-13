/**
 * Hook to handle post-import handoff flow:
 * - Uses Prime Router as the canonical orchestration path
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

interface PrimeSummaryMeta {
  tagRan?: boolean | null;
  needsReviewCount?: number | null;
  autoCount?: number | null;
  aiCount?: number | null;
  taggedCount?: number | null;
  ready?: boolean | null;
}

/**
 * Store for Prime summaries (key: importId)
 */
const primeSummaryStore = new Map<string, PrimeSummary>();
const primeSummaryMetaStore = new Map<string, PrimeSummaryMeta>();

const PRIME_ROUTER_STATUS_MAX_POLLS = 8;
const PRIME_ROUTER_STATUS_POLL_MS = 1500;
const PENDING_IMPORT_RECAP_KEY = 'xspenses:pending_import_recap';

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
        // Canonical orchestration: Chat -> Prime Router -> downstream functions.
        // Do not call TAG/OCR/summary endpoints directly from chat flow.
        const routerStatus = await waitForPrimeRouterStatus(payload.importId);
        if (routerStatus === 'error') {
          error('[usePostImportHandoff] Prime router status returned error; continuing with summary fallback');
        }

        // STEP 4: Prepare Prime summary (store in memory, do NOT send yet)
        // Wrap in try/catch to ensure summary is always prepared even if preparePrimeSummary fails
        let prepared: { content: string; meta?: PrimeSummaryMeta };
        try {
          prepared = await preparePrimeSummary(payload.importId, payload.userId);
        } catch (err: any) {
          error('[usePostImportHandoff] Error preparing summary, using fallback:', err);
          prepared = { content: "Your categorized results and insights are available." };
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
          content: prepared.content,
          preparedAt: new Date().toISOString(),
          consumed: false,
        };

        primeSummaryStore.set(stableKey, summary);
        primeSummaryMetaStore.set(stableKey, prepared.meta || {});
        await persistSummaryToDb(summary, payload.userId);
        setLatestSummary(summary);
        enqueueImportRecapIfReady(payload.importId, prepared.content, prepared.meta);

        // STEP 5: Show "Prime Summary Ready" strip
        setPrimeSummaryReady(payload.importId);

        // If summary is generic, retry after OCR/normalization completes
        if (isGenericSummary(prepared.content)) {
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
        const updated = await preparePrimeSummary(importId, retryUserId);
        const updatedContent = updated?.content;
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
          primeSummaryMetaStore.set(importId, updated?.meta || {});
          setLatestSummary(updatedSummary);
          setPrimeSummaryReady(importId);
          enqueueImportRecapIfReady(importId, updatedContent, updated?.meta);
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

  const getPrimeSummaryMeta = (importId: string): PrimeSummaryMeta | null => {
    return primeSummaryMetaStore.get(importId) || null;
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
    getPrimeSummaryMeta,
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
function parseCount(content: string, pattern: RegExp): number | null {
  const match = content.match(pattern);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

async function preparePrimeSummary(importId: string, _userId: string): Promise<{ content: string; meta?: PrimeSummaryMeta }> {
  try {
    const isGeneric = (content: string) =>
      content.includes('ready for your review') ||
      content.includes('categorized results and insights are available');

    // Canonical orchestration endpoint for chat summary path.
    // No direct summary/TAG endpoint calls from chat flow.
    try {
      const response = await fetch('/.netlify/functions/prime-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'summary', importId }),
      });
      if (response.ok) {
        const payload = await response.json();
        const routerSummary = payload?.summary?.summary;
        if (typeof routerSummary === 'string' && routerSummary && !isGeneric(routerSummary)) {
          const totalProcessed = parseCount(routerSummary, /(\d+)\s+transactions?\s+processed/i);
          const needsReview = payload?.meta?.needsReviewCount ?? parseCount(routerSummary, /(\d+)\s+transactions?\s+need review/i);
          const autoCount = payload?.meta?.autoCount ?? (
            totalProcessed !== null && needsReview !== null ? Math.max(totalProcessed - needsReview, 0) : null
          );
          return {
            content: routerSummary,
            meta: {
              tagRan: payload?.meta?.tagRan ?? null,
              needsReviewCount: needsReview,
              autoCount,
              aiCount: payload?.meta?.aiCount ?? null,
              taggedCount: autoCount,
              ready: true,
            },
          };
        }
        if (payload?.ready === false) {
          return { content: "Your categorized results and insights are available.", meta: { tagRan: false, ready: false } };
        }
      }
    } catch (err: any) {
      error('[preparePrimeSummary] prime-router summary failed:', err);
    }

    // Safe fallback: direct prime-summary if router summary path fails.
    try {
      const response = await fetch('/.netlify/functions/prime-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
      });
      if (response.ok) {
        const payload = await response.json();
        const fallbackSummary = payload?.summary;
        if (typeof fallbackSummary === 'string' && fallbackSummary.trim().length > 0 && !isGeneric(fallbackSummary)) {
          const totalProcessed = parseCount(fallbackSummary, /(\d+)\s+transactions?\s+processed/i);
          const needsReview = parseCount(fallbackSummary, /(\d+)\s+transactions?\s+need review/i);
          return {
            content: fallbackSummary,
            meta: {
              needsReviewCount: needsReview,
              taggedCount: totalProcessed !== null && needsReview !== null ? Math.max(totalProcessed - needsReview, 0) : null,
              ready: true,
            },
          };
        }
      }
    } catch (err: any) {
      error('[preparePrimeSummary] prime-summary fallback failed:', err);
    }

    return { content: "Your categorized results and insights are available.", meta: { tagRan: false, ready: false } };
  } catch (err: any) {
    error('[preparePrimeSummary] Error:', err);
    return { content: "Your categorized results and insights are available.", meta: { tagRan: false, ready: false } };
  }
}

async function waitForPrimeRouterStatus(importId: string): Promise<'complete' | 'error' | 'running_timeout'> {
  for (let i = 0; i < PRIME_ROUTER_STATUS_MAX_POLLS; i += 1) {
    try {
      const response = await fetch('/.netlify/functions/prime-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'status', importId }),
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.status === 'complete') {
          return 'complete';
        }
        if (payload?.status === 'error') {
          return 'error';
        }
      }
    } catch (err: any) {
      error('[waitForPrimeRouterStatus] Poll failed:', err);
      return 'running_timeout';
    }
    await new Promise((resolve) => setTimeout(resolve, PRIME_ROUTER_STATUS_POLL_MS));
  }
  return 'running_timeout';
}

function pickQuickInsight(summary: string): string {
  if (!summary || typeof summary !== 'string') {
    return "I’m ready when you are — want a quick review or category cleanup?";
  }
  const cleaned = summary.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return "I’m ready when you are — want a quick review or category cleanup?";
  }
  const firstSentence = cleaned.split(/[.!?]/).map((s) => s.trim()).find((s) => s.length > 0);
  if (!firstSentence) {
    return "I’m ready when you are — want a quick review or category cleanup?";
  }
  const capped = firstSentence.length > 140 ? `${firstSentence.slice(0, 137)}...` : firstSentence;
  return capped;
}

function buildImportRecapText(params: { summary: string; meta?: PrimeSummaryMeta }): string {
  const { summary, meta } = params;
  const txCount = parseCount(summary, /(\d+)\s+transactions?\s+processed/i);
  const taggedAuto = meta?.autoCount ?? 0;
  const taggedAI = meta?.aiCount ?? 0;
  const needsReview = meta?.needsReviewCount ?? 0;
  const insight = pickQuickInsight(summary);
  const nextStep =
    needsReview > 0
      ? `Next step: Review the ${needsReview} item${needsReview === 1 ? '' : 's'} and I’ll learn from your corrections.`
      : "Next step: Everything looks good. You can continue with insights or category cleanup.";

  const lines = [
    "Your document is ready. Here’s what I found:",
    ...(txCount !== null ? [`• Transactions: ${txCount}`] : []),
    `• Tagged automatically: ${taggedAuto}`,
    `• Tagged with AI: ${taggedAI}`,
    `• Needs review: ${needsReview}`,
    `Quick insight: ${insight}`,
    nextStep,
  ];
  return lines.join('\n');
}

function enqueueImportRecapIfReady(importId: string, summary: string, meta?: PrimeSummaryMeta) {
  if (typeof window === 'undefined') return;
  const ready = meta?.ready;
  if (ready === false) return;
  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) return;

  const recapText = buildImportRecapText({ summary, meta });
  const payload = {
    importId,
    createdAt: new Date().toISOString(),
    recapText,
    meta: meta || {},
    summary,
  };

  try {
    window.localStorage.setItem(PENDING_IMPORT_RECAP_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('xspenses:import_recap_ready'));
    if (import.meta.env.DEV) {
      log('[usePostImportHandoff] queued pending import recap', { importId });
    }
  } catch (err: any) {
    error('[usePostImportHandoff] failed to queue import recap:', err);
  }
}


