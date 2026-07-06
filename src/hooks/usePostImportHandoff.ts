/**
 * Hook to handle post-import handoff flow:
 * - Uses Prime Router as the canonical orchestration path
 * - Prepares Prime summary (stores in memory, doesn't send)
 * - Manages "Prime Summary Ready" UI state
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { onBus } from '../lib/bus';
import { getSupabase } from '../lib/supabase';
import { log, error } from '../lib/logger';
import { isPostImportTriggersDisabled, isPrimeUploadNarrationEnabled } from '../lib/featureFlags';
import {
  buildUploadTimelineTruthFromRouterStatus,
  type UploadTimelineTruth,
} from '../components/chat/upload/progressTruth';

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
  byteStatus?: 'queued' | 'confirmed' | 'error' | null;
  byteTransactionCount?: number | null;
  tagStatus?: 'queued' | 'confirmed' | 'error' | null;
  tagCategoriesAssigned?: number | null;
  tagFlagsRaised?: number | null;
  ready?: boolean | null;
}

type ImportTimelineState = {
  truth: UploadTimelineTruth;
  updatedAt: string;
};

/**
 * Store for Prime summaries (key: importId)
 */
const primeSummaryStore = new Map<string, PrimeSummary>();
const primeSummaryMetaStore = new Map<string, PrimeSummaryMeta>();

const PRIME_ROUTER_STATUS_MAX_POLLS = 5;
const PRIME_ROUTER_STATUS_POLL_MS = 2000;
const PENDING_IMPORT_RECAP_KEY = 'xspenses:pending_import_recap';
const SUMMARY_REQUEST_CACHE_TTL_MS = 10000;
const primeSummaryRequestCache = new Map<string, { expiresAt: number; result: { content: string; meta?: PrimeSummaryMeta } }>();
const primeSummaryRequestInflight = new Map<string, Promise<{ content: string; meta?: PrimeSummaryMeta }>>();

function buildSummaryRequestKey(importId: string, importIds?: string[]): string {
  const base = [String(importId || '').trim(), ...((importIds || []).map((id) => String(id || '').trim()))]
    .filter(Boolean);
  const uniqueSorted = Array.from(new Set(base)).sort();
  return uniqueSorted.join('|');
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabase();
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

interface UsePostImportHandoffOptions {
  /**
   * If true, bypass the quiet-mode gate so summaries still appear in chat.
   */
  bypassQuietMode?: boolean;
  /**
   * Optional provider for currently active import IDs (batch upload context).
   */
  getBatchImportIds?: () => string[];
}

export function usePostImportHandoff(userId: string | undefined, options: UsePostImportHandoffOptions = {}) {
  const { bypassQuietMode = false } = options;
  const [primeSummaryReady, setPrimeSummaryReady] = useState<string | null>(null); // importId when ready
  const [latestSummary, setLatestSummary] = useState<PrimeSummary | null>(null);
  const [importTimelineById, setImportTimelineById] = useState<Record<string, ImportTimelineState>>({});
  const processingImportsRef = useRef<Set<string>>(new Set());
  const summaryRetryRef = useRef<Map<string, number>>(new Map());

  const setImportTimelineTruth = (importId: string, truth: UploadTimelineTruth) => {
    if (!importId) return;
    setImportTimelineById((prev) => ({
      ...prev,
      [importId]: {
        truth,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const publishPrimeSummaryReady = (importId: string) => {
    if (!importId) return;
    // Reused imports can resolve to the same importId across uploads.
    // Pulse through null so listeners fire again for this run.
    setPrimeSummaryReady(null);
    window.setTimeout(() => {
      setPrimeSummaryReady(importId);
    }, 0);
  };

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
        setImportTimelineTruth(payload.importId, {
          phase: 'extracting',
          status: 'running',
          summaryReady: false,
        });
        // Canonical orchestration: Chat -> Prime Router -> downstream functions.
        // Do not call TAG/OCR/summary endpoints directly from chat flow.
        const routerStatus = await waitForPrimeRouterStatus(payload.importId, (statusPayload) => {
          const truth = buildUploadTimelineTruthFromRouterStatus(statusPayload);
          setImportTimelineTruth(payload.importId, truth);
        });
        if (routerStatus.state === 'error') {
          error('[usePostImportHandoff] Prime router status returned error; continuing with summary fallback');
          setImportTimelineTruth(payload.importId, {
            phase: 'error',
            status: 'error',
            summaryReady: false,
          });
        } else if (routerStatus.state === 'no_input_needs_review') {
          setImportTimelineTruth(payload.importId, {
            phase: 'error',
            status: 'needs_review_no_input',
            summaryReady: false,
          });
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
          publishPrimeSummaryReady(payload.importId);
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
        setImportTimelineTruth(payload.importId, {
          phase: 'summary_ready',
          status: 'complete',
          summaryReady: true,
          needsReviewCount: prepared.meta?.needsReviewCount ?? null,
          tagRan: prepared.meta?.tagRan ?? null,
        });
        await persistSummaryToDb(summary, payload.userId);
        setLatestSummary(summary);
        enqueueImportRecapIfReady(payload.importId, prepared.content, prepared.meta);

        // STEP 5: Show "Prime Summary Ready" strip
        publishPrimeSummaryReady(payload.importId);

        // If summary is generic, retry after OCR/normalization completes
        if (isGenericSummary(prepared.content)) {
          scheduleSummaryRetry(payload.importId, payload.userId);
        }
      } catch (err: any) {
        error('[usePostImportHandoff] Error processing import completion:', err);
        setImportTimelineTruth(payload.importId, {
          phase: 'error',
          status: 'error',
          summaryReady: false,
        });
      } finally {
        // Allow same importId to be processed again on future upload runs.
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

  const scheduleSummaryRetry = (importId: string, retryUserId: string, batchImportIds?: string[]) => {
    const attempts = summaryRetryRef.current.get(importId) ?? 0;
    if (attempts >= 5) {
      return;
    }
    summaryRetryRef.current.set(importId, attempts + 1);
    setTimeout(async () => {
      try {
        const updated = await preparePrimeSummary(importId, retryUserId, batchImportIds);
        const updatedContent = updated?.content;
        if (!updatedContent) {
          scheduleSummaryRetry(importId, retryUserId, batchImportIds);
          return;
        }

        const existing = primeSummaryStore.get(importId);
        if (!existing) {
          scheduleSummaryRetry(importId, retryUserId, batchImportIds);
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
          publishPrimeSummaryReady(importId);
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
  const getPrimeSummary = useCallback((importId: string): PrimeSummary | null => {
    return primeSummaryStore.get(importId) || null;
  }, []);

  const getPrimeSummaryMeta = useCallback((importId: string): PrimeSummaryMeta | null => {
    return primeSummaryMetaStore.get(importId) || null;
  }, []);

  const getImportTimeline = useCallback((importId: string): ImportTimelineState | null => {
    return importTimelineById[importId] || null;
  }, [importTimelineById]);

  /**
   * Get the latest prepared summary (if any)
   */
  const getLatestPrimeSummary = useCallback((): PrimeSummary | null => {
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
  }, [latestSummary]);

  /**
   * Mark summary as consumed (after handoff)
   * Ensures idempotency: can be called multiple times safely
   */
  const consumePrimeSummary = useCallback((importId: string) => {
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
  }, []);

  return {
    primeSummaryReady,
    getPrimeSummary,
    getPrimeSummaryMeta,
    getImportTimeline,
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

async function preparePrimeSummary(importId: string, _userId: string, importIds?: string[]): Promise<{ content: string; meta?: PrimeSummaryMeta }> {
  const requestKey = buildSummaryRequestKey(importId, importIds);
  const now = Date.now();
  const cached = primeSummaryRequestCache.get(requestKey);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }
  const inflight = primeSummaryRequestInflight.get(requestKey);
  if (inflight) {
    return inflight;
  }

  const runRequest = (async () => {
    try {
      const authHeader = await getAuthHeader();
      const isGeneric = (content: string) =>
        content.includes('ready for your review') ||
        content.includes('categorized results and insights are available');
      const isUsableSummary = (content: string) => {
        const text = String(content || '').trim();
        if (!text || isGeneric(text)) return false;
        // Accept concise-but-real summaries too; strict heading/length checks
        // were causing valid Prime summaries to be dropped from UI handoff.
        return text.length >= 24;
      };
      let routerReportedNotReady = false;

      // Canonical orchestration endpoint for chat summary path.
      // No direct summary/TAG endpoint calls from chat flow.
      try {
        const response = await fetch('/.netlify/functions/prime-router', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ mode: 'summary', importId, importIds }),
        });
        if (response.ok) {
          const payload = await response.json();
          const terminalReason = String(
            payload?.error_code ||
            payload?.meta?.reason ||
            payload?.summary?.error_code ||
            ''
          ).toLowerCase();
          const terminalState = String(payload?.state || '').toLowerCase();
          const terminalSummary = String(payload?.summary?.summary || payload?.summary || '').trim();
          const isTerminalOcrRejection =
            terminalState === 'terminal_ocr_rejected' ||
            terminalReason === 'malformed_pdf' ||
            terminalReason === 'unusable_ocr_text' ||
            terminalReason === 'ocr_rejected';
          if (isTerminalOcrRejection) {
            const terminalContent = terminalSummary ||
              (terminalReason === 'unusable_ocr_text'
                ? 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.'
                : 'Unreadable PDF structure. Please re-save this PDF and upload the new copy.');
            return {
              content: terminalContent,
              meta: {
                tagRan: false,
                ready: false,
              },
            };
          }
          const routerSummary = payload?.summary?.summary;
          if (typeof routerSummary === 'string' && routerSummary && !isGeneric(routerSummary)) {
            const handoff = payload?.meta?.handoff || {};
            const totalProcessed =
              payload?.meta?.byteTransactionCount ??
              parseCount(routerSummary, /Parsed transactions:\s*(\d+)/i) ??
              parseCount(routerSummary, /(\d+)\s+transactions?\s+processed/i);
            const needsReview =
              payload?.meta?.needsReviewCount ??
              handoff?.tag_flags_raised ??
              parseCount(routerSummary, /Flagged for review:\s*(\d+)/i) ??
              parseCount(routerSummary, /(\d+)\s+transactions?\s+need review/i);
            const autoCount = payload?.meta?.autoCount ?? handoff?.tag_categories_assigned ?? (
              totalProcessed !== null && needsReview !== null ? Math.max(totalProcessed - needsReview, 0) : null
            );
            return {
              content: routerSummary,
              meta: {
                tagRan: payload?.meta?.tagRan ?? null,
                needsReviewCount: needsReview,
                autoCount,
                aiCount: payload?.meta?.aiCount ?? null,
                taggedCount: payload?.meta?.taggedCount ?? autoCount,
                byteStatus: handoff?.byte_status ?? null,
                byteTransactionCount: payload?.meta?.byteTransactionCount ?? handoff?.byte_transaction_count ?? totalProcessed,
                tagStatus: handoff?.tag_status ?? null,
                tagCategoriesAssigned: handoff?.tag_categories_assigned ?? autoCount,
                tagFlagsRaised: handoff?.tag_flags_raised ?? needsReview,
                ready: true,
              },
            };
          }
          if (payload?.ready === false) {
            // Router may report "not ready" while prime-summary can still return a
            // structured markdown fallback (including zero-transaction summaries).
            routerReportedNotReady = true;
          }
        }
      } catch (err: any) {
        error('[preparePrimeSummary] prime-router summary failed:', err);
      }

      // Safe fallback: direct prime-summary if router summary path fails.
      try {
        // ── Tag first so Prime reads real categories ──────────────────────
        try {
          await fetch('/.netlify/functions/tag-categorize-committed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ limit: 1000 }),
          });
        } catch {
          // non-fatal - Prime will still run, categories may be partial
        }
        // ── Now Prime reads categorized data ─────────────────────────────
        const toSummaryResponse = (fallbackSummary: string) => {
            const totalProcessed =
              parseCount(fallbackSummary, /Parsed transactions:\s*(\d+)/i) ??
              parseCount(fallbackSummary, /(\d+)\s+transactions?\s+processed/i);
            const needsReview =
              parseCount(fallbackSummary, /Flagged for review:\s*(\d+)/i) ??
              parseCount(fallbackSummary, /(\d+)\s+transactions?\s+need review/i);
            const taggedCount = totalProcessed !== null && needsReview !== null ? Math.max(totalProcessed - needsReview, 0) : null;
            return {
              content: fallbackSummary,
              meta: {
                needsReviewCount: needsReview,
                taggedCount,
                byteStatus: totalProcessed !== null ? 'confirmed' : null,
                byteTransactionCount: totalProcessed,
                tagStatus: needsReview !== null ? 'confirmed' : null,
                tagCategoriesAssigned: taggedCount,
                tagFlagsRaised: needsReview,
                ready: true,
              },
            };
        };
        {
          {
            for (let i = 0; i < 5; i += 1) {
              await new Promise((resolve) => setTimeout(resolve, 600));
              const retryRes = await fetch('/.netlify/functions/prime-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ importId, importIds }),
              });
              if (!retryRes.ok) continue;
              const retryPayload = await retryRes.json().catch(() => ({}));
              const retrySummary = String(retryPayload?.summary || '');
              if (isUsableSummary(retrySummary)) {
                return toSummaryResponse(retrySummary);
              }
              if (String(retryPayload?.state || '').toLowerCase() !== 'already_processing') {
                break;
              }
            }
          }
        }
      } catch (err: any) {
        error('[preparePrimeSummary] prime-summary fallback failed:', err);
      }

      return {
        content: "Your categorized results and insights are available.",
        meta: { tagRan: false, ready: !routerReportedNotReady ? null : false },
      };
    } catch (err: any) {
      error('[preparePrimeSummary] Error:', err);
      return { content: "Your categorized results and insights are available.", meta: { tagRan: false, ready: false } };
    }
  })();

  primeSummaryRequestInflight.set(requestKey, runRequest);
  try {
    const result = await runRequest;
    primeSummaryRequestCache.set(requestKey, {
      expiresAt: Date.now() + SUMMARY_REQUEST_CACHE_TTL_MS,
      result,
    });
    return result;
  } finally {
    primeSummaryRequestInflight.delete(requestKey);
  }
}

async function waitForPrimeRouterStatus(
  importId: string,
  onUpdate?: (payload: any) => void
): Promise<{ state: 'complete' | 'error' | 'running_timeout' | 'no_input_needs_review'; payload?: any }> {
  const authHeader = await getAuthHeader();
  for (let i = 0; i < PRIME_ROUTER_STATUS_MAX_POLLS; i += 1) {
    try {
      const response = await fetch('/.netlify/functions/prime-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ mode: 'status', importId, autoCommit: false }),
      });
      if (response.ok) {
        const payload = await response.json();
        onUpdate?.(payload);
        const detailItems = Array.isArray(payload?.details?.items) ? payload.details.items : [];
        const needsReviewNoInput = detailItems.some((item: any) => {
          const itemStatus = String(item?.status || '').toLowerCase();
          const ocrStatus = String(item?.ocrStatus || '').toLowerCase();
          return itemStatus === 'done' && (ocrStatus === 'needs_review' || ocrStatus === 'rejected');
        });
        if (needsReviewNoInput) {
          return { state: 'no_input_needs_review', payload };
        }
        if (payload?.status === 'complete') {
          return { state: 'complete', payload };
        }
        if (payload?.status === 'error') {
          return { state: 'error', payload };
        }
      }
    } catch (err: any) {
      error('[waitForPrimeRouterStatus] Poll failed:', err);
      return { state: 'running_timeout' };
    }
    await new Promise((resolve) => setTimeout(resolve, PRIME_ROUTER_STATUS_POLL_MS));
  }
  return { state: 'running_timeout' };
}

function buildImportRecapText(params: { summary: string; meta?: PrimeSummaryMeta }): string {
  const cleaned = String(params.summary || '')
    .replace(/\t+/g, ' ')
    .replace(/[ \u00A0]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!cleaned) return 'Your categorized results and insights are available.';
  // Match Prime's polished Step 3 style and avoid appending legacy recap prose.
  return cleaned.replace(/\n+\s*Categorization status[\s\S]*$/i, '').trim();
}

function enqueueImportRecapIfReady(importId: string, summary: string, meta?: PrimeSummaryMeta) {
  if (typeof window === 'undefined') return;
  // Prime narration mode owns upload messaging end-to-end.
  // Avoid injecting legacy recap text that can appear as an abrupt extra bubble.
  if (isPrimeUploadNarrationEnabled()) return;
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


