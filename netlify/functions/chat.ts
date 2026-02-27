// @wiring:byte-docs
// @area:chat/routing-and-tools
// @purpose:Routes to employees, runs tools, and persists messages/tool calls used by audits.

/**
 * 💬 Unified Chat Endpoint
 * 
 * Complete chat system with:
 * - 🛡️ Unified Guardrails (moderation + PII masking) - ALL employees protected
 * - Employee routing (Prime, Byte, Crystal, Finley, Goalie, Liberty, Blitz, etc.)
 * - Memory retrieval and storage
 * - Streaming responses (SSE)
 * - Session management
 * - 🗄️ Custodian: Conversation summaries (non-blocking, async)
 * 
 * GUARDRAILS INTEGRATION:
 * - All user messages go through runInputGuardrails() BEFORE routing/model calls
 * - PII masking happens FIRST (before any API calls or storage)
 * - Content moderation and jailbreak detection run on masked text
 * - All employees (Prime, Liberty, Tag, etc.) share the same protection layer
 * - Blocked messages return safe, user-friendly responses (no crashes)
 * 
 * API Format:
 * POST /.netlify/functions/chat
 * Body: { userId, employeeSlug?, message, sessionId?, stream?: true }
 * 
 * Response: Streaming SSE with tokens, or JSON if stream=false
 * 
 * SESSION FLOW:
 * 1. Frontend generates a stable sessionId per user + employee (stored in localStorage)
 * 2. Frontend passes sessionId in request body: { sessionId: "uuid-here", ... }
 * 3. Backend calls ensureSession(sb, userId, sessionId, employeeSlug):
 *    - If sessionId exists and is valid → reuse it
 *    - If sessionId missing/invalid → create new session in chat_sessions table
 * 4. Backend calls getRecentMessages(sessionId) to load conversation history
 * 5. Backend saves new messages to chat_messages table with session_id
 * 6. Next request with same sessionId will load previous messages → maintains context
 * 
 * RECENT CHANGES (2025-01-20):
 * - Added Custodian conversation summary generation (updateConversationSummaryForCustodian)
 *   - Runs asynchronously after messages are saved (non-blocking)
 *   - Generates title, summary, and tags using OpenAI
 *   - Upserts into chat_convo_summaries table
 *   - Wrapped in try/catch to prevent chat failures
 * - Module system: Uses ES modules (package.json "type": "module")
 *   - Netlify.toml configured with node_bundler = "esbuild" for proper ES module support
 *   - All imports use .js extensions for ES module compatibility
 * - Export: Uses named export `export const handler: Handler` (Netlify standard)
 */

import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { admin } from './_shared/supabase.js';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { 
  getGuardrailConfig, 
  runInputGuardrails, 
  sendBlockedResponse, 
  type GuardrailContext 
} from './_shared/guardrails-unified.js';
import { routeToEmployee } from './_shared/router.js';
// Phase 2.1: Use unified memory API
import { 
  getMemory, 
  queueMemoryExtraction,
  // Keep backward compatibility exports for now
  recall,
  upsertFact,
  extractFactsFromMessages
} from './_shared/memory.js';
import { ensureSession, getRecentMessages } from './_shared/session.js';
import { ensureThread, backfillThreadId } from './_shared/ensureThread.js';
import { buildResponseHeaders } from './_shared/headers.js';
import { getEmployeeModelConfig } from './_shared/employeeModelConfig.js';
import { buildFinancialSnapshot } from './_shared/financial-snapshot.js';
import {
  runByteWorkerExtraction as sharedRunByteWorkerExtraction,
  normalizeByteWorkerOutput as sharedNormalizeByteWorkerOutput,
  buildByteWorkerFallbackOutput as sharedBuildByteWorkerFallbackOutput,
} from './_shared/byteWorker.js';
import {
  runCrystalWorkerInsights as sharedRunCrystalWorkerInsights,
  normalizeCrystalWorkerOutput as sharedNormalizeCrystalWorkerOutput,
  buildCrystalWorkerFallbackOutput as sharedBuildCrystalWorkerFallbackOutput,
} from './_shared/crystalWorker.js';
import {
  runFinleyWorkerPlan as sharedRunFinleyWorkerPlan,
  normalizeFinleyWorkerOutput as sharedNormalizeFinleyWorkerOutput,
  buildFinleyWorkerFallbackOutput as sharedBuildFinleyWorkerFallbackOutput,
} from './_shared/finleyWorker.js';
import {
  compareScenarios,
  computePayoffSchedule,
  normalizeFrequency as normalizePayoffFrequency,
  type PayoffInput,
} from './_shared/financePayoff.js';
import {
  resolveLoanFacts,
  type LoanType,
} from './_shared/loanFacts.js';
import {
  runFinleyPayoffPlanner,
  normalizeFinleyPayoffOutput,
  buildFinleyPayoffFallbackOutput,
} from './_shared/finleyPayoffPlanner.js';
import {
  buildPrimeHelpFastLaneAnswer,
  detectPrimeHelpFastLaneIntent,
} from './_shared/primeHelpFastLane.js';
import { renderStatementBreakdownMarkdown } from './_lib/renderStatementBreakdown.js';
import { sanitizePrimeResponse } from './_shared/primeResponseSanitizer.js';
import { detectRecurringTransactions } from './_shared/recurringDetector.js';
import {
  classifyPrimeLane,
  buildPrimeAuthoritySystemMessage,
  type PrimeLane,
} from './_shared/primePolicy.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { logAiActivity } from './_shared/logAiActivity.js';
import { buildContextInjection } from './_shared/contextInjection.js';
import { buildEmployeeJobContextSystemMessage } from './_shared/employeeJobContext.js';
import { fetchAiUserContext, buildAiContextSystemMessage } from '../../src/lib/ai/userContext.js';
import { AI_FLUENCY_GLOBAL_SYSTEM_RULE, PRIME_ORCHESTRATION_RULE } from '../../src/lib/ai/systemPrompts.js';
import { buildEmployeeBrainSystemPrompt } from '../../src/lib/ai/brains/registry.js';
// AI Fluency: Event logging
import { logUserEvent, recalcFluency } from '../../src/lib/ai/userActivity.js';
import OpenAI from 'openai';
// Import tool system for Tag tools
import { toOpenAIToolDefs, pickTools, executeTool } from '../../src/agent/tools/index.js';
import type { ToolContext } from '../../src/agent/tools/index.js';
// Rate limiting (optional - fails open if not available)
// Note: Import handled dynamically in handler to avoid breaking if module doesn't exist

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  userId: string;
  employeeSlug?: string | null;
  message: string;
  sessionId?: string;
  threadId?: string; // Optional thread ID (if provided, ensures that thread exists)
  client_message_id?: string; // Optional client-generated ID for user message dedupe
  request_id?: string; // Optional client-generated request ID for assistant dedupe
  stream?: boolean;
  systemPromptOverride?: string; // Custom system prompt from frontend (e.g., category/transaction context)
  documentIds?: string[]; // Document IDs from Smart Import uploads
  prime_context?: { // Optional PrimeState snapshot (convenience overlay, verified server-side)
    displayName: string | null;
    timezone: string | null;
    currency: string | null;
    currentStage: 'novice' | 'guided' | 'power' | null;
    financialSnapshot: {
      hasTransactions: boolean;
      uncategorizedCount: number;
      monthlySpend?: number;
      topCategories?: Array<{ name: string; amount: number }>;
      hasDebt?: boolean;
      hasGoals?: boolean;
    } | null;
    memorySummary: {
      factsCount?: number;
      lastUpdatedAt?: string;
      recentFacts?: string[];
    } | null;
    lastTagOutput?: any;
  } | null;
}

type OrchStage =
  | 'ingress'
  | 'guardrails'
  | 'routing'
  | 'deterministic_brains'
  | 'memory'
  | 'model_config'
  | 'model_streaming'
  | 'model_non_streaming'
  | 'respond';

type OrchestrationTimings = {
  request_started_at: number;
  stage_started_at: number;
  stage_durations_ms: Partial<Record<OrchStage, number>>;
};

type OrchCtx = {
  requestId: string;
  threadId: string | null;
  sessionId: string | null;
  employee: string | null;
  stage: OrchStage;
  failed_stage: OrchStage | null;
  fallback_used: boolean;
  deterministic_path: string | null;
  deterministic_intent: string | null;
  worker_outputs: Record<string, any>;
  worker_output_hashes: Record<string, string>;
  tag_saved: boolean;
  pipeline_snapshot_loaded: boolean;
  pipeline_snapshot_saved: boolean;
  reuse_path: 'none' | 'tag_only' | 'tag+crystal' | 'full';
  recurring_detected: boolean;
  recurring_count: number;
  payoff_engine_used: boolean;
  loan_type: string | null;
  help_fast_lane_used: boolean;
  help_fast_lane_intent?: string | null;
  memory_used: boolean;
  memory_skip_reason?: string | null;
  openai_timeout: boolean;
  employee_profile_cache_hit?: boolean | null;
  timeout_label?: string | null;
  timeout_ms?: number | null;
  telemetry_metadata?: Record<string, any>;
  persist_worker_output?: (key: string, value: any) => Promise<boolean> | boolean;
  timings: OrchestrationTimings;
};

type PipelineSnapshot = {
  ts: string;
  doc_ids?: string[];
  loan_type?: string;
  loan_facts?: Partial<PayoffInput>;
  byte?: { doc_type: string; period?: string | null; tx_count: number; confidence: number };
  tag?: {
    tx_count: number;
    spend_count: number;
    category_totals?: any[];
    flags?: any[];
    recurring_candidates?: Array<{
      merchant: string;
      occurrences: number;
      avg_amount: number;
      cadence: "monthly" | "weekly" | "quarterly" | "unknown";
      confidence: number;
      last_seen: string;
      category: string;
    }>;
    recurring_summary?: {
      total_monthly_estimate: number;
      total_detected: number;
    };
  };
  crystal?: { insights_count: number; flags?: any[] };
  finley?: { steps_count: number; reminders_count: number; goals_count: number };
  hashes: { byte?: string; tag?: string; crystal?: string; finley?: string };
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
  console.warn('[Chat] OpenAI API key not configured');
}

type RuntimeCacheEntry<T> = { expiresAt: number; value: T };
type EmployeeProfileCacheEntry = {
  tools_allowed: string[] | null;
  system_prompt: string | null;
  fetchedAt: number;
};
type LastTxSearchCacheEntry = {
  ids: string[];
  createdAt: number;
};
type ForcedTxSearchLatchEntry = {
  argsKey: string;
  createdAt: number;
};
const EMPLOYEE_PROFILE_TTL_MS = 5 * 60 * 1000;
const LAST_TX_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const FORCED_TX_SEARCH_DEDUPE_MS = 10 * 1000;
const employeeProfileCache = new Map<string, EmployeeProfileCacheEntry>();
const lastTxSearchCache = new Map<string, LastTxSearchCacheEntry>();
const forcedTxSearchLatch = new Map<string, ForcedTxSearchLatchEntry>();
const runtimeCache = {
  userProfile: new Map<string, RuntimeCacheEntry<any>>(),
  aiUserContext: new Map<string, RuntimeCacheEntry<any>>(),
  threadLookup: new Map<string, RuntimeCacheEntry<any>>(),
};

function getRuntimeCacheTtlSeconds(isNetlifyDev: boolean): number {
  const raw = Number(process.env.PRIME_CACHE_TTL_SECONDS || 0);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  // Safe default: dev-only short cache, disabled in prod unless explicitly enabled.
  return isNetlifyDev ? 45 : 0;
}

function readRuntimeCache<T>(
  map: Map<string, RuntimeCacheEntry<T>>,
  key: string,
): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function writeRuntimeCache<T>(
  map: Map<string, RuntimeCacheEntry<T>>,
  key: string,
  value: T,
  ttlSeconds: number,
): void {
  if (ttlSeconds <= 0) return;
  map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getEmployeeProfileCached(
  sb: SupabaseClient,
  slug: string,
  orchCtx?: OrchCtx | null
): Promise<{ tools_allowed: string[] | null; system_prompt: string | null }> {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) {
    if (orchCtx) orchCtx.employee_profile_cache_hit = false;
    return { tools_allowed: [], system_prompt: null };
  }

  const now = Date.now();
  const cacheHit = employeeProfileCache.get(normalizedSlug);
  if (cacheHit && (now - cacheHit.fetchedAt) < EMPLOYEE_PROFILE_TTL_MS) {
    if (orchCtx) orchCtx.employee_profile_cache_hit = true;
    return {
      tools_allowed: Array.isArray(cacheHit.tools_allowed) ? cacheHit.tools_allowed : [],
      system_prompt: typeof cacheHit.system_prompt === 'string' ? cacheHit.system_prompt : null,
    };
  }

  if (orchCtx) orchCtx.employee_profile_cache_hit = false;
  try {
    const { data, error } = await sb
      .from('employee_profiles')
      .select('tools_allowed, system_prompt')
      .eq('slug', normalizedSlug)
      .maybeSingle();
    if (error) {
      console.warn(`[Chat] Employee profile query failed for ${normalizedSlug}:`, error);
      return { tools_allowed: [], system_prompt: null };
    }
    const entry: EmployeeProfileCacheEntry = {
      tools_allowed: Array.isArray((data as any)?.tools_allowed) ? (data as any).tools_allowed : [],
      system_prompt: typeof (data as any)?.system_prompt === 'string' ? (data as any).system_prompt : null,
      fetchedAt: now,
    };
    employeeProfileCache.set(normalizedSlug, entry);
    return {
      tools_allowed: entry.tools_allowed,
      system_prompt: entry.system_prompt,
    };
  } catch (error: any) {
    console.warn(`[Chat] Employee profile cache fallback for ${normalizedSlug}:`, error?.message || error);
    return { tools_allowed: [], system_prompt: null };
  }
}

class OpenAiTimeoutError extends Error {
  readonly isOpenAiTimeout = true;
  readonly timeoutMs: number;
  readonly timeoutLabel: string;

  constructor(message: string, timeoutMs: number, timeoutLabel: string) {
    super(message);
    this.name = 'OpenAiTimeoutError';
    this.timeoutMs = timeoutMs;
    this.timeoutLabel = timeoutLabel;
  }
}

function isOpenAiTimeoutError(error: any): error is OpenAiTimeoutError {
  return Boolean(error?.isOpenAiTimeout === true || error?.name === 'OpenAiTimeoutError');
}

function resolveOpenAiTimeoutMs(): number {
  const isDev = process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development';
  return isDev ? 12000 : 25000;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  orchCtx: OrchCtx | null | undefined,
  abortController?: AbortController
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (abortController) {
        try {
          abortController.abort();
        } catch {
          // no-op
        }
      }
      if (orchCtx) {
        orchCtx.fallback_used = true;
        orchCtx.openai_timeout = true;
        orchCtx.timeout_label = label;
        orchCtx.timeout_ms = ms;
      }
      reject(new OpenAiTimeoutError(`Timed out: ${label}`, ms, label));
    }, ms);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize sessionId to handle various input types safely
 */
function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
    const v = (raw as any).id;
    if (typeof v === 'string') return v;
  }
  return null;
}

function flagEnabled(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function isPrimeChatGptStyleModeEnabled(): boolean {
  const raw =
    process.env.PRIME_CHATGPT_STYLE_MODE ??
    process.env.VITE_PRIME_CHATGPT_STYLE_MODE;
  // Default ON for Prime quality consistency; env can explicitly disable.
  if (typeof raw === 'undefined') return true;
  return flagEnabled(raw);
}

function applyPrimeChatStyleModelConfig(
  config: { model: string; temperature: number; maxTokens: number },
  opts: { employeeSlug: string | null | undefined; qualityMode: boolean; preferLongForm: boolean }
): { model: string; temperature: number; maxTokens: number } {
  if (!opts.qualityMode) return config;
  const slug = String(opts.employeeSlug || '').toLowerCase();
  const isPrime = slug === 'prime-boss' || slug === 'prime';
  if (!isPrime) return config;
  const next = { ...config };
  const preferredModel = String(process.env.OPENAI_PRIME_CHAT_MODEL || '').trim();
  if (preferredModel) {
    next.model = preferredModel;
  } else if (/mini/i.test(String(next.model || ''))) {
    // Prime quality mode should avoid lightweight "mini" models by default.
    next.model = 'gpt-4o';
  }
  next.temperature = Math.min(Number(next.temperature || 0.3), 0.35);
  const minTokens = opts.preferLongForm ? 1200 : 280;
  next.maxTokens = Math.max(
    Number(next.maxTokens || 0),
    minTokens
  );
  return next;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency || 'CAD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'CAD'} ${Number(amount || 0).toFixed(2)}`;
  }
}

function buildPrimeSnapshotBreakdown(
  primeContext: ChatRequest['prime_context'],
  userLabel: string,
): string | null {
  const snapshot = primeContext?.financialSnapshot;
  if (!snapshot || !snapshot.hasTransactions) return null;
  const currency = String(primeContext?.currency || 'CAD');
  const topCategories = Array.isArray(snapshot.topCategories) ? snapshot.topCategories : [];
  const monthlySpend = typeof snapshot.monthlySpend === 'number' ? snapshot.monthlySpend : null;
  const uncategorized = typeof snapshot.uncategorizedCount === 'number' ? snapshot.uncategorizedCount : null;

  const lines: string[] = [];
  lines.push(`${userLabel ? `${userLabel}, ` : ''}here is your current breakdown from account data.`);
  lines.push('');
  lines.push('SPENDING SNAPSHOT');
  if (monthlySpend !== null) {
    lines.push(`- Total monthly spend: ${formatCurrency(monthlySpend, currency)}`);
  }
  if (uncategorized !== null) {
    lines.push(`- Uncategorized transactions: ${uncategorized}`);
  }
  if (topCategories.length > 0) {
    lines.push('');
    lines.push('TOP CATEGORIES');
    topCategories.slice(0, 5).forEach((cat, idx) => {
      lines.push(`- ${idx + 1}) ${cat.name}: ${formatCurrency(Number(cat.amount || 0), currency)}`);
    });
  }
  lines.push('');
  lines.push('WHAT THIS MEANS');
  lines.push('- Your largest categories are where optimization opportunities will show first.');
  lines.push('- Reclassifying uncategorized items will improve category accuracy immediately.');
  lines.push('');
  lines.push('NEXT STEPS');
  lines.push('- Ask: "show category-by-category breakdown with actions".');
  lines.push('- Ask: "what should I fix first this month?".');
  return lines.join('\n');
}

type PrimeIntent = {
  label: 'upload_howto' | 'breakdown_report' | 'general';
  isBreakdownReport: boolean;
  isUploadHowTo: boolean;
};

type TemporalIntent = 'date' | 'time' | 'datetime' | null;
type GroundedFactsIntent = 'monthly_spend' | 'uncategorized_count' | 'top_categories' | 'snapshot_overview' | null;
type ClarificationDecision = {
  question: string;
  reason: 'missing_timeframe' | 'missing_comparison_target' | 'missing_data_source';
};
type CoachingIntent = 'debt_payoff' | 'savings_plan' | 'budget_coach' | 'stress_support' | null;
type InsightIntent = 'spending_analysis' | 'risk_alerts' | 'savings_opportunities' | 'tax_insights' | null;
type PredictiveIntent = 'month_end_forecast' | 'overspend_trajectory' | 'subscription_renewal' | null;
type AutomationIntent = 'export_report' | 'reconcile_accounts' | 'categorize_batch' | 'ingestion_sync' | null;

function detectPrimeIntent(message: string): PrimeIntent {
  const text = String(message || '').toLowerCase();
  const isUploadHowTo =
    /\b(how\s+do\s+i\s+upload|how\s+to\s+upload|where\s+do\s+i\s+upload|where\s+to\s+upload)\b/.test(text);
  const isBreakdownReport =
    /\b(break\s*down|breakdown|report|cashflow|categories?|last month|spend|spending|budget|summary|statement|transactions?)\b/.test(text);
  if (isUploadHowTo) return { label: 'upload_howto', isBreakdownReport, isUploadHowTo };
  if (isBreakdownReport) return { label: 'breakdown_report', isBreakdownReport, isUploadHowTo };
  return { label: 'general', isBreakdownReport, isUploadHowTo };
}

function detectTemporalIntent(message: string): TemporalIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  const datePattern =
    /\b(what(?:'s| is)\s+(?:the\s+)?date|today(?:'s)?\s+date|date\s+today|what\s+day\s+is\s+it|which\s+day\s+is\s+it)\b/i;
  const timePattern =
    /\b(what(?:'s| is)\s+(?:the\s+)?time|current\s+time|time\s+now|what\s+time\s+is\s+it)\b/i;
  const dateWordPattern = /\b(today|date)\b/i;
  const timeWordPattern = /\b(time|clock)\b/i;

  const asksDate = datePattern.test(text) || (dateWordPattern.test(text) && !timeWordPattern.test(text));
  const asksTime = timePattern.test(text) || (timeWordPattern.test(text) && !dateWordPattern.test(text));
  const asksBoth = datePattern.test(text) && timePattern.test(text);

  if (asksBoth) return 'datetime';
  if (asksDate) return 'date';
  if (asksTime) return 'time';
  return null;
}

function formatTemporalResponse(intent: Exclude<TemporalIntent, null>, timezone: string | null): string {
  const now = new Date();
  const locale = 'en-CA';
  let zone = timezone || undefined;

  if (zone) {
    try {
      // Validate timezone early so we can fall back cleanly.
      new Intl.DateTimeFormat(locale, { timeZone: zone }).format(now);
    } catch {
      zone = undefined;
    }
  }

  const dateText = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(zone ? { timeZone: zone } : {}),
  }).format(now);

  const timeText = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...(zone ? { timeZone: zone } : {}),
  }).format(now);

  if (intent === 'datetime') {
    return zone
      ? `Right now it is ${dateText} at ${timeText} (${zone}).`
      : `Right now it is ${dateText} at ${timeText}.`;
  }
  if (intent === 'time') {
    return zone
      ? `The current time is ${timeText} (${zone}).`
      : `The current time is ${timeText}.`;
  }
  return zone
    ? `Today's date is ${dateText} (${zone}).`
    : `Today's date is ${dateText}.`;
}

function detectGroundedFactsIntent(message: string): GroundedFactsIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  const monthlySpendPattern =
    /\b(how much (did|do) i spend|monthly spend|spent this month|spending this month|total spend(?:ing)?(?: this month)?)\b/i;
  const uncategorizedPattern =
    /\b(uncategorized|not categorized|unclassified)\b.*\b(transactions?|spend|expenses?)\b|\bhow many uncategorized\b/i;
  const topCategoriesPattern =
    /\b(top|largest|main)\s+(categories?|spending categories?)\b|\bwhich categories do i spend\b/i;
  const overviewPattern =
    /\b(financial snapshot|money snapshot|spending snapshot|quick summary|overview of my finances?)\b/i;

  if (monthlySpendPattern.test(text)) return 'monthly_spend';
  if (uncategorizedPattern.test(text)) return 'uncategorized_count';
  if (topCategoriesPattern.test(text)) return 'top_categories';
  if (overviewPattern.test(text)) return 'snapshot_overview';
  return null;
}

function buildGroundedFactsResponse(
  intent: Exclude<GroundedFactsIntent, null>,
  primeContext: ChatRequest['prime_context']
): string {
  const snapshot = primeContext?.financialSnapshot;
  const currency = String(primeContext?.currency || 'CAD');

  if (!snapshot || !snapshot.hasTransactions) {
    return "I don't have enough transaction data loaded yet to answer that reliably. If you sync or upload your latest statements, I can give you an exact number.";
  }

  const monthlySpend = typeof snapshot.monthlySpend === 'number' ? snapshot.monthlySpend : null;
  const uncategorizedCount =
    typeof snapshot.uncategorizedCount === 'number' ? snapshot.uncategorizedCount : null;
  const topCategories = Array.isArray(snapshot.topCategories) ? snapshot.topCategories : [];

  if (intent === 'monthly_spend') {
    if (monthlySpend === null) {
      return "I have transaction data, but this snapshot doesn't include a reliable monthly spend total yet. I can recalculate it after a fresh sync.";
    }
    return `Your current monthly spend is ${formatCurrency(monthlySpend, currency)} based on the latest loaded snapshot.`;
  }

  if (intent === 'uncategorized_count') {
    if (uncategorizedCount === null) {
      return "I can see transactions, but I don't have a confirmed uncategorized count in this snapshot yet.";
    }
    return `You currently have ${uncategorizedCount} uncategorized transaction${uncategorizedCount === 1 ? '' : 's'}.`;
  }

  if (intent === 'top_categories') {
    if (topCategories.length === 0) {
      return "I don't have top-category totals in this snapshot yet. After your next sync, I can rank your largest categories.";
    }
    const list = topCategories
      .slice(0, 3)
      .map((c, i) => `${i + 1}) ${c.name}: ${formatCurrency(Number(c.amount || 0), currency)}`)
      .join('; ');
    return `Your top spending categories right now are ${list}.`;
  }

  const parts: string[] = [];
  if (monthlySpend !== null) parts.push(`monthly spend ${formatCurrency(monthlySpend, currency)}`);
  if (uncategorizedCount !== null) parts.push(`${uncategorizedCount} uncategorized`);
  if (topCategories.length > 0) {
    const top = topCategories
      .slice(0, 2)
      .map((c) => `${c.name} (${formatCurrency(Number(c.amount || 0), currency)})`)
      .join(', ');
    parts.push(`top categories: ${top}`);
  }

  if (parts.length === 0) {
    return "I have partial account data, but not enough structured snapshot metrics yet. I can refresh and give you a full overview after sync.";
  }
  return `Here is your current snapshot: ${parts.join(' | ')}.`;
}

function getClarificationDecision(
  message: string,
  primeContext: ChatRequest['prime_context'],
  employeeSlug: string | null | undefined
): ClarificationDecision | null {
  const slug = String(employeeSlug || '').toLowerCase();
  const isPrime = slug === 'prime-boss' || slug === 'prime';
  if (!isPrime) return null;

  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  const financeQuestion =
    /\b(spend|spending|budget|categories?|transactions?|cashflow|report|summary|overview|income|expenses?)\b/i.test(text);
  if (!financeQuestion) return null;

  const asksComparison = /\b(compare|comparison|vs|versus|difference|trend)\b/i.test(text);
  const hasComparisonAnchor =
    /\b(last|previous|prior|month|week|year|before|after|baseline|target)\b/i.test(text);
  if (asksComparison && !hasComparisonAnchor) {
    return {
      reason: 'missing_comparison_target',
      question: 'Do you want me to compare this month vs last month, or a custom date range?',
    };
  }

  const asksSpendOrCategory =
    /\b(spend|spending|categories?|category|expenses?|cashflow)\b/i.test(text);
  const hasTimeframe =
    /\b(today|yesterday|this week|last week|this month|last month|this year|last year|month to date|mtd|year to date|ytd|current month)\b/i.test(text) ||
    /\bbetween\b.+\band\b/i.test(text) ||
    /\bfrom\b.+\bto\b/i.test(text);
  const asksSnapshotStyle = /\b(current|latest|snapshot|overview|right now)\b/i.test(text);
  if (asksSpendOrCategory && !hasTimeframe && !asksSnapshotStyle) {
    return {
      reason: 'missing_timeframe',
      question: 'Which timeframe should I use: this month, last month, or a custom date range?',
    };
  }

  const hasTransactions = Boolean(primeContext?.financialSnapshot?.hasTransactions);
  const asksForExactNumbers = /\b(exact|precise|total|how much|how many)\b/i.test(text);
  if (!hasTransactions && asksForExactNumbers) {
    return {
      reason: 'missing_data_source',
      question: "I don't have enough loaded transaction data yet. Do you want to sync your accounts or upload a statement first?",
    };
  }

  return null;
}

function detectCoachingIntent(message: string): CoachingIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  if (/\b(stress|stressed|anxious|overwhelmed|money anxiety|financial anxiety|panic)\b/.test(text)) {
    return 'stress_support';
  }
  if (/\b(debt|payoff|pay down|credit card balance|loan)\b/.test(text)) {
    return 'debt_payoff';
  }
  if (/\b(save|savings|emergency fund|set aside|saving target|goal)\b/.test(text)) {
    return 'savings_plan';
  }
  if (/\b(budget|spending plan|cut spending|reduce spending|plan my spending)\b/.test(text)) {
    return 'budget_coach';
  }
  return null;
}

function buildCoachingResponse(intent: Exclude<CoachingIntent, null>, primeContext: ChatRequest['prime_context']): string {
  const fs = primeContext?.financialSnapshot;
  const currency = String(primeContext?.currency || 'CAD');
  const monthlySpend = typeof fs?.monthlySpend === 'number' ? fs.monthlySpend : null;
  const uncategorizedCount = typeof fs?.uncategorizedCount === 'number' ? fs.uncategorizedCount : null;
  const hasDebt = fs?.hasDebt === true;
  const hasData = Boolean(fs?.hasTransactions);

  if (intent === 'stress_support') {
    return hasData
      ? [
          "That sounds heavy, and you're not alone in feeling that pressure.",
          'Here is one calm next step: we pick one spending category to tighten this week, not everything at once.',
          monthlySpend !== null
            ? `Your current monthly spend baseline is ${formatCurrency(monthlySpend, currency)}.`
            : 'I can still help with a simple weekly spending checkpoint.',
          'If you want, I can build a 7-day low-stress plan now.',
        ].join(' ')
      : "That sounds really stressful. Let's keep this simple: first connect an account or upload one recent statement, then I'll build a low-stress 7-day plan with exact numbers.";
  }

  if (intent === 'debt_payoff') {
    if (!hasData) {
      return "I can absolutely help with a debt payoff plan. First, I need your latest transaction or balance data. Sync an account or upload a statement, and I'll draft a step-by-step payoff plan.";
    }
    if (!hasDebt) {
      return 'I do not currently see confirmed debt in this snapshot. If you want, I can still build a conservative payoff-style plan focused on reducing high-interest spending first.';
    }
    return [
      'Good move. Here is a simple debt-payoff framework:',
      `1) Lock a minimum monthly payoff amount based on your current spend baseline${monthlySpend !== null ? ` (${formatCurrency(monthlySpend, currency)})` : ''}.`,
      '2) Pay highest-interest debt first while keeping minimums on others.',
      '3) Add a weekly check-in to prevent re-accumulation.',
      'Say "build my payoff plan" and I will turn this into concrete numbers.',
    ].join(' ');
  }

  if (intent === 'savings_plan') {
    if (!hasData) {
      return "I can build a savings plan, but I need recent account activity first. Connect/sync or upload one statement, then I'll propose a realistic weekly savings target.";
    }
    const starterTarget = monthlySpend !== null ? Math.max(50, Math.round(monthlySpend * 0.05)) : 100;
    return [
      'Great target. Let us start with a realistic plan:',
      `- Starter monthly transfer: ${formatCurrency(starterTarget, currency)}.`,
      '- Set one fixed transfer day each week.',
      '- Review only one category for cuts each week (not all categories at once).',
      'If you want, I can break this into a 4-week checklist.',
    ].join(' ');
  }

  // budget_coach
  if (!hasData) {
    return "I can coach your budget, but I need a baseline first. Once you sync or upload a recent statement, I will give you a focused plan by category.";
  }
  return [
    'Here is a focused budget coaching plan:',
    monthlySpend !== null ? `- Current monthly spend baseline: ${formatCurrency(monthlySpend, currency)}.` : '- Baseline captured from your latest snapshot.',
    uncategorizedCount !== null ? `- First fix: categorize ${uncategorizedCount} uncategorized transactions.` : '- First fix: clean up uncategorized transactions.',
    '- Then reduce only your top 1-2 categories this month.',
    'If you want, I can generate your exact category cut targets next.',
  ].join(' ');
}

function detectInsightIntent(message: string): InsightIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  if (/\b(analy[sz]e|analysis|insights?|patterns?|trend|spending breakdown)\b/.test(text)) {
    return 'spending_analysis';
  }
  if (/\b(risk|alert|warning|danger|problem area|red flag)\b/.test(text)) {
    return 'risk_alerts';
  }
  if (/\b(save|savings opportunities|reduce spending|cut costs|optimi[sz]e)\b/.test(text)) {
    return 'savings_opportunities';
  }
  if (/\b(tax|write-?off|deduct|deduction|filing)\b/.test(text)) {
    return 'tax_insights';
  }
  return null;
}

function buildInsightResponse(intent: Exclude<InsightIntent, null>, primeContext: ChatRequest['prime_context']): string {
  const fs = primeContext?.financialSnapshot;
  const currency = String(primeContext?.currency || 'CAD');
  const hasData = Boolean(fs?.hasTransactions);
  const monthlySpend = typeof fs?.monthlySpend === 'number' ? fs.monthlySpend : null;
  const uncategorizedCount = typeof fs?.uncategorizedCount === 'number' ? fs.uncategorizedCount : null;
  const topCategories = Array.isArray(fs?.topCategories) ? fs?.topCategories : [];

  if (!hasData) {
    return "I don't have enough transaction data loaded yet for reliable insights. Sync your account or upload a statement, and I'll generate a concrete analysis.";
  }

  if (intent === 'spending_analysis') {
    const top = topCategories.slice(0, 3).map((c) => `${c.name} (${formatCurrency(Number(c.amount || 0), currency)})`).join(', ');
    const parts: string[] = [];
    if (monthlySpend !== null) parts.push(`monthly spend is ${formatCurrency(monthlySpend, currency)}`);
    if (top) parts.push(`top categories are ${top}`);
    if (uncategorizedCount !== null) parts.push(`${uncategorizedCount} transactions are uncategorized`);
    return `Here is your current spending analysis: ${parts.join(' | ')}. If you want, I can turn this into a prioritized action plan.`;
  }

  if (intent === 'risk_alerts') {
    const alerts: string[] = [];
    if (uncategorizedCount !== null && uncategorizedCount > 20) {
      alerts.push(`high uncategorized volume (${uncategorizedCount}) may hide true category risk`);
    } else if (uncategorizedCount !== null && uncategorizedCount > 0) {
      alerts.push(`${uncategorizedCount} uncategorized transactions should be cleaned up`);
    }
    if (monthlySpend !== null && monthlySpend > 0) {
      alerts.push(`watch your highest category because most monthly leakage usually comes from top-1 spending`);
    }
    if (alerts.length === 0) {
      alerts.push('no major structural risk signal in this snapshot, but continue weekly monitoring');
    }
    return `Risk scan: ${alerts.join(' | ')}.`;
  }

  if (intent === 'tax_insights') {
    if (topCategories.length === 0) {
      return 'I can help with tax insights, but I need categorized transactions first. Once categories are cleaned up, I can highlight likely deductible patterns.';
    }
    return 'Tax insight starter: keep business-like categories clean, attach receipts to high-value transactions, and mark ambiguous items for review before filing. I can generate a pre-filing checklist next.';
  }

  // savings_opportunities
  const topCategory = topCategories[0];
  if (!topCategory) {
    return 'Savings opportunity: first classify uncategorized transactions, then target your largest category for a 10% cut to create immediate savings room.';
  }
  const cutAmount = Math.max(10, Math.round(Number(topCategory.amount || 0) * 0.1));
  return `Savings opportunity: your largest category is ${topCategory.name}. A 10% reduction there would free about ${formatCurrency(cutAmount, currency)} this month.`;
}

function detectPredictiveIntent(message: string): PredictiveIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  if (/\b(forecast|predict|projection|projected|at this pace|end of month|month[- ]end)\b/.test(text)) {
    return 'month_end_forecast';
  }
  if (/\b(overspend|over budget|going over|run out|trajectory)\b/.test(text)) {
    return 'overspend_trajectory';
  }
  if (/\b(subscription|renewal|recurring charge|auto[- ]renew)\b/.test(text)) {
    return 'subscription_renewal';
  }
  return null;
}

function buildPredictiveResponse(intent: Exclude<PredictiveIntent, null>, primeContext: ChatRequest['prime_context']): string {
  const fs = primeContext?.financialSnapshot;
  const currency = String(primeContext?.currency || 'CAD');
  const monthlySpend = typeof fs?.monthlySpend === 'number' ? fs.monthlySpend : null;
  const hasData = Boolean(fs?.hasTransactions) && monthlySpend !== null;

  if (intent === 'subscription_renewal') {
    return hasData
      ? 'I can flag likely recurring charges, but I need a dedicated recurring-analysis pass to confirm exact renewal dates. If you want, ask me to run recurring detection next.'
      : "I can't predict subscription renewals yet because I don't have enough loaded transaction history. Sync or upload statements and I can analyze recurring charges.";
  }

  if (!hasData) {
    return "I can't produce a reliable forecast yet because I don't have enough current-month transaction data. Sync or upload your latest statement and I'll project your month-end trajectory.";
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = Math.max(1, now.getDate());
  const projectedMonthEndSpend = Math.round((monthlySpend! / elapsedDays) * daysInMonth);
  const paceDelta = projectedMonthEndSpend - monthlySpend!;

  if (intent === 'overspend_trajectory') {
    if (paceDelta <= 0) {
      return `Current trajectory looks stable. At this pace, projected month-end spend is about ${formatCurrency(projectedMonthEndSpend, currency)}.`;
    }
    return `Overspend trajectory alert: at your current pace, month-end spend projects to about ${formatCurrency(projectedMonthEndSpend, currency)} (about ${formatCurrency(paceDelta, currency)} above your current run-rate).`;
  }

  // month_end_forecast
  return `Forecast: at your current pace, projected month-end spend is about ${formatCurrency(projectedMonthEndSpend, currency)}. Current spend so far is ${formatCurrency(monthlySpend!, currency)} after ${elapsedDays}/${daysInMonth} days.`;
}

function isPayoffProjectionIntent(message: string): boolean {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return false;
  return /\b(pay ?off|payoff|how long|mortgage end|amorti[sz]ation|interest saved|extra payment|lump sum|refinance|rate change|debt free|loan|car loan|what if|if i pay|if i add)\b/.test(text);
}

function formatDurationFromDays(days: number): string {
  const safeDays = Math.max(0, Math.round(Number(days || 0)));
  const months = Math.round(safeDays / 30.4375);
  if (months >= 24) {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years} years ${remMonths} months` : `${years} years`;
  }
  return `${months} months`;
}

function parseScenarioAdjustments(message: string, baseline: PayoffInput): Partial<PayoffInput> {
  const text = String(message || '').toLowerCase();
  const out: Partial<PayoffInput> = {};
  const parseAmount = (value: string | undefined): number | null => {
    if (!value) return null;
    const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
  };
  const baselineFreq = normalizePayoffFrequency(baseline.paymentFrequency);
  const baselinePpy = baselineFreq.paymentsPerYear || 12;

  const extraMatch =
    text.match(/\bextra\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:\/|\s+per\s+)?(week|weekly|biweekly|bi-weekly|month|monthly|payment)?\b/i) ||
    text.match(/\b(?:add|pay)\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:more)?\s*(?:\/|\s+per\s+)?(week|weekly|biweekly|bi-weekly|month|monthly|payment)?\b/i);
  const lumpMatch = text.match(/\b(?:lump sum|one[- ]time|one time)\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\b/i);
  const rateMatch = text.match(/\b(?:rate|apr|interest rate)\s*(?:to|is|at)?\s*([0-9]{1,2}(?:\.[0-9]+)?)\s*%/i);

  if (extraMatch) {
    const amount = parseAmount(extraMatch[1]);
    const unitRaw = String(extraMatch[2] || 'payment').toLowerCase();
    if (amount !== null) {
      let scenarioPerPay = amount;
      if (unitRaw === 'week' || unitRaw === 'weekly') {
        scenarioPerPay = (amount * 52) / baselinePpy;
      } else if (unitRaw === 'biweekly' || unitRaw === 'bi-weekly') {
        scenarioPerPay = (amount * 26) / baselinePpy;
      } else if (unitRaw === 'month' || unitRaw === 'monthly') {
        scenarioPerPay = (amount * 12) / baselinePpy;
      }
      out.extraPayment = Math.max(0, Math.round(scenarioPerPay * 100) / 100);
    }
  }

  if (lumpMatch) {
    const lump = parseAmount(lumpMatch[1]);
    if (lump !== null) out.lumpSum = Math.max(0, lump);
  }

  if (rateMatch) {
    const apr = parseAmount(rateMatch[1]);
    if (apr !== null) out.annualRate = Math.max(0, apr);
  }

  return out;
}

function buildPayoffMissingQuestion(missing: string[], hints: string[]): string {
  const ask = missing.join(', ');
  const hintLine = hints.length > 0 ? `\nHint: ${hints[0]}` : '';
  return `I can calculate this, I just need: ${ask}.\nExample: balance $36,720, rate 9.49%, payment $223.88 weekly.${hintLine}`;
}

function buildPayoffEvidenceBlock(input: {
  currency: string;
  baseline: any;
  scenario?: any;
  baselineInput: PayoffInput;
  scenarioInput?: PayoffInput;
  comparison?: { delta?: { interestSaved?: number; periodsSaved?: number; timeSavedDays?: number } };
}): string {
  const baseAssumptions = `Assumptions used: balance ${formatCurrency(input.baselineInput.principal, input.currency)}, rate ${Number(input.baselineInput.annualRate).toFixed(2)}%, payment ${formatCurrency(input.baselineInput.paymentAmount, input.currency)} ${input.baselineInput.paymentFrequency}`;
  const baselineLine = `Baseline payoff: ${input.baseline?.payoffDateISO || 'not reached'}, interest ${formatCurrency(input.baseline?.totalInterest || 0, input.currency)}.`;
  if (!input.scenario || !input.scenarioInput) {
    return [baseAssumptions, baselineLine].join('\n');
  }
  const scenarioLine = `Scenario payoff: ${input.scenario?.payoffDateISO || 'not reached'}, interest ${formatCurrency(input.scenario?.totalInterest || 0, input.currency)}.`;
  const saved = Number(input.comparison?.delta?.interestSaved || 0);
  const savedTime = formatDurationFromDays(Number(input.comparison?.delta?.timeSavedDays || 0));
  const deltaLine = `Savings vs baseline: ${formatCurrency(saved, input.currency)} interest, time saved ${savedTime}.`;
  return [baseAssumptions, baselineLine, scenarioLine, deltaLine].join('\n');
}

function detectAutomationIntent(message: string): AutomationIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  if (/\b(export|csv|sheet|report|download|send report)\b/.test(text)) {
    return 'export_report';
  }
  if (/\b(reconcile|match transactions?|bank match|duplicate match)\b/.test(text)) {
    return 'reconcile_accounts';
  }
  if (/\b(categorize all|batch categorize|auto[- ]?categorize|categorize transactions?)\b/.test(text)) {
    return 'categorize_batch';
  }
  if (/\b(sync|refresh data|import latest|ingest|pull latest)\b/.test(text)) {
    return 'ingestion_sync';
  }
  return null;
}

function buildAutomationResponse(
  intent: Exclude<AutomationIntent, null>,
  primeContext: ChatRequest['prime_context']
): string {
  const hasTransactions = Boolean(primeContext?.financialSnapshot?.hasTransactions);

  if (intent === 'export_report') {
    return hasTransactions
      ? 'I can prepare that export. Confirm the format and scope: CSV or Sheet, and this month or a custom range.'
      : "I can export once data is loaded. First sync accounts or upload a statement, then I'll generate the report.";
  }

  if (intent === 'reconcile_accounts') {
    return hasTransactions
      ? 'I can run a reconciliation pass. Confirm whether you want strict duplicate matching only, or fuzzy matching for likely equivalents too.'
      : "I need loaded transactions before I can reconcile. Sync or import first, then I'll run matching.";
  }

  if (intent === 'categorize_batch') {
    return hasTransactions
      ? 'I can run batch categorization. Confirm if you want conservative mode (high confidence only) or aggressive mode (maximize coverage).'
      : "I can do that once transactions are available. Sync/import first, then I'll batch-categorize.";
  }

  // ingestion_sync
  return 'I can start a fresh sync/import workflow now. Confirm your source: bank sync, statement PDF, or receipt batch.';
}

type PrimeRouteDecision =
  | { lane: 'deterministic'; deterministic_path: string; deterministic_intent: string; assistantText: string }
  | { lane: 'worker_chain'; reason: 'upload_import' }
  | { lane: 'model' };

type MemoryNeed = {
  need: boolean;
  reason: string;
};

export function shouldUseMemoryV2(args: {
  messageText: string;
  employeeSlug: string;
  primeDecision?: PrimeRouteDecision;
  hasAttachments: boolean;
  pipelineSnapshotLoaded: boolean;
}): MemoryNeed {
  const text = String(args.messageText || '').trim().toLowerCase();
  if (!text) return { need: false, reason: 'empty_message' };

  if (args.primeDecision?.lane === 'deterministic') {
    return { need: false, reason: `deterministic_${args.primeDecision.deterministic_path || 'lane'}` };
  }

  // Upload/statement turns should route to worker-chain or deterministic paths, not memory.
  if (args.hasAttachments) {
    return { need: false, reason: 'attachments_present' };
  }

  const faqOrGuidancePatterns = [
    /\bhow do i upload\b/i,
    /\bdo you accept\b/i,
    /\bfile types?\b/i,
    /\bsteps?\b/i,
    /\bwhere do i find\b/i,
    /\bwhat is xspensesai\b/i,
    /\bhow to upload\b/i,
  ];
  if (faqOrGuidancePatterns.some((p) => p.test(text))) {
    return { need: false, reason: 'faq_or_upload_howto' };
  }

  const explicitDataReference =
    /\bbased on my (data|spending|statements?|transactions?)\b/i.test(text) ||
    /\bmy statements?\b/i.test(text) ||
    /\bmy transactions?\b/i.test(text) ||
    /\bfrom my data\b/i.test(text);
  if (explicitDataReference) {
    return { need: true, reason: 'explicit_my_data_reference' };
  }

  const personalRecallPatterns = [
    /\bremember\b/i,
    /\blast time we said\b/i,
    /\bwhat did you learn about me\b/i,
  ];
  if (personalRecallPatterns.some((p) => p.test(text))) {
    return { need: true, reason: 'personal_recall' };
  }

  const recurringAnalysisPatterns = [
    /\bsubscriptions?\b/i,
    /\brecurring\b/i,
    /\bbills?\b/i,
    /\bpayments?\b/i,
    /\bmerchant\b/i,
    /\bwhere is my money going\b/i,
    /\bpaid for\b/i,
    /\bspent for\b/i,
    /\bspend for\b/i,
  ];
  if (recurringAnalysisPatterns.some((p) => p.test(text))) {
    return { need: true, reason: 'recurring_or_merchant_analysis' };
  }

  const dataQuestionPatterns = [
    /\bwhat did i spend\b/i,
    /\bhow much did i spend\b/i,
    /\blast month\b/i,
    /\bthis month\b/i,
    /\bcompare\b/i,
    /\btrend\b/i,
    /\bbudget\b/i,
    /\bcash\s*flow\b/i,
    /\bhow much (did i )?(pay|paid)\b/i,
    /\bhow much.*\bfor\b/i,
  ];
  if (dataQuestionPatterns.some((p) => p.test(text))) {
    return { need: true, reason: 'data_question' };
  }

  const correctionOrLearningPatterns = [
    /\b(recategorize|re-categorize|change category|set category|move to category)\b/i,
    /\b(this is wrong|that is wrong|fix this|correct this line)\b/i,
    /\b(learn this|remember this merchant|save this correction)\b/i,
  ];
  if (correctionOrLearningPatterns.some((p) => p.test(text))) {
    return { need: true, reason: 'correction_or_learning_intent' };
  }

  // Generic coaching should stay fast unless clearly data-grounded.
  if (/\b(how can i save money|give me a plan)\b/i.test(text) && !/\bbased on my\b/i.test(text)) {
    return { need: false, reason: 'generic_coaching_no_data' };
  }

  // Keep old behavior safety: Prime fast lane generally skips memory.
  if (
    args.employeeSlug === 'prime-boss' &&
    !args.pipelineSnapshotLoaded &&
    text.length <= 40 &&
    !/\b(statement|upload|import|merchant|cursor|payment|paid|spent|category|correct|fix)\b/i.test(text)
  ) {
    return { need: false, reason: 'short_prime_turn' };
  }

  return { need: false, reason: 'default_skip_v2' };
}

function isUploadImportIntent(message: string, hasAttachments: boolean): boolean {
  if (hasAttachments) return true;
  const text = String(message || '').trim().toLowerCase();
  if (!text) return false;
  return /\b(upload|import|statement|bank statement|receipt|ocr|parse|document|file|ingest)\b/.test(text);
}

function isTransactionQuestionForTxSearch(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(transaction|transactions|spend|spending|spent|charge|charges|merchant|category|categories|amount|how much|show me|what did i spend|purchase|purchases|fuel|groceries|dining|dashed|doordash|amazon|compare|versus|vs|deductible|write[- ]?off|tax|policy|limit)\b/.test(text);
}

function isCategoryChangeIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(change|recategorize|re-categorize|set)\b.*\b(category|to)\b|\bcategory\b.*\b(change|set|to)\b/.test(text);
}

function isUncategorizedIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(uncategorized|unclassified|not categorized|missing category|needs category|what'?s left|clean up categories|fix categories)\b/.test(text);
}

function isCompareIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(compare|compared to|vs\.?|versus|month over month|year over year)\b/.test(text);
}

function isTopCategoryIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(biggest|largest|top)\b.*\b(category|categories)\b|\b(top category|top categories)\b/.test(text);
}

function isTopMerchantIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(top merchants?|largest merchants?|where am i spending most)\b/.test(text);
}

function isLikelyDeductibleIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(deductible|deduction|write[- ]?off|business expense|tax)\b/.test(text);
}

function isPolicyCheckIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(policy|limit|over \$?\d+|exceed|cap|meals over)\b/.test(text);
}

function buildTxDeterministicFormatHint(message: string): string | null {
  if (isCompareIntent(message)) {
    return [
      'TX_RESPONSE_FORMAT (compare):',
      '- Period A total: <amount>',
      '- Period B total: <amount>',
      '- Delta: <amount> (<percent>)',
      '- Narrative: <one sentence on biggest driver>',
    ].join('\n');
  }
  if (isTopCategoryIntent(message)) {
    return [
      'TX_RESPONSE_FORMAT (top categories):',
      '- 1) <Category> | <Amount>',
      '- 2) <Category> | <Amount>',
      '- 3) <Category> | <Amount>',
      '- Narrative: <one sentence insight>',
    ].join('\n');
  }
  if (isTopMerchantIntent(message)) {
    return [
      'TX_RESPONSE_FORMAT (top merchants):',
      '- 1) <Merchant> | <Amount>',
      '- 2) <Merchant> | <Amount>',
      '- 3) <Merchant> | <Amount>',
      '- Narrative: <one sentence insight>',
    ].join('\n');
  }
  if (isLikelyDeductibleIntent(message)) {
    return [
      'TX_RESPONSE_FORMAT (likely deductible):',
      '- Likely deductible (rule-based): <list>',
      '- Confidence note: "These are likely matches; please confirm."',
      '- Ask for confirmation before any category changes.',
    ].join('\n');
  }
  if (isPolicyCheckIntent(message)) {
    return [
      'TX_RESPONSE_FORMAT (policy warnings):',
      '- Warning: <item> | <amount> | <rule>',
      '- This is advisory only (no automatic writes).',
      '- Ask if user wants recategorization support.',
    ].join('\n');
  }
  return null;
}

function txNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractTxSearchResults(toolCalls: any[], toolResults: any[]): Array<{ rows: any[]; totals: any }> {
  const toolNameById = new Map<string, string>();
  for (const tc of toolCalls || []) {
    const id = String(tc?.id || '');
    const name = String(tc?.function?.name || '');
    if (id && name) toolNameById.set(id, name);
  }
  const out: Array<{ rows: any[]; totals: any }> = [];
  for (const tr of toolResults || []) {
    const callId = String((tr as any)?.tool_call_id || '');
    if (toolNameById.get(callId) !== 'tx_search') continue;
    const parsed = parseToolResultContent((tr as any)?.content);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    const totals = parsed?.totals && typeof parsed.totals === 'object' ? parsed.totals : {};
    out.push({ rows, totals });
  }
  return out;
}

function computeCompareMetricsFromTxResults(txResults: Array<{ rows: any[]; totals: any }>): {
  aSpend: number;
  bSpend: number;
  delta: number;
  pct: number;
} | null {
  if (!Array.isArray(txResults) || txResults.length < 2) return null;
  const a = txResults[txResults.length - 2]?.totals || {};
  const b = txResults[txResults.length - 1]?.totals || {};
  const aSpend = txNum((a as any).spending || Math.abs(txNum((a as any).sum)));
  const bSpend = txNum((b as any).spending || Math.abs(txNum((b as any).sum)));
  const delta = bSpend - aSpend;
  const pct = aSpend > 0 ? (delta / aSpend) * 100 : 0;
  return { aSpend, bSpend, delta, pct };
}

function buildVendorRuleAmbiguityHint(message: string, toolCalls: any[], toolResults: any[]): string | null {
  const rule = extractVendorCategoryRule(message);
  if (!rule) return null;
  const txResults = extractTxSearchResults(toolCalls, toolResults);
  if (txResults.length === 0) return null;
  const latestRows = Array.isArray(txResults[txResults.length - 1]?.rows) ? txResults[txResults.length - 1].rows : [];
  const vendorNeedle = String(rule.vendor || '').trim().toLowerCase();
  if (!vendorNeedle) return null;

  const plausible = latestRows.filter((r: any) => {
    const merchant = String(r?.merchant_normalized || r?.merchant || r?.description || '').toLowerCase();
    return merchant.includes(vendorNeedle);
  });

  if (plausible.length === 0) {
    return 'TX_VENDOR_RULE_AMBIGUITY: No clear merchant match found for vendor rule. Ask one quick follow-up before calling tx_update_category.';
  }

  const merchantSet = new Set(
    plausible
      .map((r: any) => String(r?.merchant_normalized || r?.merchant || r?.description || '').trim())
      .filter(Boolean)
  );
  if (merchantSet.size > 1) {
    return `TX_VENDOR_RULE_AMBIGUITY: Multiple plausible merchants matched (${Array.from(merchantSet).slice(0, 4).join(', ')}). Ask one quick follow-up or call tx_get first; do not run tx_update_category yet.`;
  }
  return null;
}

function buildTxDeterministicMetricsHint(message: string, toolCalls: any[], toolResults: any[]): string | null {
  const txResults = extractTxSearchResults(toolCalls, toolResults);
  if (txResults.length === 0) return null;

  const latest = txResults[txResults.length - 1];
  const rows = latest.rows || [];
  const merchantAmount = new Map<string, number>();
  const categoryAmount = new Map<string, number>();
  for (const row of rows) {
    const amt = Math.abs(txNum((row as any)?.amount));
    const merchant = String((row as any)?.merchant_normalized || (row as any)?.merchant || (row as any)?.description || 'UNKNOWN-MERCHANT').trim();
    const category = String((row as any)?.category || 'Uncategorized').trim() || 'Uncategorized';
    merchantAmount.set(merchant, (merchantAmount.get(merchant) || 0) + amt);
    categoryAmount.set(category, (categoryAmount.get(category) || 0) + amt);
  }

  if (isCompareIntent(message) && txResults.length >= 2) {
    const metrics = computeCompareMetricsFromTxResults(txResults);
    if (!metrics) return null;
    return [
      'TX_COMPUTED_METRICS:',
      `- Period A spend: ${formatCurrency(metrics.aSpend, 'CAD')}`,
      `- Period B spend: ${formatCurrency(metrics.bSpend, 'CAD')}`,
      `- Delta: ${formatCurrency(metrics.delta, 'CAD')} (${metrics.pct.toFixed(1)}%)`,
      '- Use these computed metrics exactly in your response.',
    ].join('\n');
  }

  if (isTopCategoryIntent(message)) {
    const top = Array.from(categoryAmount.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
    return [
      'TX_COMPUTED_METRICS:',
      ...top.map(([name, amt], i) => `- ${i + 1}) ${name} | ${formatCurrency(amt, 'CAD')}`),
      '- Use these computed category totals exactly in your response.',
    ].join('\n');
  }

  if (isTopMerchantIntent(message)) {
    const top = Array.from(merchantAmount.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
    return [
      'TX_COMPUTED_METRICS:',
      ...top.map(([name, amt], i) => `- ${i + 1}) ${name} | ${formatCurrency(amt, 'CAD')}`),
      '- Use these computed merchant totals exactly in your response.',
    ].join('\n');
  }

  if (isLikelyDeductibleIntent(message)) {
    const likely = rows.filter((r: any) => {
      const text = `${r?.category || ''} ${r?.merchant_normalized || ''} ${r?.merchant || ''} ${r?.description || ''}`.toLowerCase();
      return /\b(office|software|subscription|internet|phone|fuel|travel|business|supplies|hosting|cloud)\b/.test(text);
    }).slice(0, 5);
    return [
      'TX_COMPUTED_METRICS:',
      `- Likely deductible count: ${likely.length}`,
      ...likely.map((r: any) => `- ${String(r?.date || 'UNKNOWN-DATE')} | ${String(r?.merchant_normalized || r?.merchant || 'UNKNOWN-MERCHANT')} | ${formatCurrency(Math.abs(txNum(r?.amount)), 'CAD')} | ${String(r?.category || 'Uncategorized')}`),
      '- Mark these as likely only and ask for confirmation.',
    ].join('\n');
  }

  if (isPolicyCheckIntent(message)) {
    const warnings = rows.filter((r: any) => {
      const text = `${r?.category || ''} ${r?.merchant_normalized || ''} ${r?.merchant || ''} ${r?.description || ''}`.toLowerCase();
      const amt = Math.abs(txNum(r?.amount));
      const isMeal = /\b(meal|restaurant|dining|food)\b/.test(text);
      return isMeal && amt > 50;
    }).slice(0, 10);
    return [
      'TX_COMPUTED_METRICS:',
      `- Policy warnings count: ${warnings.length}`,
      ...warnings.map((r: any) => `- ${String(r?.date || 'UNKNOWN-DATE')} | ${String(r?.merchant_normalized || r?.merchant || 'UNKNOWN-MERCHANT')} | ${formatCurrency(Math.abs(txNum(r?.amount)), 'CAD')} | rule: meals over $50`),
      '- Advisory only; no automatic writes.',
    ].join('\n');
  }

  return null;
}

function extractVendorCategoryRule(message: string): { vendor: string; category: string } | null {
  const text = String(message || '').trim();
  if (!text) return null;
  const m =
    text.match(/\ball\s+(.+?)\s*=\s*(.+)\b/i) ||
    text.match(/\ball\s+(.+?)\s+should\s+be\s+(.+)\b/i);
  if (!m?.[1] || !m?.[2]) return null;
  const vendor = String(m[1]).trim();
  const category = String(m[2]).trim();
  if (!vendor || !category) return null;
  return { vendor, category };
}

function parseOrdinalSelection(message: string): number | null {
  const text = String(message || '').toLowerCase();
  if (!text) return null;
  if (/\b(1st|first)\b/.test(text)) return 1;
  if (/\b(2nd|second)\b/.test(text)) return 2;
  if (/\b(3rd|third)\b/.test(text)) return 3;
  if (/\b(4th|fourth)\b/.test(text)) return 4;
  if (/\b(5th|fifth)\b/.test(text)) return 5;
  if (/\b(that one|this one)\b/.test(text)) return 1;
  return null;
}

function readLastTxSearchIds(sessionId: string): string[] | null {
  const hit = lastTxSearchCache.get(sessionId);
  if (!hit) return null;
  if ((Date.now() - hit.createdAt) > LAST_TX_SEARCH_CACHE_TTL_MS) {
    lastTxSearchCache.delete(sessionId);
    return null;
  }
  return hit.ids;
}

function writeLastTxSearchIds(sessionId: string, ids: string[]): void {
  if (!sessionId) return;
  lastTxSearchCache.set(sessionId, {
    ids: ids.slice(0, 25),
    createdAt: Date.now(),
  });
}

function shouldRunForcedTxSearch(sessionId: string, args: Record<string, any>): boolean {
  if (!sessionId) return true;
  const now = Date.now();
  const existing = forcedTxSearchLatch.get(sessionId);
  if (existing && (now - existing.createdAt) > FORCED_TX_SEARCH_DEDUPE_MS) {
    forcedTxSearchLatch.delete(sessionId);
  }
  const argsKey = JSON.stringify(args || {});
  const hit = forcedTxSearchLatch.get(sessionId);
  if (hit && hit.argsKey === argsKey) return false;
  forcedTxSearchLatch.set(sessionId, { argsKey, createdAt: now });
  return true;
}

function shouldIncludePendingInTxSearch(message: string): boolean {
  const text = String(message || '').toLowerCase();
  return /\b(pending|needs review|need review|uploaded but not committed|not committed|staging)\b/.test(text);
}

function mentionsStatementImportContext(message: string): boolean {
  const text = String(message || '').toLowerCase();
  return /\b(statement|import|upload|uploaded|this statement|that statement|latest statement|last upload|what i uploaded|which statement)\b/.test(text);
}

function isStatementBreakdownIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  const explicitStatementContext = mentionsStatementImportContext(text)
    || /\b(uploaded|uploaded statement|what i uploaded|which statement|that upload|that statement)\b/.test(text);
  const breakdownAsks = /\b(break\s*down|breakdown|what'?s on|what is on|summar(?:y|ize)|summarise|what did you find|findings|show me|list|totals?|categories?)\b/.test(text);
  const statementDetailAsks = /\b(due date|minimum payment|min payment|new balance|credit limit|available credit|account last[-\s]?4|last[-\s]?4|issuer|institution|card|visa|mastercard|credit card|bank statement|statement type|statement period|period start|period end)\b/.test(text);
  return (explicitStatementContext && breakdownAsks) || statementDetailAsks;
}

function isStatementQaIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text.trim()) return false;
  const monthMentioned = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec|last month|this month)\b/.test(text);
  const statementKeywords = /\b(statement|transactions?|charges?|spend|spent|total|totals|category|categories|merchant|deposits?|income|refunds?|balance|fees?|interest|largest|biggest|top\s+\d+)\b/.test(text);
  const styleOnlyQuestion = /\b(visa|mastercard|bank statement|statement type|issuer|institution|due date|minimum payment|credit limit|available credit)\b/.test(text);
  if (styleOnlyQuestion && !/\b(transactions?|charges?|spend|spent|total|category|merchant|income|deposits?|refunds?|fees?|interest|largest|biggest|top\s+\d+)\b/.test(text)) {
    return false;
  }
  return statementKeywords || monthMentioned;
}

function asksForLatestStatement(message: string): boolean {
  const text = String(message || '').toLowerCase();
  return /\b(latest|last|most recent|previous|prior)\s+(statement|upload|import|document)\b/.test(text);
}

function extractImportIdFromMessage(message: string): string | null {
  const text = String(message || '');
  const uuidMatch = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
  return uuidMatch ? String(uuidMatch[0]) : null;
}

function extractAmountRangeHint(message: string): { minAmount?: number; maxAmount?: number; _hasDollar?: boolean; _raw?: number } {
  const text = String(message || '');
  const amountMatch = text.match(/(\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
  if (!amountMatch) return {};
  const hasDollar = Boolean(amountMatch[1]);
  const parsed = Number(String(amountMatch[2]).replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return {};
  if (parsed >= 1000 && !hasDollar) return {};
  const center = Math.abs(parsed);
  const delta = center * 0.12;
  return {
    minAmount: Math.max(0, Number((center - delta).toFixed(2))),
    maxAmount: Number((center + delta).toFixed(2)),
    _hasDollar: hasDollar,
    _raw: parsed,
  };
}

function extractDateRangeHint(message: string, now: Date = new Date()): { startDate?: string; endDate?: string } {
  const text = String(message || '').toLowerCase();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (/\blast month\b/.test(text)) {
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
    const end = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0);
    return { startDate: fmt(start), endDate: fmt(end) };
  }

  const monthMap: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5,
    july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
  };
  const monthRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b(?:\s+([0-9]{4}))?/i;
  const monthMatch = text.match(monthRegex);
  if (!monthMatch) return {};
  const monthKey = String(monthMatch[1]).toLowerCase();
  const monthIndex = monthMap[monthKey];
  if (typeof monthIndex !== 'number') return {};
  const year = monthMatch[2] ? Number(monthMatch[2]) : now.getFullYear();
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return {};
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function extractQueryHint(message: string): string | null {
  const text = String(message || '').trim();
  if (!text) return null;

  const showAllMatch = text.match(/\bshow me(?: all)?\s+(.+?)\s+(?:in|for|on)\s+(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec|last month)\b/i);
  if (showAllMatch?.[1]) return String(showAllMatch[1]).trim();

  const spendOnMatch = text.match(/\bspen[dt]\s+on\s+(.+?)\s+(?:last month|this month|in\s+\w+)/i);
  if (spendOnMatch?.[1]) return String(spendOnMatch[1]).trim();

  const chargeMatch = text.match(/\b(?:that|the)?\s*(?:\$?\s*[0-9][0-9.,]*)?\s*([a-zA-Z][a-zA-Z0-9&' -]{2,})\s+charge\b/i);
  if (chargeMatch?.[1]) return String(chargeMatch[1]).trim();

  return null;
}

function parseToolResultContent(content: unknown): any {
  if (typeof content !== 'string') return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function encodePluginPayloadForHandoff(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  try {
    const json = JSON.stringify(payload);
    if (!json || json === '{}') return null;
    return Buffer.from(json, 'utf8').toString('base64');
  } catch {
    return null;
  }
}

function decodePluginPayloadFromHandoffSummary(summary: string | null | undefined): Record<string, any> | null {
  const raw = String(summary || '');
  const marker = raw.match(/PLUGIN_CONTEXT_B64:([A-Za-z0-9+/=]+)/);
  if (!marker?.[1]) return null;
  try {
    const decoded = Buffer.from(marker[1], 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, any>;
  } catch {
    return null;
  }
}

function stripPluginMarkerFromSummary(summary: string | null | undefined): string | undefined {
  const raw = String(summary || '');
  if (!raw) return undefined;
  const stripped = raw.replace(/\n?PLUGIN_CONTEXT_B64:[A-Za-z0-9+/=]+\s*$/m, '').trim();
  return stripped || undefined;
}

function didLastTxUpdateCategorySucceed(toolCalls: any[], toolResults: any[]): boolean {
  const toolNameById = new Map<string, string>();
  for (const tc of toolCalls || []) {
    const id = String(tc?.id || '');
    const name = String(tc?.function?.name || '');
    if (id && name) toolNameById.set(id, name);
  }

  for (let i = (toolResults || []).length - 1; i >= 0; i--) {
    const result = toolResults[i];
    const callId = String(result?.tool_call_id || '');
    if (toolNameById.get(callId) !== 'tx_update_category') continue;
    const parsed = parseToolResultContent(result?.content);
    return Boolean(parsed && typeof parsed === 'object' && parsed.ok === true);
  }
  return false;
}

async function resolveImportIdContextForTurn(
  message: string,
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  let importId = extractImportIdFromMessage(message);
  if (!importId && mentionsStatementImportContext(message)) {
    const latestImport = await loadLatestImportSummaryBestEffort(sb, userId);
    if (latestImport?.importId) importId = latestImport.importId;
  }
  return importId || null;
}

function buildTxUpdateRefreshSystemMessage(args: {
  didUpdate: boolean;
  importId: string | null;
}): string | null {
  if (!args.didUpdate) return null;
  if (args.importId) {
    return [
      'Category update succeeded. If importId is available, call tx_search with {"importId":"'+args.importId+'","includePending":true,"limit":200} to refresh totals.',
      'Then respond with: Updated statement summary: Income, Spending, Net, Count, Pending, Uncategorized.',
      "After summary, ask: 'Want me to fix the remaining Uncategorized ones?'",
    ].join('\n');
  }
  return 'Category update succeeded. Do not call tx_search automatically without statement context. Ask exactly: "Which statement/month should I refresh?"';
}

function routePrime(
  ctx: OrchCtx,
  sanitizedUserText: string,
  meta: {
    employeeSlug: string | null | undefined;
    hasAttachments: boolean;
    primeContext: ChatRequest['prime_context'];
  }
): PrimeRouteDecision {
  const isPrimeEmployee = meta.employeeSlug === 'prime-boss' || meta.employeeSlug === 'prime';
  if (!isPrimeEmployee) return { lane: 'model' };

  const temporalIntent = detectTemporalIntent(sanitizedUserText);
  if (temporalIntent && !meta.hasAttachments) {
    const assistantText = formatTemporalResponse(temporalIntent, meta.primeContext?.timezone || null);
    return {
      lane: 'deterministic',
      deterministic_path: 'temporal',
      deterministic_intent: temporalIntent,
      assistantText,
    };
  }

  const groundedFactsIntent = detectGroundedFactsIntent(sanitizedUserText);
  if (groundedFactsIntent && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'grounded_facts',
      deterministic_intent: groundedFactsIntent,
      assistantText: buildGroundedFactsResponse(groundedFactsIntent, meta.primeContext),
    };
  }

  const clarificationDecision = getClarificationDecision(sanitizedUserText, meta.primeContext, meta.employeeSlug);
  if (clarificationDecision && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'clarification',
      deterministic_intent: clarificationDecision.reason,
      assistantText: clarificationDecision.question,
    };
  }

  if (isPayoffProjectionIntent(sanitizedUserText) && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'payoff_engine',
      deterministic_intent: 'payoff_projection',
      assistantText: 'I can run that payoff projection. Share balance, rate, payment, and frequency if any are missing.',
    };
  }

  const predictiveIntent = detectPredictiveIntent(sanitizedUserText);
  if (predictiveIntent && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'predictive_finance',
      deterministic_intent: predictiveIntent,
      assistantText: buildPredictiveResponse(predictiveIntent, meta.primeContext),
    };
  }

  const coachingIntent = detectCoachingIntent(sanitizedUserText);
  if (coachingIntent && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'coaching',
      deterministic_intent: coachingIntent,
      assistantText: buildCoachingResponse(coachingIntent, meta.primeContext),
    };
  }

  const insightIntent = detectInsightIntent(sanitizedUserText);
  if (insightIntent && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'financial_insight',
      deterministic_intent: insightIntent,
      assistantText: buildInsightResponse(insightIntent, meta.primeContext),
    };
  }

  const automationIntent = detectAutomationIntent(sanitizedUserText);
  if (automationIntent && !meta.hasAttachments) {
    return {
      lane: 'deterministic',
      deterministic_path: 'automation',
      deterministic_intent: automationIntent,
      assistantText: buildAutomationResponse(automationIntent, meta.primeContext),
    };
  }

  if (isUploadImportIntent(sanitizedUserText, meta.hasAttachments)) {
    return { lane: 'worker_chain', reason: 'upload_import' };
  }

  return { lane: 'model' };
}

function shouldUseHelpFastLane(messageText: string): { use: boolean; intent?: string } {
  return detectPrimeHelpFastLaneIntent(messageText);
}

function isPrimeSnapshotThin(primeContext: ChatRequest['prime_context']): boolean {
  const fs = primeContext?.financialSnapshot;
  if (!fs) return true;
  const hasTotals = typeof fs.monthlySpend === 'number';
  const hasUncategorized = typeof fs.uncategorizedCount === 'number';
  const hasCategories = Array.isArray(fs.topCategories) && fs.topCategories.length > 0;
  const hasTransactionSignal = fs.hasTransactions === true;
  return !(hasTotals || hasUncategorized || hasCategories || hasTransactionSignal);
}

function isGenericUploadTemplateReply(text: string): boolean {
  const normalized = String(text || '').toLowerCase();
  return /\b(please upload|upload your statement|attach your document|how to upload your statement|steps to upload|find the upload section|locate the upload section|you can upload it|you('?ll| will)? need to upload|upload it first|once uploaded|select ["']?upload statement["']?)\b/.test(normalized);
}

function buildPrimeDeterministicRewrite(input: {
  hasDocs: boolean;
  hasSnapshot: boolean;
}): string {
  const knownInfo = input.hasSnapshot
    ? '- I currently have account snapshot data available.'
    : '- I do not currently have a complete account snapshot for this request.';
  return [
    'Direct answer: I can help with what is already available right now.',
    '',
    'What I used:',
    knownInfo,
    `- Uploaded document in this turn: ${input.hasDocs ? 'yes' : 'no'}`,
    '',
    'Next steps:',
    '- If you want statement-specific details, share the statement period (for example: Jan 2026).',
    '',
    'Quick question: Which statement month should I use?',
  ].join('\n');
}

const TAG_WORKER_SYSTEM_PROMPT = `ROLE
You are TAG, the financial categorization worker for the Prime orchestration system.

You DO NOT talk directly to the user.
You output structured data only for Prime to summarize.

GOAL
Given extracted financial statement text or transaction JSON:
1) Confirm all pages were processed.
2) Extract all transactions.
3) Categorize each transaction.
4) Produce totals and insights for Prime.
5) Never return empty output.

CRITICAL RULES
- Never skip pages. If a page contains legal info only, label it "legal/info".
- Transfers and payments must NOT be counted as spending.
- Bank/credit card payments reduce liabilities, not expenses.
- ATM withdrawals are transfers unless explicit spending context exists.
- Always output JSON only. No conversational text.

CATEGORIES TO USE
Income
Transfer
Bank Fee
Credit Card Payment
Subscription
Software/AI
Fitness/Health
Retail
Groceries
Dining
Cash Withdrawal
Insurance
Utilities
Other

TAX HINT VALUES
business_possible
personal_likely
transfer
unknown

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "pages_processed": number,
  "account_summary": {
    "opening_balance": number|null,
    "closing_balance": number|null,
    "total_deposits": number|null,
    "total_withdrawals": number|null
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD"|null,
      "description": "...",
      "amount": number,
      "direction": "debit"|"credit",
      "category": "...",
      "is_spend": true|false,
      "tax_hint": "...",
      "confidence": number,
      "needs_review": true|false,
      "reason": "short explanation"
    }
  ],
  "category_totals": [
    {
      "category": "...",
      "total": number,
      "count": number
    }
  ],
  "insights_for_prime": [
    "short factual insights only"
  ]
}`;

export const BYTE_WORKER_SYSTEM_PROMPT = `ROLE
You are BYTE, the document ingestion + extraction worker for XspensesAI.
You DO NOT respond to the user. Output STRICT JSON ONLY for Prime/TAG/Crystal.

GOAL
Given raw extracted text from a financial document (bank statement, credit card statement, receipt, invoice):
1) Detect document type and key metadata (institution, period, currency).
2) Detect and label pages/sections (summary | transactions | legal/info | unknown).
3) Extract a normalized transaction list.
4) Extract account-level totals/balances when present.
5) Provide extraction quality signals.

HARD RULES
- Do NOT hallucinate. If you cannot find a field, set it to null and flag needs_review=true.
- Do NOT invent transactions. Only extract what exists in the text.
- If legal pages exist, label them "legal/info" and do not treat them as transactions.
- Preserve traceability: keep the original line/description in description_raw.
- Use CAD unless text explicitly indicates another currency.
- Output JSON only. No markdown. No extra text.
- Be bank-format-agnostic: support column and wording variants across institutions.
- Never include full unmasked account/card numbers in output (mask when present).

FORMAT VARIANTS TO HANDLE
- Opening balance synonyms: "opening balance", "balance forward", "previous balance", "beginning balance".
- Deposits synonyms: "deposits", "credits", "payments received".
- Withdrawals synonyms: "withdrawals", "debits", "purchases", "charges".
- Transaction table variants:
  - Separate debit/credit columns.
  - Single amount column with sign or CR/DR markers.
  - Rows with running balance column.
- If multiple account numbers appear, extract primary account first and set needs_review=true with warning.

INPUT
You will receive:
- document_text: string (may include multiple pages concatenated; may be imperfect OCR)
- optional: filename, doc_id, user hints

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "doc_type": "bank_statement"|"credit_card_statement"|"receipt"|"invoice"|"unknown",
  "institution": "string|null",
  "statement_period": "string|null",
  "currency": "CAD"|"USD"|"other"|null,
  "pages_detected": [
    { "page_index": number, "page_kind": "summary"|"transactions"|"legal/info"|"unknown", "notes": "string" }
  ],
  "account_summary": {
    "opening_balance": number|null,
    "closing_balance": number|null,
    "total_deposits": number|null,
    "total_withdrawals": number|null,

    "previous_balance": number|null,
    "new_balance": number|null,
    "minimum_payment": number|null,
    "payment_due_date": "YYYY-MM-DD"|null,
    "credit_limit": number|null,
    "available_credit": number|null
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD"|null,
      "posting_date": "YYYY-MM-DD"|null,
      "description_raw": "string",
      "merchant_normalized": "string|null",
      "amount": number|null,
      "direction": "debit"|"credit"|null,
      "balance_after": number|null,
      "source_hint": "string|null"
    }
  ],
  "extraction_quality": {
    "confidence": number,
    "missing_fields": ["string"],
    "warnings": ["string"],
    "needs_review": boolean
  }
}

DATE NORMALIZATION RULES
- If the statement includes year, use it.
- If only month/day appears, infer year from statement_period when possible; otherwise null.
- Use ISO format YYYY-MM-DD when possible.

MERCHANT NORMALIZATION
- If a merchant is present (e.g., "OPENAI *CHATGPT SUBSCR"), set merchant_normalized to a cleaned version (e.g., "OPENAI CHATGPT").
- If it's a transfer line, merchant_normalized may be the counterparty name if present.

VALIDATION WARNINGS (use these exact codes)
- "doc_type_uncertain"
- "missing_year_in_dates"
- "transaction_date_missing"
- "suspiciously_low_transaction_count"
- "totals_mismatch"
- "multiple_accounts_detected"

CONFIDENCE GUIDANCE
- 0.9-1.0 clean digital statement and totals reconcile
- 0.6-0.8 minor OCR issues
- 0.3-0.5 partial extraction
- 0.0-0.2 near unusable

Now process the given input task and return STRICT JSON ONLY.`;

export function buildByteWorkerFallbackOutput(ctx: OrchCtx | null, reason: string, pagesDetectedHint = 1): any {
  if (ctx) {
    ctx.failed_stage = ctx.failed_stage || ctx.stage;
  }
  return {
    doc_type: 'unknown',
    institution: null,
    statement_period: null,
    currency: 'CAD',
    pages_detected: Array.from({ length: Math.max(1, pagesDetectedHint) }).map((_, idx) => ({
      page_index: idx + 1,
      page_kind: 'unknown',
      notes: `fallback:${reason}`,
    })),
    account_summary: {
      opening_balance: null,
      closing_balance: null,
      total_deposits: null,
      total_withdrawals: null,
      previous_balance: null,
      new_balance: null,
      minimum_payment: null,
      payment_due_date: null,
      credit_limit: null,
      available_credit: null,
    },
    transactions: [],
    extraction_quality: {
      confidence: 0,
      missing_fields: ['doc_type', 'transactions'],
      warnings: [`BYTE fallback used: ${reason}`],
      needs_review: true,
    },
  };
}

function maskSensitiveIdentifierText(value: string | null | undefined): string {
  const text = String(value || '');
  return text
    .replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4,7})\b/g, '****-****-****-$4')
    .replace(/\b\d{8,19}\b/g, '[redacted-id]')
    .trim();
}

export function normalizeByteWorkerOutput(raw: any, ctx: OrchCtx | null, pagesDetectedHint = 1): any {
  const fallback = buildByteWorkerFallbackOutput(ctx, 'normalize_fallback', pagesDetectedHint);
  const source = raw && typeof raw === 'object' ? raw : fallback;
  const pagesDetected = Array.isArray(source.pages_detected) ? source.pages_detected : [];
  const txns = Array.isArray(source.transactions) ? source.transactions : [];
  const docType = ['bank_statement', 'credit_card_statement', 'receipt', 'invoice', 'unknown'].includes(String(source.doc_type))
    ? String(source.doc_type)
    : 'unknown';
  const currency = ['CAD', 'USD', 'other'].includes(String(source.currency)) ? source.currency : 'CAD';
  let needsReview = Boolean(source?.extraction_quality?.needs_review ?? true);
  const warnings = Array.isArray(source?.extraction_quality?.warnings)
    ? source.extraction_quality.warnings.map((v: any) => String(v))
    : [...fallback.extraction_quality.warnings];
  const addWarning = (code: string) => {
    if (!warnings.includes(code)) warnings.push(code);
  };

  const coerceAmount = (value: any): number | null => {
    if (value === null || typeof value === 'undefined') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).replace(/[,$\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Basic multi-account hint detection from source text fields when available.
  const sourceTextForAccounts = JSON.stringify({
    institution: source?.institution || null,
    statement_period: source?.statement_period || null,
    pages_detected: source?.pages_detected || [],
    warnings: source?.extraction_quality?.warnings || [],
  });
  const accountMatches = sourceTextForAccounts.match(/\b\d{8,19}\b/g) || [];
  const uniqueAccounts = Array.from(new Set(accountMatches));
  if (uniqueAccounts.length > 1) {
    needsReview = true;
    addWarning('multiple_accounts_detected');
  }

  const normalizedTransactions = txns
    .map((t: any) => {
      const amount = coerceAmount(t?.amount);
      let direction: 'debit' | 'credit' | null = null;
      if (t?.direction === 'credit' || t?.direction === 'debit') {
        direction = t.direction;
      } else if (typeof amount === 'number') {
        if (amount < 0) direction = 'debit';
        if (amount > 0) direction = 'credit';
      } else {
        const descriptionLower = String(t?.description_raw || '').toLowerCase();
        if (/\b(payment|credit|refund|deposit|e-?transfer in|money in)\b/.test(descriptionLower)) {
          direction = 'credit';
        } else if (/\b(purchase|debit|withdraw|fee|charge|e-?transfer out|money out)\b/.test(descriptionLower)) {
          direction = 'debit';
        }
      }
      let normalizedDate = t?.date ?? null;
      const postingDate = t?.posting_date ?? null;
      if (!normalizedDate && postingDate) {
        normalizedDate = postingDate;
        addWarning('transaction_date_missing');
      }
      if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(normalizedDate))) {
        if (/^\d{1,2}[/-]\d{1,2}$/.test(String(normalizedDate))) {
          normalizedDate = null;
          addWarning('missing_year_in_dates');
        }
      }
      const normalized = {
        date: normalizedDate,
        posting_date: postingDate,
        description_raw: maskSensitiveIdentifierText(String(t?.description_raw || '').trim()),
        merchant_normalized: t?.merchant_normalized ? maskSensitiveIdentifierText(String(t.merchant_normalized)) : null,
        amount: amount === null ? null : Math.abs(amount),
        direction,
        balance_after: coerceAmount(t?.balance_after),
        source_hint: t?.source_hint ?? null,
      };
      if (!normalized.direction) {
        needsReview = true;
      }
      return normalized;
    })
    .filter((t: any) => {
      const hasDescription = String(t.description_raw || '').length > 0;
      const hasAmount = typeof t.amount === 'number';
      return hasDescription || hasAmount;
    });

  if (normalizedTransactions.some((tx: any) => tx.direction === null)) {
    addWarning('transaction_direction_uncertain');
  }

  const totalDeposits = coerceAmount(source?.account_summary?.total_deposits);
  const totalWithdrawals = coerceAmount(source?.account_summary?.total_withdrawals);
  const rowCredits = normalizedTransactions
    .filter((tx: any) => tx.direction === 'credit' && typeof tx.amount === 'number')
    .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const rowDebits = normalizedTransactions
    .filter((tx: any) => tx.direction === 'debit' && typeof tx.amount === 'number')
    .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const materiallyDiffers = (declared: number | null, computed: number): boolean => {
    if (declared === null) return false;
    const diff = Math.abs(declared - computed);
    const threshold = Math.max(5, Math.abs(declared) * 0.01);
    return diff > threshold;
  };
  if (materiallyDiffers(totalDeposits, rowCredits)) {
    addWarning('totals_mismatch');
    needsReview = true;
  }
  if (materiallyDiffers(totalWithdrawals, rowDebits)) {
    addWarning('totals_mismatch');
    needsReview = true;
  }

  const statementPeriodText = String(source?.statement_period || '').toLowerCase();
  const periodLooksMonthly = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|statement period)\b/.test(statementPeriodText);
  if (periodLooksMonthly && normalizedTransactions.length > 0 && normalizedTransactions.length < 3) {
    addWarning('suspiciously_low_transaction_count');
    needsReview = true;
  }
  if (docType === 'unknown') {
    addWarning('doc_type_uncertain');
  }
  if ((docType === 'bank_statement' || docType === 'credit_card_statement') && normalizedTransactions.length === 0) {
    needsReview = true;
  }

  let confidence = Number(source?.extraction_quality?.confidence);
  if (!Number.isFinite(confidence)) confidence = fallback.extraction_quality.confidence;
  confidence = Math.max(0, Math.min(1, confidence));
  if (needsReview && confidence > 0.8) confidence = 0.8;
  if (normalizedTransactions.length === 0 && (docType === 'bank_statement' || docType === 'credit_card_statement')) {
    confidence = Math.min(confidence, 0.3);
  }

  return {
    doc_type: docType,
    institution: source.institution ? maskSensitiveIdentifierText(String(source.institution)) : null,
    statement_period: source.statement_period ?? null,
    currency,
    pages_detected: pagesDetected.length > 0
      ? pagesDetected.map((p: any, idx: number) => ({
          page_index: Number.isFinite(Number(p?.page_index)) ? Number(p.page_index) : idx + 1,
          page_kind: ['summary', 'transactions', 'legal/info', 'unknown'].includes(String(p?.page_kind))
            ? String(p.page_kind)
            : 'unknown',
          notes: String(p?.notes || ''),
        }))
      : fallback.pages_detected,
    account_summary: {
      opening_balance: coerceAmount(source?.account_summary?.opening_balance),
      closing_balance: coerceAmount(source?.account_summary?.closing_balance),
      total_deposits: coerceAmount(source?.account_summary?.total_deposits),
      total_withdrawals: coerceAmount(source?.account_summary?.total_withdrawals),
      previous_balance: coerceAmount(source?.account_summary?.previous_balance),
      new_balance: coerceAmount(source?.account_summary?.new_balance),
      minimum_payment: coerceAmount(source?.account_summary?.minimum_payment),
      payment_due_date: source?.account_summary?.payment_due_date ?? null,
      credit_limit: coerceAmount(source?.account_summary?.credit_limit),
      available_credit: coerceAmount(source?.account_summary?.available_credit),
    },
    transactions: normalizedTransactions,
    extraction_quality: {
      confidence,
      missing_fields: Array.isArray(source?.extraction_quality?.missing_fields)
        ? source.extraction_quality.missing_fields.map((v: any) => String(v))
        : fallback.extraction_quality.missing_fields,
      warnings,
      needs_review: needsReview,
    },
  };
}

export async function runByteWorkerExtraction(input: {
  documentText: string;
  filename?: string | null;
  docId?: string | null;
  ctx?: OrchCtx | null;
}): Promise<any> {
  const pagesDetectedHint = 1;
  if (!openai) {
    throw new Error('openai_unavailable');
  }
  const model = 'gpt-4o-mini';
  const baseDocumentPayload = {
    document_text: String(input.documentText || 'No document_text provided.'),
    filename: input.filename || null,
    doc_id: input.docId || null,
  };

  // Pass A: structure extraction
  try {
    const structureAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const structureCompletion = await withTimeout(
      openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' } as any,
        messages: [
          { role: 'system', content: BYTE_WORKER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'structure_pass',
              output_focus: ['doc_type', 'institution', 'statement_period', 'currency', 'pages_detected', 'account_summary', 'extraction_quality'],
              ...baseDocumentPayload,
            }),
          },
        ],
        max_tokens: 1600,
      } as any),
      resolveOpenAiTimeoutMs(),
      'byte_structure_pass',
      input.ctx,
      structureAbortController
    );
    const structureText = structureCompletion.choices?.[0]?.message?.content;
    const structureParsed = typeof structureText === 'string' ? JSON.parse(structureText) : {};

    // Pass B: transaction row extraction
    const rowAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const rowCompletion = await withTimeout(
      openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' } as any,
        messages: [
          { role: 'system', content: BYTE_WORKER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'row_pass',
              output_focus: ['transactions', 'extraction_quality'],
              structure_context: {
                doc_type: structureParsed?.doc_type ?? null,
                institution: structureParsed?.institution ?? null,
                statement_period: structureParsed?.statement_period ?? null,
                currency: structureParsed?.currency ?? null,
                pages_detected: structureParsed?.pages_detected ?? [],
                account_summary: structureParsed?.account_summary ?? {},
              },
              ...baseDocumentPayload,
            }),
          },
        ],
        max_tokens: 2200,
      } as any),
      resolveOpenAiTimeoutMs(),
      'byte_row_pass',
      input.ctx,
      rowAbortController
    );
    const rowText = rowCompletion.choices?.[0]?.message?.content;
    const rowParsed = typeof rowText === 'string' ? JSON.parse(rowText) : {};

    const merged = {
      doc_type: structureParsed?.doc_type ?? 'unknown',
      institution: structureParsed?.institution ?? null,
      statement_period: structureParsed?.statement_period ?? null,
      currency: structureParsed?.currency ?? 'CAD',
      pages_detected: structureParsed?.pages_detected ?? [],
      account_summary: structureParsed?.account_summary ?? {},
      transactions: rowParsed?.transactions ?? [],
      extraction_quality: {
        ...(structureParsed?.extraction_quality || {}),
        ...(rowParsed?.extraction_quality || {}),
      },
    };
    return normalizeByteWorkerOutput(merged, input.ctx || null, pagesDetectedHint);
  } catch (error: any) {
    if (input.ctx) {
      input.ctx.failed_stage = input.ctx.failed_stage || input.ctx.stage;
    }
    console.warn('[Chat] BYTE two-pass extraction failed (non-fatal):', error?.message || error);
    return buildByteWorkerFallbackOutput(input.ctx || null, 'byte_two_pass_failed', pagesDetectedHint);
  }
}

function buildTagWorkerFallbackOutput(reason: string, pagesProcessed = 1): any {
  return {
    pages_processed: Math.max(1, Number(pagesProcessed || 1)),
    account_summary: {
      opening_balance: null,
      closing_balance: null,
      total_deposits: null,
      total_withdrawals: null,
    },
    transactions: [],
    category_totals: [],
    insights_for_prime: [
      `TAG fallback used: ${reason}.`,
      'No reliable transaction extraction was available from the provided input.',
    ],
  };
}

function normalizeTagWorkerOutput(raw: any, fallbackReason: string, pagesProcessedHint = 1): any {
  const fallback = buildTagWorkerFallbackOutput(fallbackReason, pagesProcessedHint);
  const source = raw && typeof raw === 'object' ? raw : fallback;
  const pagesProcessed = Number(source.pages_processed);
  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  const categoryTotals = Array.isArray(source.category_totals) ? source.category_totals : [];
  const insights = Array.isArray(source.insights_for_prime) && source.insights_for_prime.length > 0
    ? source.insights_for_prime.map((v: any) => String(v))
    : fallback.insights_for_prime;

  return {
    pages_processed: Number.isFinite(pagesProcessed) && pagesProcessed > 0 ? pagesProcessed : Math.max(1, pagesProcessedHint),
    account_summary: {
      opening_balance: source?.account_summary?.opening_balance ?? null,
      closing_balance: source?.account_summary?.closing_balance ?? null,
      total_deposits: source?.account_summary?.total_deposits ?? null,
      total_withdrawals: source?.account_summary?.total_withdrawals ?? null,
    },
    transactions: transactions.map((t: any) => ({
      date: t?.date ?? null,
      description: String(t?.description || 'Unknown'),
      amount: Number(t?.amount || 0),
      direction: t?.direction === 'credit' ? 'credit' : 'debit',
      category: String(t?.category || 'Other'),
      is_spend: Boolean(t?.is_spend),
      tax_hint: ['business_possible', 'personal_likely', 'transfer', 'unknown'].includes(String(t?.tax_hint))
        ? t.tax_hint
        : 'unknown',
      confidence: Number.isFinite(Number(t?.confidence)) ? Number(t.confidence) : 0.5,
      needs_review: Boolean(t?.needs_review),
      reason: String(t?.reason || 'normalized'),
    })),
    category_totals: categoryTotals.map((c: any) => ({
      category: String(c?.category || 'Other'),
      total: Number(c?.total || 0),
      count: Number(c?.count || 0),
    })),
    insights_for_prime: insights.length > 0 ? insights : fallback.insights_for_prime,
  };
}

function sanitizeWorkerValue(value: any): any {
  const redact = (input: any): any => {
    if (input === null || typeof input === 'undefined') return input;
    if (Array.isArray(input)) return input.map(redact);
    if (typeof input === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(input)) {
        out[k] = redact(v);
      }
      return out;
    }
    if (typeof input === 'string') {
      return input
        // Redact long digit sequences likely to include PAN/account identifiers.
        .replace(/\b\d{6,19}\b/g, '[redacted-id]')
        .trim();
    }
    return input;
  };
  return redact(value);
}

function truncateJsonForStorage(value: any, maxChars = 30000): string {
  const raw = JSON.stringify(value || {});
  if (raw.length <= maxChars) return raw;
  return raw.slice(0, maxChars);
}

function computeTagOutputHash(input: {
  transactions: any[];
  statementPeriod: string | null;
  docIds: string[];
}): string {
  const normalizedTransactions = (Array.isArray(input.transactions) ? input.transactions : [])
    .map((t: any) => ({
      date: t?.date ?? null,
      description: String(t?.description || '').toLowerCase().trim(),
      amount: Number(t?.amount || 0),
      direction: t?.direction === 'credit' ? 'credit' : 'debit',
      category: String(t?.category || 'Other'),
      is_spend: Boolean(t?.is_spend),
    }))
    .sort((a, b) => {
      const ak = `${a.date}|${a.description}|${a.amount}|${a.direction}`;
      const bk = `${b.date}|${b.description}|${b.amount}|${b.direction}`;
      return ak.localeCompare(bk);
    });
  const payload = JSON.stringify({
    transactions: normalizedTransactions,
    statement_period: input.statementPeriod || null,
    doc_ids: [...(input.docIds || [])].sort(),
  });
  return createHash('sha256').update(payload).digest('hex');
}

function computeWorkerOutputHash(value: any): string {
  return createHash('sha256').update(JSON.stringify(value || {})).digest('hex');
}

function truncateStructuredForStorage(value: any, maxChars = 40000): any {
  const raw = JSON.stringify(value || {});
  if (raw.length <= maxChars) return value;
  const sliced = raw.slice(0, maxChars);
  try {
    return JSON.parse(sliced);
  } catch {
    return { _truncated: true, _raw: sliced };
  }
}

async function persistTagOutputStateBestEffort(
  sb: SupabaseClient,
  sessionId: string | null,
  threadId: string | null,
  payload: any
): Promise<boolean> {
  const mergeIntoColumn = async (
    table: 'chat_sessions' | 'chat_threads',
    id: string,
    column: 'metadata' | 'state'
  ): Promise<boolean> => {
    try {
      const { data, error } = await sb.from(table).select(column).eq('id', id).maybeSingle();
      if (error) return false;
      const current = data && typeof (data as any)[column] === 'object' && (data as any)[column] !== null
        ? (data as any)[column]
        : {};
      const merged = {
        ...current,
        last_tag_output: payload,
      };
      const { error: updateError } = await sb.from(table).update({ [column]: merged } as any).eq('id', id);
      return !updateError;
    } catch {
      return false;
    }
  };

  if (sessionId) {
    if (await mergeIntoColumn('chat_sessions', sessionId, 'metadata')) return true;
    if (await mergeIntoColumn('chat_sessions', sessionId, 'state')) return true;
  }
  if (threadId) {
    if (await mergeIntoColumn('chat_threads', threadId, 'metadata')) return true;
    if (await mergeIntoColumn('chat_threads', threadId, 'state')) return true;
  }
  return false;
}

async function loadLastTagOutputBestEffort(
  sb: SupabaseClient,
  sessionId: string | null,
  threadId: string | null
): Promise<any | null> {
  const readFromColumn = async (
    table: 'chat_sessions' | 'chat_threads',
    id: string,
    column: 'metadata' | 'state'
  ): Promise<any | null> => {
    try {
      const { data, error } = await sb.from(table).select(column).eq('id', id).maybeSingle();
      if (error || !data) return null;
      const root = (data as any)[column];
      if (!root || typeof root !== 'object') return null;
      return (root as any).last_tag_output || null;
    } catch {
      return null;
    }
  };

  if (sessionId) {
    const fromSessionMeta = await readFromColumn('chat_sessions', sessionId, 'metadata');
    if (fromSessionMeta) return fromSessionMeta;
    const fromSessionState = await readFromColumn('chat_sessions', sessionId, 'state');
    if (fromSessionState) return fromSessionState;
  }
  if (threadId) {
    const fromThreadMeta = await readFromColumn('chat_threads', threadId, 'metadata');
    if (fromThreadMeta) return fromThreadMeta;
    const fromThreadState = await readFromColumn('chat_threads', threadId, 'state');
    if (fromThreadState) return fromThreadState;
  }
  return null;
}

async function persistPipelineSnapshot(
  sb: SupabaseClient,
  ctx: OrchCtx,
  snapshot: PipelineSnapshot,
  raw?: {
    tag_json?: any;
    crystal_json?: any;
    finley_json?: any;
  }
): Promise<boolean> {
  const safeSnapshot = sanitizeWorkerValue(snapshot);
  const safeRaw = raw
    ? sanitizeWorkerValue({
        tag_json: raw.tag_json ? truncateStructuredForStorage(raw.tag_json, 40000) : undefined,
        crystal_json: raw.crystal_json ? truncateStructuredForStorage(raw.crystal_json, 40000) : undefined,
        finley_json: raw.finley_json ? truncateStructuredForStorage(raw.finley_json, 40000) : undefined,
      })
    : undefined;

  const mergeIntoSessionOrThread = async (
    table: 'chat_sessions' | 'chat_threads',
    id: string,
    column: 'metadata'
  ): Promise<boolean> => {
    try {
      const { data, error } = await sb.from(table).select(column).eq('id', id).maybeSingle();
      if (error) return false;
      const current = data && typeof (data as any)[column] === 'object' && (data as any)[column] !== null
        ? (data as any)[column]
        : {};
      const merged = {
        ...current,
        last_pipeline_snapshot: safeSnapshot,
        ...(safeRaw ? { last_pipeline_raw: safeRaw } : {}),
      };
      const { error: updateError } = await sb.from(table).update({ [column]: merged } as any).eq('id', id);
      return !updateError;
    } catch {
      return false;
    }
  };

  if (ctx.sessionId && await mergeIntoSessionOrThread('chat_sessions', ctx.sessionId, 'metadata')) {
    ctx.pipeline_snapshot_saved = true;
    return true;
  }
  if (ctx.threadId && await mergeIntoSessionOrThread('chat_threads', ctx.threadId, 'metadata')) {
    ctx.pipeline_snapshot_saved = true;
    return true;
  }

  try {
    const { error } = await sb.from('ai_activity_events').insert({
      user_id: null,
      employee_id: ctx.employee || 'prime-boss',
      event_type: 'prime.pipeline.snapshot',
      status: 'completed',
      label: 'Prime pipeline snapshot',
      details: {},
      metadata: {
        last_pipeline_snapshot: safeSnapshot,
        ...(safeRaw ? { last_pipeline_raw: safeRaw } : {}),
      },
    } as any);
    if (!error) {
      ctx.pipeline_snapshot_saved = true;
      return true;
    }
  } catch {
    // no-op
  }

  return false;
}

async function loadLastPipelineSnapshotBestEffort(
  sb: SupabaseClient,
  sessionId: string | null,
  threadId: string | null
): Promise<{ snapshot: PipelineSnapshot | null; raw: any | null }> {
  const readFromSessionOrThread = async (
    table: 'chat_sessions' | 'chat_threads',
    id: string,
    column: 'metadata'
  ): Promise<{ snapshot: PipelineSnapshot | null; raw: any | null } | null> => {
    try {
      const { data, error } = await sb.from(table).select(column).eq('id', id).maybeSingle();
      if (error || !data) return null;
      const root = (data as any)[column];
      if (!root || typeof root !== 'object') return null;
      return {
        snapshot: ((root as any).last_pipeline_snapshot || null) as PipelineSnapshot | null,
        raw: (root as any).last_pipeline_raw || null,
      };
    } catch {
      return null;
    }
  };

  if (sessionId) {
    const fromSession = await readFromSessionOrThread('chat_sessions', sessionId, 'metadata');
    if (fromSession?.snapshot) return fromSession;
  }
  if (threadId) {
    const fromThread = await readFromSessionOrThread('chat_threads', threadId, 'metadata');
    if (fromThread?.snapshot) return fromThread;
  }
  return { snapshot: null, raw: null };
}

function isTagFollowupMessage(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(that statement|last upload|summari[sz]e again|why categorized|why did you categor|that upload|my upload|did you find anything)\b/.test(text);
}

function isPipelineFollowupMessage(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  if (/\bupload\b/.test(text) && /\b(find|found|anything|what did you find|see)\b/.test(text)) {
    return true;
  }
  return /\b(summari[sz]e again|show subscriptions|why did you categor|why categorized|transfers vs spending|business expenses|set reminders from that|compare this month to last|that statement|last upload|that upload|my upload|did you find anything|what did you find|anything in my upload|any recurring charges|monthly subscriptions|what subscriptions|last ask|that last ask|did you get that|did i not upload|cannot find|can't find|you can'?t find|in your memory|did you miss|you repeated)\b/.test(text);
}

function detectPipelineReuseIntent(message: string): 'explain_categorization' | 'tag_breakdown' | 'coaching_plan' | 'recurring_summary' | 'none' {
  const text = String(message || '').toLowerCase();
  if (!text) return 'none';
  if (/\bupload\b/.test(text) && /\b(find|found|anything|what did you find|see)\b/.test(text)) return 'tag_breakdown';
  if (/\b(why did you categor|why categorized|categorized .* as)\b/.test(text)) return 'explain_categorization';
  if (/\b(what subscriptions|any recurring charges|monthly subscriptions|recurring charges)\b/.test(text)) return 'recurring_summary';
  if (/\b(show subscriptions|transfers vs spending|business expenses|summari[sz]e again|my upload|that upload|did you find anything|what did you find|last ask|that last ask|did you get that|did i not upload|cannot find|can't find|you can'?t find|in your memory|did you miss|you repeated)\b/.test(text)) return 'tag_breakdown';
  if (/\b(set reminders from that|compare this month to last|plan|coach|next steps)\b/.test(text)) return 'coaching_plan';
  return 'none';
}

function buildExplainCategorizationResponse(message: string, tagOutput: any): string {
  const txns = Array.isArray(tagOutput?.transactions) ? tagOutput.transactions : [];
  if (txns.length === 0) {
    return "Here's why: I don't have categorized transaction rows available for this statement yet. Re-run the statement flow and I'll explain category decisions line by line.";
  }
  const msg = String(message || '').toLowerCase();
  const matches = txns
    .filter((tx: any) => {
      const description = String(tx?.description || tx?.description_raw || '').toLowerCase();
      const merchant = String(tx?.merchant_normalized || '').toLowerCase();
      return description.includes(msg) || msg.split(/\s+/).some((w) => w.length > 3 && (description.includes(w) || merchant.includes(w)));
    })
    .slice(0, 3);

  const candidates = matches.length > 0 ? matches : txns.slice(0, 3);
  const lines = candidates.map((tx: any) => {
    const description = String(tx?.description || tx?.description_raw || 'transaction');
    const category = String(tx?.category || 'Other');
    const reason = String(tx?.reason || 'based on merchant and transaction wording');
    return `- ${description}: categorized as ${category} because ${reason}.`;
  });
  return ["Here's why:", ...lines, "If you want, I can also suggest a category correction rule for future imports."].join('\n');
}

function buildRecurringSummaryResponse(input: {
  recurringCandidates: Array<{
    merchant: string;
    occurrences: number;
    avg_amount: number;
    cadence: "monthly" | "weekly" | "quarterly" | "unknown";
  }>;
  monthlyEstimate: number;
  currency: string | null;
}): string {
  const rows = Array.isArray(input.recurringCandidates) ? input.recurringCandidates : [];
  if (rows.length === 0) {
    return [
      "From your last statement, I do not see strong recurring charge patterns yet.",
      "That can happen if charges are too new or irregular.",
      "If you want, I can watch for recurring services on the next statement too.",
    ].join('\n');
  }
  const top = rows.slice(0, 6).map((r) =>
    `- ${String(r.merchant)}: ${formatCurrency(Number(r.avg_amount || 0), String(input.currency || 'CAD'))} (${r.cadence})`
  );
  return [
    "From your last statement, here are likely recurring charges:",
    ...top,
    '',
    `Estimated monthly recurring total: ${formatCurrency(Number(input.monthlyEstimate || 0), String(input.currency || 'CAD'))}`,
    "Based on what we reviewed earlier, I can also suggest which ones to keep, review, or cancel.",
  ].join('\n');
}

function buildUploadFindingsResponseFromSummary(summaryText: string): string {
  const text = String(summaryText || '').trim();
  if (!text) {
    return "I found your latest upload, but the summary content is empty. Upload one more time and I'll re-read it.";
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const summaryBullets = lines
    .filter((line) => /^-\s+/.test(line))
    .slice(0, 4)
    .map((line) => line.replace(/^-+\s*/, '- '));

  const txLines = lines
    .filter((line) => /^-\s*\d{4}-\d{2}-\d{2}\s+\|/.test(line))
    .slice(0, 5)
    .map((line) => line.replace(/^-+\s*/, '- '));

  if (txLines.length > 0) {
    return [
      'Yes — I found items in your latest upload.',
      ...(summaryBullets.length > 0 ? ['', 'Top findings:', ...summaryBullets] : []),
      '',
      'Sample transactions I extracted:',
      ...txLines,
      '',
      'If you want, I can list all rows or group this by category.',
    ].join('\n');
  }

  return [
    'Yes — I found your latest upload summary.',
    ...(summaryBullets.length > 0
      ? ['', 'Top findings:', ...summaryBullets]
      : ['I can walk through key details from it now.']),
  ].join('\n');
}

function isLastUploadRecallIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(last|latest|previous|prior)\s+(receipt|upload|statement|document|file)\b/.test(text)
    || /\buse\s+(my\s+)?(last|latest|previous)\b/.test(text)
    || /\b(recall|bring up|pull up)\s+(my\s+)?(last|latest)\s+(receipt|upload|statement|document)\b/.test(text);
}

function isLastUploadDetailIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  const merchantNeedle = extractMerchantNeedleFromQuestion(text);
  if (merchantNeedle && /\b(how much|amount|total|spend|spent|pay|paid)\b/.test(text)) {
    return true;
  }
  return /\b(how much|amount|total|when was it|what date|date|merchant|where was it|where did i|who was it)\b/.test(text)
    && /\b(it|that|receipt|upload|statement|last)\b/.test(text);
}

function isWorkspaceActivityIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  if (!text) return false;
  return /\b(how active|activity|uploads?\s+(did i|have i)|how many uploads|workspace activity|last workspace)\b/.test(text);
}

async function loadLatestImportSummaryTextBestEffort(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await sb
      .from('import_summaries')
      .select('summary_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    const text = String(data?.summary_text || '').trim();
    return text || null;
  } catch {
    return null;
  }
}

async function resolveUserDisplayNameBestEffort(
  sb: SupabaseClient,
  userId: string,
  fallbackDisplayName?: string | null
): Promise<string> {
  const fallback = String(fallbackDisplayName || '').trim();
  if (fallback) return fallback;
  try {
    const { data } = await sb
      .from('profiles')
      .select('display_name, first_name, full_name')
      .eq('id', userId)
      .maybeSingle();
    const profileName = String(
      data?.display_name ||
      data?.first_name ||
      data?.full_name ||
      ''
    ).trim();
    if (profileName) return profileName;
  } catch {
    // Ignore and fall back.
  }
  return 'there';
}

type LatestImportFacts = {
  importId: string | null;
  createdAt: string | null;
  summaryText: string | null;
  transactionCount: number;
  totalAmount: number;
  topMerchant: string | null;
  topDate: string | null;
  currency: string;
};

function extractMerchantNeedleFromQuestion(question: string): string | null {
  const q = String(question || '').toLowerCase();
  const connectorCapture = q.match(/\b(?:with|on|for|at)\s+([a-z0-9][a-z0-9&*'.,\-\s]{1,60})/i);
  if (connectorCapture?.[1]) {
    const cleanedConnector = String(connectorCapture[1])
      .replace(/\?.*$/, '')
      .replace(/\b(this month|last month|latest|statement|upload|did i|do i|can you|tell me|how much)\b/gi, '')
      .replace(/^(a|an|the|my)\s+/i, '')
      .trim();
    if (cleanedConnector.length >= 2) return cleanedConnector;
  }
  const patterns = [
    /\bspend with\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bspent with\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bpaid for\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bspend for\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bspent for\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bfor\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bwith\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bon\s+([a-z0-9&*'.,\-\s]{2,})$/i,
    /\bat\s+([a-z0-9&*'.,\-\s]{2,})$/i,
  ];
  for (const pattern of patterns) {
    const m = q.match(pattern);
    if (m?.[1]) {
      const cleaned = String(m[1])
        .replace(/\?+$/, '')
        .replace(/\b(this month|last month|latest|statement|upload)\b/gi, '')
        .replace(/^(a|an|the|my)\s+/i, '')
        .trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }
  return null;
}

async function loadMerchantSpendForLatestImportBestEffort(
  sb: SupabaseClient,
  userId: string,
  importId: string,
  merchantNeedle: string
): Promise<{ total: number; count: number; matches: string[] }> {
  const isMatch = (merchantValue: unknown, descriptionValue: unknown, needle: string, tokens: string[]) => {
    const merchant = String(merchantValue || '').toLowerCase();
    const description = String(descriptionValue || '').toLowerCase();
    if (!needle) return false;
    if (merchant.includes(needle) || description.includes(needle)) return true;
    if (tokens.length === 0) return false;
    return tokens.some((token) => merchant.includes(token) || description.includes(token));
  };
  try {
    const { data } = await sb
      .from('transactions')
      .select('amount, merchant, description')
      .eq('user_id', userId)
      .eq('import_id', importId)
      .limit(500);
    const rows = Array.isArray(data) ? data : [];
    const needle = String(merchantNeedle || '').toLowerCase().trim();
    const needleTokens = needle
      .split(/[^a-z0-9]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);
    let matched = rows.filter((row: any) => isMatch(row?.merchant, row?.description, needle, needleTokens));
    let total = matched.reduce((sum: number, row: any) => sum + Math.abs(Number(row?.amount || 0)), 0);
    let matches = Array.from(
      new Set(
        matched
          .map((row: any) => String(row?.merchant || row?.description || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 4);
    if (matched.length === 0) {
      const { data: staged } = await sb
        .from('transactions_staging')
        .select('data_json')
        .eq('user_id', userId)
        .eq('import_id', importId)
        .limit(800);
      const stagedRows = Array.isArray(staged) ? staged : [];
      const stagedMatched = stagedRows.filter((row: any) =>
        isMatch(
          row?.data_json?.merchant || row?.data_json?.vendor || row?.data_json?.description,
          row?.data_json?.description || row?.data_json?.memo,
          needle,
          needleTokens
        )
      );
      if (stagedMatched.length > 0) {
        matched = stagedMatched as any[];
        total = stagedMatched.reduce((sum: number, row: any) => sum + Math.abs(Number(row?.data_json?.amount || 0)), 0);
        matches = Array.from(
          new Set(
            stagedMatched
              .map((row: any) =>
                String(
                  row?.data_json?.merchant ||
                  row?.data_json?.vendor ||
                  row?.data_json?.description ||
                  row?.data_json?.memo ||
                  ''
                ).trim()
              )
              .filter(Boolean)
          )
        ).slice(0, 4);
      }
    }
    return { total, count: matched.length, matches };
  } catch {
    return { total: 0, count: 0, matches: [] };
  }
}

async function loadLatestImportFactsBestEffort(
  sb: SupabaseClient,
  userId: string
): Promise<LatestImportFacts | null> {
  try {
    const latest = await loadLatestImportSummaryBestEffort(sb, userId);
    let importId = latest?.importId || null;
    let latestCreatedAt = latest?.createdAt || null;
    if (!importId) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id,created_at')
        .eq('user_id', userId)
        .in('status', ['committed', 'parsed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestImport?.id) {
        importId = String(latestImport.id);
        latestCreatedAt = latestImport?.created_at ? String(latestImport.created_at) : latestCreatedAt;
      }
    }
    if (!importId) {
      return latest
        ? {
            importId: latest.importId,
            createdAt: latest.createdAt,
            summaryText: latest.summaryText,
            transactionCount: 0,
            totalAmount: 0,
            topMerchant: null,
            topDate: null,
            currency: 'CAD',
          }
        : null;
    }

    const { data: txRows } = await sb
      .from('transactions')
      .select('amount, merchant, date')
      .eq('user_id', userId)
      .eq('import_id', importId)
      .order('date', { ascending: false })
      .limit(50);

    const rows = Array.isArray(txRows) ? txRows : [];
    const transactionCount = rows.length;
    const totalAmount = rows.reduce((sum: number, row: any) => sum + Math.abs(Number(row?.amount || 0)), 0);
    const topMerchant = transactionCount > 0 ? String(rows[0]?.merchant || '').trim() || null : null;
    const topDate = transactionCount > 0 ? String(rows[0]?.date || '').trim() || null : null;

    return {
      importId,
      createdAt: latestCreatedAt,
      summaryText: latest?.summaryText || null,
      transactionCount,
      totalAmount,
      topMerchant,
      topDate,
      currency: 'CAD',
    };
  } catch {
    return null;
  }
}

async function loadWorkspaceActivitySnapshotBestEffort(
  sb: SupabaseClient,
  userId: string
): Promise<{ uploads30d: number; chatTurns7d: number; latestUploadAt: string | null } | null> {
  try {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ count: uploads30d }, { count: chatTurns7d }, latestUpload] = await Promise.all([
      sb.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since30),
      sb.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user').gte('created_at', since7),
      sb.from('imports').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      uploads30d: Number(uploads30d || 0),
      chatTurns7d: Number(chatTurns7d || 0),
      latestUploadAt: latestUpload?.data?.created_at ? String(latestUpload.data.created_at) : null,
    };
  } catch {
    return null;
  }
}

async function loadLatestImportSummaryBestEffort(
  sb: SupabaseClient,
  userId: string
): Promise<{ summaryText: string; importId: string | null; createdAt: string | null } | null> {
  try {
    const { data, error } = await sb
      .from('import_summaries')
      .select('import_id, summary_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    const summaryText = String(data?.summary_text || '').trim();
    if (!summaryText) return null;
    return {
      summaryText,
      importId: data?.import_id ? String(data.import_id) : null,
      createdAt: data?.created_at ? String(data.created_at) : null,
    };
  } catch {
    return null;
  }
}

interface StatementBreakdown {
  version: 1;
  import_id: string;
  document_id: string | null;
  user_id: string;
  created_at: string;
  statement_meta: {
    issuer: string | null;
    account_last4: string | null;
    period_start: string | null;
    period_end: string | null;
    statement_type: 'bank' | 'credit_card' | 'unknown';
  };
  totals: {
    total_debits: number;
    total_credits: number;
    net: number;
    transaction_count: number;
  };
  category_totals: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  flags: {
    duplicate_count: number;
    refund_count: number;
    needs_review_count: number;
    low_confidence_count: number;
    missing_date_count: number;
  };
  read_completeness?: {
    status: 'complete' | 'partial' | 'unknown';
    pages_detected: number | null;
    pages_read: number | null;
    coverage_ratio: number | null;
    signals: string[];
  };
  confidence: {
    overall: 'high' | 'medium' | 'low';
    ocr_confidence: number | null;
    parse_confidence: number | null;
    transaction_match_rate: number | null;
    reconciled: boolean;
    recon_method: 'direct_debits' | 'balance_equation' | 'direct_credits' | 'none';
  };
}

async function loadStatementBreakdown(
  sb: SupabaseClient,
  userId: string,
  importId?: string | null
): Promise<StatementBreakdown | null> {
  const parseBreakdownCandidate = (candidate: any): any | null => {
    if (candidate == null) return null;
    if (typeof candidate === 'string') {
      const raw = candidate.trim();
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    return typeof candidate === 'object' ? candidate : null;
  };
  const hasUsableStatementMetadata = (breakdown: any): boolean => {
    if (!breakdown || typeof breakdown !== 'object') return false;
    const meta = breakdown.statement_meta && typeof breakdown.statement_meta === 'object'
      ? breakdown.statement_meta
      : {};
    return Boolean(
      String(meta.issuer || breakdown.institution || breakdown.issuer || '').trim() ||
      String(meta.account_last4 || breakdown.account_last4 || '').trim() ||
      String(meta.period_start || breakdown.period_start || '').trim() ||
      String(meta.period_end || breakdown.period_end || '').trim() ||
      Number.isFinite(Number(breakdown.previous_balance)) ||
      Number.isFinite(Number(breakdown.new_balance))
    );
  };
  const normalizeFromRow = (row: any): StatementBreakdown | null => {
    if (!row || typeof row !== 'object') return null;
    const candidate =
      parseBreakdownCandidate(row.statement_breakdown_json) ||
      parseBreakdownCandidate(row.statement_breakdown) ||
      parseBreakdownCandidate(row?.metadata?.statement_breakdown);
    if (!candidate) return null;
    const hasTransactions = Array.isArray(candidate.transactions) && candidate.transactions.length > 0;
    if (Number(candidate.version || 1) !== 1 && !hasTransactions && !hasUsableStatementMetadata(candidate)) {
      return null;
    }
    return candidate as StatementBreakdown;
  };

  const selectAttempts = [
    'id,status,created_at,statement_breakdown_json,statement_breakdown,metadata',
    'id,status,created_at,statement_breakdown_json,metadata',
    'id,status,created_at,statement_breakdown,metadata',
    'id,status,created_at,metadata',
  ];

  for (const selectClause of selectAttempts) {
    try {
      if (importId) {
        const { data, error } = await sb
          .from('imports')
          .select(selectClause)
          .eq('user_id', userId)
          .eq('id', importId)
          .limit(1)
          .maybeSingle();
        if (error) continue;
        return normalizeFromRow(data);
      }

      const { data, error } = await sb
        .from('imports')
        .select(selectClause)
        .eq('user_id', userId)
        .eq('status', 'committed')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) continue;
      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        const normalized = normalizeFromRow(row);
        if (normalized) return normalized;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function listUserStatements(
  sb: SupabaseClient,
  userId: string,
  limit: number = 10
): Promise<Array<{
  import_id: string;
  document_id: string | null;
  status: string;
  created_at: string;
  issuer: string | null;
  account_last4: string | null;
  period_start: string | null;
  period_end: string | null;
  transaction_count: number | null;
}>> {
  const selectAttempts = [
    'id, document_id, status, created_at, statement_breakdown_json, statement_breakdown, metadata',
    'id, document_id, status, created_at, statement_breakdown_json, metadata',
    'id, document_id, status, created_at, statement_breakdown, metadata',
    'id, document_id, status, created_at, metadata',
  ];
  for (const clause of selectAttempts) {
    try {
      const { data, error } = await sb
        .from('imports')
        .select(clause)
        .eq('user_id', userId)
        .in('status', ['committed', 'parsed'])
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) continue;
      const rows = Array.isArray(data) ? data : [];
      return rows.map((imp: any) => {
        const bd = imp?.statement_breakdown_json || imp?.statement_breakdown || imp?.metadata?.statement_breakdown || null;
        return {
          import_id: String(imp.id),
          document_id: imp?.document_id ? String(imp.document_id) : null,
          status: String(imp?.status || 'unknown'),
          created_at: String(imp?.created_at || ''),
          issuer: bd?.statement_meta?.issuer || null,
          account_last4: bd?.statement_meta?.account_last4 || null,
          period_start: bd?.statement_meta?.period_start || null,
          period_end: bd?.statement_meta?.period_end || null,
          transaction_count: Number.isFinite(Number(bd?.totals?.transaction_count))
            ? Number(bd.totals.transaction_count)
            : null,
        };
      });
    } catch {
      continue;
    }
  }
  return [];
}

type ResolvedKeyDetails = {
  issuer: string | null;
  accountLast4: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  issuerReason?: string | null;
  accountReason?: string | null;
  periodReason?: string | null;
};

function inferInstitutionFromFileName(name: string): string | null {
  const lower = String(name || '').toLowerCase();
  if (!lower) return null;
  if ((lower.includes('triangle') || lower.includes('ctfs')) && (lower.includes('mastercard') || lower.includes('worldelite'))) {
    return 'Triangle World Elite Mastercard';
  }
  if (lower.includes('rbc') && lower.includes('visa')) return 'RBC Visa';
  return null;
}

function inferLast4FromFileName(name: string): string | null {
  const digits = String(name || '').match(/(\d{12,19})/);
  if (!digits?.[1]) return null;
  return digits[1].slice(-4);
}

function inferPeriodFromFileName(name: string): { start: string | null; end: string | null } {
  const m = String(name || '').match(/(\d{4})[_-](\d{2})[_-](\d{2})[_-](\d{4})[_-](\d{2})[_-](\d{2})/);
  if (!m) return { start: null, end: null };
  return { start: `${m[1]}-${m[2]}-${m[3]}`, end: `${m[4]}-${m[5]}-${m[6]}` };
}

function normalizeIsoDate(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const m = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function resolveBreakdownKeyDetails(
  sb: SupabaseClient,
  userId: string,
  breakdown: StatementBreakdown
): Promise<ResolvedKeyDetails> {
  const baseIssuer = String(breakdown.statement_meta?.issuer || '').trim() || null;
  const baseLast4 = String(breakdown.statement_meta?.account_last4 || '').trim() || null;
  const basePeriodStart = normalizeIsoDate(breakdown.statement_meta?.period_start);
  const basePeriodEnd = normalizeIsoDate(breakdown.statement_meta?.period_end);
  if (baseIssuer && baseLast4 && basePeriodStart && basePeriodEnd) {
    return { issuer: baseIssuer, accountLast4: baseLast4, periodStart: basePeriodStart, periodEnd: basePeriodEnd };
  }

  let fileName = '';
  let extracted: any = null;
  let importFileUrl = '';
  try {
    const { data: importRow } = await sb
      .from('imports')
      .select('document_id,file_url')
      .eq('id', breakdown.import_id)
      .eq('user_id', userId)
      .maybeSingle();
    const docId = importRow?.document_id ? String(importRow.document_id) : '';
    importFileUrl = String(importRow?.file_url || '').trim();
    if (docId) {
      const selectAttempts = ['original_name,extracted_data', 'original_name', 'extracted_data'];
      for (const clause of selectAttempts) {
        const { data, error } = await sb
          .from('user_documents')
          .select(clause)
          .eq('id', docId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) continue;
        fileName = String(data?.original_name || fileName || '');
        extracted = extracted || data?.extracted_data || null;
        break;
      }
    }
    if (!fileName && importFileUrl) {
      const fromUrl = importFileUrl.split('/').filter(Boolean).pop() || '';
      fileName = String(fromUrl || '').trim();
    }
  } catch {
    // non-blocking fallback resolution
  }

  const issuer = baseIssuer ||
    String(extracted?.issuer || extracted?.institution || extracted?.card || '').trim() ||
    inferInstitutionFromFileName(fileName);
  const accountLast4 = baseLast4 ||
    String(extracted?.account_last4 || extracted?.last4 || '').trim() ||
    inferLast4FromFileName(fileName);

  let periodStart = basePeriodStart || normalizeIsoDate(extracted?.period_start || extracted?.statement_period_start);
  let periodEnd = basePeriodEnd || normalizeIsoDate(extracted?.period_end || extracted?.statement_period_end);
  if (!periodStart || !periodEnd) {
    const byName = inferPeriodFromFileName(fileName);
    periodStart = periodStart || byName.start;
    periodEnd = periodEnd || byName.end;
  }
  if (!periodStart || !periodEnd) {
    try {
      const { data: txRows } = await sb
        .from('transactions')
        .select('date')
        .eq('user_id', userId)
        .eq('import_id', breakdown.import_id)
        .order('date', { ascending: true })
        .limit(500);
      const dates = (Array.isArray(txRows) ? txRows : [])
        .map((r: any) => normalizeIsoDate(r?.date))
        .filter((d: string | null): d is string => Boolean(d));
      if (dates.length > 0) {
        periodStart = periodStart || dates[0];
        periodEnd = periodEnd || dates[dates.length - 1];
      }
    } catch {
      // ignore tx fallback failure
    }
  }

  return {
    issuer: issuer || null,
    accountLast4: accountLast4 || null,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    issuerReason: issuer ? null : 'structured metadata unavailable',
    accountReason: accountLast4 ? null : 'account identifier not detected',
    periodReason: periodStart && periodEnd ? null : 'no reliable date range parsed',
  };
}

type StatementQaMode = 'general' | 'merchant' | 'largest' | 'income';

type StatementQaRow = {
  id: string;
  date: string | null;
  merchant: string;
  description: string | null;
  category: string | null;
  amount: number;
  importId: string | null;
  documentId: string | null;
  source: 'transactions' | 'transactions_staging';
};

type StatementQaRequest = {
  importId: string | null;
  startDate: string | null;
  endDate: string | null;
  queryText: string | null;
  includePending: boolean;
  mode: StatementQaMode;
  topN: number;
};

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeStatementQaSignedAmount(rawAmount: unknown, row: any): number {
  let amount = toFiniteNumber(rawAmount);
  const type = String(row?.type || row?.tx_type || '').toLowerCase();
  const direction = String(row?.direction || '').toLowerCase();
  const isDebit = row?.is_debit === true || direction === 'debit' || direction === 'out' || type === 'debit' || type === 'expense';
  const isCreditLike =
    direction === 'credit' ||
    direction === 'in' ||
    type === 'credit' ||
    type === 'income' ||
    type === 'deposit' ||
    type === 'payment' ||
    type === 'refund';
  if (isDebit && amount < 0) amount = Math.abs(amount);
  if (isCreditLike && amount > 0) amount = -Math.abs(amount);
  return amount;
}

function parseTopNHint(message: string): number {
  const m = String(message || '').toLowerCase().match(/\btop\s+(\d{1,2})\b/);
  if (!m?.[1]) return 5;
  const parsed = Number(m[1]);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

function inferStatementQaMode(message: string): StatementQaMode {
  const text = String(message || '').toLowerCase();
  if (/\b(largest|biggest|top\s+\d+)\b/.test(text)) return 'largest';
  if (/\b(income|deposit|deposits|salary|payroll)\b/.test(text)) return 'income';
  if (extractMerchantNeedleFromQuestion(text)) return 'merchant';
  return 'general';
}

async function loadStatementQaRows(
  sb: SupabaseClient,
  userId: string,
  req: StatementQaRequest
): Promise<StatementQaRow[]> {
  const matchText = (value: unknown, queryText: string): boolean => {
    const hay = String(value || '').toLowerCase();
    return hay.includes(queryText.toLowerCase());
  };

  const normalizeDate = (value: unknown): string | null => {
    const normalized = normalizeIsoDate(value);
    return normalized || null;
  };

  const rows: StatementQaRow[] = [];
  try {
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(800);
    if (!error) {
      for (const row of Array.isArray(data) ? data : []) {
        const importId = row?.import_id ? String(row.import_id) : null;
        const documentId = row?.document_id ? String(row.document_id) : null;
        if (req.importId && importId !== req.importId) continue;
        const date = normalizeDate(row?.date || row?.posted_at || row?.occurred_at);
        if (req.startDate && (!date || date < req.startDate)) continue;
        if (req.endDate && (!date || date > req.endDate)) continue;
        const merchant = String(row?.merchant || row?.merchant_name || row?.vendor || row?.description || 'UNKNOWN-MERCHANT').trim();
        const description = String(row?.description || row?.memo || '').trim() || null;
        const category = String(row?.category || '').trim() || null;
        const amount = normalizeStatementQaSignedAmount(row?.amount, row);
        if (req.queryText) {
          const q = req.queryText;
          const textMatch =
            matchText(merchant, q) ||
            matchText(description, q) ||
            matchText(category, q);
          if (!textMatch) continue;
        }
        rows.push({
          id: String(row?.id || `${importId || 'tx'}-${merchant}-${date || 'unknown'}`),
          date,
          merchant,
          description,
          category,
          amount,
          importId,
          documentId,
          source: 'transactions',
        });
      }
    }
  } catch {
    // Non-blocking; fall through to staged rows if available.
  }

  if (req.includePending) {
    try {
      const { data: staged, error: stagedError } = await sb
        .from('transactions_staging')
        .select('id,import_id,data_json')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(800);
      if (!stagedError) {
        for (const row of Array.isArray(staged) ? staged : []) {
          const data = row?.data_json && typeof row.data_json === 'object' ? row.data_json : {};
          const importId = row?.import_id ? String(row.import_id) : null;
          if (req.importId && importId !== req.importId) continue;
          const date = normalizeDate(data?.date || data?.posted_at || data?.occurred_at);
          if (req.startDate && (!date || date < req.startDate)) continue;
          if (req.endDate && (!date || date > req.endDate)) continue;
          const merchant = String(data?.merchant || data?.merchant_name || data?.vendor || data?.description || 'UNKNOWN-MERCHANT').trim();
          const description = String(data?.description || data?.memo || '').trim() || null;
          const category = String(data?.category || '').trim() || null;
          const amount = normalizeStatementQaSignedAmount(data?.amount, data);
          if (req.queryText) {
            const q = req.queryText;
            const textMatch =
              matchText(merchant, q) ||
              matchText(description, q) ||
              matchText(category, q);
            if (!textMatch) continue;
          }
          rows.push({
            id: String(row?.id || `${importId || 'staged'}-${merchant}-${date || 'unknown'}`),
            date,
            merchant,
            description,
            category,
            amount,
            importId,
            documentId: null,
            source: 'transactions_staging',
          });
        }
      }
    } catch {
      // ignore staged read failures
    }
  }

  return rows;
}

function renderStatementQaAnswer(message: string, req: StatementQaRequest, rows: StatementQaRow[]): string {
  const mode = req.mode;
  const charges = rows.filter((r) => r.amount > 0);
  const credits = rows.filter((r) => r.amount < 0);
  const totalDebits = charges.reduce((sum, row) => sum + row.amount, 0);
  const totalCredits = credits.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const net = totalDebits - totalCredits;
  const lowerMessage = String(message || '').toLowerCase();
  const nLargest = req.topN;

  const categoryAgg = new Map<string, { total: number; count: number }>();
  for (const row of charges) {
    const key = String(row.category || 'Uncategorized');
    const existing = categoryAgg.get(key) || { total: 0, count: 0 };
    existing.total += row.amount;
    existing.count += 1;
    categoryAgg.set(key, existing);
  }
  const categoryTotals = Array.from(categoryAgg.entries())
    .map(([category, data]) => ({ category, total: data.total, count: data.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const merchantAgg = new Map<string, { total: number; count: number }>();
  for (const row of charges) {
    const key = String(row.merchant || 'UNKNOWN-MERCHANT').trim();
    const existing = merchantAgg.get(key) || { total: 0, count: 0 };
    existing.total += row.amount;
    existing.count += 1;
    merchantAgg.set(key, existing);
  }
  const topMerchants = Array.from(merchantAgg.entries())
    .map(([merchant, data]) => ({ merchant, total: data.total, count: data.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const largest = [...charges]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, nLargest);

  const sample = [...rows]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 10);

  const lines: string[] = [];
  lines.push('## Summary');
  if (mode === 'income') {
    lines.push(`- Income/deposits found: $${totalCredits.toFixed(2)} across ${credits.length} transaction${credits.length === 1 ? '' : 's'}.`);
  } else if (mode === 'largest') {
    lines.push(`- Here are your top ${largest.length} largest charges from normalized transactions.`);
  } else if (req.queryText) {
    lines.push(`- Spend matching "${req.queryText}": $${totalDebits.toFixed(2)} across ${charges.length} transaction${charges.length === 1 ? '' : 's'}.`);
  } else {
    lines.push(`- I analyzed ${rows.length} normalized transaction${rows.length === 1 ? '' : 's'} for this statement query.`);
  }
  lines.push(`- Total debits: $${totalDebits.toFixed(2)} | total credits: $${totalCredits.toFixed(2)} | net: $${net.toFixed(2)}.`);
  lines.push(`- Scope: ${req.startDate || 'unknown'} to ${req.endDate || 'unknown'}${req.importId ? ` | import ${req.importId.slice(0, 8)}` : ''}.`);
  lines.push('');

  lines.push('## Key details');
  lines.push(`- Rows scanned: ${rows.length}`);
  lines.push(`- Source: ${rows.some((r) => r.source === 'transactions_staging') ? 'committed + staged' : 'committed'}`);
  if (req.queryText) lines.push(`- Query filter: ${req.queryText}`);
  lines.push('');

  if (mode === 'largest' && largest.length > 0) {
    lines.push('## Largest transactions');
    for (const row of largest) {
      lines.push(`- ${row.date || 'UNKNOWN-DATE'} | ${row.merchant || 'UNKNOWN-MERCHANT'} | ${row.amount.toFixed(2)} | CAD`);
    }
    lines.push('');
  }

  if (categoryTotals.length > 0 && /\b(category|categories|restaurant|restaurants|dining|grocery|groceries|fuel|fees|interest)\b/.test(lowerMessage)) {
    lines.push('## Category totals');
    for (const cat of categoryTotals) {
      lines.push(`- ${cat.category}: $${cat.total.toFixed(2)} (${cat.count} txns)`);
    }
    lines.push('');
  }

  if (topMerchants.length > 0 && /\b(merchant|merchants|top|spend|spent|with|at)\b/.test(lowerMessage)) {
    lines.push('## Top merchants');
    for (const merchant of topMerchants) {
      lines.push(`- ${merchant.merchant}: $${merchant.total.toFixed(2)} (${merchant.count} txns)`);
    }
    lines.push('');
  }

  lines.push('## Transactions (sample)');
  for (const row of sample) {
    lines.push(`- ${row.date || 'UNKNOWN-DATE'} | ${row.merchant || 'UNKNOWN-MERCHANT'} | ${row.amount.toFixed(2)} | CAD | ${row.category || 'Uncategorized'}`);
  }
  lines.push('');
  lines.push('## Issues / Uncertain lines');
  lines.push('- No guessed values were used; totals are computed from stored transactions only.');
  return lines.join('\n');
}

async function buildPayoffProjectionResponse(input: {
  messageText: string;
  currency: string;
  orchCtx: OrchCtx;
  snapshot: PipelineSnapshot | null;
  snapshotRaw: any | null;
}): Promise<{
  assistantText: string;
  deterministic_path: string;
  deterministic_intent: string;
  payoffRawForSnapshot?: any;
  payoffSnapshotPatch?: Partial<PipelineSnapshot>;
}> {
  const facts = resolveLoanFacts({}, input.messageText, input.snapshotRaw || input.snapshot || null);
  input.orchCtx.loan_type = facts.loanType;
  input.orchCtx.payoff_engine_used = true;

  if (facts.missing.length > 0) {
    return {
      assistantText: buildPayoffMissingQuestion(facts.missing, facts.hints),
      deterministic_path: 'payoff_engine',
      deterministic_intent: 'payoff_projection_missing_fields',
    };
  }

  const baselineInput: PayoffInput = {
    principal: Number(facts.facts.principal || 0),
    annualRate: Number(facts.facts.annualRate || 0),
    paymentAmount: Number(facts.facts.paymentAmount || 0),
    paymentFrequency: (facts.facts.paymentFrequency || 'monthly') as PayoffInput['paymentFrequency'],
    extraPayment: Number(facts.facts.extraPayment || 0),
    lumpSum: Number(facts.facts.lumpSum || 0),
    maxPeriods: 2000,
  };

  const scenarioAdjustments = parseScenarioAdjustments(input.messageText, baselineInput);
  const hasScenario =
    typeof scenarioAdjustments.extraPayment === 'number' ||
    typeof scenarioAdjustments.lumpSum === 'number' ||
    typeof scenarioAdjustments.annualRate === 'number';
  const scenarioInput: PayoffInput = {
    ...baselineInput,
    ...scenarioAdjustments,
  };

  const computed = compareScenarios(baselineInput, hasScenario ? scenarioInput : baselineInput);
  const plannerInput = {
    loanType: facts.loanType as LoanType,
    baseline: baselineInput,
    ...(hasScenario ? { scenario: scenarioInput } : {}),
    computed,
    notes: [
      `payment frequency: ${baselineInput.paymentFrequency}`,
      `loan type: ${facts.loanType}`,
    ],
  };

  const planned = await withTimeout(
    runFinleyPayoffPlanner(plannerInput, input.orchCtx),
    resolveOpenAiTimeoutMs(),
    'finley_payoff_planner',
    input.orchCtx
  );
  const finleyOutput = normalizeFinleyPayoffOutput(planned, plannerInput);
  const safeFinleyOutput =
    finleyOutput && finleyOutput.one_paragraph_summary
      ? finleyOutput
      : buildFinleyPayoffFallbackOutput('planner_empty', plannerInput);

  const evidence = buildPayoffEvidenceBlock({
    currency: input.currency,
    baseline: computed.baseline,
    scenario: hasScenario ? computed.scenario : undefined,
    baselineInput,
    scenarioInput: hasScenario ? scenarioInput : undefined,
    comparison: computed,
  });

  const key = safeFinleyOutput.key_numbers || {};
  const summaryText = [
    safeFinleyOutput.one_paragraph_summary,
    '',
    `Payoff date estimate: ${key.baseline_payoff_date || computed.baseline.payoffDateISO || 'not reached in current assumptions'}`,
    `Total interest estimate: ${formatCurrency(Number(key.baseline_total_interest || computed.baseline.totalInterest || 0), input.currency)}`,
    hasScenario
      ? `Interest saved: ${formatCurrency(Number(key.interest_saved || computed.delta.interestSaved || 0), input.currency)}`
      : 'Interest saved: add a scenario to compare.',
    hasScenario
      ? `Time saved: ${key.time_saved || formatDurationFromDays(computed.delta.timeSavedDays)}`
      : 'Time saved: add a scenario to compare.',
    '',
    'Next steps:',
    ...(Array.isArray(safeFinleyOutput.next_actions) && safeFinleyOutput.next_actions.length > 0
      ? safeFinleyOutput.next_actions.slice(0, 5).map((v) => `- ${String(v)}`)
      : ['- Confirm your payment frequency and APR.', '- Try one extra payment scenario.']),
    '',
    `Caution: ${Array.isArray(safeFinleyOutput.cautions) && safeFinleyOutput.cautions.length > 0 ? String(safeFinleyOutput.cautions[0]) : 'Lender prepayment rules can affect real savings.'}`,
    '',
    evidence,
  ].join('\n');

  const payoffRawForSnapshot = {
    payoff: {
      loan_type: facts.loanType,
      baseline_assumptions: {
        principal: baselineInput.principal,
        annualRate: baselineInput.annualRate,
        paymentAmount: baselineInput.paymentAmount,
        paymentFrequency: baselineInput.paymentFrequency,
      },
      ...(hasScenario
        ? {
            scenario_assumptions: {
              extraPayment: scenarioInput.extraPayment || 0,
              lumpSum: scenarioInput.lumpSum || 0,
              annualRate: scenarioInput.annualRate,
            },
          }
        : {}),
      output: safeFinleyOutput,
      computed: {
        baseline: computed.baseline,
        scenario: hasScenario ? computed.scenario : undefined,
        delta: computed.delta,
      },
    },
  };

  return {
    assistantText: ensureAssistantContent(summaryText, 'deterministic_brains', input.orchCtx),
    deterministic_path: 'payoff_engine',
    deterministic_intent: 'payoff_projection',
    payoffRawForSnapshot,
    payoffSnapshotPatch: {
      loan_type: facts.loanType,
      loan_facts: {
        principal: baselineInput.principal,
        annualRate: baselineInput.annualRate,
        paymentAmount: baselineInput.paymentAmount,
        paymentFrequency: baselineInput.paymentFrequency,
      },
    },
  };
}

async function attachWorkerOutput(ctx: OrchCtx, key: string, value: any): Promise<boolean> {
  const sanitized = sanitizeWorkerValue(value);
  ctx.worker_outputs[key] = sanitized;
  if (ctx.persist_worker_output) {
    try {
      const persisted = await ctx.persist_worker_output(key, sanitized);
      return Boolean(persisted);
    } catch {
      return false;
    }
  }
  return false;
}

async function runTagWorkerCategorization(inputText: string, pagesProcessedHint = 1, ctx?: OrchCtx | null): Promise<any> {
  if (!openai) {
    return buildTagWorkerFallbackOutput('openai_unavailable', pagesProcessedHint);
  }
  try {
    const tagAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' } as any,
        messages: [
          { role: 'system', content: TAG_WORKER_SYSTEM_PROMPT },
          { role: 'user', content: String(inputText || 'No extracted text was provided.') },
        ],
        max_tokens: 2000,
      } as any),
      resolveOpenAiTimeoutMs(),
      'tag_worker_categorization',
      ctx,
      tagAbortController
    );
    const content = completion.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : {};
    return normalizeTagWorkerOutput(parsed, 'parsed_empty', pagesProcessedHint);
  } catch (error: any) {
    console.warn('[Chat] TAG worker categorization failed (non-fatal):', error?.message || error);
    return buildTagWorkerFallbackOutput('tag_worker_error', pagesProcessedHint);
  }
}

/**
 * Get user profile from Supabase profiles table
 * Returns user identity information for AI employees
 * @param sb - Supabase client
 * @param userId - User ID
 * @returns User profile with identity fields or null
 */
async function getUserProfile(
  sb: SupabaseClient,
  userId: string
): Promise<{
  preferredName: string;
  scope: string;
  primaryGoal: string | null;
  proactivityLevel: string | null;
  timezone: string | null;
  currency: string | null;
  accountType: string | null;
  accountName: string | null;
  dateLocale: string | null;
  taxIncluded: string | null;
  taxSystem: string | null;
  aiFluencyLevel: string | null;
  aiFluencyScore: number | null;
} | null> {
  try {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('display_name, first_name, full_name, account_type, currency, time_zone, account_name, date_locale, metadata, ai_fluency_level, ai_fluency_score')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected if profile missing)
      console.warn('[Chat] Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      // Fallback: try auth user metadata/email for a name
      try {
        const { data: authUser } = await sb.auth.admin.getUserById(userId);
        const metaName = authUser?.user?.user_metadata?.full_name
          || authUser?.user?.user_metadata?.name
          || null;
        const emailName = authUser?.user?.email?.split('@')[0] || null;
        const fallbackName = metaName || emailName || 'there';
        return {
          preferredName: fallbackName,
          scope: 'exploring',
          primaryGoal: null,
          proactivityLevel: null,
          timezone: null,
          currency: null,
          accountType: null,
          accountName: null,
          dateLocale: null,
          taxIncluded: null,
          taxSystem: null,
          aiFluencyLevel: 'Explorer',
          aiFluencyScore: 20,
        };
      } catch (fallbackError: any) {
        if (process.env.NETLIFY_DEV === 'true') {
          console.warn('[Chat] getUserProfile fallback failed:', fallbackError?.message || fallbackError);
        }
        return null;
      }
    }

    // Preferred name: display_name → first_name → full_name → auth metadata/email
    let preferredName = profile.display_name || profile.first_name || profile.full_name || 'there';
    if (preferredName === 'there') {
      try {
        const { data: authUser } = await sb.auth.admin.getUserById(userId);
        const metaName = authUser?.user?.user_metadata?.full_name
          || authUser?.user?.user_metadata?.name
          || null;
        const emailName = authUser?.user?.email?.split('@')[0] || null;
        preferredName = metaName || emailName || preferredName;
      } catch (fallbackError: any) {
        if (process.env.NETLIFY_DEV === 'true') {
          console.warn('[Chat] getUserProfile name fallback failed:', fallbackError?.message || fallbackError);
        }
      }
    }

    // Account type (account_type column)
    const scope = profile.account_type || 'exploring';

    // Primary goal from metadata.settings
    const metadata = profile.metadata && typeof profile.metadata === 'object'
      ? profile.metadata as Record<string, any>
      : null;
    const settings = metadata?.settings && typeof metadata.settings === 'object'
      ? metadata.settings as Record<string, any>
      : null;
    const primaryGoal = settings?.primary_goal || null;

    // Proactivity level from metadata.settings
    const proactivityLevel = settings?.proactivity_level || null;

    // Extract timezone from metadata or time_zone column
    const timezone = metadata?.timezone || profile.time_zone || null;
    
    // Currency from currency column
    const currency = profile.currency || null;
    
    // Account type from account_type column
    const accountType = profile.account_type || null;
    
    // Onboarding fields
    const accountName = profile.account_name || null;
    const dateLocale = profile.date_locale || null;
    // Note: tax_included and tax_system columns removed - use metadata only
    // Extract tax fields from metadata if available, otherwise null
    const taxIncluded = metadata?.tax_included || null;
    const taxSystem = metadata?.tax_system || null;

    // AI Fluency Level (for adaptive communication)
    const aiFluencyLevel = profile.ai_fluency_level || 'Explorer';
    const aiFluencyScore = profile.ai_fluency_score || 20;

    // Debug log (dev only)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] getUserProfile:', {
        userId,
        preferredName,
        source: profile.display_name ? 'display_name' : profile.first_name ? 'first_name' : profile.full_name ? 'full_name' : 'fallback',
        scope,
        primaryGoal,
        proactivityLevel,
        timezone,
        currency,
        accountType,
        accountName: accountName ? '***' : null, // Log presence only, not value
        dateLocale: dateLocale ? '***' : null,
        taxIncluded: taxIncluded ? '***' : null,
        taxSystem: taxSystem ? '***' : null,
        aiFluencyLevel,
        aiFluencyScore,
        fieldsLoaded: {
          accountName: !!accountName,
          dateLocale: !!dateLocale,
          taxIncluded: !!taxIncluded,
          taxSystem: !!taxSystem,
        },
      });
    }

    return {
      preferredName,
      scope,
      primaryGoal,
      proactivityLevel,
      timezone,
      currency,
      accountType,
      accountName,
      dateLocale,
      taxIncluded,
      taxSystem,
      aiFluencyLevel,
      aiFluencyScore,
    };
  } catch (error: any) {
    console.warn('[Chat] Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Format user context as a string for injection into system prompts
 * @param userProfile - User profile from getUserProfile
 * @returns Formatted string for system prompt
 */
function formatUserContextForPrompt(userProfile: {
  preferredName: string;
  scope: string;
  primaryGoal: string | null;
  proactivityLevel: string | null;
  timezone: string | null;
  currency: string | null;
  accountType: string | null;
  accountName: string | null;
  dateLocale: string | null;
  taxIncluded: string | null;
  taxSystem: string | null;
  aiFluencyLevel: string | null;
  aiFluencyScore: number | null;
}): string {
  const parts: string[] = [];
  
  parts.push(`**User Identity:**`);
  parts.push(`- Preferred name: ${userProfile.preferredName}`);
  
  if (userProfile.scope && userProfile.scope !== 'exploring') {
    parts.push(`- Account scope: ${userProfile.scope}`);
  }
  
  if (userProfile.accountType) {
    parts.push(`- Account type: ${userProfile.accountType}`);
  }
  
  if (userProfile.accountName) {
    parts.push(`- Account name: ${userProfile.accountName}`);
  }
  
  if (userProfile.currency) {
    parts.push(`- Currency: ${userProfile.currency}`);
  }
  
  if (userProfile.timezone) {
    parts.push(`- Timezone: ${userProfile.timezone}`);
  }
  
  if (userProfile.dateLocale) {
    parts.push(`- Date locale: ${userProfile.dateLocale}`);
  }
  
  if (userProfile.taxIncluded) {
    parts.push(`- Tax included: ${userProfile.taxIncluded}`);
  }
  
  if (userProfile.taxSystem) {
    parts.push(`- Tax system: ${userProfile.taxSystem}`);
  }
  
  if (userProfile.primaryGoal) {
    parts.push(`- Primary financial goal: ${userProfile.primaryGoal}`);
  }
  
  if (userProfile.proactivityLevel) {
    parts.push(`- Proactivity preference: ${userProfile.proactivityLevel}`);
  }
  
  // AI Fluency Level (for adaptive communication - only include if set)
  if (userProfile.aiFluencyLevel && userProfile.aiFluencyLevel !== 'Explorer') {
    parts.push(`- AI fluency level: ${userProfile.aiFluencyLevel} (score: ${userProfile.aiFluencyScore || 20}/100)`);
  }
  
  return parts.join('\n');
}

/**
 * Load documents and build attachment context for chat
 * @param sb - Supabase client
 * @param userId - User ID
 * @param documentIds - Array of document IDs
 * @returns Attachment context string or null if no documents/processing
 */
async function buildAttachmentContext(
  sb: SupabaseClient,
  userId: string,
  documentIds: string[]
): Promise<string | null> {
  if (!documentIds || documentIds.length === 0) {
    return null;
  }

  try {
    // Load documents from user_documents table
    const { data: documents, error } = await sb
      .from('user_documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', userId); // Security: only allow user to read their own documents

    if (error) {
      console.error('[Chat] Error loading documents:', error);
      return null;
    }

    if (!documents || documents.length === 0) {
      console.warn('[Chat] No documents found for provided documentIds');
      return null;
    }

    const contextParts: string[] = [];
    const processingDocs: string[] = [];

    for (const doc of documents) {
      const isProcessing = doc.status === 'pending' || doc.status === 'processing';
      const textLengthValue = doc?.ocr_text_length ?? doc?.extracted_data?.text_length ?? null;
      const textLength = Number.isFinite(Number(textLengthValue)) ? Number(textLengthValue) : 0;
      const textHash = doc?.ocr_text_hash || doc?.extracted_data?.text_hash || null;
      const hasContent = textLength > 0 || Boolean(textHash);

      if (isProcessing && !hasContent) {
        processingDocs.push(doc.original_name || 'document');
        continue;
      }

      // Build context for each document
      const docContext: string[] = [];
      docContext.push(`Document: ${doc.original_name || 'Untitled'}`);
      
      if (doc.mime_type) {
        docContext.push(`Type: ${doc.mime_type}`);
      }

      if (hasContent) {
        const docType = doc?.extracted_data?.docType || doc?.mime_type || 'unknown';
        const quality = doc?.extracted_data?.confidence?.overall;
        docContext.push(`Extraction metrics: length=${textLength}, hash=${textHash || 'n/a'}, type=${docType}, confidence=${typeof quality === 'number' ? Number(quality).toFixed(3) : 'n/a'}`);
      } else if (isProcessing) {
        docContext.push('Status: Still processing (OCR/parsing in progress)');
      }

      contextParts.push(docContext.join('\n'));
    }

    if (processingDocs.length > 0) {
      contextParts.push(
        `\nNote: ${processingDocs.length} document(s) are still being processed: ${processingDocs.join(', ')}. ` +
        `I'll summarize them once processing completes.`
      );
    }

    if (contextParts.length === 0) {
      return null;
    }

    return `\n\n--- ATTACHED DOCUMENTS ---\n${contextParts.join('\n\n---\n')}\n--- END ATTACHED DOCUMENTS ---\n`;
  } catch (error: any) {
    console.error('[Chat] Error building attachment context:', error);
    return null;
  }
}

type SummaryTxnRow = {
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  notes: string;
};

function parseSummaryAmount(value: string): number | null {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseSummaryTransactions(summaryText: string): SummaryTxnRow[] {
  const lines = String(summaryText || '').split('\n');
  const rows: SummaryTxnRow[] = [];
  const rowPattern = /^-\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(rowPattern);
    if (!match) continue;

    const date = String(match[1] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && date !== 'UNKNOWN-DATE') continue;

    const merchant = String(match[2] || '').trim();
    const amount = parseSummaryAmount(String(match[3] || ''));
    if (amount === null) continue;
    const currency = String(match[4] || '').trim().toUpperCase() || 'UNKNOWN';
    const notes = String(match[5] || '').trim();

    rows.push({ date, merchant, amount, currency, notes });
  }

  return rows;
}

function buildSummaryMathFacts(summaryText: string): string | null {
  const rows = parseSummaryTransactions(summaryText);
  if (rows.length === 0) return null;

  const knownDateRows = rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dateCoverage =
    knownDateRows.length > 0
      ? `${knownDateRows[0].date} to ${knownDateRows[knownDateRows.length - 1].date}`
      : 'unknown';

  const currencySet = Array.from(new Set(rows.map((r) => r.currency).filter(Boolean)));
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  const eTransferRows = rows.filter((r) => /\be-?transfer\b/i.test(r.merchant));
  const eTransferTotal = eTransferRows.reduce((sum, r) => sum + r.amount, 0);

  const merchantRollup = new Map<string, { count: number; amount: number }>();
  for (const row of rows) {
    const key = row.merchant || 'UNKNOWN-MERCHANT';
    const existing = merchantRollup.get(key) || { count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += row.amount;
    merchantRollup.set(key, existing);
  }
  const topMerchants = Array.from(merchantRollup.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([merchant, agg]) => `${merchant} (${agg.count} tx, ${agg.amount.toFixed(2)})`);

  const monthRollup = new Map<string, number>();
  for (const row of knownDateRows) {
    const monthKey = row.date.slice(0, 7);
    monthRollup.set(monthKey, (monthRollup.get(monthKey) || 0) + row.amount);
  }
  const monthTotals = Array.from(monthRollup.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, total]) => `${month}: ${total.toFixed(2)}`);

  const monthCounts = new Map<string, number>();
  for (const row of knownDateRows) {
    const monthKey = row.date.slice(0, 7);
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  }

  const now = new Date();
  const thisMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthKey = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const thisMonthTotal = monthRollup.get(thisMonthKey) || 0;
  const thisMonthCount = monthCounts.get(thisMonthKey) || 0;
  const lastMonthTotal = monthRollup.get(lastMonthKey) || 0;
  const lastMonthCount = monthCounts.get(lastMonthKey) || 0;

  const coverageMonthKey = knownDateRows.length > 0 ? knownDateRows[knownDateRows.length - 1].date.slice(0, 7) : null;
  const coverageMonthTotal = coverageMonthKey ? monthRollup.get(coverageMonthKey) || 0 : 0;
  const coverageMonthCount = coverageMonthKey ? monthCounts.get(coverageMonthKey) || 0 : 0;

  const currencyLabel = currencySet.length === 1 ? currencySet[0] : 'MIXED';
  const facts: string[] = [
    `- Parsed transaction lines: ${rows.length}`,
    `- Date coverage: ${dateCoverage}`,
    `- Total amount across listed lines: ${totalAmount.toFixed(2)} ${currencyLabel}`,
    `- E-TRANSFER count: ${eTransferRows.length}`,
    `- E-TRANSFER total: ${eTransferTotal.toFixed(2)} ${currencyLabel}`,
  ];

  if (topMerchants.length > 0) {
    facts.push(`- Top merchants by amount: ${topMerchants.join('; ')}`);
  }
  if (monthTotals.length > 0) {
    facts.push(`- Month totals: ${monthTotals.join('; ')}`);
  }
  facts.push(
    `- Timeframe resolver (this month=${thisMonthKey}): count=${thisMonthCount}, total=${thisMonthTotal.toFixed(2)} ${currencyLabel}`
  );
  facts.push(
    `- Timeframe resolver (last month=${lastMonthKey}): count=${lastMonthCount}, total=${lastMonthTotal.toFixed(2)} ${currencyLabel}`
  );
  if (coverageMonthKey) {
    facts.push(
      `- Timeframe resolver (this period=${coverageMonthKey}): count=${coverageMonthCount}, total=${coverageMonthTotal.toFixed(2)} ${currencyLabel}`
    );
  }

  facts.push(
    '- Follow-up rules: map "this month" and "last month" to the resolver lines above; map "this period" to the latest covered month; for custom ranges use Date coverage + transaction lines.'
  );
  return facts.join('\n');
}

/**
 * Build fallback context from latest persisted Prime summary.
 * Used for follow-up questions when no documentIds are attached.
 */
async function buildLatestImportSummaryContext(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await sb
      .from('import_summaries')
      .select('import_id, summary_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.summary_text) {
      return null;
    }

    const summaryText = String(data.summary_text).trim();
    if (!summaryText) {
      return null;
    }

    const mathFacts = buildSummaryMathFacts(summaryText);

    // Keep context bounded to avoid prompt bloat.
    const boundedSummary = summaryText.slice(0, 12000);
    return `\n\n--- LATEST IMPORT SUMMARY ---\nImport ID: ${data.import_id || 'unknown'}\nGenerated: ${data.created_at || 'unknown'}\n${boundedSummary}\n--- END LATEST IMPORT SUMMARY ---\n${
      mathFacts ? `\n--- LATEST IMPORT MATH FACTS ---\n${mathFacts}\n--- END LATEST IMPORT MATH FACTS ---\n` : ''
    }`;
  } catch (error: any) {
    console.warn('[Chat] Failed to load latest import summary context:', error?.message || error);
    return null;
  }
}

// ============================================================================
// CUSTODIAN: CONVERSATION SUMMARY HELPER
// ============================================================================

/**
 * Update conversation summary for Custodian
 * Generates title, summary, and tags using OpenAI, then upserts into chat_convo_summaries
 * @param sb - Supabase client
 * @param userId - User ID
 * @param conversationId - Conversation/session ID
 * @param messages - Full conversation messages array
 * @param employeesInvolved - Array of employee slugs involved in conversation
 */
async function updateConversationSummaryForCustodian(
  sb: SupabaseClient,
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  employeesInvolved: string[]
): Promise<void> {
  // Skip if OpenAI not configured or no messages
  if (!openai || messages.length === 0) {
    return;
  }

  try {
    // Get conversation text (last 20 messages for context, or all if fewer)
    const recentMessages = messages.slice(-20);
    const conversationText = recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Call OpenAI to generate title, summary, and tags
    const custodianAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const summaryResponse = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Custodian, an AI assistant that creates concise summaries of financial conversations.

Generate:
1. A short title (3-8 words) that captures the main topic
2. A 1-2 sentence summary of what was discussed
3. 2-5 relevant tags (e.g., "budgeting", "debt", "investments", "taxes", "spending-analysis")

Return JSON format:
{
  "title": "Short descriptive title",
  "summary": "One to two sentence summary of the conversation.",
  "tags": ["tag1", "tag2", "tag3"]
}`
          },
          {
            role: 'user',
            content: `Summarize this conversation:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      } as any),
      resolveOpenAiTimeoutMs(),
      'custodian_conversation_summary',
      null,
      custodianAbortController
    );

    const content = summaryResponse.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Custodian] No summary content generated');
      return;
    }

    // Parse JSON response
    let summaryData: { title: string; summary: string; tags: string[] };
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, content];
      summaryData = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.warn('[Custodian] Failed to parse summary JSON:', parseError);
      // Fallback: create basic summary from first user message
      const firstUserMessage = messages.find(m => m.role === 'user')?.content || '';
      summaryData = {
        title: firstUserMessage.substring(0, 50) || 'New Conversation',
        summary: firstUserMessage.substring(0, 200) || 'Conversation started.',
        tags: [],
      };
    }

    // Get conversation timestamps from messages (if available) or use current time
    // Note: messages array doesn't have created_at, so we'll use current time for last_message_at
    // and query the database for started_at if needed
    const now = new Date().toISOString();
    let startedAt = now;
    let lastMessageAt = now;
    
    // Try to get started_at from first message in database
    try {
      const { data: firstMessage } = await sb
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (firstMessage?.created_at) {
        startedAt = firstMessage.created_at;
      }
    } catch (e) {
      // Ignore errors, use current time
    }
    
    // Try to get last_message_at from last message in database
    try {
      const { data: lastMessage } = await sb
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastMessage?.created_at) {
        lastMessageAt = lastMessage.created_at;
      }
    } catch (e) {
      // Ignore errors, use current time
    }

    // Upsert into chat_convo_summaries (conflict on unique index idx_convo_summaries_user_conversation)
    // Note: Supabase upsert uses the unique constraint columns, not the index name
    // updated_at is auto-managed by trigger, so we don't include it in upsert
    const { error: upsertError } = await sb
      .from('chat_convo_summaries')
      .upsert({
        user_id: userId,
        conversation_id: conversationId,
        title: summaryData.title,
        summary: summaryData.summary,
        tags: summaryData.tags || [],
        employees_involved: employeesInvolved,
        started_at: startedAt,
        last_message_at: lastMessageAt,
        pinned: false,
        // updated_at is auto-updated by trigger, don't include it
      }, {
        // Use onConflict with the actual unique constraint column names
        // The constraint is typically on (user_id, conversation_id)
        // If the constraint name is different, Supabase will use the column names
        onConflict: 'user_id,conversation_id',
        ignoreDuplicates: false, // Update existing rows
      });

    if (upsertError) {
      console.error('[Custodian] Failed to upsert chat_convo_summaries:', {
        error: upsertError,
        userId,
        conversationId,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
    } else {
      console.log(`[Custodian] ✅ Updated summary for conversation ${conversationId}`);
    }
  } catch (error: any) {
    // Non-blocking: log error but don't throw
    console.warn('[Custodian] Error updating conversation summary:', error);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event, context) => {
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  let body: any = null;
  let employeeSlugForLog: string | null = null;
  let requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const streamEncoder = new TextEncoder();
  let streamController: any = null;
  let streamStarted = false;
  // Environment variable diagnostics (safe - never logs secrets)
  const envCheck = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnon: !!process.env.SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  console.log('[chat] env check', envCheck);

  // Validate required environment variables
  if (!envCheck.hasOpenAI || !envCheck.hasSupabaseUrl) {
    const missing = [];
    if (!envCheck.hasOpenAI) missing.push('OPENAI_API_KEY');
    if (!envCheck.hasSupabaseUrl) missing.push('SUPABASE_URL');
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Missing server environment variables',
        missing: missing.join(', '),
        message: 'Server configuration error. Please contact support.',
      }),
    };
  }

  // CORS headers (will be enhanced with guardrail headers later)
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // CRITICAL: Allow Authorization header for JWT auth
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // CRITICAL: Request timing instrumentation
  const requestStartTime = Date.now();
  const timingLogs: Record<string, number> = {};
  const orchCtx: OrchCtx = {
    requestId,
    threadId: null,
    sessionId: null,
    employee: null,
    stage: 'ingress',
    failed_stage: null,
    fallback_used: false,
    deterministic_path: null,
    deterministic_intent: null,
    worker_outputs: {},
    worker_output_hashes: {},
    tag_saved: false,
    pipeline_snapshot_loaded: false,
    pipeline_snapshot_saved: false,
    reuse_path: 'none',
    recurring_detected: false,
    recurring_count: 0,
    payoff_engine_used: false,
    loan_type: null,
    help_fast_lane_used: false,
    help_fast_lane_intent: null,
    memory_used: false,
    memory_skip_reason: 'not_evaluated',
    openai_timeout: false,
    employee_profile_cache_hit: null,
    timeout_label: null,
    timeout_ms: null,
    timings: {
      request_started_at: requestStartTime,
      stage_started_at: requestStartTime,
      stage_durations_ms: {},
    },
  };
  let orchestrationStage: OrchStage = 'ingress';
  let fallbackUsed = false;
  let orchSummaryEmitted = false;
  const setStage = (stage: OrchStage) => {
    const now = Date.now();
    const prev = orchCtx.stage;
    const elapsed = now - orchCtx.timings.stage_started_at;
    orchCtx.timings.stage_durations_ms[prev] = (orchCtx.timings.stage_durations_ms[prev] || 0) + Math.max(0, elapsed);
    orchCtx.timings.stage_started_at = now;
    orchCtx.stage = stage;
    if (process.env.NETLIFY_DEV === 'true') {
      console.log('[Chat][ORCH] stage=', stage);
    }
    orchestrationStage = stage;
  };
  const emitOrchSummary = (success: boolean, overrides?: Partial<OrchCtx>) => {
    if (orchSummaryEmitted) return;
    orchSummaryEmitted = true;
    const summaryCtx = { ...orchCtx, ...overrides };
    console.log(
      `[Chat][ORCH_SUMMARY] requestId=${summaryCtx.requestId} threadId=${summaryCtx.threadId || 'null'} sessionId=${summaryCtx.sessionId || 'null'} employee=${summaryCtx.employee || 'null'} stage=${summaryCtx.stage || 'null'} deterministic_path=${summaryCtx.deterministic_path || 'model'} fallback_used=${summaryCtx.fallback_used ? 'true' : 'false'} success=${success ? 'true' : 'false'} tag_saved=${summaryCtx.tag_saved ? 'true' : 'false'} pipeline_snapshot_loaded=${summaryCtx.pipeline_snapshot_loaded ? 'true' : 'false'} pipeline_snapshot_saved=${summaryCtx.pipeline_snapshot_saved ? 'true' : 'false'} reuse_path=${summaryCtx.reuse_path || 'none'} recurring_detected=${summaryCtx.recurring_detected ? 'true' : 'false'} recurring_count=${Number(summaryCtx.recurring_count || 0)} payoff_engine_used=${summaryCtx.payoff_engine_used ? 'true' : 'false'} loan_type=${summaryCtx.loan_type || 'unknown'} help_fast_lane_used=${summaryCtx.help_fast_lane_used ? 'true' : 'false'} help_fast_lane_intent=${summaryCtx.help_fast_lane_intent || 'none'} memory_used=${summaryCtx.memory_used ? 'true' : 'false'} memory_skip_reason=${summaryCtx.memory_skip_reason || 'none'} employee_profile_cache_hit=${summaryCtx.employee_profile_cache_hit === true ? 'true' : 'false'} openai_timeout=${summaryCtx.openai_timeout ? 'true' : 'false'} openai_timeout_ms=${Number(summaryCtx.timeout_ms || 0)} openai_timeout_label=${summaryCtx.timeout_label || 'none'}`
    );
  };
  
  try {
    if (!body) {
      body = event.body ? JSON.parse(event.body || '{}') : {};
      requestId = body?.requestId || requestId;
      orchCtx.requestId = requestId;
      employeeSlugForLog = body?.employeeSlug || null;
    }
    // Verify authentication from JWT token
    // Log auth header presence for debugging
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] Auth check:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      });
    }
    
    const authStartTime = Date.now();
    let { userId, error: authError } = await verifyAuth(event);
    timingLogs.auth = Date.now() - authStartTime;

    // Security lock: JWT identity is the only trusted user source.
    // Never accept user identity from request body for chat.

    if (authError || !userId) {
      // Enhanced error logging for debugging
      console.error('[Chat] Auth failed:', {
        authError,
        hasAuthHeader: !!authHeader,
        userId: userId || 'none',
      });
      return {
        statusCode: 401,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: authError || 'Authentication required' }),
      };
    }
    
    // Log successful auth (dev only)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] Auth successful:', { userId });
    }

    // Parse request body (userId now comes from JWT, not body)
    const requestBody = (body || JSON.parse(event.body || '{}')) as ChatRequest;
    let { employeeSlug, message, sessionId, threadId: requestThreadId, stream = true, systemPromptOverride, documentIds, client_message_id, request_id } = requestBody;
    let effectivePrimeContext: ChatRequest['prime_context'] = requestBody?.prime_context || null;
    employeeSlugForLog = employeeSlug || null;
    const userForcedEmployee = !!body.employeeSlug;
    const isNetlifyDev = process.env.NETLIFY_DEV === 'true';
    const primeDebug = flagEnabled(process.env.PRIME_DEBUG ?? process.env.VITE_PRIME_DEBUG);
    const allowStreamInDev = flagEnabled(process.env.PRIME_STREAM_IN_DEV);
    const runtimeCacheTtlSeconds = getRuntimeCacheTtlSeconds(isNetlifyDev);
    if (isNetlifyDev && stream === true && !allowStreamInDev) {
      console.log('[Chat] DEV MODE: Forcing non-streaming (SSE disabled) to keep Netlify CLI stable');
      stream = false;
    } else if (isNetlifyDev && stream === true && allowStreamInDev) {
      console.log('[Chat] DEV MODE: PRIME_STREAM_IN_DEV=1, keeping SSE streaming enabled');
    }

    // Validate required fields (userId already verified from JWT)
    if (!message) {
      return {
        statusCode: 400,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'message is required' }),
      };
    }

    const messageTrimmed = message.trim();
    const primeIntent = detectPrimeIntent(messageTrimmed);
    const statusPrefixes = [
      '📄 Uploading',
      '✅ Upload complete',
      '✅ OCR complete',
      'OCR completed',
      "I've uploaded",
    ];
    if (statusPrefixes.some(prefix => messageTrimmed.startsWith(prefix))) {
      console.warn('[Chat] blocked auto-status message');
      console.debug('[Chat] ignored status message', { message: messageTrimmed });
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ignored: true, reason: 'status_message' }),
      };
    }

    

    // ========================================================================
    // 0.3. FAST PATH CHECK (Speed Mode for Short Messages)
    // ========================================================================
    // Skip expensive context retrieval for short messages/greetings to improve response time
    const messageLength = messageTrimmed.length;
    const isGreeting = /^(hi|hello|hey|thanks|thank you|thx|bye|goodbye|good night|good morning|good afternoon|sup|what's up|howdy)$/i.test(messageTrimmed);
    const hasAttachments = Array.isArray(documentIds) && documentIds.length > 0;
    const classifiedLane = classifyPrimeLane(messageTrimmed, hasAttachments);
    const primeChatGptStyleMode = isPrimeChatGptStyleModeEnabled();
    let shouldPreferPrimeQualityMode = false;
    let isFastPath = messageLength <= 30 || isGreeting;
    
    if (isFastPath && process.env.NETLIFY_DEV === 'true') {
      console.log(`[Chat] 🚀 FAST PATH enabled: messageLength=${messageLength}, isGreeting=${isGreeting}`);
    }

    // ========================================================================
    // 0.5. RATE LIMITING (Optional - fails open if not available)
    // ========================================================================
    let isRateLimited = false;
    try {
      const rateLimitModule = await import('./_shared/rate-limit.js');
      if (rateLimitModule.assertWithinRateLimit) {
        await rateLimitModule.assertWithinRateLimit(userId, 20); // 20 requests per minute
      }
    } catch (rateLimitError: any) {
      if (rateLimitError.statusCode === 429) {
        // Rate limit exceeded - return proper 429 response
        const retryAfter = rateLimitError.retryAfter || 60;
        return {
          statusCode: 429,
          headers: {
            ...baseHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
          body: JSON.stringify({
            error: rateLimitError.message || 'Rate limit exceeded',
            retryAfter,
          }),
        };
      }
      // For other errors (including module not found, table missing, etc.), fail open
      // In local dev, rate limiting may not be available - don't crash
      if (rateLimitError.code !== 'MODULE_NOT_FOUND') {
        console.warn('[Chat] Rate limit check failed (non-fatal, failing open):', rateLimitError.message || rateLimitError);
      }
      isRateLimited = false; // Fail open in dev/local
    }

    let sb;
    try {
      sb = admin();
    } catch (error: any) {
      console.error('[Chat] Failed to initialize Supabase:', error);
      // Return graceful error instead of 500
      const isStreaming = stream !== false;
      if (isStreaming) {
        const errorMessage = "I'm sorry, I'm having trouble connecting to the database right now. Please try again in a moment.";
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: errorMessage })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
        };
      }
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: false,
          error: 'Database configuration error',
          content: "I'm sorry, I'm having trouble connecting to the database right now. Please try again in a moment.",
          message: process.env.NETLIFY_DEV === 'true' ? error.message : undefined,
        }),
      };
    }

    if (client_message_id) {
      try {
        let query = sb
          .from('chat_messages')
          .select('id')
          .eq('user_id', userId)
          .eq('role', 'user')
          .contains('metadata', { client_message_id })
          .limit(1);
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        const { data: existing } = await query.maybeSingle();
        if (existing) {
          return {
            statusCode: 200,
            headers: {
              ...baseHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ok: true, deduped: true, type: 'noop' }),
          };
        }
      } catch (dedupeError: any) {
        console.warn('[Chat] client_message_id dedupe check failed (non-fatal):', dedupeError?.message || dedupeError);
      }
    }

    setStage('guardrails');
    // ========================================================================
    // 1. UNIFIED GUARDRAILS (Policy Enforcement + PII Masking)
    // ========================================================================
    // Phase 2.2: All guardrails go through unified API (includes config loading)
    // Run guardrails on the user message BEFORE routing/model calls
    // This ensures all employees (Prime, Liberty, Tag, etc.) share the same protection
    
    // Get guardrail config to access preset for routing
    // Default to 'balanced' if config fetch fails
    let preset: 'strict' | 'balanced' | 'creative' = 'balanced';
    let guardrailConfig: any = null;
    try {
      // Use top-level import from guardrails-unified.js (no dynamic import needed)
      guardrailConfig = await getGuardrailConfig(userId);
      preset = guardrailConfig.preset || 'balanced';
    } catch (error) {
      console.warn('[Chat] Failed to get guardrail config, using default preset:', error);
      preset = 'balanced';
    }
    
    const userText = message;
    const GREETING_ALLOWLIST = [
      /^hi\b/i,
      /^hello\b/i,
      /^hey\b/i,
      /^good (morning|afternoon|evening)\b/i,
      /^how are you\b/i,
    ];
    const isGreetingAllowlisted = GREETING_ALLOWLIST.some(r => r.test(userText.trim()));
    if (process.env.NETLIFY_DEV === 'true') {
      console.log('[Guardrails] Scanning text (user-only):', userText);
    }
    if (isGreetingAllowlisted) {
      console.log('[Guardrails] Allowlisted greeting — skipping jailbreak detection');
    }

    let masked = userText;
    let piiFound: string[] = [];
    let guardrailResult: any = { ok: true, signals: {}, maskedMessages: [{ role: 'user', content: userText }] };
    
    try {
      const guardrailContext: GuardrailContext = {
        userId,
        sessionId: sessionId || undefined,
        employeeSlug: employeeSlug || undefined,
        source: 'chat',
      };

      if (!isGreetingAllowlisted) {
        guardrailResult = await runInputGuardrails(guardrailContext, {
          messages: [{ role: 'user', content: userText }],
        }, guardrailConfig || undefined);
      }

      if (!guardrailResult.ok) {
        setStage('respond');
        orchCtx.failed_stage = 'guardrails';
        orchCtx.employee = employeeSlug || 'prime-boss';
        const headers = buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: guardrailResult.signals?.pii || false,
          employee: employeeSlug || 'prime-boss',
        });

        const blockedResponse = sendBlockedResponse(
          guardrailResult.blockedReason || 'policy_violation',
          guardrailResult.events || []
        );

        let safeBlockedBody = blockedResponse.body;
        try {
          const parsed = JSON.parse(String(blockedResponse.body || '{}'));
          const safeContent = ensureAssistantContent(parsed?.content, 'guardrails', orchCtx);
          safeBlockedBody = JSON.stringify({ ...parsed, content: safeContent });
        } catch {
          safeBlockedBody = JSON.stringify({
            ok: false,
            error: guardrailResult.blockedReason || 'policy_violation',
            content: ensureAssistantContent('', 'guardrails', orchCtx),
          });
        }
        emitOrchSummary(true);

        return {
          statusCode: blockedResponse.statusCode || 200,
          headers: {
            ...baseHeaders,
            ...headers,
            ...blockedResponse.headers,
          },
          body: safeBlockedBody,
        };
      }

      // Use the masked text from guardrails result
      masked = guardrailResult.maskedMessages?.[0]?.content || userText;
      piiFound = guardrailResult.signals?.piiTypes || [];
    } catch (guardrailError: any) {
      // Guardrails failed - log but don't crash, use original message
      console.warn('[Chat] Guardrails check failed (non-fatal, using original message):', guardrailError.message || guardrailError);
      masked = userText;
      piiFound = [];
      // Continue with original message - fail open in dev
    }

    const guardrailEvents = guardrailResult?.events;
    if (process.env.NETLIFY_DEV === 'true') {
      console.log(
        '[Chat][DEBUG 966] typeof target=',
        typeof guardrailEvents,
        'isArray=',
        Array.isArray(guardrailEvents),
        'keys=',
        guardrailEvents && typeof guardrailEvents === 'object' ? Object.keys(guardrailEvents) : null
      );
    }
    const guardrailEventsCount = Array.isArray(guardrailEvents) ? guardrailEvents.length : 0;
    console.log(`[Chat] Guardrails passed, PII masked: ${piiFound.length > 0}`, {
      original: message.slice(0, 40),
      masked: masked.slice(0, 40),
      foundTypes: piiFound,
      employeeSlug: employeeSlug || 'prime-boss',
      eventsCount: guardrailEventsCount,
    });

    // ========================================================================
    // BUILD GUARDRAILS STATUS OBJECT (for response metadata)
    // ========================================================================
    /**
     * Build guardrails status object for chat responses
     * This provides real-time status based on actual guardrails execution
     */
    function buildGuardrailsStatus(mode: 'streaming' | 'json'): {
      enabled: boolean;
      pii_masking: boolean;
      moderation: boolean;
      policy_version: string;
      checked_at: string;
      mode: 'streaming' | 'json';
      reason?: string;
    } {
      const hasPiiMasking = guardrailConfig?.chat?.pii !== false && guardrailConfig?.ingestion?.pii !== false;
      const hasModeration = guardrailConfig?.chat?.moderation === true || guardrailConfig?.ingestion?.moderation === true;
      const isEnabled = guardrailResult?.ok !== false && guardrailConfig !== null;
      
      // Policy version: use preset as version identifier
      const policyVersion = guardrailConfig?.preset || 'balanced';
      
      // If guardrails failed to load or execute, mark as disabled
      let reason: string | undefined;
      if (!isEnabled) {
        if (!guardrailConfig) {
          reason = 'config_load_failed';
        } else if (!guardrailResult?.ok) {
          reason = guardrailResult?.blockedReason || 'execution_failed';
        } else {
          reason = 'unknown';
        }
      }
      
      return {
        enabled: isEnabled,
        pii_masking: hasPiiMasking && isEnabled,
        moderation: hasModeration && isEnabled,
        policy_version: policyVersion,
        checked_at: new Date().toISOString(),
        mode,
        ...(reason ? { reason } : {}),
      };
    }

    setStage('routing');
    // ========================================================================
    // 4. EMPLOYEE ROUTING
    // ========================================================================
    // Restore original routing behavior: pass employeeSlug directly to router
    // Router handles normalization internally via resolveSlug()
    // Only normalize here for UI aliases (prime -> prime-boss, byte -> byte-docs, etc.)
    // but preserve canonical slugs as-is
    const requestedEmployeeSlug = employeeSlug 
      ? normalizeEmployeeSlug(employeeSlug) // Only normalizes known aliases, preserves canonical slugs
      : null; // null means router will auto-route based on message content
    
    let routing: any;
    let finalEmployeeSlug: string | null = userForcedEmployee ? requestedEmployeeSlug : null;
    let systemPreamble: string | null = null;
    let employeePersona: string | null = null;
    
    if (!userForcedEmployee) {
      try {
        routing = await routeToEmployee({
          userText: masked,
          requestedEmployee: requestedEmployeeSlug, // Pass normalized slug or null
          mode: preset, // Use guardrail preset (strict/balanced/creative)
        });

        const { employee, systemPreamble: routingPreamble, employeePersona: routingPersona } = routing;
        
        // Router already normalizes via resolveSlug(), so use its result directly
        // Only normalize again if router returned something unexpected
        if (employee) {
          finalEmployeeSlug = employee; // Router's resolveSlug already normalized it
        } else if (requestedEmployeeSlug) {
          finalEmployeeSlug = requestedEmployeeSlug; // Fallback to requested if router returned null
        }
        
        systemPreamble = routingPreamble || null;
        employeePersona = routingPersona || null;
      } catch (routingError: any) {
        // Routing failed - use requested employee or fallback to Prime
        console.warn('[Chat] Employee routing failed (non-fatal, using requested employee):', routingError.message || routingError);
        finalEmployeeSlug = requestedEmployeeSlug || null;
        systemPreamble = null;
        employeePersona = null;
      }
    }

    if (!finalEmployeeSlug) {
      finalEmployeeSlug = 'prime-boss';
    }
    orchCtx.employee = finalEmployeeSlug;
    const isPrimeEmployee = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    const primeLane: PrimeLane = classifiedLane;
    const isPrimeFastLane = finalEmployeeSlug === 'prime-boss' && primeLane === 'fast';
    const isPrimeDeepLane = finalEmployeeSlug === 'prime-boss' && primeLane === 'deep';
    const toolsAllowedThisTurn = !(finalEmployeeSlug === 'prime-boss' && isPrimeFastLane);
    shouldPreferPrimeQualityMode =
      primeChatGptStyleMode &&
      isPrimeEmployee;
    // 2-lane architecture for Prime: force fast/deep from classifier.
    if (finalEmployeeSlug === 'prime-boss') {
      isFastPath = isPrimeFastLane;
      if (isPrimeDeepLane && process.env.NETLIFY_DEV === 'true') {
        console.log('[Chat] PRIME QUALITY MODE: disabled fast path for deep/analysis Prime turn');
      }
      if (primeDebug) {
        console.log('[Chat][PRIME_DEBUG] lane selected', {
          lane: primeLane,
          hasAttachments,
          messageWords: messageTrimmed.split(/\s+/).filter(Boolean).length,
          employee: finalEmployeeSlug,
        });
      }
    }

    console.log('[chat] employee lock', {
      userForcedEmployee,
      requested: body.employeeSlug,
      resolved: finalEmployeeSlug,
    });
    
    const originalEmployeeSlug = finalEmployeeSlug; // Track original for handoff detection
    const explicitlyRequestedEmployee = requestedEmployeeSlug || null; // Store if employee was explicitly requested (not auto-routed)

    // Check for custom system prompt from frontend (e.g., from EmployeeChatPage with category context)
    // NOTE: We read systemPromptOverride from the request body, not headers, because HTTP headers
    // must be ISO-8859-1 compatible. System prompts contain markdown, fancy quotes, emojis, and
    // other Unicode characters that are not valid in header values. Using the JSON body allows
    // us to send rich, UTF-8 encoded prompts without encoding issues.
    const customSystemPrompt = systemPromptOverride;
    
    console.log(`[Chat] Routed to: ${finalEmployeeSlug}${customSystemPrompt ? ' (custom system prompt provided)' : ''}`);

    // ========================================================================
    // 4.5. LOAD EMPLOYEE PROFILE & TOOLS
    // ========================================================================
    let employeeTools: string[] = [];
    let toolModules: Record<string, any> = {};
    let employeeSystemPrompt: string | null = null; // Load system_prompt from database
    
    // Defensive employee profile loading - don't crash if profile missing
    // If profile is missing, continue without tools/system prompt (router's persona will be used)
    try {
      const employeeProfile = await getEmployeeProfileCached(sb, finalEmployeeSlug, orchCtx);
      if (employeeProfile.tools_allowed && Array.isArray(employeeProfile.tools_allowed) && employeeProfile.tools_allowed.length > 0) {
        employeeTools = employeeProfile.tools_allowed;
        toolModules = pickTools(employeeTools);
        console.log(`[Chat] Loaded ${employeeTools.length} tools for ${finalEmployeeSlug}:`, employeeTools);
        
        // Special logging for Prime and Tag to verify handoff tool is included
        if (finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime') {
          const hasHandoff = employeeTools.includes('request_employee_handoff');
          console.log(`[Chat] Prime tools check - request_employee_handoff included: ${hasHandoff}`);
          if (!hasHandoff) {
            console.error(`[Chat] ❌ CRITICAL: Prime is missing request_employee_handoff tool! Current tools:`, employeeTools);
            console.error(`[Chat] Prime cannot delegate without this tool. Run migration: 20251120_add_handoff_tool_to_prime.sql`);
          } else {
            console.log(`[Chat] ✅ Prime delegation enabled - can hand off to other employees`);
          }

          if (!employeeTools.includes('tx_search')) {
            employeeTools = [...employeeTools, 'tx_search'];
            toolModules = pickTools(employeeTools);
            console.log('[Chat] Prime tx_search tool enabled via runtime fallback');
          }
          if (!employeeTools.includes('tx_get')) {
            employeeTools = [...employeeTools, 'tx_get'];
            toolModules = pickTools(employeeTools);
            console.log('[Chat] Prime tx_get tool enabled via runtime fallback');
          }
          if (!employeeTools.includes('tx_update_category')) {
            employeeTools = [...employeeTools, 'tx_update_category'];
            toolModules = pickTools(employeeTools);
            console.log('[Chat] Prime tx_update_category tool enabled via runtime fallback');
          }
        }
        
        if (finalEmployeeSlug === 'tag-ai' || finalEmployeeSlug === 'tag') {
          const hasHandoff = employeeTools.includes('request_employee_handoff');
          console.log(`[Chat] Tag tools check - request_employee_handoff included: ${hasHandoff}`);
          if (!hasHandoff) {
            console.warn(`[Chat] WARNING: Tag is missing request_employee_handoff tool! Current tools:`, employeeTools);
          }
        }
      } else {
        console.warn(`[Chat] No tools_allowed found for ${finalEmployeeSlug} or invalid format`);
      }
      
      // Load system_prompt from database (use this when no custom prompt is provided)
      if (employeeProfile.system_prompt && typeof employeeProfile.system_prompt === 'string') {
        employeeSystemPrompt = employeeProfile.system_prompt;
        console.log(`[Chat] Loaded system_prompt from database for ${finalEmployeeSlug} (${employeeSystemPrompt.length} chars)`);
      }
    } catch (error: any) {
      console.error('[Chat] Failed to load employee profile (non-fatal):', error);
      // Don't change finalEmployeeSlug - continue with requested employee
      // Router's persona and system prompt will be used instead
      console.log(`[Chat] Continuing with ${finalEmployeeSlug} using router persona due to profile loading error`);
      // Continue without tools if loading fails - chat will still work with router's persona
    }

    // ========================================================================
    // 5. ENSURE THREAD EXISTS (thread_id model)
    // ========================================================================
    // Resolve employee_key from slug using registry
    let employeeKey: string;
    try {
      const { getEmployeeKeyFromSlug } = await import('./_shared/employeeRegistryBackend.js');
      employeeKey = await getEmployeeKeyFromSlug(sb, finalEmployeeSlug);
    } catch (error) {
      console.warn('[Chat] Failed to resolve employee_key from registry, using fallback:', error);
      // Fallback: extract from slug (first part before hyphen)
      employeeKey = finalEmployeeSlug.split('-')[0] || 'prime';
    }
    
    // CRITICAL: thread_id must NEVER be null - ensure thread exists atomically
    // If request includes threadId, upsert that thread; otherwise create/find one
    let threadId: string;
    try {
      threadId = await ensureThread(sb, userId, employeeKey, requestThreadId);
      orchCtx.threadId = threadId;
      console.log(`[Chat] ✅ Thread ID: ${threadId} for user ${userId.substring(0, 8)}... employee ${employeeKey}`);
      
      // Backfill existing messages with thread_id (one-time migration)
      try {
        const backfilledCount = await backfillThreadId(sb, userId, employeeKey, threadId);
        if (backfilledCount > 0) {
          console.log(`[Chat] ✅ Backfilled ${backfilledCount} messages with thread_id ${threadId}`);
        }
      } catch (backfillError: any) {
        console.warn('[Chat] Backfill failed (non-fatal):', backfillError.message);
      }
    } catch (threadError: any) {
      console.error('[Chat] Failed to ensure thread:', threadError);
      // CRITICAL: If thread creation fails, return error - never use fallback UUID
      // This ensures FK integrity: every chat_messages.thread_id references a valid chat_threads.id
      return {
        statusCode: 500,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to create or retrieve chat thread',
          message: threadError?.message || 'Thread creation failed',
          details: 'Please try again. If the problem persists, contact support.',
        }),
      };
    }
    
    // ========================================================================
    // 5.5. SESSION MANAGEMENT (for backward compatibility)
    // ========================================================================
    let finalSessionId: string | null = null;
    let sessionEmployeeSlug: string = finalEmployeeSlug; // Track employee from session (may change after handoff)
    try {
      const sessionStartTime = Date.now();
      const sessionResult = await ensureSession(sb, userId, sessionId, finalEmployeeSlug);
      timingLogs.session = Date.now() - sessionStartTime;
      // ensureSession returns { sessionId: string, employee_slug: string }
      finalSessionId = sessionResult?.sessionId ?? normalizeSessionId(sessionId) ?? null;
      // Use employee_slug from session if available (handles handoff scenarios)
      // CRITICAL: Only allow session employee to override if employee was NOT explicitly requested
      // This prevents sticky handoff - /dashboard/prime-chat must always show Prime
      if (sessionResult?.employee_slug) {
        sessionEmployeeSlug = sessionResult.employee_slug;
        // Only override if:
        // 1. Employee was NOT explicitly requested (explicitlyRequestedEmployee is null), OR
        // 2. Explicitly requested employee is prime-boss (route-forced, must respect)
        const shouldRespectRequestedEmployee = explicitlyRequestedEmployee !== null;
        const isPrimeRequested = explicitlyRequestedEmployee === 'prime-boss';
        
        if (sessionEmployeeSlug !== finalEmployeeSlug) {
          if (shouldRespectRequestedEmployee && !isPrimeRequested) {
            // Employee was explicitly requested (not auto-routed) - respect it, don't override
            console.log(`[Chat] Respecting explicitly requested employee ${finalEmployeeSlug} over session employee ${sessionEmployeeSlug}`);
            // Update session to match requested employee (fixes sticky handoff)
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: finalEmployeeSlug })
                .eq('id', finalSessionId);
              console.log(`[Chat] Updated session ${finalSessionId} to match requested employee ${finalEmployeeSlug}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to update session employee (non-fatal):', error);
            }
          } else if (isPrimeRequested) {
            // Prime was explicitly requested (from /dashboard/prime-chat) - ALWAYS respect it
            console.log(`[Chat] Prime explicitly requested - forcing prime-boss, ignoring session employee ${sessionEmployeeSlug}`);
            // Update session to prime-boss to fix sticky handoff
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: 'prime-boss' })
                .eq('id', finalSessionId);
              console.log(`[Chat] Updated session ${finalSessionId} to prime-boss (route-forced)`);
            } catch (error: any) {
              console.warn('[Chat] Failed to update session to prime-boss (non-fatal):', error);
            }
          } else {
            // Employee was auto-routed (not explicitly requested) - allow session employee to override
            console.log(`[Chat] Session employee mismatch: auto-routed ${finalEmployeeSlug}, session has ${sessionEmployeeSlug} (using session employee)`);
            finalEmployeeSlug = sessionEmployeeSlug;
          }
        }
      }
      
      if (!finalSessionId) {
        throw new Error('Failed to get session ID from ensureSession');
      }
    } catch (error: any) {
      console.error('[Chat] Session creation failed:', error);
      // Use a fallback session ID if database fails
      const fallbackId = normalizeSessionId(sessionId) ?? `session-${userId}-${Date.now()}`;
      finalSessionId = typeof fallbackId === 'string' ? fallbackId : null;
    }
    orchCtx.sessionId = finalSessionId;
    orchCtx.employee = finalEmployeeSlug;
    orchCtx.persist_worker_output = async (key: string, value: any): Promise<boolean> => {
      if (key !== 'tag') return false;
      const persisted = await persistTagOutputStateBestEffort(sb, orchCtx.sessionId, orchCtx.threadId, value);
      if (persisted) {
        orchCtx.tag_saved = true;
      }
      return persisted;
    };

    let lastPipelineSnapshot: PipelineSnapshot | null = null;
    let lastPipelineRaw: any | null = null;
    if (isTagFollowupMessage(masked) || isPipelineFollowupMessage(masked) || isPayoffProjectionIntent(masked)) {
      const [lastTagOutput, lastPipeline] = await Promise.all([
        loadLastTagOutputBestEffort(sb, finalSessionId, threadId),
        loadLastPipelineSnapshotBestEffort(sb, finalSessionId, threadId),
      ]);
      if (lastTagOutput || lastPipeline?.snapshot) {
        const basePrimeContext = effectivePrimeContext || {
          displayName: null,
          timezone: null,
          currency: null,
          currentStage: null,
          financialSnapshot: null,
          memorySummary: null,
        };
        effectivePrimeContext = {
          ...basePrimeContext,
          ...(lastTagOutput ? { lastTagOutput } : {}),
          ...(lastPipeline?.snapshot ? { lastPipelineSnapshot: lastPipeline.snapshot } : {}),
          ...(lastPipeline?.raw ? { lastPipelineRaw: lastPipeline.raw } : {}),
        } as any;
      }
      if (lastPipeline?.snapshot) {
        lastPipelineSnapshot = lastPipeline.snapshot;
        lastPipelineRaw = lastPipeline.raw || null;
        orchCtx.pipeline_snapshot_loaded = true;
        orchCtx.recurring_count = Number(lastPipeline.snapshot?.tag?.recurring_summary?.total_detected || 0);
        orchCtx.recurring_detected = orchCtx.recurring_count > 0;
        if (lastPipelineRaw?.tag_json && lastPipelineRaw?.crystal_json && lastPipelineRaw?.finley_json) {
          orchCtx.reuse_path = 'full';
        } else if (lastPipelineRaw?.tag_json && lastPipelineRaw?.crystal_json) {
          orchCtx.reuse_path = 'tag+crystal';
        } else if (lastPipelineRaw?.tag_json) {
          orchCtx.reuse_path = 'tag_only';
        }
      }
    }

    const logUsageMetrics = async (params: {
      sessionIdForLog: string | null;
      employeeForLog: string | null;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      model: string;
      latencyMs: number | null;
      durationMs: number;
      toolsUsed: string[] | null;
      success: boolean;
      deterministicPath?: string;
      deterministicIntent?: string;
      orchestrationStage?: string;
      failedStage?: string | null;
      fallbackUsed?: boolean;
      metadata?: Record<string, any>;
    }): Promise<void> => {
      orchCtx.requestId = requestId;
      orchCtx.threadId = threadId || orchCtx.threadId;
      orchCtx.sessionId = params.sessionIdForLog ?? orchCtx.sessionId;
      orchCtx.employee = params.employeeForLog ?? orchCtx.employee;
      orchCtx.stage = (params.orchestrationStage as OrchStage) || orchCtx.stage || orchestrationStage;
      orchCtx.deterministic_path = params.deterministicPath || orchCtx.deterministic_path;
      orchCtx.deterministic_intent = params.deterministicIntent || orchCtx.deterministic_intent;
      orchCtx.failed_stage = (params.failedStage as OrchStage) || orchCtx.failed_stage;
      orchCtx.fallback_used = params.fallbackUsed ?? orchCtx.fallback_used ?? fallbackUsed;

      const basePayload: Record<string, any> = {
        user_id: userId,
        session_id: params.sessionIdForLog,
        employee_slug: params.employeeForLog,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: params.totalTokens,
        model: params.model,
        latency_ms: params.latencyMs,
        duration_ms: params.durationMs,
        tools_used: params.toolsUsed,
        success: params.success,
      };

      const combinedMetadata = {
        ...(orchCtx.telemetry_metadata || {}),
        ...(params.metadata || {}),
      };
      await logOrchestrationTelemetry(
        sb,
        basePayload,
        orchCtx,
        Object.keys(combinedMetadata).length > 0 ? combinedMetadata : undefined
      );
      emitOrchSummary(params.success);
    };

    // Deterministic temporal capability: answer date/time without a model call.
    // This keeps simple utility requests fast and reliable.
    setStage('deterministic_brains');
    const pipelineReuseIntent = detectPipelineReuseIntent(masked);
    const recallLastUploadIntent = isLastUploadRecallIntent(masked);
    const recallLastUploadDetailIntent = isLastUploadDetailIntent(masked);
    const workspaceActivityIntent = isWorkspaceActivityIntent(masked);
    const statementBreakdownIntent = isStatementBreakdownIntent(masked) || pipelineReuseIntent === 'tag_breakdown';
    let forcedPrimeDecision: PrimeRouteDecision | null = null;
    if (!forcedPrimeDecision && statementBreakdownIntent && !hasAttachments) {
      const explicitImportId = extractImportIdFromMessage(masked);
      let resolvedImportId: string | null = explicitImportId;

      if (!resolvedImportId) {
        const allStatements = await listUserStatements(sb, userId, 10);
        const latestRequested = asksForLatestStatement(masked);
        if (!latestRequested && allStatements.length > 1) {
          const stmtList = allStatements
            .slice(0, 5)
            .map((s, i) => {
              const issuer = s.issuer || 'Unknown issuer';
              const acct = s.account_last4 ? ` (****${s.account_last4})` : '';
              const period = s.period_start && s.period_end ? ` - ${s.period_start} to ${s.period_end}` : '';
              const count = s.transaction_count ? ` | ${s.transaction_count} transactions` : '';
              return `${i + 1}. ${issuer}${acct}${period}${count}`;
            })
            .join('\n');
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown_disambiguation',
            assistantText: `You have ${allStatements.length} statements on file:\n\n${stmtList}\n\nWhich one should I break down?`,
          };
        } else if (allStatements.length === 1) {
          resolvedImportId = allStatements[0].import_id;
        } else {
          resolvedImportId = await resolveImportIdContextForTurn(masked, sb, userId);
        }
      }

      if (forcedPrimeDecision) {
        // disambiguation response already prepared
      } else {
      const breakdown = await loadStatementBreakdown(sb, userId, resolvedImportId);
      if (breakdown) {
        const readStatus = String(breakdown.read_completeness?.status || 'unknown');
        if (readStatus === 'partial') {
          const pagesRead = Number(breakdown.read_completeness?.pages_read || 0);
          const pagesDetected = Number(breakdown.read_completeness?.pages_detected || 0);
          const signals = Array.isArray(breakdown.read_completeness?.signals)
            ? breakdown.read_completeness!.signals.slice(0, 3).join(', ')
            : '';
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown_partial',
            assistantText: `I can see this statement is only partially verified right now${pagesDetected > 0 ? ` (${pagesRead}/${pagesDetected} pages fully read)` : ''}. I can show what I extracted so far, but some items may be missing. ${signals ? `Signals: ${signals}. ` : ''}Would you like the partial breakdown now or should I re-run extraction first?`,
          };
        } else
        if (breakdown.confidence.overall === 'low') {
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown_low_confidence',
            assistantText: `I extracted ${breakdown.totals.transaction_count} transactions from your statement, but my confidence in the extraction is low. Some items may be missing or incorrect. Would you like me to show what I have with that caveat, or would you prefer to re-upload a clearer image?`,
          };
        } else {
          const keyDetails = await resolveBreakdownKeyDetails(sb, userId, breakdown);
          const enrichedBreakdown: StatementBreakdown = {
            ...breakdown,
            statement_meta: {
              ...breakdown.statement_meta,
              issuer: keyDetails.issuer || breakdown.statement_meta?.issuer || null,
              account_last4: keyDetails.accountLast4 || breakdown.statement_meta?.account_last4 || null,
              period_start: keyDetails.periodStart || breakdown.statement_meta?.period_start || null,
              period_end: keyDetails.periodEnd || breakdown.statement_meta?.period_end || null,
            },
          };
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown',
            assistantText: renderStatementBreakdownMarkdown(enrichedBreakdown, { includeNextActions: true }),
          };
        }
      } else {
        const { data: activeImport } = await sb
          .from('imports')
          .select('id,status,created_at')
          .eq('user_id', userId)
          .in('status', ['parsing', 'normalizing', 'parsed'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (Array.isArray(activeImport) && activeImport.length > 0) {
          const latest = activeImport[0] as any;
          const statusMessage = String(latest?.status || '') === 'parsed'
            ? 'Your statement has been processed and is ready for review. Would you like me to commit these transactions so I can give you a full breakdown?'
            : `Your statement is still being processed (status: ${String(latest?.status || 'processing')}). I can break it down once processing completes.`;
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown_pending_commit',
            assistantText: statusMessage,
          };
        } else {
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_breakdown',
            deterministic_intent: 'statement_breakdown_missing',
            assistantText: "Your statement breakdown is not ready yet. Your statement is still processing, and I'll notify you when it's ready.",
          };
        }
      }
      }
    }
    const statementQaIntent = isStatementQaIntent(masked);
    if (!forcedPrimeDecision && statementQaIntent && !hasAttachments) {
      const explicitImportId = extractImportIdFromMessage(masked);
      const importIdForQa = explicitImportId || await resolveImportIdContextForTurn(masked, sb, userId);
      const dateHint = extractDateRangeHint(masked);
      const queryHint = extractQueryHint(masked) || extractMerchantNeedleFromQuestion(masked);
      const includePending = shouldIncludePendingInTxSearch(masked);
      const mode = inferStatementQaMode(masked);
      const topN = parseTopNHint(masked);
      const qaRequest: StatementQaRequest = {
        importId: importIdForQa,
        startDate: dateHint.startDate || null,
        endDate: dateHint.endDate || null,
        queryText: queryHint || null,
        includePending,
        mode,
        topN,
      };
      const qaRows = await loadStatementQaRows(sb, userId, qaRequest);
      const firstDocId = qaRows[0]?.documentId || 'none';
      console.log(
        `[Chat][statement_qa] stage=statement_qa rows_count=${qaRows.length} date_range=${qaRequest.startDate || 'none'}..${qaRequest.endDate || 'none'} doc_id=${firstDocId} import_id=${qaRequest.importId || 'none'}`
      );
      if (qaRows.length === 0) {
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'statement_qa',
          deterministic_intent: 'statement_qa_missing_scope',
          assistantText: 'Which month or which statement upload should I use?',
        };
      } else {
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'statement_qa',
          deterministic_intent: `statement_qa_${mode}`,
          assistantText: renderStatementQaAnswer(masked, qaRequest, qaRows),
        };
      }
    }
    const merchantNeedleForTurn = extractMerchantNeedleFromQuestion(masked);
    const merchantSpendIntent =
      Boolean(merchantNeedleForTurn) &&
      /\b(how much|amount|total|spend|spent|pay|paid)\b/.test(String(masked || '').toLowerCase());
    if (!forcedPrimeDecision && merchantSpendIntent && !hasAttachments) {
      const facts = await loadLatestImportFactsBestEffort(sb, userId);
      if (facts?.importId && merchantNeedleForTurn) {
        const merchantSpend = await loadMerchantSpendForLatestImportBestEffort(
          sb,
          userId,
          facts.importId,
          merchantNeedleForTurn
        );
        if (merchantSpend.count > 0) {
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_merchant_spend',
            deterministic_intent: 'latest_import_merchant_spend',
            assistantText: [
              `Here is what I found for **${merchantNeedleForTurn.toUpperCase()}** on your latest uploaded statement:`,
              '',
              `- Total spend: ${formatCurrency(merchantSpend.total, facts.currency)}`,
              `- Transactions matched: ${merchantSpend.count}`,
              ...(merchantSpend.matches.length > 0 ? [`- Merchant match: ${merchantSpend.matches.join(', ')}`] : []),
            ].join('\n'),
          };
        } else {
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'statement_merchant_spend',
            deterministic_intent: 'latest_import_merchant_spend_none',
            assistantText: `I checked your latest uploaded statement and found no transactions matching "${merchantNeedleForTurn}".`,
          };
        }
      } else if (merchantNeedleForTurn) {
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'statement_merchant_spend',
          deterministic_intent: 'latest_import_merchant_spend_missing_context',
          assistantText: `I need your latest imported statement context to calculate spend for "${merchantNeedleForTurn}". Upload or finish processing a statement, then ask again.`,
        };
      }
    }
    if (!forcedPrimeDecision && workspaceActivityIntent && !hasAttachments) {
      const displayName = await resolveUserDisplayNameBestEffort(sb, userId, effectivePrimeContext?.displayName || null);
      const firstName = String(displayName).split(' ')[0] || 'there';
      const activity = await loadWorkspaceActivitySnapshotBestEffort(sb, userId);
      if (activity) {
        const latestUpload = activity.latestUploadAt ? new Date(activity.latestUploadAt).toLocaleString() : 'not yet';
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'workspace_activity',
          deterministic_intent: 'workspace_activity_snapshot',
          assistantText: [
            `${firstName}, here is your workspace activity snapshot:`,
            `- Uploads in last 30 days: ${activity.uploads30d}`,
            `- Chat questions in last 7 days: ${activity.chatTurns7d}`,
            `- Latest upload: ${latestUpload}`,
            '',
            'If you want, I can break this down by week.',
          ].join('\n'),
        };
      }
    }
    if (!forcedPrimeDecision && recallLastUploadIntent && !hasAttachments) {
      const displayName = await resolveUserDisplayNameBestEffort(sb, userId, effectivePrimeContext?.displayName || null);
      const firstName = String(displayName).split(' ')[0] || 'there';
      const latest = await loadLatestImportSummaryBestEffort(sb, userId);
      if (latest?.summaryText) {
        const timestampText = latest.createdAt ? new Date(latest.createdAt).toLocaleString() : 'recently';
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'upload_recall',
          deterministic_intent: 'last_upload_recall',
          assistantText: [
            `${firstName}, using your last uploaded document (${timestampText})${latest.importId ? ` [import ${latest.importId.slice(0, 8)}]` : ''}.`,
            '',
            buildUploadFindingsResponseFromSummary(latest.summaryText),
          ].join('\n'),
        };
      } else {
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'upload_recall',
          deterministic_intent: 'last_upload_recall_missing',
          assistantText: "I can't find a recent uploaded summary yet. Upload one file and then say 'use my last receipt'.",
        };
      }
    }
    if (!forcedPrimeDecision && recallLastUploadDetailIntent && !hasAttachments) {
      const facts = await loadLatestImportFactsBestEffort(sb, userId);
      if (facts && facts.importId) {
        const q = String(masked || '').toLowerCase();
        const merchantNeedle = extractMerchantNeedleFromQuestion(q);
        let assistantText = '';
        if (/\b(how much|amount|total)\b/.test(q) && merchantNeedle) {
          const merchantSpend = await loadMerchantSpendForLatestImportBestEffort(sb, userId, facts.importId, merchantNeedle);
          if (merchantSpend.count > 0) {
            assistantText = [
              `Here is what I found for **${merchantNeedle.toUpperCase()}** on your latest uploaded statement:`,
              '',
              `- Total spend: ${formatCurrency(merchantSpend.total, facts.currency)}`,
              `- Transactions matched: ${merchantSpend.count}`,
              ...(merchantSpend.matches.length > 0 ? [`- Merchant match: ${merchantSpend.matches.join(', ')}`] : []),
            ].join('\n');
          } else {
            assistantText = `I checked your latest uploaded statement and found no transactions matching "${merchantNeedle}".`;
          }
        } else if (/\b(how much|amount|total)\b/.test(q)) {
          if (facts.transactionCount === 1) {
            assistantText = `Your last uploaded receipt was ${formatCurrency(facts.totalAmount, facts.currency)}${facts.topMerchant ? ` at ${facts.topMerchant}` : ''}${facts.topDate ? ` on ${facts.topDate}` : ''}.`;
          } else if (facts.transactionCount > 1) {
            assistantText = `Your last uploaded document has ${facts.transactionCount} transactions totaling ${formatCurrency(facts.totalAmount, facts.currency)}.`;
          } else {
            assistantText = "I found your last upload, but I don't have transaction rows yet to calculate the amount.";
          }
        } else if (/\b(when|date)\b/.test(q)) {
          assistantText = facts.topDate
            ? `The most recent transaction date in your last upload is ${facts.topDate}.`
            : "I found your last upload, but I couldn't read a reliable date from the extracted rows.";
        } else if (/\b(merchant|where|who)\b/.test(q)) {
          assistantText = facts.topMerchant
            ? `The merchant on your latest uploaded receipt is ${facts.topMerchant}${facts.topDate ? ` (${facts.topDate})` : ''}.`
            : "I found your last upload, but I couldn't read a reliable merchant name from the extracted rows.";
        } else {
          assistantText = facts.summaryText
            ? buildUploadFindingsResponseFromSummary(facts.summaryText)
            : 'I found your last upload and can walk through it now.';
        }
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'upload_recall_detail',
          deterministic_intent: 'last_upload_detail',
          assistantText,
        };
      }
    }
    if (pipelineReuseIntent !== 'none' && lastPipelineSnapshot) {
      if (pipelineReuseIntent === 'explain_categorization' && lastPipelineRaw?.tag_json) {
        const explainText = buildExplainCategorizationResponse(masked, lastPipelineRaw.tag_json);
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'pipeline_reuse',
          deterministic_intent: 'explain_categorization',
          assistantText: [
            'I still have your last statement context loaded.',
            'From your last statement, here is why:',
            explainText,
          ].join('\n\n'),
        };
      } else if (pipelineReuseIntent === 'tag_breakdown' && lastPipelineRaw?.tag_json) {
        const txns = Array.isArray(lastPipelineRaw.tag_json?.transactions) ? lastPipelineRaw.tag_json.transactions : [];
        const spendTotal = txns.reduce(
          (sum: number, tx: any) => sum + (tx?.is_spend === true && tx?.direction === 'debit' ? Math.abs(Number(tx?.amount || 0)) : 0),
          0
        );
        const transferTotal = txns.reduce(
          (sum: number, tx: any) => sum + (String(tx?.category || '').toLowerCase().includes('transfer') ? Math.abs(Number(tx?.amount || 0)) : 0),
          0
        );
        const businessLike = txns.filter((tx: any) => String(tx?.tax_hint || '') === 'business_possible').length;
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'pipeline_reuse',
          deterministic_intent: 'tag_breakdown',
          assistantText: [
            'I still have your last statement context loaded.',
            `From your last statement (${lastPipelineSnapshot.ts}), here is a grounded breakdown:`,
            `- Transactions reviewed: ${txns.length}`,
            `- Spend total: ${formatCurrency(spendTotal, String(effectivePrimeContext?.currency || 'CAD'))}`,
            `- Transfer total: ${formatCurrency(transferTotal, String(effectivePrimeContext?.currency || 'CAD'))}`,
            `- Business-possible rows: ${businessLike}`,
            '',
            "Based on what we reviewed earlier, I can filter this to subscriptions only or list likely business expenses next.",
          ].join('\n'),
        };
      } else if (pipelineReuseIntent === 'recurring_summary') {
        const recurringCandidates = Array.isArray(lastPipelineSnapshot?.tag?.recurring_candidates)
          ? lastPipelineSnapshot.tag.recurring_candidates
          : [];
        const recurringMonthlyEstimate = Number(lastPipelineSnapshot?.tag?.recurring_summary?.total_monthly_estimate || 0);
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'pipeline_reuse',
          deterministic_intent: 'recurring_summary',
          assistantText: [
            'I still have your last statement context loaded.',
            buildRecurringSummaryResponse({
              recurringCandidates,
              monthlyEstimate: recurringMonthlyEstimate,
              currency: effectivePrimeContext?.currency || null,
            }),
          ].join('\n\n'),
        };
      } else if (pipelineReuseIntent === 'coaching_plan' && (lastPipelineRaw?.finley_json || lastPipelineRaw?.crystal_json)) {
        const finleyPlan = lastPipelineRaw?.finley_json || {};
        const steps = Array.isArray(finleyPlan?.plan?.steps) ? finleyPlan.plan.steps.slice(0, 4) : [];
        const questions = Array.isArray(finleyPlan?.questions_for_prime) ? finleyPlan.questions_for_prime.slice(0, 2) : [];
        forcedPrimeDecision = {
          lane: 'deterministic',
          deterministic_path: 'pipeline_reuse',
          deterministic_intent: 'coaching_followup',
          assistantText: [
            'I still have your last statement context loaded.',
            'Based on what we reviewed earlier, here is a follow-up plan:',
            ...(steps.length > 0 ? steps.map((s: any) => `- ${String(s?.step || 'Plan step')}`) : ["- I can generate a fresh plan if you want."]),
            '',
            ...(questions.length > 0 ? ["Before creating anything, please confirm:", ...questions.map((q: any) => `- ${String(q)}`)] : ["Before creating reminders, tell me which dates you prefer."]),
          ].join('\n'),
        };
      }
    }
    if (pipelineReuseIntent !== 'none' && !lastPipelineSnapshot) {
      const latestSummaryText = await loadLatestImportSummaryTextBestEffort(sb, userId);
      forcedPrimeDecision = {
        lane: 'deterministic',
        deterministic_path: 'pipeline_reuse',
        deterministic_intent: pipelineReuseIntent,
        assistantText: latestSummaryText
          ? buildUploadFindingsResponseFromSummary(latestSummaryText)
          : "I don't have a statement loaded yet. Upload one anytime.",
      };
    }
    if (!forcedPrimeDecision) {
      const isPrimeForHelpFastLane = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
      if (isPrimeForHelpFastLane && !hasAttachments) {
        const helpLane = shouldUseHelpFastLane(masked);
        if (helpLane.use) {
          orchCtx.help_fast_lane_used = true;
          orchCtx.help_fast_lane_intent = helpLane.intent || null;
          orchCtx.deterministic_path = 'help_fast_lane';
          orchCtx.deterministic_intent = helpLane.intent || 'help_fast_lane';
          const fastHelp = buildPrimeHelpFastLaneAnswer({
            messageText: masked,
            intent: helpLane.intent,
            employeeSlug: finalEmployeeSlug,
            appName: 'XspensesAI',
          });
          forcedPrimeDecision = {
            lane: 'deterministic',
            deterministic_path: 'help_fast_lane',
            deterministic_intent: helpLane.intent || 'help_fast_lane',
            assistantText: fastHelp.text,
          };
        }
      }
    }
    let payoffRawForSnapshot: any | undefined;
    let payoffSnapshotPatch: Partial<PipelineSnapshot> | undefined;
    if (!forcedPrimeDecision && isPayoffProjectionIntent(masked) && !hasAttachments) {
      const payoffResult = await buildPayoffProjectionResponse({
        messageText: masked,
        currency: String(effectivePrimeContext?.currency || 'CAD'),
        orchCtx,
        snapshot: lastPipelineSnapshot,
        snapshotRaw: lastPipelineRaw,
      });
      forcedPrimeDecision = {
        lane: 'deterministic',
        deterministic_path: payoffResult.deterministic_path,
        deterministic_intent: payoffResult.deterministic_intent,
        assistantText: payoffResult.assistantText,
      };
      payoffRawForSnapshot = payoffResult.payoffRawForSnapshot;
      payoffSnapshotPatch = payoffResult.payoffSnapshotPatch;
    }

    const primeDecision = forcedPrimeDecision || routePrime(orchCtx, masked, {
      employeeSlug: finalEmployeeSlug,
      hasAttachments,
      primeContext: effectivePrimeContext,
    });

    if (primeDecision.lane === 'deterministic') {
      orchCtx.deterministic_path = primeDecision.deterministic_path;
      orchCtx.deterministic_intent = primeDecision.deterministic_intent;
      let assistantContent = sanitizePrimeAssistantPresentation(primeDecision.assistantText, finalEmployeeSlug);
      assistantContent = ensureAssistantContent(assistantContent, orchestrationStage, orchCtx);
      fallbackUsed = orchCtx.fallback_used;
      setStage('respond');

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });

        if (primeDecision.deterministic_path === 'payoff_engine' && payoffRawForSnapshot) {
          const payoffHash = computeWorkerOutputHash(payoffRawForSnapshot);
          orchCtx.worker_output_hashes.finley = payoffHash;
          const priorSnapshot = lastPipelineSnapshot || {
            ts: new Date().toISOString(),
            hashes: {},
          };
          const payoffSnapshot: PipelineSnapshot = {
            ...priorSnapshot,
            ts: new Date().toISOString(),
            ...(payoffSnapshotPatch || {}),
            hashes: {
              ...(priorSnapshot.hashes || {}),
              finley: payoffHash,
            },
          };
          const priorRawFinley = lastPipelineRaw?.finley_json || {};
          const persisted = await persistPipelineSnapshot(sb, orchCtx, payoffSnapshot, {
            ...(lastPipelineRaw?.tag_json ? { tag_json: lastPipelineRaw.tag_json } : {}),
            ...(lastPipelineRaw?.crystal_json ? { crystal_json: lastPipelineRaw.crystal_json } : {}),
            finley_json: {
              ...priorRawFinley,
              ...payoffRawForSnapshot,
            },
          });
          orchCtx.pipeline_snapshot_saved = orchCtx.pipeline_snapshot_saved || persisted;
        }
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic router response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: `deterministic:${primeDecision.deterministic_path}`,
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: primeDecision.deterministic_path,
        deterministicIntent: primeDecision.deterministic_intent,
        orchestrationStage: orchestrationStage,
        failedStage: orchCtx.failed_stage,
        fallbackUsed: orchCtx.fallback_used,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: primeDecision.deterministic_path, intent: primeDecision.deterministic_intent },
        }),
      };
    }

    if (primeDecision.lane === 'worker_chain') {
      orchCtx.deterministic_path = 'worker_chain';
      orchCtx.deterministic_intent = primeDecision.reason;

      let workerFailed = false;
      const workerNotes: string[] = [];
      let byteWorkerOutput = sharedBuildByteWorkerFallbackOutput(orchCtx, 'initial');
      let tagWorkerOutput = buildTagWorkerFallbackOutput('initial');
      let crystalWorkerOutput = sharedBuildCrystalWorkerFallbackOutput(orchCtx, 'initial');
      let finleyWorkerOutput = sharedBuildFinleyWorkerFallbackOutput(orchCtx, 'initial');
      let recurringDetection: {
        recurring_candidates: Array<{
          merchant: string;
          occurrences: number;
          avg_amount: number;
          cadence: "monthly" | "weekly" | "quarterly" | "unknown";
          confidence: number;
          last_seen: string;
          category: string;
        }>;
        summary: {
          total_monthly_estimate: number;
          total_detected: number;
        };
      } = {
        recurring_candidates: [],
        summary: {
          total_monthly_estimate: 0,
          total_detected: 0,
        },
      };
      let statementPeriod: string | null = null;
      let docs: string[] = Array.isArray(documentIds) ? documentIds : [];
      try {
        setStage('routing');
        workerNotes.push('Byte: import signal captured');
        let pagesHint = docs.length > 0 ? docs.length : 1;
        let sourceBlocks: string[] = [`User request: ${masked}`];
        if (docs.length > 0) {
          let userDocs: any[] | null = null;
          try {
            const docsLookup = await withTimeout(
              sb
                .from('user_documents')
                .select('*')
                .in('id', docs)
                .eq('user_id', userId)
                .limit(10),
              process.env.NETLIFY_DEV === 'true' ? 3500 : 7000,
              'worker_chain_user_docs_lookup',
              orchCtx
            );
            if ((docsLookup as any)?.error) {
              throw (docsLookup as any).error;
            }
            userDocs = Array.isArray((docsLookup as any)?.data) ? (docsLookup as any).data : null;
          } catch (docsLookupError: any) {
            console.warn('[Chat] Worker chain user document lookup timed out/failed; continuing with message-only context:', docsLookupError?.message || docsLookupError);
            userDocs = null;
          }
          if (Array.isArray(userDocs) && userDocs.length > 0) {
            pagesHint = userDocs.length;
            docs = userDocs.map((doc: any) => String(doc?.id || '')).filter(Boolean);
            const firstWithPeriod = userDocs.find((doc: any) => doc?.extracted_data?.statement_period);
            statementPeriod = firstWithPeriod?.extracted_data?.statement_period
              ? String(firstWithPeriod.extracted_data.statement_period)
              : null;
            sourceBlocks = userDocs.map((doc: any, idx: number) => {
              const extracted = doc?.extracted_data ? JSON.stringify(doc.extracted_data) : '';
              const textLength = Number(doc?.ocr_text_length ?? doc?.extracted_data?.text_length ?? 0);
              const textHash = String(doc?.ocr_text_hash || doc?.extracted_data?.text_hash || '');
              return `Page ${idx + 1}: ${doc?.original_name || doc?.id}\nExtracted: ${extracted}\nOCR metrics: length=${textLength || 0}, hash=${textHash || 'n/a'}`;
            });
          }
        }

        // BYTE worker (JSON-only extraction contract)
        const primaryDocId = docs.length > 0 ? docs[0] : null;
        byteWorkerOutput = await withTimeout(
          sharedRunByteWorkerExtraction({
            documentText: sourceBlocks.join('\n\n---\n\n'),
            filename: null,
            docId: primaryDocId,
            ctx: orchCtx,
          }),
          resolveOpenAiTimeoutMs(),
          'worker_chain_byte',
          orchCtx
        );
        byteWorkerOutput = sharedNormalizeByteWorkerOutput(byteWorkerOutput, orchCtx, pagesHint);
        await attachWorkerOutput(orchCtx, 'byte', {
          doc_type: byteWorkerOutput.doc_type,
          statement_period: byteWorkerOutput.statement_period,
          currency: byteWorkerOutput.currency,
          institution: byteWorkerOutput.institution,
          account_summary: byteWorkerOutput.account_summary,
          transactions: byteWorkerOutput.transactions,
          extraction_quality: byteWorkerOutput.extraction_quality,
        });
        orchCtx.telemetry_metadata = {
          ...(orchCtx.telemetry_metadata || {}),
          byte: {
            doc_type: byteWorkerOutput.doc_type,
            tx_count: Array.isArray(byteWorkerOutput.transactions) ? byteWorkerOutput.transactions.length : 0,
            confidence: Number(byteWorkerOutput?.extraction_quality?.confidence || 0),
            needs_review: Boolean(byteWorkerOutput?.extraction_quality?.needs_review),
          },
        };
        workerNotes.push(
          `Byte: type=${byteWorkerOutput.doc_type}, pages=${(byteWorkerOutput.pages_detected || []).length}, txns=${(byteWorkerOutput.transactions || []).length}`
        );
        if (!statementPeriod && byteWorkerOutput.statement_period) {
          statementPeriod = String(byteWorkerOutput.statement_period);
        }

        // TAG worker consumes BYTE-normalized transaction payload
        const tagWorkerInput = JSON.stringify({
          statement_period: byteWorkerOutput.statement_period,
          currency: byteWorkerOutput.currency,
          account_summary: byteWorkerOutput.account_summary,
          pages_detected: byteWorkerOutput.pages_detected,
          transactions: byteWorkerOutput.transactions,
          extraction_quality: byteWorkerOutput.extraction_quality,
        });
        tagWorkerOutput = await runTagWorkerCategorization(tagWorkerInput, pagesHint, orchCtx);
        tagWorkerOutput = normalizeTagWorkerOutput(tagWorkerOutput, 'worker_chain_normalized', pagesHint);
        const tagHash = computeTagOutputHash({
          transactions: tagWorkerOutput.transactions,
          statementPeriod,
          docIds: docs,
        });
        orchCtx.worker_output_hashes.tag = tagHash;
        const normalizedTransactionsForStorage = (Array.isArray(tagWorkerOutput.transactions) ? tagWorkerOutput.transactions : []).map((tx: any) => ({
          date: tx?.date ?? null,
          description: String(tx?.description || ''),
          amount: Number(tx?.amount || 0),
          direction: tx?.direction === 'credit' ? 'credit' : 'debit',
          category: String(tx?.category || 'Other'),
          is_spend: Boolean(tx?.is_spend),
          tax_hint: ['business_possible', 'personal_likely', 'transfer', 'unknown'].includes(String(tx?.tax_hint))
            ? String(tx.tax_hint)
            : 'unknown',
          confidence: Number.isFinite(Number(tx?.confidence)) ? Number(tx.confidence) : 0.5,
          needs_review: Boolean(tx?.needs_review),
        }));
        const safeTagPersistPayload = sanitizeWorkerValue({
          ts: new Date().toISOString(),
          doc_ids: docs,
          statement_period: statementPeriod,
          hash: tagHash,
          tag_json: {
            normalized_transactions: normalizedTransactionsForStorage,
            totals: {
              account_summary: tagWorkerOutput.account_summary,
              category_totals: tagWorkerOutput.category_totals,
            },
            flags: {
              pages_processed: Number(tagWorkerOutput.pages_processed || 1),
              tx_count: normalizedTransactionsForStorage.length,
              review_count: normalizedTransactionsForStorage.filter((tx: any) => tx.needs_review === true).length,
              has_review_items: normalizedTransactionsForStorage.some((tx: any) => tx.needs_review === true),
            },
          },
        });
        const persistedTagOutput = await attachWorkerOutput(orchCtx, 'tag', safeTagPersistPayload);
        orchCtx.tag_saved = orchCtx.tag_saved || persistedTagOutput;
        const rawTagJsonTruncated = truncateJsonForStorage(safeTagPersistPayload.tag_json, 30000);
        orchCtx.telemetry_metadata = {
          ...(orchCtx.telemetry_metadata || {}),
          tag: {
            version: 'v1',
            categories_count: Array.isArray(tagWorkerOutput.category_totals) ? tagWorkerOutput.category_totals.length : 0,
            totals: tagWorkerOutput.category_totals || [],
            flags: {
              pages_processed: tagWorkerOutput.pages_processed,
              tx_count: Array.isArray(tagWorkerOutput.transactions) ? tagWorkerOutput.transactions.length : 0,
              has_review_items: Array.isArray(tagWorkerOutput.transactions)
                ? tagWorkerOutput.transactions.some((tx: any) => Boolean(tx?.needs_review))
                : false,
            },
            hash: tagHash,
            raw_json: rawTagJsonTruncated,
          },
        };
        workerNotes.push(`Tag: pages=${tagWorkerOutput.pages_processed}, txns=${tagWorkerOutput.transactions.length}`);

        try {
          recurringDetection = detectRecurringTransactions(tagWorkerOutput);
          orchCtx.recurring_detected = recurringDetection.summary.total_detected > 0;
          orchCtx.recurring_count = recurringDetection.summary.total_detected;
          orchCtx.telemetry_metadata = {
            ...(orchCtx.telemetry_metadata || {}),
            recurring: {
              total_detected: recurringDetection.summary.total_detected,
              total_monthly_estimate: recurringDetection.summary.total_monthly_estimate,
            },
          };
          if (recurringDetection.summary.total_detected > 0) {
            workerNotes.push(
              `Recurring: detected=${recurringDetection.summary.total_detected}, est_monthly=${formatCurrency(recurringDetection.summary.total_monthly_estimate, String(effectivePrimeContext?.currency || 'CAD'))}`
            );
          }
        } catch (recurringError: any) {
          console.warn('[Chat] Recurring detection failed (non-fatal):', recurringError?.message || recurringError);
        }

        // CRYSTAL worker consumes TAG output and summarizes grounded insights.
        crystalWorkerOutput = await withTimeout(
          sharedRunCrystalWorkerInsights({
            tag_output_json: tagWorkerOutput,
            byte_account_summary: byteWorkerOutput.account_summary,
            recurring_candidates: recurringDetection.recurring_candidates,
            recurring_summary: recurringDetection.summary,
            prior_period_snapshot: null,
          }, orchCtx),
          resolveOpenAiTimeoutMs(),
          'worker_chain_crystal',
          orchCtx
        );
        crystalWorkerOutput = sharedNormalizeCrystalWorkerOutput(crystalWorkerOutput, orchCtx);
        if (recurringDetection.summary.total_detected > 0) {
          const recurringInsight = {
            type: 'subscriptions',
            title: 'Recurring services detected',
            detail: `Detected recurring services totaling about ${formatCurrency(recurringDetection.summary.total_monthly_estimate, String(effectivePrimeContext?.currency || 'CAD'))} per month.`,
            confidence: 0.8,
            cites: ['statement_recurring_pattern'],
          };
          const existingInsights = Array.isArray(crystalWorkerOutput?.insights) ? crystalWorkerOutput.insights : [];
          crystalWorkerOutput.insights = [recurringInsight, ...existingInsights].slice(0, 8);
        }
        await attachWorkerOutput(orchCtx, 'crystal', {
          insights: crystalWorkerOutput.insights,
          highlights: crystalWorkerOutput.highlights,
          flags: crystalWorkerOutput.flags,
          recommended_next_actions: crystalWorkerOutput.recommended_next_actions,
        });
        workerNotes.push(`Crystal: insights=${Array.isArray(crystalWorkerOutput.insights) ? crystalWorkerOutput.insights.length : 0}`);

        // FINLEY worker creates suggestion-only plan from TAG + CRYSTAL outputs.
        finleyWorkerOutput = await withTimeout(
          sharedRunFinleyWorkerPlan({
            tag_output_json: tagWorkerOutput,
            crystal_output_json: crystalWorkerOutput,
            user_preferences: null,
          }, orchCtx),
          resolveOpenAiTimeoutMs(),
          'worker_chain_finley',
          orchCtx
        );
        finleyWorkerOutput = sharedNormalizeFinleyWorkerOutput(finleyWorkerOutput, orchCtx);
        if (recurringDetection.summary.total_detected > 0) {
          const topRecurring = recurringDetection.recurring_candidates.slice(0, 3);
          finleyWorkerOutput.suggested_reminders = Array.isArray(finleyWorkerOutput.suggested_reminders)
            ? finleyWorkerOutput.suggested_reminders
            : [];
          finleyWorkerOutput.suggested_goals = Array.isArray(finleyWorkerOutput.suggested_goals)
            ? finleyWorkerOutput.suggested_goals
            : [];
          for (const rec of topRecurring) {
            finleyWorkerOutput.suggested_reminders.push({
              label: `Consider reviewing ${rec.merchant}`,
              date_hint: null,
              cadence: rec.cadence === 'weekly' ? 'weekly' : 'monthly',
              notes: 'If you want, Prime can help set a reminder after your confirmation.',
            });
          }
          finleyWorkerOutput.suggested_goals.push({
            goal: 'Set a recurring-charge budget alert',
            target_amount: recurringDetection.summary.total_monthly_estimate > 0 ? recurringDetection.summary.total_monthly_estimate : null,
            cadence: 'monthly',
            notes: 'Optional: use this as a review threshold before renewals.',
          });
        }
        await attachWorkerOutput(orchCtx, 'finley', {
          plan: finleyWorkerOutput.plan,
          suggested_goals: finleyWorkerOutput.suggested_goals,
          suggested_reminders: finleyWorkerOutput.suggested_reminders,
          questions_for_prime: finleyWorkerOutput.questions_for_prime,
        });
        workerNotes.push(`Finley: steps=${Array.isArray(finleyWorkerOutput?.plan?.steps) ? finleyWorkerOutput.plan.steps.length : 0}`);

        setStage('memory');
        workerNotes.push('Memory: context refresh queued');

        const spendTotal = (Array.isArray(tagWorkerOutput.transactions) ? tagWorkerOutput.transactions : []).reduce(
          (sum: number, tx: any) =>
            sum + (tx?.direction === 'debit' && tx?.is_spend === true ? Math.abs(Number(tx?.amount || 0)) : 0),
          0
        );
        const topCategory = (Array.isArray(tagWorkerOutput.category_totals) ? tagWorkerOutput.category_totals : [])
          .sort((a: any, b: any) => Number(b?.total || 0) - Number(a?.total || 0))[0];
        workerNotes.push(
          `Snapshot: spend=${formatCurrency(spendTotal, String(effectivePrimeContext?.currency || 'CAD'))}` +
            (topCategory ? `, top_category=${topCategory.category}` : '')
        );

        const byteHash = computeWorkerOutputHash({
          doc_type: byteWorkerOutput.doc_type,
          statement_period: byteWorkerOutput.statement_period,
          account_summary: byteWorkerOutput.account_summary,
          transactions: byteWorkerOutput.transactions,
        });
        const crystalHash = computeWorkerOutputHash({
          insights: crystalWorkerOutput.insights,
          highlights: crystalWorkerOutput.highlights,
          flags: crystalWorkerOutput.flags,
        });
        const finleyHash = computeWorkerOutputHash({
          plan: finleyWorkerOutput.plan,
          suggested_goals: finleyWorkerOutput.suggested_goals,
          suggested_reminders: finleyWorkerOutput.suggested_reminders,
        });
        orchCtx.worker_output_hashes.byte = byteHash;
        orchCtx.worker_output_hashes.crystal = crystalHash;
        orchCtx.worker_output_hashes.finley = finleyHash;

        const spendCount = (Array.isArray(tagWorkerOutput.transactions) ? tagWorkerOutput.transactions : []).filter((tx: any) => tx?.is_spend === true).length;
        const pipelineSnapshot: PipelineSnapshot = {
          ts: new Date().toISOString(),
          doc_ids: docs,
          byte: {
            doc_type: String(byteWorkerOutput?.doc_type || 'unknown'),
            period: byteWorkerOutput?.statement_period ?? null,
            tx_count: Array.isArray(byteWorkerOutput?.transactions) ? byteWorkerOutput.transactions.length : 0,
            confidence: Number(byteWorkerOutput?.extraction_quality?.confidence || 0),
          },
          tag: {
            tx_count: Array.isArray(tagWorkerOutput?.transactions) ? tagWorkerOutput.transactions.length : 0,
            spend_count: spendCount,
            category_totals: tagWorkerOutput?.category_totals || [],
            flags: tagWorkerOutput?.highlights?.flags || [],
            recurring_candidates: recurringDetection.recurring_candidates,
            recurring_summary: recurringDetection.summary,
          },
          crystal: {
            insights_count: Array.isArray(crystalWorkerOutput?.insights) ? crystalWorkerOutput.insights.length : 0,
            flags: crystalWorkerOutput?.flags || [],
          },
          finley: {
            steps_count: Array.isArray(finleyWorkerOutput?.plan?.steps) ? finleyWorkerOutput.plan.steps.length : 0,
            reminders_count: Array.isArray(finleyWorkerOutput?.suggested_reminders) ? finleyWorkerOutput.suggested_reminders.length : 0,
            goals_count: Array.isArray(finleyWorkerOutput?.suggested_goals) ? finleyWorkerOutput.suggested_goals.length : 0,
          },
          hashes: {
            byte: byteHash,
            tag: orchCtx.worker_output_hashes.tag,
            crystal: crystalHash,
            finley: finleyHash,
          },
        };
        const persistedPipeline = await persistPipelineSnapshot(sb, orchCtx, pipelineSnapshot, {
          tag_json: {
            transactions: tagWorkerOutput.transactions,
            category_totals: tagWorkerOutput.category_totals,
            account_summary: tagWorkerOutput.account_summary,
            highlights: tagWorkerOutput.highlights,
            recurring_candidates: recurringDetection.recurring_candidates,
            recurring_summary: recurringDetection.summary,
          },
          crystal_json: crystalWorkerOutput,
          finley_json: finleyWorkerOutput,
        });
        orchCtx.pipeline_snapshot_saved = orchCtx.pipeline_snapshot_saved || persistedPipeline;
      } catch (workerError: any) {
        byteWorkerOutput = sharedBuildByteWorkerFallbackOutput(orchCtx, 'byte_worker_error', docs.length > 0 ? docs.length : 1);
        workerFailed = true;
        orchCtx.failed_stage = orchCtx.stage;
        console.warn('[Chat] Worker chain failed (non-fatal):', workerError?.message || workerError);
      }

      setStage('respond');
      const primeWorkerSummary = [
        'I reviewed your statement context and prepared analysis and planning notes.',
        workerNotes.length > 0 ? workerNotes.map((note) => `- ${note}`).join('\n') : '- Worker details unavailable.',
        '- TAG insights:',
        ...(Array.isArray(tagWorkerOutput.insights_for_prime) && tagWorkerOutput.insights_for_prime.length > 0
          ? tagWorkerOutput.insights_for_prime.slice(0, 4).map((insight: string) => `  - ${insight}`)
          : ['  - No additional insights available.']),
        workerFailed
          ? 'I hit a delay in one worker step, but I can continue once you retry.'
          : 'Prime summary: upload/import processing is staged and ready for the next actionable step.',
      ].join('\n');
      const assistantContent = ensureAssistantContent(
        sanitizePrimeAssistantPresentation(primeWorkerSummary, finalEmployeeSlug),
        orchestrationStage,
        orchCtx
      );
      fallbackUsed = orchCtx.fallback_used;

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist worker-chain response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'worker_chain:v1',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: ['byte', 'tag', 'crystal', 'finley', 'memory'],
        success: !workerFailed,
        deterministicPath: 'worker_chain',
        deterministicIntent: primeDecision.reason,
        orchestrationStage: orchestrationStage,
        failedStage: orchCtx.failed_stage,
        fallbackUsed: orchCtx.fallback_used,
        metadata: orchCtx.telemetry_metadata,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { lane: 'worker_chain', reason: primeDecision.reason },
        }),
      };
    }

    const temporalIntent = detectTemporalIntent(masked);
    if (temporalIntent && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        formatTemporalResponse(
          temporalIntent,
          effectivePrimeContext?.timezone || null
        ),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic temporal response path', {
        temporalIntent,
        employee: finalEmployeeSlug,
        timezone: effectivePrimeContext?.timezone || null,
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic temporal response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:temporal',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'temporal',
        deterministicIntent: temporalIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'temporal' },
        }),
      };
    }

    const groundedFactsIntent = detectGroundedFactsIntent(masked);
    const isPrimeEmployeeForGroundedFacts = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (groundedFactsIntent && isPrimeEmployeeForGroundedFacts && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        buildGroundedFactsResponse(groundedFactsIntent, effectivePrimeContext),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic grounded facts response path', {
        groundedFactsIntent,
        employee: finalEmployeeSlug,
        hasPrimeContext: Boolean(effectivePrimeContext),
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic grounded facts response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:grounded_facts',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'grounded_facts',
        deterministicIntent: groundedFactsIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'grounded_facts' },
        }),
      };
    }

    const clarificationDecision = getClarificationDecision(masked, effectivePrimeContext, finalEmployeeSlug);
    if (clarificationDecision && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        clarificationDecision.question,
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic clarification response path', {
        reason: clarificationDecision.reason,
        employee: finalEmployeeSlug,
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic clarification response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:clarification',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'clarification',
        deterministicIntent: clarificationDecision.reason,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'clarification', reason: clarificationDecision.reason },
        }),
      };
    }

    const coachingIntent = detectCoachingIntent(masked);
    const isPrimeEmployeeForCoaching = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (coachingIntent && isPrimeEmployeeForCoaching && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        buildCoachingResponse(coachingIntent, effectivePrimeContext),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic coaching response path', {
        coachingIntent,
        employee: finalEmployeeSlug,
        hasPrimeContext: Boolean(effectivePrimeContext),
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic coaching response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:coaching',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'coaching',
        deterministicIntent: coachingIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'coaching', intent: coachingIntent },
        }),
      };
    }

    const insightIntent = detectInsightIntent(masked);
    const isPrimeEmployeeForInsights = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (insightIntent && isPrimeEmployeeForInsights && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        buildInsightResponse(insightIntent, effectivePrimeContext),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic financial insight response path', {
        insightIntent,
        employee: finalEmployeeSlug,
        hasPrimeContext: Boolean(effectivePrimeContext),
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic financial insight response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:financial_insight',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'financial_insight',
        deterministicIntent: insightIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'financial_insight', intent: insightIntent },
        }),
      };
    }

    const predictiveIntent = detectPredictiveIntent(masked);
    const isPrimeEmployeeForPredictive = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (predictiveIntent && isPrimeEmployeeForPredictive && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        buildPredictiveResponse(predictiveIntent, effectivePrimeContext),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic predictive finance response path', {
        predictiveIntent,
        employee: finalEmployeeSlug,
        hasPrimeContext: Boolean(effectivePrimeContext),
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic predictive response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:predictive_finance',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'predictive_finance',
        deterministicIntent: predictiveIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'predictive_finance', intent: predictiveIntent },
        }),
      };
    }

    const automationIntent = detectAutomationIntent(masked);
    const isPrimeEmployeeForAutomation = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (automationIntent && isPrimeEmployeeForAutomation && !hasAttachments) {
      const assistantContent = sanitizePrimeAssistantPresentation(
        buildAutomationResponse(automationIntent, effectivePrimeContext),
        finalEmployeeSlug
      );

      console.log('[Chat] ⚡ Deterministic automation response path', {
        automationIntent,
        employee: finalEmployeeSlug,
        hasPrimeContext: Boolean(effectivePrimeContext),
      });

      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'user',
          content: masked,
          tokens: estimateTokens(masked),
          thread_id: threadId,
          metadata: client_message_id ? { client_message_id } : undefined,
        });

        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: estimateTokens(assistantContent),
          thread_id: threadId,
          metadata: request_id ? { request_id } : undefined,
        });
      } catch (persistError: any) {
        console.warn('[Chat] Failed to persist deterministic automation response (non-fatal):', persistError?.message || persistError);
      }

      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals?.piiTypes || []).length > 0,
        employee: finalEmployeeSlug,
        routeConfidence: 1,
        sessionId: finalSessionId || undefined,
      });
      const guardrailsStatus = buildGuardrailsStatus(stream ? 'streaming' : 'json');
      await logUsageMetrics({
        sessionIdForLog: finalSessionId,
        employeeForLog: finalEmployeeSlug,
        promptTokens: estimateTokens(masked),
        completionTokens: estimateTokens(assistantContent),
        totalTokens: estimateTokens(masked) + estimateTokens(assistantContent),
        model: 'deterministic:automation',
        latencyMs: null,
        durationMs: 0,
        toolsUsed: null,
        success: true,
        deterministicPath: 'automation',
        deterministicIntent: automationIntent,
      });

      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Chat-Backend': 'v2',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: assistantContent, employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug, sessionId: finalSessionId, thread_id: threadId, guardrails: guardrailsStatus })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          employeeSlug: finalEmployeeSlug,
          sessionId: finalSessionId,
          thread_id: threadId,
          guardrails: guardrailsStatus,
          meta: { deterministic: 'automation', intent: automationIntent },
        }),
      };
    }

    setStage('memory');
    // ========================================================================
    // 6. MEMORY RETRIEVAL
    // ========================================================================
    // Check if this is a Smart Import AI conversation (check session context)
    let isSmartImportAI = false;
    try {
      const normalizedSessionIdForCheck = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForCheck) {
        const { data: sessionData } = await sb
          .from('chat_sessions')
          .select('context')
          .eq('id', normalizedSessionIdForCheck)
          .maybeSingle();
        
        if (sessionData?.context && typeof sessionData.context === 'object' && 'workspace' in sessionData.context) {
          isSmartImportAI = sessionData.context.workspace === 'smart_import_ai';
        }
      }
    } catch (error) {
      // Non-fatal - continue
    }
    
    // ========================================================================
    // 6. MEMORY RECALL (Phase 2.1: Unified API)
    // ========================================================================
    let memoryContext = '';
    let memoryFacts: Array<{
      fact: string;
      score: number;
      fact_id: string;
      memory_type?: 'habit' | 'goal' | 'correction' | 'stress_signal' | 'preference' | 'fact';
    }> = [];
    let memoryHitScore: number | null = null;
    
    const memNeed = shouldUseMemoryV2({
      messageText: masked,
      employeeSlug: finalEmployeeSlug,
      primeDecision,
      hasAttachments,
      pipelineSnapshotLoaded: orchCtx.pipeline_snapshot_loaded,
    });
    orchCtx.memory_used = memNeed.need;
    orchCtx.memory_skip_reason = memNeed.need ? 'used' : memNeed.reason;

    if (memNeed.need) {
      try {
        const memoryStartTime = Date.now();
        // Phase 2.1: Use unified memory API for comprehensive context
        const normalizedSessionId = normalizeSessionId(finalSessionId);
        const memory = await getMemory({
          userId,
          sessionId: normalizedSessionId || '',
          query: masked,
          options: {
            maxFacts: isSmartImportAI ? 8 : 5,
            topK: 6,
            minScore: 0.2,
            includeTasks: true, // Skip tasks in fast path
            includeSummaries: false
          }
        });

        // Use formatted context block from unified API
        memoryContext = memory.context || '';
        memoryFacts = memory.facts || [];
        memoryHitScore = memoryFacts.length > 0 ? memoryFacts[0].score : null;
        timingLogs.memory = Date.now() - memoryStartTime;

      // Filter Smart Import AI memories if this is a Smart Import AI conversation
      if (isSmartImportAI && memoryFacts.length > 0) {
        const smartImportMemories = memoryFacts.filter(f => {
          const factLower = f.fact.toLowerCase();
          return factLower.includes('smart import') || 
                 factLower.includes('document summary') ||
                 factLower.includes('transactions:');
        });
        
        if (smartImportMemories.length > 0) {
          memoryFacts = [
            ...smartImportMemories.slice(0, 5),
            ...memoryFacts.filter(f => !smartImportMemories.includes(f)).slice(0, 3)
          ];
          // Rebuild context with filtered facts
          memoryContext = memoryFacts.length > 0
            ? `\n\nRelevant user context:\n${memoryFacts.map(f => `- ${f.fact}`).join('\n')}`
            : '';
        }
      } else if (memoryContext) {
        // Add prefix for non-Smart Import AI
        memoryContext = `\n\n${memoryContext}`;
      }
      } catch (error: any) {
        console.warn('[Chat] Memory retrieval failed:', error);
        // Fallback to legacy recall() for backward compatibility
        try {
          const normalizedSessionId = normalizeSessionId(finalSessionId);
          memoryFacts = await recall({
            userId,
            query: masked,
            k: isSmartImportAI ? 8 : 5,
            minScore: 0.2,
            sessionId: normalizedSessionId || undefined
          });
          memoryHitScore = memoryFacts.length > 0 ? memoryFacts[0].score : null;
          memoryContext = memoryFacts.length > 0
            ? `\n\nRelevant user context:\n${memoryFacts.map(f => `- ${f.fact}`).join('\n')}`
            : '';
        } catch (fallbackError: any) {
          console.warn('[Chat] Fallback memory retrieval also failed:', fallbackError);
          // Continue without memory if both fail
        }
      }
    } else {
      // Memory gating v2: skip retrieval when deterministic heuristics say context is not required.
      if (process.env.NETLIFY_DEV === 'true') {
        console.log(`[Chat] 🚀 MEMORY GATE V2: skipping memory (${memNeed.reason})`);
      }
    }
    const hasStressMemorySignal = memoryFacts.some((f) => {
      const type = String(f.memory_type || '').toLowerCase();
      const text = String(f.fact || '').toLowerCase();
      return type === 'stress_signal' || /\b(stress|stressed|anxious|anxiety|overwhelmed|worried)\b/.test(text);
    });

    // Log memory recall summary only when memory was used.
    if (memNeed.need) {
      const safeSessionId =
        typeof finalSessionId === "string"
          ? finalSessionId
          : String(finalSessionId || "");
      const sessionIdForLog = safeSessionId.length > 0
        ? safeSessionId.substring(0, 8)
        : 'no-session';
      console.log(`[CHAT] memory recall userId=${typeof userId === 'string' && userId.length > 8 ? userId.substring(0, 8) : userId}... sessionId=${sessionIdForLog}... employee=${finalEmployeeSlug} hasContext=${memoryContext.length > 0}`);
    }

    // ========================================================================
    // 7. GET RECENT MESSAGES (by thread_id if available, else session_id)
    // ========================================================================
    // FAST lane: use smaller history window for speed.
    const messageLimit = isPrimeFastLane ? 6 : (isFastPath ? 10 : 50);
    let recentMessages: any[] = [];
    try {
      const messagesStartTime = Date.now();
      const cacheScope = threadId || normalizeSessionId(finalSessionId) || 'none';
      const cacheKey = `${userId}:${cacheScope}:${messageLimit}:${isPrimeFastLane ? 'fast' : 'default'}`;
      const cachedMessages = runtimeCacheTtlSeconds > 0
        ? readRuntimeCache<any[]>(runtimeCache.threadLookup, cacheKey)
        : null;
      if (cachedMessages) {
        recentMessages = cachedMessages.map((m: any) => ({ ...m }));
      }
      if (recentMessages.length === 0 && threadId) {
        // Load by thread_id (preferred)
        const { data: threadMessages, error: threadError } = await sb
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('thread_id', threadId)
          // Load newest first for limit, then reverse in-memory to preserve chronology.
          .order('created_at', { ascending: false })
          .limit(messageLimit);
        
        if (!threadError && threadMessages) {
          recentMessages = [...threadMessages].reverse().map((m: any) => ({
            role: m.role,
            content: m.content,
            id: m.id,
          }));
          console.log(`[Chat] ✅ Loaded ${recentMessages.length} messages from thread ${threadId.substring(0, 8)}...`);
        } else {
          console.warn('[Chat] Failed to load messages by thread_id, falling back to session_id');
        }
      }
      
        // Fallback to session_id if thread_id didn't work or wasn't available
        if (recentMessages.length === 0) {
          const normalizedSessionIdForMessages = normalizeSessionId(finalSessionId);
          if (normalizedSessionIdForMessages) {
            // FAST PATH: Use smaller token limit for short messages
            const tokenLimit = isPrimeFastLane ? 800 : (isFastPath ? 1000 : 4000);
            recentMessages = await getRecentMessages(sb, normalizedSessionIdForMessages, tokenLimit);
          const normalizedSessionIdForLog = normalizeSessionId(finalSessionId) || 'no-session';
          const safeSessionId2 =
            typeof normalizedSessionIdForLog === "string"
              ? normalizedSessionIdForLog
              : String(normalizedSessionIdForLog || "");
          if (recentMessages.length > 0) {
            console.log(`[Chat] ✅ Loaded ${recentMessages.length} previous messages from session ${safeSessionId2.substring(0, 8)}...`);
          } else {
            console.log(`[Chat] ℹ️ No previous messages found for session ${safeSessionId2.substring(0, 8)}... (this is normal for new conversations)`);
          }
        }
      }
      if (runtimeCacheTtlSeconds > 0 && recentMessages.length > 0) {
        writeRuntimeCache(runtimeCache.threadLookup, cacheKey, recentMessages, runtimeCacheTtlSeconds);
      }
      timingLogs.messages = Date.now() - messagesStartTime;
    } catch (error: any) {
      console.warn('[Chat] ⚠️ Failed to load recent messages:', error);
      // Continue without history if loading fails
    }

    // ========================================================================
    // 7.5. CHECK FOR HANDOFF CONTEXT (Phase 3.2)
    // ========================================================================
    let handoffContext: {
      from_employee: string;
      reason?: string;
      context_summary?: string;
      key_facts?: string[];
      user_intent?: string;
      handoff_type?: 'standard' | 'plugin';
      plugin_payload?: Record<string, any>;
    } | null = null;
    
    try {
      // Check for recent handoff (last 5 minutes, same session, to current employee)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: handoffData } = await sb
        .from('handoffs')
        .select('from_employee, reason, context_summary, key_facts, user_intent, status')
        .eq('session_id', finalSessionId)
        .eq('to_employee', finalEmployeeSlug)
        .eq('status', 'initiated')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (handoffData) {
        const pluginPayload = decodePluginPayloadFromHandoffSummary(handoffData.context_summary || null);
        handoffContext = {
          from_employee: handoffData.from_employee,
          reason: handoffData.reason || undefined,
          context_summary: stripPluginMarkerFromSummary(handoffData.context_summary || undefined),
          key_facts: handoffData.key_facts || undefined,
          user_intent: handoffData.user_intent || undefined,
          handoff_type: pluginPayload ? 'plugin' : 'standard',
          plugin_payload: pluginPayload || undefined,
        };
        
        // Mark handoff as completed
        await sb
          .from('handoffs')
          .update({ status: 'completed' })
          .eq('session_id', finalSessionId)
          .eq('to_employee', finalEmployeeSlug)
          .eq('status', 'initiated')
          .gte('created_at', fiveMinutesAgo);
        
        console.log(`[Chat] ✅ Loaded handoff context from ${handoffContext.from_employee} → ${finalEmployeeSlug}`);
      }
    } catch (error: any) {
      console.warn('[Chat] Failed to load handoff context:', error);
      // Continue without handoff context if loading fails
    }

    const isPrimeEmployeeForHydration = finalEmployeeSlug === 'prime-boss';
    const snapshotThinBeforeHydration = isPrimeSnapshotThin(effectivePrimeContext);
    if (isPrimeEmployeeForHydration && primeIntent.isBreakdownReport && snapshotThinBeforeHydration) {
      try {
        const hydrated = await buildFinancialSnapshot(sb, userId);
        effectivePrimeContext = {
          displayName: effectivePrimeContext?.displayName || null,
          timezone: effectivePrimeContext?.timezone || null,
          currency: effectivePrimeContext?.currency || 'CAD',
          currentStage: effectivePrimeContext?.currentStage || null,
          financialSnapshot: {
            hasTransactions: Boolean(hydrated?.hasTransactions),
            uncategorizedCount: Number(hydrated?.uncategorizedCount || 0),
            monthlySpend: typeof hydrated?.monthlySpend === 'number' ? hydrated.monthlySpend : undefined,
            topCategories: (hydrated?.topCategories || []).map((c: any) => ({
              name: String(c?.category || 'Other'),
              amount: Number(c?.totalAmount || 0),
            })),
            hasDebt: hydrated?.hasDebt === 'yes',
            hasGoals: hydrated?.hasGoals === 'yes',
          },
          memorySummary: effectivePrimeContext?.memorySummary || null,
        };
      } catch (hydrationError: any) {
        console.warn('[Chat] Snapshot hydration failed:', hydrationError?.message || hydrationError);
      }
    }

    // ========================================================================
    // 7.5. GET USER PROFILE & BUILD CONTEXT INJECTION
    // ========================================================================
    // Fetch AI user context for fluency adaptation (skip on Prime fast lane).
    const profileStartTime = Date.now();
    let ctx: any = null;
    let userProfile: Awaited<ReturnType<typeof getUserProfile>> = null;
    if (!isPrimeFastLane) {
      const ctxCacheKey = `${userId}:ai_context`;
      const profileCacheKey = `${userId}:profile`;
      const cachedCtx = runtimeCacheTtlSeconds > 0
        ? readRuntimeCache<any>(runtimeCache.aiUserContext, ctxCacheKey)
        : null;
      const cachedProfile = runtimeCacheTtlSeconds > 0
        ? readRuntimeCache<any>(runtimeCache.userProfile, profileCacheKey)
        : null;
      ctx = cachedCtx ?? await fetchAiUserContext(userId);
      userProfile = cachedProfile ?? await getUserProfile(sb, userId);
      if (!cachedCtx && runtimeCacheTtlSeconds > 0) {
        writeRuntimeCache(runtimeCache.aiUserContext, ctxCacheKey, ctx, runtimeCacheTtlSeconds);
      }
      if (!cachedProfile && runtimeCacheTtlSeconds > 0) {
        writeRuntimeCache(runtimeCache.userProfile, profileCacheKey, userProfile, runtimeCacheTtlSeconds);
      }
    }
    timingLogs.profile = Date.now() - profileStartTime;
    const userContextBlock = userProfile ? formatUserContextForPrompt(userProfile) : null;

    // ========================================================================
    // 8. BUILD MODEL MESSAGES
    // ========================================================================
    // Build system messages array (separate messages for each rule)
    // ORDER: Global fluency rule → Merged user context → Prime rule → Employee-specific prompts
    const systemMessages: Array<{ role: 'system'; content: string }> = [];
    const isPrime = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    const isPrimeBoss = finalEmployeeSlug === 'prime-boss';
    if (!(isPrimeBoss)) {

    // 1. Global AI Fluency Rule (ALL employees) - Single merged global rules message
    systemMessages.push({ role: 'system', content: AI_FLUENCY_GLOBAL_SYSTEM_RULE });
    
    // 2. Merged User Context (fluency level + user preferences in ONE message to avoid duplication)
    // Combine buildAiContextSystemMessage(ctx) with userContextBlock if available
    let mergedUserContext = buildAiContextSystemMessage(ctx);
    if (userContextBlock) {
      // Merge: AI fluency context + detailed user preferences
      mergedUserContext = `${mergedUserContext}\n\n---\n\n${userContextBlock}`;
    } else {
      // PRIME AUTHORITY HOT PATH (single authority contract)
      // Keep Prime context as compact factual data; avoid overlapping behavior prompts.
      if (!isPrimeFastLane && userProfile) {
        const compactUserContext = [
          'PRIME USER CONTEXT:',
          `- Name: ${userProfile.preferredName || 'User'}`,
          `- Currency: ${userProfile.currency || 'CAD'}`,
          userProfile.timezone ? `- Timezone: ${userProfile.timezone}` : null,
        ].filter(Boolean).join('\n');
        systemMessages.push({ role: 'system', content: compactUserContext });
      }

      if (effectivePrimeContext) {
        const pc = effectivePrimeContext;
        let primeContextMessage = 'PRIME CONTEXT (User State Snapshot):\n\n';
        primeContextMessage += `User: ${pc.displayName || 'User'}\n`;
        if (pc.timezone) primeContextMessage += `Timezone: ${pc.timezone}\n`;
        if (pc.currency) primeContextMessage += `Currency: ${pc.currency}\n`;
        if (pc.currentStage) primeContextMessage += `Stage: ${pc.currentStage}\n`;
        if (pc.financialSnapshot) {
          const fs = pc.financialSnapshot;
          primeContextMessage += `\nSnapshot:\n`;
          primeContextMessage += `- hasTransactions: ${fs.hasTransactions}\n`;
          primeContextMessage += `- uncategorizedCount: ${fs.uncategorizedCount}\n`;
          if (fs.monthlySpend !== undefined) primeContextMessage += `- monthlySpend: ${fs.monthlySpend}\n`;
          if (fs.topCategories && fs.topCategories.length > 0) {
            primeContextMessage += `- topCategories: ${fs.topCategories.map(c => `${c.name} (${c.amount})`).join(', ')}\n`;
          }
        }
        systemMessages.push({ role: 'system', content: primeContextMessage });
      }

      if (!isPrimeFastLane && handoffContext) {
        const handoffBits: string[] = [];
        handoffBits.push(`Handoff from: ${handoffContext.from_employee}`);
        if (handoffContext.reason) handoffBits.push(`Reason: ${handoffContext.reason}`);
        if (handoffContext.context_summary) handoffBits.push(`Summary: ${handoffContext.context_summary}`);
        if (handoffContext.user_intent) handoffBits.push(`User question: ${handoffContext.user_intent}`);
        if (handoffContext.key_facts?.length) {
          handoffBits.push(`Key facts: ${handoffContext.key_facts.join('; ')}`);
        }
        if (handoffContext.handoff_type === 'plugin' && handoffContext.plugin_payload) {
          handoffBits.push(`Plugin context: ${JSON.stringify(handoffContext.plugin_payload)}`);
        }
        systemMessages.push({ role: 'system', content: handoffBits.join('\n') });
      }

      if (!isPrimeFastLane && memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
    }
    
    // Add user name context (CRITICAL: Never show email as name)
    if (userProfile?.preferredName) {
      const firstName = userProfile.preferredName.split(' ')[0] || userProfile.preferredName;
      mergedUserContext += `\n\n**User Name Context (IMPORTANT):**
- User display name: ${userProfile.preferredName}
- Address the user as "${firstName}" in greetings and responses
- NEVER show their email address as their name
- If name is missing or unavailable, address them as "there"`;
    } else {
      mergedUserContext += `\n\n**User Name Context (IMPORTANT):**
- User name is not available
- Address the user as "there" in greetings and responses
- NEVER show their email address as their name`;
    }
    
    systemMessages.push({ role: 'system', content: mergedUserContext });

    // 2.5 Employee Brain Pack (ALL employees, per employee_key)
    // This is the employee’s unique identity + workflow + tone layer.
    const employeeBrainPrompt = buildEmployeeBrainSystemPrompt({
      employee_key: employeeKey, // resolved earlier from slug/registry
      ai_fluency_level: (ctx as any)?.ai_fluency_level ?? null,
      preferredName: userProfile?.preferredName ?? null,
      currency: (ctx as any)?.currency ?? null,
    });

    systemMessages.push({ role: 'system', content: employeeBrainPrompt });

    // Dev log (small + safe)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[chat] brain injected', {
        employeeKey,
        brainHead: employeeBrainPrompt.slice(0, 40),
      });
    }

    // 2.6 Employee Job Context (per-employee “what’s happening right now” snapshot)
    try {
      const jobCtx = await buildEmployeeJobContextSystemMessage(sb, {
        employeeKey,
        finalEmployeeSlug,
        userId,
        threadId: threadId || null,
        documentIds: documentIds || null,
      });

      if (jobCtx) {
        systemMessages.push({ role: 'system', content: jobCtx });
      }

      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[chat] job context injected', { employeeKey, hasJobCtx: !!jobCtx });
      }
    } catch (e: any) {
      console.warn('[chat] job context inject failed', { employeeKey, error: e?.message });
    }
    
    // 3. Prime Context System Message (ONLY for Prime, if prime_context provided)
    if (isPrime && effectivePrimeContext) {
      const pc = effectivePrimeContext;
      
      // Build Prime context system message (convenience overlay, verified server-side)
      let primeContextMessage = 'PRIME CONTEXT (User State Snapshot):\n\n';
      
      // User identity
      primeContextMessage += `User: ${pc.displayName || 'User'}\n`;
      if (pc.timezone) primeContextMessage += `Timezone: ${pc.timezone}\n`;
      if (pc.currency) primeContextMessage += `Currency: ${pc.currency}\n`;
      if (pc.currentStage) primeContextMessage += `Stage: ${pc.currentStage}\n`;
      
      // Financial snapshot
      if (pc.financialSnapshot) {
        const fs = pc.financialSnapshot;
        primeContextMessage += `\nSnapshot:\n`;
        primeContextMessage += `- hasTransactions: ${fs.hasTransactions}\n`;
        primeContextMessage += `- uncategorizedCount: ${fs.uncategorizedCount}\n`;
        if (fs.monthlySpend !== undefined) primeContextMessage += `- monthlySpend: ${fs.monthlySpend}\n`;
        if (fs.topCategories && fs.topCategories.length > 0) {
          primeContextMessage += `- topCategories: ${fs.topCategories.map(c => `${c.name} (${c.amount})`).join(', ')}\n`;
        }
        if (fs.hasDebt !== undefined) primeContextMessage += `- hasDebt: ${fs.hasDebt}\n`;
        if (fs.hasGoals !== undefined) primeContextMessage += `- hasGoals: ${fs.hasGoals}\n`;
      }
      
      // Memory summary
      if (pc.memorySummary) {
        const ms = pc.memorySummary;
        primeContextMessage += `\nMemorySummary:\n`;
        if (ms.factsCount !== undefined) primeContextMessage += `- factsCount: ${ms.factsCount}\n`;
        if (ms.lastUpdatedAt) primeContextMessage += `- lastUpdatedAt: ${ms.lastUpdatedAt}\n`;
        if (ms.recentFacts && ms.recentFacts.length > 0) {
          primeContextMessage += `- recentFacts: ${ms.recentFacts.slice(0, 3).join(', ')}\n`;
        }
      }
      
      // Prepend Prime context BEFORE orchestration rule (so orchestration can reference context)
      systemMessages.push({ role: 'system', content: primeContextMessage });
      
      // Dev logging (redacted)
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[chat] prime_context received', {
          hasName: !!pc.displayName,
          stage: pc.currentStage,
          uncategorizedCount: pc.financialSnapshot?.uncategorizedCount,
          factsCount: pc.memorySummary?.factsCount
        });
      }
    }
    
    // 3.5. Prime Orchestration Rule (ONLY for Prime, after context)
    if (isPrime) {
      if (hasStressMemorySignal) {
        systemMessages.push({
          role: 'system',
          content:
            'MEMORY BRAIN SIGNAL: user has prior financial stress signals. Use a calm, empathetic tone first, then give a short practical next step.',
        });
      }
      systemMessages.push({ role: 'system', content: PRIME_ORCHESTRATION_RULE });
    }
    
    // 3.6. Custodian Context (ONLY for Custodian, if custodian slug)
    const isCustodian = finalEmployeeSlug === 'custodian' || finalEmployeeSlug === 'custodian-settings';
    if (isCustodian) {
      try {
        // Query user security settings
        const { data: profile } = await sb
          .from('profiles')
          .select('metadata, created_at, updated_at')
          .eq('id', userId)
          .single();
        
        const metadata = profile?.metadata || {};
        const twoFactorEnabled = metadata.two_factor_enabled || false;
        const privacyLevel = metadata.privacy_level || 'standard';
        const accountAge = profile?.created_at ? 
          Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const onboardingCompleted = metadata.onboarding_completed || metadata.prime_initialized || false;
        
        const custodianContext = `
CUSTODIAN CONTEXT (Account Security & Settings):
- Account age: ${accountAge} days
- Two-factor authentication: ${twoFactorEnabled ? 'Enabled ✅' : 'Not enabled ⚠️'}
- Privacy level: ${privacyLevel}
- Account security score: ${twoFactorEnabled ? '8/10 (Good)' : '5/10 (Needs improvement)'}
- Onboarding completed: ${onboardingCompleted ? 'Yes' : 'No'}
- Last updated: ${profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
`;
        
        systemMessages.push({ role: 'system', content: custodianContext });
        
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log('[Custodian Context] Security context injected:', {
            accountAge,
            twoFactorEnabled,
            privacyLevel,
            onboardingCompleted,
          });
        }
      } catch (error: any) {
        console.warn('[Custodian Context] Failed to load security context:', error);
        // Continue without context if loading fails
      }
    }
    
    // 5. Handoff context if available
    if (handoffContext) {
      const handoffPreamble = `You're taking over this conversation from ${handoffContext.from_employee}.`;
      let handoffContent = handoffPreamble;
      
      if (handoffContext.reason) {
        handoffContent += `\nReason for handoff: ${handoffContext.reason}`;
      }
      
      if (handoffContext.context_summary) {
        handoffContent += `\n\nContext Summary:\n${handoffContext.context_summary}`;
      }
      
      if (handoffContext.key_facts && handoffContext.key_facts.length > 0) {
        handoffContent += `\n\nKey Facts:\n${handoffContext.key_facts.map(f => `- ${f}`).join('\n')}`;
      }
      
      if (handoffContext.user_intent) {
        handoffContent += `\n\nUser's Current Question: ${handoffContext.user_intent}`;
      }
      
      systemMessages.push({ role: 'system', content: handoffContent });
    }
    
    // 6. Employee-specific system prompt (from database or routing)
    if (customSystemPrompt) {
      // Use custom system prompt (includes category context, transaction context, etc.)
      systemMessages.push({ role: 'system', content: customSystemPrompt });
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
    } else if (employeeSystemPrompt) {
      // Use system_prompt from employee_profiles table (includes org chart, handoff rules, etc.)
      systemMessages.push({ role: 'system', content: employeeSystemPrompt });
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
      console.log(`[Chat] Using system_prompt from database for ${finalEmployeeSlug}`);
    } else {
      // Fallback to default routing-based prompts
      if (systemPreamble) {
        systemMessages.push({ role: 'system', content: systemPreamble });
      }
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
      if (employeePersona) {
        systemMessages.push({ role: 'system', content: employeePersona });
      }
      console.log(`[Chat] Using routing-based prompts for ${finalEmployeeSlug} (no DB system_prompt found)`);
    }
    }

    // Build attachment context if documentIds provided
    let attachmentContext: string | null = null;
    if (!isPrimeFastLane && documentIds && documentIds.length > 0) {
      attachmentContext = await buildAttachmentContext(sb, userId, documentIds);
    }
    const shouldAttachLatestImportContext =
      isPrime &&
      !isPrimeFastLane &&
      (
        isLastUploadRecallIntent(masked) ||
        isLastUploadDetailIntent(masked) ||
        isPipelineFollowupMessage(masked) ||
        isWorkspaceActivityIntent(masked)
      );
    if (!attachmentContext && shouldAttachLatestImportContext) {
      attachmentContext = await buildLatestImportSummaryContext(sb, userId);
    }

    // Combine user message with attachment context
    let userMessageContent = masked;
    if (attachmentContext) {
      userMessageContent = `${masked}${attachmentContext}`;
    }

    const txSearchAvailable = toolsAllowedThisTurn && employeeTools.includes('tx_search');
    const importIdContextForTurn = await resolveImportIdContextForTurn(masked, sb, userId);
    const txSearchIntent = txSearchAvailable && isTransactionQuestionForTxSearch(masked);
    if (txSearchIntent) {
      const txArgsHint: Record<string, any> = { limit: 25 };
      const pendingHint = shouldIncludePendingInTxSearch(masked);
      if (pendingHint) txArgsHint.includePending = true;

      const amountHint = extractAmountRangeHint(masked);
      const asksAboutAmount =
        masked.includes('$') ||
        /\b(charge|charged|amount|cost|spent)\b/i.test(masked) ||
        false;
      const shouldApplyAmountHint =
        asksAboutAmount &&
        (amountHint._hasDollar === true || (typeof amountHint._raw === 'number' && amountHint._raw < 1000));
      if (shouldApplyAmountHint) {
        if (typeof amountHint.minAmount === 'number') txArgsHint.minAmount = amountHint.minAmount;
        if (typeof amountHint.maxAmount === 'number') txArgsHint.maxAmount = amountHint.maxAmount;
      }

      const dateHint = extractDateRangeHint(masked);
      if (dateHint.startDate) txArgsHint.startDate = dateHint.startDate;
      if (dateHint.endDate) txArgsHint.endDate = dateHint.endDate;

      const queryHint = extractQueryHint(masked);
      if (queryHint) txArgsHint.q = queryHint;

      let importIdHint = importIdContextForTurn;
      if (importIdHint) txArgsHint.importId = importIdHint;

      systemMessages.push({
        role: 'system',
        content: [
          'TX_SEARCH TOOL RULE (transaction questions):',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- For transaction/spending/merchant/category/amount questions, call `tx_search` before answering.',
          '- Prefer passing `importId` when statement/import context is present and an import id is available.',
          '- Use `includePending=true` when user asks about pending/needs review/not committed.',
          '- If tx_search returns multiple candidates and user says "the 2nd one", "that one", or "this charge", call `tx_get` with the selected transaction id before answering.',
          '- For category changes on a specific transaction: if id is known call `tx_update_category`; otherwise call `tx_search` -> `tx_get` -> `tx_update_category`.',
          '- After successful update, confirm the change and ask: "Apply this category to this vendor going forward?" (yes/no).',
          `- Suggested tx_search args for this turn: ${JSON.stringify(txArgsHint)}`,
          '- Ground answer in tool results only. Show up to 5 matches as: YYYY-MM-DD | Merchant | Amount | Category.',
          '- If multiple plausible matches remain, ask one concise follow-up question.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isCategoryChangeIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_UPDATE_CATEGORY TOOL RULE (category changes):',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- If a specific transaction id is available, call `tx_update_category` directly.',
          '- If id is not available, call `tx_search` -> `tx_get` -> `tx_update_category`.',
          '- After update, confirm the change and ask: "Apply this category to this vendor going forward?"',
          '- If user says yes, call `tx_update_category` again with `applyToVendor=true` and vendor from `tx_get` row.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && finalSessionId) {
      const ordinalSelection = parseOrdinalSelection(masked);
      if (ordinalSelection !== null) {
        const cachedIds = readLastTxSearchIds(finalSessionId);
        const selectedId = cachedIds?.[ordinalSelection - 1] || null;
        if (selectedId) {
          systemMessages.push({
            role: 'system',
            content: `Selected transaction id: ${selectedId}. Call tx_get(id) now.`,
          });
        }
      }
    }
    if (txSearchAvailable && isUncategorizedIntent(masked)) {
      const uncategorizedArgs: Record<string, any> = {
        uncategorizedOnly: true,
        includePending: true,
        limit: 50,
      };
      if (importIdContextForTurn) uncategorizedArgs.importId = importIdContextForTurn;
      systemMessages.push({
        role: 'system',
        content: [
          'TX_UNCATEGORIZED TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          `- Call tx_search with ${JSON.stringify(uncategorizedArgs)}.`,
          '- Show up to 10 results as: YYYY-MM-DD | Merchant | Amount | Category',
          '- Then ask:',
          '- "Want me to categorize these now? If yes, tell me:',
          '- (A) category per item, OR',
          '- (B) a vendor rule like \'All Amazon = Office Supplies\'."',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isCompareIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_COMPARE TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- For comparison questions, call tx_search for period A and period B before answering.',
          '- Keep both calls scoped to importId when available.',
          '- Then respond with: Period A total, Period B total, Delta amount, Delta %, and one narrative line explaining the biggest driver.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isTopCategoryIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_TOP_CATEGORY TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- Call tx_search with relevant timeframe filters first.',
          '- Return top categories by spend with amounts, then one short narrative insight.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isTopMerchantIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_TOP_MERCHANT TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- Call tx_search with relevant timeframe filters first.',
          '- Return top merchants by spend with amounts, then one short narrative insight.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isLikelyDeductibleIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_DEDUCTIBLE TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- Call tx_search first, then flag only likely deductible transactions using rule-based reasoning from category/merchant/description.',
          '- Label output as "likely" and ask for confirmation before any category changes.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable && isPolicyCheckIntent(masked)) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_POLICY TOOL RULE:',
          `- Do not answer from memory. If tool not called, respond: 'I need to search your transactions first' and call the tool.`,
          '- Call tx_search first, then produce warning-only policy checks (no automatic writes).',
          '- Example format: item, amount, rule triggered.',
        ].join('\n'),
      });
    }
    if (txSearchAvailable) {
      const txFormatHint = buildTxDeterministicFormatHint(masked);
      if (txFormatHint) {
        systemMessages.push({
          role: 'system',
          content: txFormatHint,
        });
      }
    }
    const vendorRule = txSearchAvailable ? extractVendorCategoryRule(masked) : null;
    if (vendorRule) {
      systemMessages.push({
        role: 'system',
        content: [
          'TX_VENDOR_RULE TOOL RULE:',
          `- User rule detected: all ${vendorRule.vendor} = ${vendorRule.category}.`,
          `- Run tx_search with {"q":"${vendorRule.vendor}","includePending":true,"limit":25}.`,
          '- Then call tx_update_category using the TOP match id from tx_search as `id`, with applyToVendor=true, vendor, and category.',
          '- If tx_search returns multiple plausible vendors/merchants or no id is available, ask one quick follow-up or call tx_get first.',
          '- Confirm and offer to apply more vendor rules.',
        ].join('\n'),
      });
    }

    const hasPrimeSnapshotData =
      Boolean(effectivePrimeContext?.financialSnapshot?.hasTransactions) ||
      typeof effectivePrimeContext?.financialSnapshot?.monthlySpend === 'number' ||
      (Array.isArray(effectivePrimeContext?.financialSnapshot?.topCategories) &&
        effectivePrimeContext?.financialSnapshot?.topCategories.length > 0);
    const hasDocumentContext = Boolean(attachmentContext);
    const snapshotThin = isPrimeSnapshotThin(effectivePrimeContext);
    const primeAuthorityHint =
      isPrimeBoss
        ? {
            role: 'system' as const,
            content: buildPrimeAuthoritySystemMessage({
              lane: primeLane,
              intent: primeIntent.label,
              hasDocs: hasDocumentContext,
              hasSnapshot: hasPrimeSnapshotData,
            }),
          }
        : null;

    // Build final messages: system messages + chat history + current user message
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...(primeAuthorityHint ? [primeAuthorityHint] : []),
      ...systemMessages,
      ...recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessageContent },
    ];
    if (primeDebug && isPrime && finalEmployeeSlug === 'prime-boss') {
      const promptSizeChars = messages.reduce((sum, m: any) => sum + String(m?.content || '').length, 0);
      console.log('[Chat][PRIME_DEBUG] prompt construction', {
        lane: primeLane,
        intent: primeIntent.label,
        hasDocumentContext,
        snapshotThin,
        contextBlocksIncluded: {
          primeContext: Boolean(effectivePrimeContext),
          memoryContext: Boolean(memoryContext),
          handoffContext: Boolean(handoffContext),
          attachmentContext: Boolean(attachmentContext),
          userProfileContext: Boolean(userProfile),
          primeAuthority: Boolean(primeAuthorityHint),
          fluencyGlobal: systemMessages.some((m) => m.content.includes('SYSTEM RULE: AI FLUENCY ADAPTATION')),
          primeOrchestration: systemMessages.some((m) => m.content.includes('ROLE: PRIME — AI FINANCIAL CEO')),
          dbEmployeePrompt: systemMessages.some((m) => m.content === employeeSystemPrompt),
          brainPack: systemMessages.some((m) => m.content.includes('EMPLOYEE BRAIN PACK')),
        },
        promptSizeChars,
        promptSizeTokensEstimate: Math.ceil(promptSizeChars / 4),
      });
    }

    // ========================================================================
    // 8.4. PRIME→BYTE HANDOFF TRIGGER (Explicit confirmation only)
    // ========================================================================
    // Prime-only: Only trigger handoff on explicit confirmation, not hypothetical questions
    // Handoff should happen ONLY when:
    // 1. User explicitly confirms ("yes, let's upload/import", "go ahead", "yes", "ok")
    // 2. User clicks Upload button (handled by frontend)
    // 3. Prime explicitly calls request_employee_handoff tool (handled by tool execution)
    // REMOVED: Automatic keyword-based handoff to prevent stickiness on hypothetical questions
    if (!userForcedEmployee && isPrime && finalEmployeeSlug === 'prime-boss') {
      // Only trigger on explicit confirmation, not just keywords
      const confirmationPattern = /\b(yes|ok|okay|go ahead|let's do it|let's upload|let's import|proceed|start|begin|ready)\b/i;
      const uploadIntentPattern = /\b(upload|import|statement|bank statement|receipt|pdf|transactions|document|file|scan|ocr|parse)\b/i;
      
      // Require BOTH confirmation AND upload intent (explicit user intent)
      const hasConfirmation = confirmationPattern.test(userMessageContent);
      const hasUploadIntent = uploadIntentPattern.test(userMessageContent);
      
      if (hasConfirmation && hasUploadIntent) {
        console.log(`[Chat] 🔄 PRIME→BYTE HANDOFF: User explicitly confirmed upload/import intent`);
        
        // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
        if (!finalSessionId) {
          console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available.');
        } else {
          // Simulate handoff tool result to reuse existing handoff processing logic
          const simulatedHandoffResult = {
            ok: true,
            data: {
              requested_handoff: true,
              target_slug: 'byte-docs',
              reason: 'Smart Import',
              summary_for_next_employee: 'User wants to upload a statement/receipt. Ask for the file and run OCR/parse pipeline. Summarize results and offer handback to Prime.',
            },
          };
          
          // Process handoff immediately (reuse existing logic from tool execution)
          try {
            const handoffData = simulatedHandoffResult.data;
            const targetSlug = handoffData.target_slug;
            const reason = handoffData.reason || 'Smart Import';
            const summary = handoffData.summary_for_next_employee;
            
            console.log(`[Chat] ✅ AUTO-HANDOFF COMPLETE: ${originalEmployeeSlug} → ${targetSlug}`, {
              reason,
              summary: summary?.substring(0, 100),
              sessionId: finalSessionId,
            });
            
            // Gather handoff context
            let handoffRecentMessages: any[] = [];
            let keyFacts: string[] = [];
            
            try {
              // Get recent messages (last 10)
              const { data: messagesData } = await sb
                .from('chat_messages')
                .select('role, content, created_at')
                .eq('session_id', finalSessionId)
                .order('created_at', { ascending: false })
                .limit(10);
              
              if (messagesData) {
                handoffRecentMessages = messagesData.reverse(); // Oldest first
              }
              
              // Extract key facts from memory
              if (memoryFacts && memoryFacts.length > 0) {
                keyFacts = memoryFacts.slice(0, 5).map(f => f.fact);
              }
            } catch (error: any) {
              console.warn('[Chat] Failed to gather handoff context:', error);
            }
            
            // Store handoff context in database
            try {
              await sb.from('handoffs').insert({
                user_id: userId,
                session_id: finalSessionId,
                from_employee: originalEmployeeSlug,
                to_employee: targetSlug,
                reason: reason,
                context_summary: summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`,
                key_facts: keyFacts,
                recent_messages: handoffRecentMessages,
                user_intent: masked.substring(0, 500),
                status: 'initiated',
              });
              
              console.log(`[Chat] Stored auto-handoff context for session ${finalSessionId}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to store auto-handoff context:', error);
            }
            
            // Update session's employee_slug ONLY if this is a confirmed handoff (not hypothetical)
            // CRITICAL: Only persist handoff if user explicitly confirmed (hasConfirmation && hasUploadIntent)
            // This prevents session from becoming "sticky" after hypothetical questions
            // Note: This handoff path only runs when hasConfirmation && hasUploadIntent is true (see line ~1591)
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: targetSlug })
                .eq('id', finalSessionId);
              
              console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug} (confirmed handoff)`);
            } catch (error: any) {
              console.warn('[Chat] Failed to update session employee_slug:', error);
            }
            
            // Insert system message about handoff
            try {
              const handoffMessage = summary 
                ? `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`
                : `Handoff: Conversation moved to ${targetSlug}.`;
              
              await sb.from('chat_messages').insert({
                session_id: finalSessionId,
                user_id: userId,
                role: 'system',
                content: handoffMessage,
                tokens: estimateTokens(handoffMessage),
                thread_id: threadId,
              });
              
              console.log(`[Chat] Inserted auto-handoff system message for session ${finalSessionId}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to insert auto-handoff system message:', error);
            }
            
            // CRITICAL: Return early with silent handoff - do NOT continue processing
            // Prime must NOT produce a full answer when handing off
            // Return only a short handoff message, then Byte will produce the substantive answer
            const handoffConfirmation = "Got it — handing this to Byte.";
            const isStreaming = stream !== false;
            
            // Log handoff for debugging
            console.log(`[Chat] 🔄 HANDOFF: ${originalEmployeeSlug} → ${targetSlug}`, {
              requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              responder: targetSlug,
              handoffOccurred: true,
            });
            
            if (isStreaming) {
              return {
                statusCode: 200,
                headers: {
                  ...baseHeaders,
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'X-Employee': targetSlug,
                  'X-Handoff': `${originalEmployeeSlug}-to-${targetSlug}`,
                },
                body: `data: ${JSON.stringify({ role: 'assistant', content: handoffConfirmation })}\n\ndata: ${JSON.stringify({ type: 'handoff', from: originalEmployeeSlug, to: targetSlug })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
              };
            } else {
              return {
                statusCode: 200,
                headers: {
                  ...baseHeaders,
                  'Content-Type': 'application/json',
                  'X-Employee': targetSlug,
                  'X-Handoff': `${originalEmployeeSlug}-to-${targetSlug}`,
                },
                body: JSON.stringify({
                  ok: true,
                  content: handoffConfirmation,
                  handoff: {
                    from: originalEmployeeSlug,
                    to: targetSlug,
                    reason: reason,
                  },
                  thread_id: threadId,
                }),
              };
            }
          } catch (error: any) {
            console.error('[Chat] Failed to process auto-handoff:', error);
            // Continue with normal Prime processing if handoff fails
          }
        }
      }
    }

    // Log context summary (skip detailed logging in fast path)
    if (!isFastPath) {
      console.log(`[Chat] Context: ${recentMessages.length} history messages, ${memoryFacts.length} memory facts`);
    } else if (process.env.NETLIFY_DEV === 'true') {
      console.log(`[Chat] 🚀 FAST PATH: ${recentMessages.length} history messages (memory skipped)`);
    }

    // ========================================================================
    // 8.5. RESOLVE MODEL CONFIGURATION (before dev logging and API calls)
    // ========================================================================
    setStage('model_config');
    // Get employee-specific model configuration early so it's available for logging and API calls
    // CRITICAL: modelConfig must ALWAYS be defined - never throw ReferenceError
    let modelConfig: { model: string; temperature: number; maxTokens: number };
    try {
      modelConfig = await getEmployeeModelConfig(finalEmployeeSlug);
      // Verify config is valid
      if (!modelConfig || !modelConfig.model || typeof modelConfig.temperature !== 'number' || typeof modelConfig.maxTokens !== 'number') {
        throw new Error('Invalid model config returned');
      }
      
      // FAST PATH: Reduce maxTokens for short messages (faster response, lower cost)
      const fastLaneMaxTokens = isPrimeFastLane ? 400 : 300;
      if (isFastPath && modelConfig.maxTokens > fastLaneMaxTokens) {
        modelConfig.maxTokens = fastLaneMaxTokens;
        if (process.env.NETLIFY_DEV === 'true') {
          console.log(`[Chat] 🚀 FAST PATH: Reduced maxTokens to ${modelConfig.maxTokens} for short message`);
        }
      }
      modelConfig = applyPrimeChatStyleModelConfig(modelConfig, {
        employeeSlug: finalEmployeeSlug,
        qualityMode: shouldPreferPrimeQualityMode,
        preferLongForm: !isFastPath,
      });
      
      console.log(`[Chat] modelConfig resolved: model=${modelConfig.model}, temperature=${modelConfig.temperature}, maxTokens=${modelConfig.maxTokens}`);
      if (primeDebug && isPrime && finalEmployeeSlug === 'prime-boss') {
        console.log('[Chat][PRIME_DEBUG] model selected', {
          lane: primeLane,
          intent: primeIntent.label,
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          toolsEnabled: toolsAllowedThisTurn,
        });
      }
    } catch (configError: any) {
      console.warn('[Chat] Failed to get employee model config (non-fatal, using defaults):', configError?.message || configError);
      // Fallback to default config using env var or safe defaults
      // Use process.env only (no import.meta for CJS compatibility)
      const defaultModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
      const defaultMaxTokens = isFastPath ? (isPrimeFastLane ? 400 : 300) : 2000; // FAST PATH: Lower maxTokens
      modelConfig = {
        model: defaultModel,
        temperature: 0.7,
        maxTokens: defaultMaxTokens,
      };
      modelConfig = applyPrimeChatStyleModelConfig(modelConfig, {
        employeeSlug: finalEmployeeSlug,
        qualityMode: shouldPreferPrimeQualityMode,
        preferLongForm: !isFastPath,
      });
      console.log(`[Chat] modelConfig resolved (fallback): model=${modelConfig.model}, temperature=${modelConfig.temperature}, maxTokens=${modelConfig.maxTokens}`);
      if (primeDebug && isPrime && finalEmployeeSlug === 'prime-boss') {
        console.log('[Chat][PRIME_DEBUG] model selected (fallback)', {
          lane: primeLane,
          intent: primeIntent.label,
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          toolsEnabled: toolsAllowedThisTurn,
        });
      }
    }
    
    // Final safety check - ensure modelConfig is never undefined
    if (!modelConfig || !modelConfig.model) {
      console.error('[Chat] CRITICAL: modelConfig is still undefined after all fallbacks - using emergency defaults');
      const emergencyMaxTokens = isFastPath ? (isPrimeFastLane ? 400 : 300) : 2000; // FAST PATH: Lower maxTokens
      modelConfig = {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: emergencyMaxTokens,
      };
      modelConfig = applyPrimeChatStyleModelConfig(modelConfig, {
        employeeSlug: finalEmployeeSlug,
        qualityMode: shouldPreferPrimeQualityMode,
        preferLongForm: !isFastPath,
      });
    }
    // Track request timing (used in both streaming and non-streaming paths)
    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;

    // DEV: Comprehensive AI request logging
    // Use process.env only (no import.meta for CJS compatibility)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.group(`🤖 [Backend AI Request] ${finalEmployeeSlug}`);
      
      // Log model configuration (now guaranteed to be defined)
      console.log('⚙️ Model Config:', {
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
      
      // Log system messages summary
      const systemMessagesSummary = systemMessages.map((m, i) => ({
        index: i,
        role: m.role,
        contentLength: m.content.length,
        preview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        hasContextData: {
          'prime-boss': m.content.includes('uncategorizedCount') || m.content.includes('topCategories'),
          'byte-docs': m.content.includes('Document:') || m.content.includes('OCR Text'),
          'tag-ai': m.content.includes('uncategorized') || m.content.includes('category'),
          'crystal-analytics': m.content.includes('spending') || m.content.includes('budget'),
        }[finalEmployeeSlug] || false,
      }));
      console.log('📋 System Messages:', systemMessagesSummary);
      
      // Log context summary
      const contextSummary = {
        systemMessagesCount: systemMessages.length,
        historyMessagesCount: recentMessages.length,
        memoryFactsCount: memoryFacts.length,
        hasPrimeContext: isPrime && !!effectivePrimeContext,
        hasDocumentContext: !!attachmentContext,
        hasMemoryContext: memoryContext.length > 0,
        hasHandoffContext: !!handoffContext,
        userMessageLength: userMessageContent.length,
      };
      console.log('📊 Context Summary:', contextSummary);
      
      // Log user message
      console.log('💬 User Message:', userMessageContent.substring(0, 200) + (userMessageContent.length > 200 ? '...' : ''));
      
      // Log expected context per employee
      const expectedContext = {
        'prime-boss': {
          shouldHave: ['Financial snapshot', 'Memory summary', 'User facts', 'RAG embeddings'],
          actualHas: [
            isPrime && effectivePrimeContext ? 'Financial snapshot' : null,
            isPrime && effectivePrimeContext?.memorySummary ? 'Memory summary' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'byte-docs': {
          shouldHave: ['Document context', 'User facts', 'RAG embeddings'],
          actualHas: [
            attachmentContext ? 'Document context' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'tag-ai': {
          shouldHave: ['Uncategorized count', 'User facts', 'RAG embeddings'],
          actualHas: [
            memoryContext.includes('uncategorized') ? 'Uncategorized count' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'crystal-analytics': {
          shouldHave: ['Analytics data', 'Budget data', 'User facts', 'RAG embeddings'],
          actualHas: [
            memoryContext.includes('spending') || memoryContext.includes('budget') ? 'Analytics/Budget data' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
      }[finalEmployeeSlug] || { shouldHave: ['User facts', 'RAG embeddings'], actualHas: [] };
      
      console.log('🎯 Expected vs Actual Context:', expectedContext);
      
      console.groupEnd();
    }

    // ========================================================================
    // 9. CALL OPENAI (Streaming)
    // ========================================================================
    if (!openai) {
      // Return graceful error instead of 500
      const isStreaming = stream !== false;
      if (isStreaming) {
        const errorMessage = "I'm sorry, the AI service is not properly configured right now. Please contact support or try again later.";
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: errorMessage })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: false,
          error: 'OpenAI API key not configured',
          content: "I'm sorry, the AI service is not properly configured right now. Please contact support or try again later.",
        }),
      };
    }

    // Save user message to database (masked) - non-blocking
    try {
      const messageData: any = {
        session_id: finalSessionId, // Keep for backward compatibility
        user_id: userId,
        role: 'user',
        content: masked, // Store masked version
        tokens: estimateTokens(masked),
        thread_id: threadId, // CRITICAL: thread_id is always required
        metadata: client_message_id ? { client_message_id } : undefined,
      };
      console.log(`[Chat] Inserting user message with thread_id: ${threadId}`);
      await sb.from('chat_messages').insert(messageData);
      
      // Log AI activity event (non-blocking, uses RLS with auth.uid())
      const authToken = event.headers?.authorization || event.headers?.Authorization || '';
      if (authToken && userId) {
        logAiActivity(authToken.replace('Bearer ', ''), {
          employeeId: finalEmployeeSlug,
          eventType: 'message_sent',
          status: 'success',
          label: `User sent message to ${finalEmployeeSlug}`,
          details: { message_length: masked.length, thread_id: finalSessionId },
        }).catch(err => {
          console.warn('[Chat] Failed to log activity event (non-fatal):', err);
        });
      }

      // AI Fluency: Detect multi-step chat (light heuristic)
      // If session has 3+ messages (user + assistant + user), it's a multi-step conversation
      if (recentMessages.length >= 3) {
        // Count user messages in recent history (excluding current one we just saved)
        const userMessageCount = recentMessages.filter(m => m.role === 'user').length;
        if (userMessageCount >= 1) {
          // Log multi-step chat event (non-blocking)
          logUserEvent({
            userId,
            eventType: 'multi_step_chat',
            eventValue: userMessageCount + 1, // +1 for current message
            meta: { sessionId: finalSessionId, employeeSlug: finalEmployeeSlug }
          }).catch(err => {
            console.error('[Chat] Error logging multi-step chat event:', err);
            // Don't block - logging failures are non-fatal
          });
        }
      }
    } catch (error: any) {
      console.warn('[Chat] Failed to save user message:', error);
      // Continue even if save fails
    }

    if (stream) {
      setStage('model_streaming');
      // Streaming response (SSE) with tool support
      console.log('[Chat] Streaming mode enabled for employee:', finalEmployeeSlug, 'userId:', userId);
      
      // Capture original employee slug before potential handoff
      const originalEmployeeSlug = finalEmployeeSlug;
      
      // Declare toolResults at function scope to ensure it's accessible throughout the streaming block
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      // Build response headers (cannot change after stream starts)
      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
        memoryHitTopScore: memoryHitScore,
        memoryHitCount: memoryFacts.length,
        employee: finalEmployeeSlug,
        routeConfidence: 0.8,
        sessionId: finalSessionId || undefined, // Include sessionId in headers for frontend
      });

      const responseHeaders = {
        ...baseHeaders,
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // important for the frontend check in chatEndpoint.ts
        'X-Chat-Backend': 'v2',
      };

      const encoder = new TextEncoder();
      let controller: any = null;
      const stream = new TransformStream({
        start(ctrl) {
          controller = ctrl as any;
          streamController = controller;
          streamStarted = true;
        },
      });
      const writeRaw = (text: string) => {
        if (!controller) return;
        controller.enqueue(encoder.encode(text));
      };
      const writeSSE = (payload: any, event?: string) => {
        const prefix = event ? `event: ${event}\n` : '';
        writeRaw(`${prefix}data: ${JSON.stringify(payload)}\n\n`);
      };

      (async () => {
        try {
        // Send meta event at start for debugging
        writeRaw(`data: {"type":"meta","status":"stream_started"}\n\n`);
        const guardrailsStatus = buildGuardrailsStatus('streaming');
        writeSSE({ status: 'starting' }, 'meta');
        writeSSE({ guardrails: guardrailsStatus }, 'meta');

        // Send employee header first (will be updated if handoff occurs)
        const employeePayload = { type: 'employee', employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug };
        writeSSE(employeePayload);
        
        // Convert tools to OpenAI format if available
        let openaiTools: any = undefined;
        try {
          if (!toolsAllowedThisTurn) {
            openaiTools = undefined;
          } else {
          openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
          }
        } catch (toolError: any) {
          console.warn('[Chat] Failed to convert tools to OpenAI format (non-fatal):', toolError);
          // Continue without tools
        }
        
        // Model config already resolved above - reuse it
        // (No need to resolve again - already available in scope)
        
        // Note: Netlify Functions streaming requires returning a promise that resolves to chunks
        console.log('[Chat] OPENAI streaming call start', { employeeSlug: finalEmployeeSlug, userId });
        
        // DEV: Log what's being sent to OpenAI
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.group(`🚀 [OpenAI API Call] ${finalEmployeeSlug}`);
          console.log('📤 Request to OpenAI:', {
            model: modelConfig.model,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            messagesCount: messages.length,
            systemMessagesCount: messages.filter(m => m.role === 'system').length,
            toolsCount: openaiTools?.length || 0,
          });
          
          // Log system messages (first 3 for brevity)
          const systemMsgs = messages.filter(m => m.role === 'system').slice(0, 3);
          systemMsgs.forEach((msg, i) => {
            console.log(`📋 System Message ${i + 1}:`, {
              length: msg.content.length,
              preview: msg.content.substring(0, 150) + '...',
              hasContextData: msg.content.includes('uncategorizedCount') || 
                             msg.content.includes('topCategories') ||
                             msg.content.includes('Document:') ||
                             msg.content.includes('spending') ||
                             msg.content.includes('budget'),
            });
          });
          
          console.log('💬 User Message:', messages.find(m => m.role === 'user')?.content?.substring(0, 200));
          console.groupEnd();
        }
        
        // CRITICAL: Time OpenAI call
        const openaiStartTime = Date.now();
        const streamAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        const openaiStream = await withTimeout(
          openai.chat.completions.create({
            model: modelConfig.model,
            messages,
            temperature: modelConfig.temperature,
            max_tokens: modelConfig.maxTokens,
            stream: true,
            tools: openaiTools, // Add tools if available
            ...(streamAbortController ? { signal: streamAbortController.signal } : {}),
          } as any),
          resolveOpenAiTimeoutMs(),
          'model_streaming_primary',
          orchCtx,
          streamAbortController
        );
        timingLogs.openai_ttft = Date.now() - openaiStartTime;
        console.log('[Chat] OPENAI streaming call initiated, starting to process chunks');

        // Create streaming response with tool calling support
        let assistantContent = '';
        let toolCalls: any[] = [];
        // requestStartTime and firstTokenTime already declared above

        // Dev-only verification log
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Guardrails] enabled=${guardrailsStatus.enabled} pii_masking=${guardrailsStatus.pii_masking} moderation=${guardrailsStatus.moderation} version=${guardrailsStatus.policy_version}`);
        }
        // DEV: Log every SSE payload type
        if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
          console.log('[CHAT SSE OUT]', employeePayload.type, 'employee:', finalEmployeeSlug);
        }

        // Stream tokens and collect tool calls
        for await (const chunk of openaiStream) {
          // Track time to first token
          if (!firstTokenTime && chunk.choices[0]?.delta?.content) {
            firstTokenTime = Date.now();
          }
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            assistantContent += delta.content;
            // Frontend expects type: 'text' with content property, not type: 'token' with token
            const textPayload = { type: 'text', content: delta.content };
            writeSSE(textPayload);
            // DEV: Log every SSE payload type
            if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
              console.log('[CHAT SSE OUT]', textPayload.type, 'content length:', delta.content.length);
            }
          }
          // Collect tool calls from stream
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index || 0;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCall.id,
                  type: 'function',
                  function: { name: toolCall.function?.name || '', arguments: '' }
                };
                
                // Phase 3.1: Send tool_calling event when tool call detected
                if (toolCall.function?.name) {
                  writeSSE({
                    type: 'tool_call',
                    tool: {
                      id: toolCall.id,
                      name: toolCall.function.name,
                      arguments: {}
                    }
                  });
                }
              }
              if (toolCall.function?.name) {
                toolCalls[index].function.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                toolCalls[index].function.arguments += toolCall.function.arguments;
              }
            }
          }
        }

      // Guardrail: enforce tx_search for transaction intents when model skips tools.
      if (
        toolsAllowedThisTurn &&
        toolCalls.length === 0 &&
        finalSessionId &&
        txSearchAvailable &&
        isTransactionQuestionForTxSearch(masked) &&
        toolModules['tx_search']
      ) {
        const forcedArgs: Record<string, any> = {
          limit: isUncategorizedIntent(masked) ? 50 : 25,
        };
        if (importIdContextForTurn) forcedArgs.importId = importIdContextForTurn;
        if (isUncategorizedIntent(masked)) forcedArgs.uncategorizedOnly = true;
        if (isUncategorizedIntent(masked) || shouldIncludePendingInTxSearch(masked)) forcedArgs.includePending = true;
        const forcedQ = extractQueryHint(masked);
        if (forcedQ) forcedArgs.q = forcedQ;
        if (shouldRunForcedTxSearch(finalSessionId, forcedArgs)) {
          toolCalls = [{
            id: `forced_tx_search_${Date.now()}`,
            type: 'function',
            function: { name: 'tx_search', arguments: JSON.stringify(forcedArgs) },
          }];
          if (!assistantContent || !assistantContent.trim()) {
            assistantContent = 'I need to search your transactions first.';
          }
        }
      }

      // Handle tool calls if any
      if (toolsAllowedThisTurn && toolCalls.length > 0 && Object.keys(toolModules).length > 0) {
        console.log(`[Chat] Processing ${toolCalls.length} tool calls`);
        
        // Execute tools and add results to messages
        // toolResults already declared at function scope above
        for (const toolCall of toolCalls) {
                if (!toolCall.id || !toolCall.function?.name) continue;
                
                const toolName = toolCall.function.name;
                const toolModule = toolModules[toolName];
                
                if (!toolModule) {
                  console.warn(`[Chat] Tool ${toolName} not found in modules`);
                  toolResults.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: `Tool ${toolName} not available` }),
                  });
                  continue;
                }

                try {
                  // Parse args once for logging and execution
                  const args = JSON.parse(toolCall.function.arguments || '{}');
                  
                  // Enhanced logging for all tools
                  console.log(`[Chat] Executing tool: ${toolName}`, {
                    employee: finalEmployeeSlug,
                    tool: toolName,
                    args: process.env.NETLIFY_DEV === 'true' ? args : '[redacted]',
                  });
                  
                  // Special debug logging for tag_category_brain
                  if (toolName === 'tag_category_brain') {
                    console.log(`[Tag Category Brain] Category: "${args.category || 'unknown'}", Timeframe: "${args.timeframe || 'all'}", UserId: ${userId}`);
                  }
                  
                  // Warn if tag_explain_category is called with obviously invalid transaction IDs
                  if (toolName === 'tag_explain_category' && args.transactionId) {
                    const invalidIds = ['upload', 'statement', 'document', 'file', 'smart import', 'import'];
                    const txIdLower = String(args.transactionId).toLowerCase().trim();
                    if (invalidIds.includes(txIdLower)) {
                      console.warn(`[Chat] ⚠️ Tag called tag_explain_category with invalid transactionId: "${args.transactionId}". This looks like an upload question that should trigger handoff instead.`);
                    }
                  }
                  
                  const toolContext: ToolContext = {
                    userId,
                    conversationId: finalSessionId,
                    sessionId: finalSessionId,
                    authHeader: authHeader || '',
                  };
                  
                  // Special debug logging for request_employee_handoff BEFORE execution
                  if (toolName === 'request_employee_handoff') {
                    console.log(`[Chat] 🔄 HANDOFF REQUEST (streaming): ${finalEmployeeSlug} → ${args.target_slug || 'unknown'}`, {
                      reason: args.reason || 'No reason provided',
                      summary: args.summary_for_next_employee || 'No summary provided',
                      userId,
                      sessionId: finalSessionId,
                    });
                  }
                  
                  // Phase 3.1: Send tool_executing event before execution
                  writeSSE({
                    type: 'tool_executing',
                    tool: toolName
                  });
                  
                  const result = await executeTool(toolModule, args, toolContext, {
                    employeeSlug: finalEmployeeSlug,
                    mode: 'propose-confirm', // TODO: Get from user preferences
                    autonomyLevel: 1, // TODO: Get from user preferences or tool metadata
                  });
                  
                  // Check if result has error field (from executeTool error handling)
                  if (result && typeof result === 'object' && 'error' in result) {
                    console.error(`[Chat] Tool ${toolName} returned error:`, result.error);
                    toolResults.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({ 
                        error: result.error || 'Tool execution failed',
                        message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
                      }),
                    });
                  } else {
                    if (toolName === 'tx_search' && finalSessionId) {
                      const rows = Array.isArray((result as any)?.rows) ? (result as any).rows : [];
                      const ids = rows
                        .map((r: any) => String(r?.id || '').trim())
                        .filter((id: string) => id.length > 0)
                        .slice(0, 25);
                      if (ids.length > 0) writeLastTxSearchIds(finalSessionId, ids);
                    }
                    // Special handling for employee handoff (streaming)
                    // Check for new schema: data.requested_handoff === true
                    if (!userForcedEmployee && toolName === 'request_employee_handoff' && result && typeof result === 'object' && 'data' in result) {
                      const handoffData = (result as any).data;
                      if (handoffData && handoffData.requested_handoff === true && handoffData.target_slug) {
                        // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
                        if (!finalSessionId) {
                          console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available. Cannot proceed with handoff.');
                          // Continue without handoff - don't crash
                          continue;
                        }
                        
                        const targetSlug = handoffData.target_slug;
                        const reason = handoffData.reason || 'Better suited for this question';
                        const summary = handoffData.summary_for_next_employee;
                        const handoffType: 'standard' | 'plugin' =
                          handoffData.handoff_type === 'plugin' ? 'plugin' : 'standard';
                        const pluginPayload =
                          handoffType === 'plugin' && handoffData.plugin_payload && typeof handoffData.plugin_payload === 'object'
                            ? handoffData.plugin_payload
                            : null;
                        const pluginMarker = encodePluginPayloadForHandoff(pluginPayload);
                        const summaryForStorage = pluginMarker
                          ? `${String(summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`)}\nPLUGIN_CONTEXT_B64:${pluginMarker}`
                          : (summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`);
                        
                        console.log(`[Chat] ✅ HANDOFF COMPLETE (streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                          reason,
                          summary: summary?.substring(0, 100),
                          sessionId: finalSessionId,
                        });
                        
                        // Phase 3.2: Gather handoff context
                        let recentMessages: any[] = [];
                        let keyFacts: string[] = [];
                        
                        try {
                          // Get recent messages (last 10)
                          const { data: messagesData } = await sb
                            .from('chat_messages')
                            .select('role, content, created_at')
                            .eq('session_id', finalSessionId)
                            .order('created_at', { ascending: false })
                            .limit(10);
                          
                          if (messagesData) {
                            recentMessages = messagesData.reverse(); // Oldest first
                          }
                          
                          // Extract key facts from memory
                          if (memoryFacts && memoryFacts.length > 0) {
                            keyFacts = memoryFacts.slice(0, 5).map(f => f.fact);
                          }
                        } catch (error: any) {
                          console.warn('[Chat] Failed to gather handoff context:', error);
                        }
                        
                        // Phase 3.2: Store handoff context in database
                        try {
                          await sb.from('handoffs').insert({
                            user_id: userId,
                            session_id: finalSessionId,
                            from_employee: originalEmployeeSlug,
                            to_employee: targetSlug,
                            reason: reason,
                            context_summary: summaryForStorage,
                            key_facts: keyFacts,
                            recent_messages: recentMessages,
                            user_intent: masked.substring(0, 500), // Current user message
                            status: 'initiated',
                          });
                          
                          console.log(`[Chat] Stored handoff context for session ${finalSessionId}`);
                        } catch (error: any) {
                          console.warn('[Chat] Failed to store handoff context:', error);
                        }
                        
                        // Update session's employee_slug (tool-based handoff - explicit action, safe to persist)
                        // This is from Prime calling request_employee_handoff tool, which is an explicit handoff action
                        try {
                          await sb
                            .from('chat_sessions')
                            .update({ employee_slug: targetSlug })
                            .eq('id', finalSessionId);
                          
                          console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug} (tool-based handoff)`);
                        } catch (error: any) {
                          console.warn('[Chat] Failed to update session employee_slug:', error);
                        }
                        
                        // Insert system message about handoff
                        try {
                          const handoffMessage = summary 
                            ? `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`
                            : `Handoff: Conversation moved to ${targetSlug}.`;
                          
                          await sb.from('chat_messages').insert({
                            session_id: finalSessionId,
                            user_id: userId,
                            role: 'system',
                            content: handoffMessage,
                            tokens: estimateTokens(handoffMessage),
                            thread_id: threadId, // CRITICAL: thread_id is always required
                          });
                          console.log(`[Chat] Inserting system handoff message with thread_id: ${threadId}`);
                          
                          console.log(`[Chat] Inserted handoff system message for session ${finalSessionId}`);
                        } catch (error: any) {
                          console.warn('[Chat] Failed to insert handoff system message:', error);
                        }
                        
                        // Update finalEmployeeSlug for this request
                        finalEmployeeSlug = targetSlug;
                        
                        // Reload employee profile and tools for new employee
                        try {
                          const newEmployeeProfile = await getEmployeeProfileCached(sb, finalEmployeeSlug, orchCtx);
                          if (newEmployeeProfile?.tools_allowed && Array.isArray(newEmployeeProfile.tools_allowed)) {
                            employeeTools = newEmployeeProfile.tools_allowed;
                            toolModules = pickTools(employeeTools);
                            console.log(`[Chat] Loaded ${employeeTools.length} tools for new employee ${finalEmployeeSlug}:`, employeeTools);
                          }
                        } catch (error: any) {
                          console.warn('[Chat] Failed to reload employee tools after handoff:', error);
                        }
                        
                        // Send handoff event in stream
                        const handoffEvent = {
                          type: 'handoff',
                          from: originalEmployeeSlug,
                          to: targetSlug,
                          reason,
                          summary,
                          handoff_type: handoffType,
                          plugin_payload: pluginPayload,
                        };
                        writeSSE(handoffEvent);
                        writeSSE({ type: 'employee', employee: finalEmployeeSlug, employeeSlug: finalEmployeeSlug });
                        
                        // Enhanced logging for debugging (guarded by env flag)
                        if (process.env.NETLIFY_DEV === 'true' || process.env.DEBUG_HANDOFF === 'true') {
                          console.log(`[Chat] 📤 HANDOFF EVENT SENT (streaming):`, handoffEvent);
                        }
                      }
                    }
                    
                    // executeTool handles Result unwrapping and returns the validated output directly
                    
                    // Phase 3.1: Send tool_result event with formatted result
                    // Format result for display (limit size, handle sensitive data)
                    let displayResult = result;
                    if (typeof result === 'object' && result !== null) {
                      // Create a safe copy for display (limit depth, remove sensitive fields)
                      try {
                        displayResult = JSON.parse(JSON.stringify(result));
                        // Limit large arrays/objects
                        if (Array.isArray(displayResult) && displayResult.length > 10) {
                          displayResult = displayResult.slice(0, 10).concat([`... and ${displayResult.length - 10} more items`]);
                        }
                      } catch (e) {
                        // If JSON parsing fails, use string representation
                        displayResult = String(result).substring(0, 500);
                      }
                    }
                    
                    writeSSE({
                      type: 'tool_result',
                      tool: toolName,
                      result: displayResult
                    });
                    
                    toolResults.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify(result),
                    });
                    
                    console.log(`[Chat] Tool ${toolName} executed successfully`);
                  }
                } catch (error: any) {
                  console.error(`[Chat] Tool execution error for ${toolName}:`, {
                    error: error.message,
                    stack: process.env.NETLIFY_DEV === 'true' ? error.stack : undefined,
                    employee: finalEmployeeSlug,
                  });
                  toolResults.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ 
                      error: error.message || 'Tool execution failed',
                      message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
                    }),
                  });
                }
              }
            }

      // If we have tool results, make another completion call with tool results
      if (toolResults.length > 0) {
        messages.push(
          { role: 'assistant', content: assistantContent, tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments }
          })) },
          ...toolResults
        );
        const txUpdateRefreshMessage = buildTxUpdateRefreshSystemMessage({
          didUpdate: didLastTxUpdateCategorySucceed(toolCalls, toolResults),
          importId: importIdContextForTurn,
        });
        if (txUpdateRefreshMessage) {
          messages.push({ role: 'system', content: txUpdateRefreshMessage });
        }
        const txComputedMetricsHint = buildTxDeterministicMetricsHint(masked, toolCalls, toolResults);
        if (txComputedMetricsHint) {
          messages.push({ role: 'system', content: txComputedMetricsHint });
        }
        const txVendorAmbiguityHint = buildVendorRuleAmbiguityHint(masked, toolCalls, toolResults);
        if (txVendorAmbiguityHint) {
          messages.push({ role: 'system', content: txVendorAmbiguityHint });
        }

        // Second completion with tool results
        try {
          // If handoff occurred, reload tools for new employee
          let openaiToolsAfterHandoff: any = undefined;
          try {
            openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
          } catch (toolError: any) {
            console.warn('[Chat] Failed to convert tools after handoff (non-fatal):', toolError);
          }
          
          // Use model config for current employee (may have changed after handoff)
          let modelConfigAfterHandoff;
          try {
            modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);
          } catch (configError: any) {
            console.warn('[Chat] Failed to get model config after handoff (non-fatal, using defaults):', configError);
            modelConfigAfterHandoff = {
              model: 'gpt-4o-mini',
              temperature: 0.7,
              maxTokens: 2000,
            };
          }
          modelConfigAfterHandoff = applyPrimeChatStyleModelConfig(modelConfigAfterHandoff, {
            employeeSlug: finalEmployeeSlug,
            qualityMode: shouldPreferPrimeQualityMode,
            preferLongForm: true,
          });
          
          const secondStreamAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
          const secondStream = await withTimeout(
            openai.chat.completions.create({
              model: modelConfigAfterHandoff.model,
              messages,
              temperature: modelConfigAfterHandoff.temperature,
              max_tokens: modelConfigAfterHandoff.maxTokens,
              stream: true,
              tools: openaiToolsAfterHandoff,
              ...(secondStreamAbortController ? { signal: secondStreamAbortController.signal } : {}),
            } as any),
            resolveOpenAiTimeoutMs(),
            'model_streaming_tool_followup',
            orchCtx,
            secondStreamAbortController
          );

                assistantContent = ''; // Reset for final response
                for await (const chunk of secondStream) {
                  const delta = chunk.choices[0]?.delta?.content;
                  if (delta) {
                    assistantContent += delta;
                    // Frontend expects type: 'text' with content property
                    const textPayload = { type: 'text', content: delta };
                    writeSSE(textPayload);
                    // DEV: Log every SSE payload type
                    if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
                      console.log('[CHAT SSE OUT]', textPayload.type, 'content length:', delta.length);
                    }
                  }
                }
              } catch (secondStreamError: any) {
                console.error('[Chat] Second streaming call failed after tool execution:', secondStreamError);
                // Add error message to stream
                const errorMsg = "I had trouble processing the tool results. Let me try a different approach.";
                assistantContent = errorMsg;
                writeSSE({ type: 'text', content: errorMsg });
              }
      }

      // ========================================================================
      // CUSTODIAN CLOSE-OUT SUMMARY (Step 6)
      // ========================================================================
      // When Custodian resolves an issue or hands off, append a structured summary
      // This helps users understand what was done and what's next
      // Check if Custodian was involved (either as original or final employee)
      const custodianWasInvolved = originalEmployeeSlug === 'custodian' || finalEmployeeSlug === 'custodian';
      const didHandoff = finalEmployeeSlug !== originalEmployeeSlug;
      const custodianHandedOff = originalEmployeeSlug === 'custodian' && didHandoff;
      
      if (custodianWasInvolved && assistantContent.trim().length > 0) {
        try {
          // Generate structured summary
          // Format: Diagnosis, What we changed, How to verify, Next steps / who owns it
          const summaryParts: string[] = [];
          
          if (custodianHandedOff) {
            // Handoff summary - Custodian handed off to another employee
            summaryParts.push(`\n\n---\n**Custodian Summary:**`);
            summaryParts.push(`**Diagnosis:** Issue triaged and routed to appropriate specialist.`);
            summaryParts.push(`**Action Taken:** Handed off to ${finalEmployeeSlug} for specialized assistance.`);
            summaryParts.push(`**Next Steps:** Continue conversation with ${finalEmployeeSlug} - they have the context needed.`);
          } else if (finalEmployeeSlug === 'custodian') {
            // Resolution summary (when Custodian resolves without handoff)
            // Extract key points from response (simple heuristic)
            const responseLower = assistantContent.toLowerCase();
            const hasDiagnosis = responseLower.includes('issue') || responseLower.includes('problem') || responseLower.includes('error') || responseLower.includes('diagnos');
            const hasAction = responseLower.includes('changed') || responseLower.includes('updated') || responseLower.includes('fixed') || responseLower.includes('resolved') || responseLower.includes('addressed');
            
            if (hasDiagnosis || hasAction) {
              summaryParts.push(`\n\n---\n**Custodian Summary:**`);
              if (hasDiagnosis) {
                summaryParts.push(`**Diagnosis:** Issue identified and addressed.`);
              }
              if (hasAction) {
                summaryParts.push(`**What Changed:** See response above for details.`);
              }
              summaryParts.push(`**How to Verify:** Test the functionality or check settings as described.`);
              summaryParts.push(`**Next Steps:** If issues persist, feel free to ask for further assistance.`);
            }
          }
          
          // Only append summary if we detected a resolution/handoff pattern
          if (summaryParts.length > 0) {
            const summaryText = summaryParts.join('\n');
            writeSSE({ type: 'text', content: summaryText });
            // Also append to assistantContent for database storage
            assistantContent += summaryText;
          }
        } catch (error: any) {
          // Fail silently - don't break chat if summary generation fails
          console.warn('[Chat] Failed to generate Custodian close-out summary:', error);
        }
      }

      console.log('[Chat] OPENAI streaming call completed, total content length:', assistantContent.length);
      
      // DEV: Verify single terminal path (prove no double emission)
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log(`[Chat] ✅ SSE Response Complete:`, {
          requestId: threadId,
          mode: 'SSE',
          doneEventEmitted: true,
          contentLength: assistantContent.length,
        });
      }

      // DEV: Comprehensive AI response logging
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.group(`✅ [Backend AI Response] ${finalEmployeeSlug}`);
        
        console.log('📥 Response Summary:', {
          model: modelConfig.model,
          responseLength: assistantContent.length,
          toolCallsCount: toolCalls.length,
          totalLatency: (Date.now() - requestStartTime) + 'ms',
          timeToFirstToken: firstTokenTime ? (firstTokenTime - requestStartTime) + 'ms' : 'N/A',
        });
        
        // Log response content
        console.log('💬 Assistant Response:', assistantContent.substring(0, 300) + (assistantContent.length > 300 ? '...' : ''));
        
        // Check if response references context data
        const hasNumbers = /\d+/.test(assistantContent);
        const hasContextualData = 
          (finalEmployeeSlug === 'prime-boss' && (
            assistantContent.includes('uncategorized') || 
            assistantContent.includes('spent') || 
            assistantContent.includes('category') ||
            /\$\d+/.test(assistantContent)
          )) ||
          (finalEmployeeSlug === 'byte-docs' && (
            assistantContent.includes('document') || 
            assistantContent.includes('upload') ||
            assistantContent.includes('processed')
          )) ||
          (finalEmployeeSlug === 'tag-ai' && (
            assistantContent.includes('uncategorized') || 
            assistantContent.includes('categor') || 
            /\d+.*transaction/i.test(assistantContent)
          )) ||
          (finalEmployeeSlug === 'crystal-analytics' && (
            assistantContent.includes('spent') || 
            assistantContent.includes('category') || 
            assistantContent.includes('budget') ||
            /\$\d+/.test(assistantContent)
          ));
        
        console.log('🧠 Intelligence Check:', {
          hasNumbers: hasNumbers,
          referencesContextData: hasContextualData,
          seemsIntelligent: hasNumbers && hasContextualData,
          toolCallsUsed: toolCalls.length > 0,
        });
        
        // Log tool calls if any
        if (toolCalls.length > 0) {
          console.log('🔧 Tool Calls:', toolCalls.map(tc => ({
            name: tc.function?.name,
            args: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
          })));
        }
        
        console.groupEnd();
      }

      const shouldRewritePrimeGeneric =
        isPrime &&
        finalEmployeeSlug === 'prime-boss' &&
        isPrimeDeepLane &&
        primeIntent.isBreakdownReport &&
        !primeIntent.isUploadHowTo &&
        isGenericUploadTemplateReply(assistantContent);
      if (shouldRewritePrimeGeneric) {
        const rewritten = buildPrimeDeterministicRewrite({
          hasDocs: hasDocumentContext,
          hasSnapshot: hasPrimeSnapshotData,
        });
        assistantContent = rewritten;
        // Streaming already emitted chunks; provide deterministic correction as final text chunk.
        writeSSE({ type: 'text', content: `\n\nUpdated answer:\n${rewritten}` });
      }

      const sanitizedStreamAssistantContent = sanitizePrimeAssistantPresentation(assistantContent, finalEmployeeSlug);
      if (sanitizedStreamAssistantContent !== assistantContent) {
        assistantContent = sanitizedStreamAssistantContent;
        writeSSE({ type: 'text', content: `\n\nUpdated answer:\n${assistantContent}` });
      }

      setStage('respond');
      assistantContent = ensureAssistantContent(assistantContent, orchestrationStage, orchCtx);
      if (assistantContent === buildSafeFallbackResponse(orchestrationStage)) {
        fallbackUsed = true;
        writeSSE({ type: 'text', content: assistantContent });
      }

      // Send completion signal after all post-generation rewrites
      const guardrailsMetadata = {
        status: guardrailResult?.ok ? 'active' : 'blocked',
        blocked: !guardrailResult?.ok,
        reasons: guardrailResult?.blockedReason ? [guardrailResult.blockedReason] : [],
        pii_masked: (guardrailResult?.signals?.pii || piiFound.length > 0) ? true : false,
        events_count: guardrailResult?.events?.length || 0,
      };
      const donePayload = { type: 'done', guardrails: guardrailsMetadata, thread_id: threadId };
      writeSSE(donePayload);
      if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
        console.log('[CHAT SSE OUT]', donePayload.type, 'thread_id:', threadId);
      }

      // Calculate token usage (rough estimate)
      // Join all system message contents for token estimation
      const systemMessageContent = systemMessages.map((m: any) => m.content).join('\n\n') || '';
      const promptTokens = estimateTokens(systemMessageContent + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime ? firstTokenTime - requestStartTime : null;

      // Save assistant message (will be redacted if needed) - non-blocking
      try {
        const messageData: any = {
          session_id: finalSessionId, // Keep for backward compatibility
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
          thread_id: threadId, // CRITICAL: thread_id is always required
          metadata: request_id ? { request_id } : undefined,
        };
        console.log(`[Chat] Inserting assistant message with thread_id: ${threadId}`);
        await sb.from('chat_messages').insert(messageData);
        
        // DEV: Verify single persistence (prove no double write)
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Chat] ✅ Assistant Message Persisted (SSE):`, {
            requestId: threadId,
            contentLength: assistantContent.length,
            persisted: true,
          });
        }
        
        // Log AI activity event (non-blocking, uses RLS with auth.uid())
        const authToken = event.headers?.authorization || event.headers?.Authorization || '';
        if (authToken && userId) {
          logAiActivity(authToken.replace('Bearer ', ''), {
            employeeId: finalEmployeeSlug,
            eventType: 'message_received',
            status: 'success',
            label: `Received response from ${finalEmployeeSlug}`,
            details: { 
              response_length: assistantContent.length,
              tokens: completionTokens,
              tools_used: toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null,
              thread_id: finalSessionId,
            },
          }).catch(err => {
            console.warn('[Chat] Failed to log activity event (non-fatal):', err);
          });
        }
      } catch (error: any) {
        console.warn('[Chat] Failed to save assistant message:', error);
        // Continue even if save fails
      }

      // Log usage metrics (non-blocking)
      try {
        const toolsUsed = toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null;
        await logUsageMetrics({
          sessionIdForLog: finalSessionId,
          employeeForLog: finalEmployeeSlug,
          promptTokens,
          completionTokens,
          totalTokens,
          model: modelConfig.model,
          latencyMs,
          durationMs,
          toolsUsed,
          success: true,
          orchestrationStage,
          fallbackUsed,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to log usage metrics:', error);
        // Continue even if logging fails
      }

      // CRITICAL: Log timing summary before returning
      const totalTime = Date.now() - requestStartTime;
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[Chat] ⏱️ Timing summary (ms):', {
          auth: timingLogs.auth || 0,
          session: timingLogs.session || 0,
          memory: timingLogs.memory || 0,
          messages: timingLogs.messages || 0,
          profile: timingLogs.profile || 0,
          openai_ttft: timingLogs.openai_ttft || 0,
          insert_message: timingLogs.insert_message || 0,
          total: totalTime,
          openai_latency: latencyMs,
          openai_duration: durationMs,
        });
      }

      // Phase 2.3: Queue memory extraction for async processing (non-blocking, fire-and-forget)
      // CRITICAL: Do NOT await - this runs after response is returned
      const normalizedSessionIdForExtraction = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForExtraction) {
        // Fire-and-forget: don't await, don't block response
        queueMemoryExtraction({
          userId,
          sessionId: normalizedSessionIdForExtraction,
          userMessage: masked,
          assistantResponse: assistantContent
        }).catch((error: any) => {
          // Log but don't fail - extraction failures shouldn't break chat
          console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
          // Worker will retry failed jobs automatically
        });
      }

      // Custodian: Update conversation summary (non-blocking, fire-and-forget)
      // CRITICAL: Do NOT await - this runs after response is returned
      // In dev mode, optionally skip to reduce latency
      const skipSummaryInDev = process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development';
      if (!skipSummaryInDev) {
        // Fire-and-forget: don't await, don't block response
        (async () => {
          try {
            // Get all messages for this conversation
            const { data: allMessages } = await sb
              .from('chat_messages')
              .select('role, content, created_at')
              .eq('session_id', finalSessionId)
              .order('created_at', { ascending: true });

            if (!allMessages || allMessages.length === 0) {
              return;
            }

            // Get employees involved from session and handoffs
            const employeesInvolved = new Set<string>();
            employeesInvolved.add(finalEmployeeSlug);
            
            // Check for handoffs in this session
            try {
              const { data: handoffs } = await sb
                .from('handoffs')
                .select('from_employee, to_employee')
                .eq('session_id', finalSessionId);
              
              if (handoffs) {
                handoffs.forEach((h: any) => {
                  if (h.from_employee) employeesInvolved.add(h.from_employee);
                  if (h.to_employee) employeesInvolved.add(h.to_employee);
                });
              }
            } catch (e) {
              // Ignore handoff lookup errors
            }

            // Call summary update
            await updateConversationSummaryForCustodian(
              sb,
              userId,
              finalSessionId,
              allMessages.map(m => ({ role: m.role, content: m.content })),
              Array.from(employeesInvolved)
            );
          } catch (error: any) {
            console.warn('[Custodian] Failed to update conversation summary:', error);
          }
        })();
      } else if (process.env.NETLIFY_DEV === 'true') {
        console.log('[Chat] 🚀 DEV MODE: Skipping conversation summary update to reduce latency');
      }

      return;
    } catch (streamingError: any) {
      console.error('[Chat] Streaming OpenAI call failed:', streamingError);
      // Log the full error for debugging
      if (streamingError?.message) {
        console.error('[Chat] Error details:', streamingError.message);
        console.error('[Chat] Error stack:', streamingError.stack);
      }
      const isTimeout = isOpenAiTimeoutError(streamingError);
      if (isTimeout) {
        orchCtx.openai_timeout = true;
        orchCtx.timeout_label = streamingError.timeoutLabel || orchCtx.timeout_label;
        orchCtx.timeout_ms = Number(streamingError.timeoutMs || orchCtx.timeout_ms || resolveOpenAiTimeoutMs());
      }
      setStage('respond');
      const fallbackMessage = ensureAssistantContent(buildSafeFallbackResponse(orchestrationStage, orchCtx), orchestrationStage, orchCtx);
      fallbackUsed = true;
      writeRaw(`data: ${JSON.stringify({ role: 'assistant', content: fallbackMessage })}\n\n`);
      writeRaw(`data: ${JSON.stringify({ type: 'done', thread_id: threadId, error: isTimeout ? 'OpenAI timeout' : 'Streaming call failed' })}\n\n`);
      return;
    } finally {
      try {
        const anyController: any = controller as any;
        if (anyController && typeof anyController.close === 'function') {
          anyController.close();
        }
      } catch {
        // ignore
      }
    }
      })();

      return new Response(stream.readable, { headers: responseHeaders }) as any;
    } else {
      setStage('model_non_streaming');
      // Non-streaming response with tool calling support
      try {
        let openaiTools: any = undefined;
        try {
          if (!toolsAllowedThisTurn) {
            openaiTools = undefined;
          } else {
            openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
          }
        } catch (toolError: any) {
          console.warn('[Chat] Failed to convert tools to OpenAI format (non-fatal):', toolError);
        }
        
        // Model config already resolved above - reuse it
        // (No need to resolve again - already available in scope)
        
        const nonStreamAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        let completion = await withTimeout(
          openai.chat.completions.create({
            model: modelConfig.model,
            messages,
            temperature: modelConfig.temperature,
            max_tokens: modelConfig.maxTokens,
            stream: false,
            tools: openaiTools,
          } as any),
          resolveOpenAiTimeoutMs(),
          'model_non_streaming_primary',
          orchCtx,
          nonStreamAbortController
        );

        let assistantContent = completion.choices[0]?.message?.content || '';
        let toolCalls = completion.choices[0]?.message?.tool_calls || [];

        // DEV: Log non-streaming response
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.group(`✅ [Backend AI Response - Non-Streaming] ${finalEmployeeSlug}`);
          console.log('📥 Response Summary:', {
            model: modelConfig.model,
            responseLength: assistantContent.length,
            toolCallsCount: toolCalls.length,
            usage: completion.usage,
          });
          console.log('💬 Assistant Response:', assistantContent.substring(0, 300) + (assistantContent.length > 300 ? '...' : ''));
          
          // Check intelligence
          const hasNumbers = /\d+/.test(assistantContent);
          const hasContextualData = 
            (finalEmployeeSlug === 'prime-boss' && (assistantContent.includes('uncategorized') || assistantContent.includes('spent'))) ||
            (finalEmployeeSlug === 'tag-ai' && (assistantContent.includes('uncategorized') || /\d+.*transaction/i.test(assistantContent))) ||
            (finalEmployeeSlug === 'crystal-analytics' && (assistantContent.includes('spent') || /\$\d+/.test(assistantContent)));
          
          console.log('🧠 Intelligence Check:', {
            hasNumbers,
            referencesContextData: hasContextualData,
            seemsIntelligent: hasNumbers && hasContextualData,
          });
          console.groupEnd();
        }

        // Guardrail: enforce tx_search for transaction intents when model skips tools.
        if (
          toolsAllowedThisTurn &&
          toolCalls.length === 0 &&
          finalSessionId &&
          txSearchAvailable &&
          isTransactionQuestionForTxSearch(masked) &&
          toolModules['tx_search']
        ) {
          const forcedArgs: Record<string, any> = {
            limit: isUncategorizedIntent(masked) ? 50 : 25,
          };
          if (importIdContextForTurn) forcedArgs.importId = importIdContextForTurn;
          if (isUncategorizedIntent(masked)) forcedArgs.uncategorizedOnly = true;
          if (isUncategorizedIntent(masked) || shouldIncludePendingInTxSearch(masked)) forcedArgs.includePending = true;
          const forcedQ = extractQueryHint(masked);
          if (forcedQ) forcedArgs.q = forcedQ;
          if (shouldRunForcedTxSearch(finalSessionId, forcedArgs)) {
            toolCalls = [{
              id: `forced_tx_search_${Date.now()}`,
              type: 'function',
              function: { name: 'tx_search', arguments: JSON.stringify(forcedArgs) },
            }] as any;
            if (!assistantContent || !assistantContent.trim()) {
              assistantContent = 'I need to search your transactions first.';
            }
          }
        }

        // Handle tool calls if any
        if (toolsAllowedThisTurn && toolCalls.length > 0 && Object.keys(toolModules).length > 0) {
        console.log(`[Chat] Processing ${toolCalls.length} tool calls (non-streaming)`);
        
        const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolModule = toolModules[toolName];
          
          if (!toolModule) {
            console.warn(`[Chat] Tool ${toolName} not found`);
            continue;
          }

          try {
            // Parse args once for logging and execution
            const args = JSON.parse(toolCall.function.arguments || '{}');
            
            // Enhanced logging for all tools
            console.log(`[Chat] Executing tool: ${toolName}`, {
              employee: finalEmployeeSlug,
              tool: toolName,
              args: process.env.NETLIFY_DEV === 'true' ? args : '[redacted]',
            });
            
            // Special debug logging for tag_category_brain
            if (toolName === 'tag_category_brain') {
              console.log(`[Tag Category Brain] Category: "${args.category || 'unknown'}", Timeframe: "${args.timeframe || 'all'}", UserId: ${userId}`);
            }
            
            // Warn if tag_explain_category is called with obviously invalid transaction IDs
            if (toolName === 'tag_explain_category' && args.transactionId) {
              const invalidIds = ['upload', 'statement', 'document', 'file', 'smart import', 'import'];
              const txIdLower = String(args.transactionId).toLowerCase().trim();
              if (invalidIds.includes(txIdLower)) {
                console.warn(`[Chat] ⚠️ Tag called tag_explain_category with invalid transactionId: "${args.transactionId}". This looks like an upload question that should trigger handoff instead.`);
              }
            }
            
            const toolContext: ToolContext = {
              userId,
              conversationId: finalSessionId,
              sessionId: finalSessionId,
              authHeader: authHeader || '',
            };
            
            // Special debug logging for request_employee_handoff BEFORE execution
            if (toolName === 'request_employee_handoff') {
              console.log(`[Chat] 🔄 HANDOFF REQUEST (non-streaming): ${finalEmployeeSlug} → ${args.target_slug || 'unknown'}`, {
                reason: args.reason || 'No reason provided',
                summary: args.summary_for_next_employee || 'No summary provided',
                userId,
                sessionId: finalSessionId,
              });
            }
            
            const result = await executeTool(toolModule, args, toolContext, {
              employeeSlug: finalEmployeeSlug,
              mode: 'propose-confirm', // TODO: Get from user preferences
              autonomyLevel: 1, // TODO: Get from user preferences or tool metadata
            });
            
            // Check if result has error field (from executeTool error handling)
            if (result && typeof result === 'object' && 'error' in result) {
              console.error(`[Chat] Tool ${toolName} returned error:`, result.error);
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ 
                  error: result.error || 'Tool execution failed',
                  message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
                }),
              });
            } else {
              if (toolName === 'tx_search' && finalSessionId) {
                const rows = Array.isArray((result as any)?.rows) ? (result as any).rows : [];
                const ids = rows
                  .map((r: any) => String(r?.id || '').trim())
                  .filter((id: string) => id.length > 0)
                  .slice(0, 25);
                if (ids.length > 0) writeLastTxSearchIds(finalSessionId, ids);
              }
              // Special handling for employee handoff (non-streaming)
              // Check for new schema: data.requested_handoff === true
              if (!userForcedEmployee && toolName === 'request_employee_handoff' && result && typeof result === 'object' && 'data' in result) {
                const handoffData = (result as any).data;
                if (handoffData && handoffData.requested_handoff === true && handoffData.target_slug) {
                  // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
                  if (!finalSessionId) {
                    console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available. Cannot proceed with handoff.');
                    // Continue without handoff - don't crash
                    continue;
                  }
                  
                  const targetSlug = handoffData.target_slug;
                  const reason = handoffData.reason || 'Better suited for this question';
                  const summary = handoffData.summary_for_next_employee;
                  const handoffType: 'standard' | 'plugin' =
                    handoffData.handoff_type === 'plugin' ? 'plugin' : 'standard';
                  const pluginPayload =
                    handoffType === 'plugin' && handoffData.plugin_payload && typeof handoffData.plugin_payload === 'object'
                      ? handoffData.plugin_payload
                      : null;
                  const pluginMarker = encodePluginPayloadForHandoff(pluginPayload);
                  const summaryForStorage = pluginMarker
                    ? `${String(summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`)}\nPLUGIN_CONTEXT_B64:${pluginMarker}`
                    : (summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`);
                  
                  console.log(`[Chat] ✅ HANDOFF COMPLETE (non-streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                    reason,
                    summary: summary?.substring(0, 100),
                    sessionId: finalSessionId,
                  });
                  
                  // Phase 3.2: Gather handoff context (non-streaming)
                  let recentMessagesNonStream: any[] = [];
                  let keyFactsNonStream: string[] = [];
                  
                  try {
                    // Get recent messages (last 10)
                    const { data: messagesData } = await sb
                      .from('chat_messages')
                      .select('role, content, created_at')
                      .eq('session_id', finalSessionId)
                      .order('created_at', { ascending: false })
                      .limit(10);
                    
                    if (messagesData) {
                      recentMessagesNonStream = messagesData.reverse(); // Oldest first
                    }
                    
                    // Extract key facts from memory
                    if (memoryFacts && memoryFacts.length > 0) {
                      keyFactsNonStream = memoryFacts.slice(0, 5).map(f => f.fact);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to gather handoff context (non-streaming):', error);
                  }
                  
                  // Phase 3.2: Store handoff context in database (non-streaming)
                  try {
                    await sb.from('handoffs').insert({
                      user_id: userId,
                      session_id: finalSessionId,
                      from_employee: originalEmployeeSlug,
                      to_employee: targetSlug,
                      reason: reason,
                      context_summary: summaryForStorage,
                      key_facts: keyFactsNonStream,
                      recent_messages: recentMessagesNonStream,
                      user_intent: masked.substring(0, 500),
                      status: 'initiated',
                    });
                    
                    console.log(`[Chat] Stored handoff context (non-streaming) for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to store handoff context (non-streaming):', error);
                  }
                  
                  // Update session's employee_slug
                  try {
                    await sb
                      .from('chat_sessions')
                      .update({ employee_slug: targetSlug })
                      .eq('id', finalSessionId);
                    
                    console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to update session employee_slug:', error);
                  }
                  
                  // Insert system message about handoff
                  try {
                    const handoffMessage = summary 
                      ? `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`
                      : `Handoff: Conversation moved to ${targetSlug}.`;
                    
                    await sb.from('chat_messages').insert({
                      session_id: finalSessionId,
                      user_id: userId,
                      role: 'system',
                      content: handoffMessage,
                      tokens: estimateTokens(handoffMessage),
                      thread_id: threadId, // CRITICAL: thread_id is always required
                    });
                    console.log(`[Chat] Inserting system handoff message (non-streaming) with thread_id: ${threadId}`);
                    console.log(`[Chat] Inserting system handoff message (non-streaming) with thread_id: ${threadId}`);
                    
                    console.log(`[Chat] Inserted handoff system message for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to insert handoff system message:', error);
                  }
                  
                  // Update finalEmployeeSlug for this request
                  finalEmployeeSlug = targetSlug;
                  
                  // Reload employee profile and tools for new employee
                  try {
                    const newEmployeeProfile = await getEmployeeProfileCached(sb, finalEmployeeSlug, orchCtx);
                    if (newEmployeeProfile?.tools_allowed && Array.isArray(newEmployeeProfile.tools_allowed)) {
                      employeeTools = newEmployeeProfile.tools_allowed;
                      toolModules = pickTools(employeeTools);
                      console.log(`[Chat] Loaded ${employeeTools.length} tools for new employee ${finalEmployeeSlug}:`, employeeTools);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to reload employee tools after handoff:', error);
                  }
                }
              }
              
              // executeTool handles Result unwrapping and returns the validated output directly
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
              
              console.log(`[Chat] Tool ${toolName} executed successfully`);
            }
          } catch (error: any) {
            console.error(`[Chat] Tool execution error for ${toolName}:`, {
              error: error.message,
              stack: process.env.NETLIFY_DEV === 'true' ? error.stack : undefined,
              employee: finalEmployeeSlug,
            });
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                error: error.message || 'Tool execution failed',
                message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
              }),
            });
          }
        }

        // Second completion with tool results
        if (toolResults.length > 0) {
          try {
            messages.push(
              { role: 'assistant', content: assistantContent || null, tool_calls: toolCalls },
              ...toolResults
            );
            const txUpdateRefreshMessage = buildTxUpdateRefreshSystemMessage({
              didUpdate: didLastTxUpdateCategorySucceed(toolCalls, toolResults),
              importId: importIdContextForTurn,
            });
            if (txUpdateRefreshMessage) {
              messages.push({ role: 'system', content: txUpdateRefreshMessage });
            }
            const txComputedMetricsHint = buildTxDeterministicMetricsHint(masked, toolCalls, toolResults);
            if (txComputedMetricsHint) {
              messages.push({ role: 'system', content: txComputedMetricsHint });
            }
            const txVendorAmbiguityHint = buildVendorRuleAmbiguityHint(masked, toolCalls, toolResults);
            if (txVendorAmbiguityHint) {
              messages.push({ role: 'system', content: txVendorAmbiguityHint });
            }

            // If handoff occurred, reload tools for new employee
            let openaiToolsAfterHandoff: any = undefined;
            try {
              openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
            } catch (toolError: any) {
              console.warn('[Chat] Failed to convert tools after handoff (non-fatal):', toolError);
            }

            // Use model config for current employee (may have changed after handoff)
            let modelConfigAfterHandoff;
            try {
              modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);
            } catch (configError: any) {
              console.warn('[Chat] Failed to get model config after handoff (non-fatal, using defaults):', configError);
              modelConfigAfterHandoff = {
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 2000,
              };
            }
            modelConfigAfterHandoff = applyPrimeChatStyleModelConfig(modelConfigAfterHandoff, {
              employeeSlug: finalEmployeeSlug,
              qualityMode: shouldPreferPrimeQualityMode,
              preferLongForm: true,
            });

            const secondNonStreamAbortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
            completion = await withTimeout(
              openai.chat.completions.create({
                model: modelConfigAfterHandoff.model,
                messages,
                temperature: modelConfigAfterHandoff.temperature,
                max_tokens: modelConfigAfterHandoff.maxTokens,
                stream: false,
                tools: openaiToolsAfterHandoff,
              } as any),
              resolveOpenAiTimeoutMs(),
              'model_non_streaming_tool_followup',
              orchCtx,
              secondNonStreamAbortController
            );

            assistantContent = completion.choices[0]?.message?.content || assistantContent;
          } catch (secondCompletionError: any) {
            console.error('[Chat] Second completion call failed after tool execution:', secondCompletionError);
            // Use original assistant content or add error message
            assistantContent = assistantContent || "I had trouble processing the tool results, but I can still help you with your question.";
          }
        }
      }

      const shouldRewritePrimeGenericNonStream =
        isPrime &&
        finalEmployeeSlug === 'prime-boss' &&
        isPrimeDeepLane &&
        primeIntent.isBreakdownReport &&
        !primeIntent.isUploadHowTo &&
        isGenericUploadTemplateReply(assistantContent);
      if (shouldRewritePrimeGenericNonStream) {
        assistantContent = buildPrimeDeterministicRewrite({
          hasDocs: hasDocumentContext,
          hasSnapshot: hasPrimeSnapshotData,
        });
      }

      assistantContent = sanitizePrimeAssistantPresentation(assistantContent, finalEmployeeSlug);
      setStage('respond');
      assistantContent = ensureAssistantContent(assistantContent, orchestrationStage, orchCtx);
      if (assistantContent === buildSafeFallbackResponse(orchestrationStage)) {
        fallbackUsed = true;
      }

      // Calculate token usage (rough estimate)
      // Join all system message contents for token estimation
      const systemMessageContent = systemMessages.map((m: any) => m.content).join('\n\n') || '';
      const promptTokens = estimateTokens(systemMessageContent + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime ? firstTokenTime - requestStartTime : durationMs;

      // Save assistant message - non-blocking
      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
          thread_id: threadId, // CRITICAL: thread_id is always required
          metadata: request_id ? { request_id } : undefined,
        });
        console.log(`[Chat] Inserting assistant message (non-streaming) with thread_id: ${threadId}`);
        
        // DEV: Verify single persistence (prove no double write)
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Chat] ✅ Assistant Message Persisted (JSON):`, {
            requestId: threadId,
            contentLength: assistantContent.length,
            persisted: true,
          });
        }
      } catch (error: any) {
        console.warn('[Chat] Failed to save assistant message:', error);
        // Continue even if save fails
      }

      // Log usage metrics (non-blocking)
      try {
        const toolsUsed = toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null;
        await logUsageMetrics({
          sessionIdForLog: finalSessionId,
          employeeForLog: finalEmployeeSlug,
          promptTokens,
          completionTokens,
          totalTokens,
          model: modelConfig.model,
          latencyMs,
          durationMs,
          toolsUsed,
          success: true,
          orchestrationStage,
          fallbackUsed,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to log usage metrics:', error);
        // Continue even if logging fails
      }

      // Phase 2.3: Queue memory extraction for async processing (non-blocking)
      // Extraction happens in background worker, doesn't block chat response
      const normalizedSessionIdForExtraction2 = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForExtraction2) {
        queueMemoryExtraction({
          userId,
          sessionId: normalizedSessionIdForExtraction2,
          userMessage: masked,
          assistantResponse: assistantContent
        }).catch((error: any) => {
          // Log but don't fail - extraction failures shouldn't break chat
          console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
          // Worker will retry failed jobs automatically
        });
      }

      // Custodian: Update conversation summary (non-blocking)
      // Fetch all messages for this conversation and generate summary
      (async () => {
        try {
          // Get all messages for this conversation
          const { data: allMessages } = await sb
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('session_id', finalSessionId)
            .order('created_at', { ascending: true });

          if (!allMessages || allMessages.length === 0) {
            return;
          }

          // Get employees involved from session and handoffs
          const employeesInvolved = new Set<string>();
          employeesInvolved.add(finalEmployeeSlug);
          
          // Check for handoffs in this session
          try {
            const { data: handoffs } = await sb
              .from('handoffs')
              .select('from_employee, to_employee')
              .eq('session_id', finalSessionId);
            
            if (handoffs) {
              handoffs.forEach((h: any) => {
                if (h.from_employee) employeesInvolved.add(h.from_employee);
                if (h.to_employee) employeesInvolved.add(h.to_employee);
              });
            }
          } catch (e) {
            // Ignore handoff lookup errors
          }

          // Call summary update
          await updateConversationSummaryForCustodian(
            sb,
            userId,
            finalSessionId,
            allMessages.map(m => ({ role: m.role, content: m.content })),
            Array.from(employeesInvolved)
          );
        } catch (error: any) {
          console.warn('[Custodian] Failed to update conversation summary:', error);
        }
      })();

      // Build headers (may have been updated during handoff)
      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
        memoryHitTopScore: memoryHitScore,
        memoryHitCount: memoryFacts.length,
        employee: finalEmployeeSlug,
        routeConfidence: 0.8,
        sessionId: finalSessionId || undefined, // Include sessionId in headers for frontend
      });

      // Check if handoff occurred
      const handoffMeta = finalEmployeeSlug !== originalEmployeeSlug 
        ? { from: originalEmployeeSlug, to: finalEmployeeSlug }
        : undefined;

        // Include guardrails status in non-streaming response (using buildGuardrailsStatus)
        const guardrailsStatusNonStream = buildGuardrailsStatus('json');
        
        // Dev-only verification log
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Guardrails] enabled=${guardrailsStatusNonStream.enabled} pii_masking=${guardrailsStatusNonStream.pii_masking} moderation=${guardrailsStatusNonStream.moderation} version=${guardrailsStatusNonStream.policy_version}`);
        }
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ok: true,
            content: assistantContent,
            employee: finalEmployeeSlug,
            employeeSlug: finalEmployeeSlug,
            sessionId: finalSessionId,
            thread_id: threadId, // CRITICAL: Return thread_id for frontend to store
            guardrails: guardrailsStatusNonStream,
            ...(handoffMeta && { meta: { handoff: handoffMeta } }),
          }),
        };
      } catch (nonStreamingError: any) {
        console.error('[Chat] Non-streaming OpenAI call failed:', nonStreamingError);
        const isTimeout = isOpenAiTimeoutError(nonStreamingError);
        if (isTimeout) {
          orchCtx.openai_timeout = true;
          orchCtx.timeout_label = nonStreamingError.timeoutLabel || orchCtx.timeout_label;
          orchCtx.timeout_ms = Number(nonStreamingError.timeoutMs || orchCtx.timeout_ms || resolveOpenAiTimeoutMs());
        }
        setStage('respond');
        const fallbackContent = ensureAssistantContent(buildSafeFallbackResponse(orchestrationStage, orchCtx), orchestrationStage, orchCtx);
        fallbackUsed = true;
        // Return graceful error in JSON format
        const headers = buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: (guardrailResult?.signals?.piiTypes || []).length > 0,
          employee: finalEmployeeSlug || 'prime-boss',
        });
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ok: false,
            error: isTimeout ? 'OpenAI timeout' : 'OpenAI API error',
            content: fallbackContent,
            employee: finalEmployeeSlug || 'prime-boss',
            employeeSlug: finalEmployeeSlug || 'prime-boss',
            sessionId: finalSessionId,
            thread_id: threadId, // CRITICAL: Return thread_id even on error
            message: process.env.NETLIFY_DEV === 'true' ? nonStreamingError.message : undefined,
          }),
        };
      }
    }
  } catch (err: any) {
    console.error('[chat] FATAL', {
      requestId,
      employeeSlug: employeeSlugForLog,
      errName: err?.name,
      errMessage: err?.message,
      errStack: err?.stack,
      errCause: err?.cause,
    });
    orchCtx.requestId = requestId;
    orchCtx.employee = employeeSlugForLog || orchCtx.employee;
    orchCtx.failed_stage = orchCtx.stage || orchestrationStage;
    orchCtx.fallback_used = true;
    emitOrchSummary(false);

    if (streamStarted && streamController) {
      try {
        streamController.enqueue(streamEncoder.encode(`data: ${JSON.stringify({ type: 'error', requestId, message: 'internal_error' })}\n\n`));
        streamController.close();
      } catch {}
    }

    const safeFallback = buildSafeFallbackResponse(orchestrationStage || 'pipeline', orchCtx);

    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        status: 'degraded',
        errorId: requestId,
        requestId,
        error: 'internal_error',
        content: safeFallback,
        meta: {
          failed_stage: orchestrationStage || null,
          fallback_used: true,
        },
      }),
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize employee slug (handle aliases from UI)
 * Converts short names to canonical slugs, but preserves canonical slugs as-is
 * 
 * This is a lightweight normalization for UI aliases only.
 * The router's resolveSlug() handles full canonicalization including database lookups.
 */
function normalizeEmployeeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null; // Return null to let router auto-route
  
  const normalized = slug.toLowerCase().trim();
  
  // Only normalize known UI aliases
  switch (normalized) {
    case 'prime':
      return 'prime-boss';
    case 'byte':
      return 'byte-docs';
    case 'tag':
      return 'tag-ai';
    case 'crystal':
      return 'crystal-analytics';
    case 'finley':
      return 'finley-forecasts';
    case 'goalie':
      return 'goalie-goals';
    case 'blitz':
      return 'blitz-debt';
    case 'liberty':
      return 'liberty-freedom';
    case 'chime':
      return 'chime-reminders';
    case 'ledger':
      return 'ledger-tax';
    default:
      // Return as-is if already canonical (router will handle further normalization)
      // This preserves slugs like 'prime-boss', 'byte-docs', 'tag-ai', etc.
      return normalized;
  }
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildSafeFallbackResponse(stage: string, ctx?: OrchCtx): string {
  if (ctx) {
    ctx.failed_stage = (stage as OrchStage) || ctx.failed_stage;
    ctx.fallback_used = true;
  }
  return `I'm processing your data — one moment. I hit a delay in the ${stage} step, so please retry and I'll continue from there.\n\nThis is taking longer than normal. I can still help — tell me if you want a quick answer or a detailed one.`;
}

function ensureAssistantContent(content: string | null | undefined, stage: string, ctx?: OrchCtx): string {
  const normalized = typeof content === 'string' ? content.trim() : '';
  if (normalized.length > 0) return normalized;
  if (ctx) {
    ctx.fallback_used = true;
    if (!ctx.failed_stage) {
      ctx.failed_stage = stage as OrchStage;
    }
  }
  return buildSafeFallbackResponse(stage, ctx);
}

function sanitizePrimeAssistantPresentation(
  content: string | null | undefined,
  employeeSlug: string | null | undefined
): string {
  const text = String(content || '');
  const slug = String(employeeSlug || '').toLowerCase();
  const isPrime = slug === 'prime-boss' || slug === 'prime';
  if (!isPrime) return text;

  let sanitized = sanitizePrimeResponse(text);
  const mentionsUploads = /\b(upload|import|statement|statements)\b/i.test(sanitized);
  const isGreetingLikeReply = /\b(how can i assist you today|how can i help|how are you)\b/i.test(sanitized);
  const reassurance = "I'll guide you if anything doesn't import correctly.";
  if (mentionsUploads && !isGreetingLikeReply && !sanitized.includes(reassurance)) {
    sanitized = `${sanitized.trim()}\n\n${reassurance}`;
  }
  return sanitized;
}

async function logOrchestrationTelemetry(
  sb: SupabaseClient,
  basePayload: Record<string, any>,
  ctx: OrchCtx,
  metadata?: Record<string, any>
): Promise<void> {
  const orchestrationPayload = {
    ...basePayload,
    deterministic_path: ctx.deterministic_path,
    deterministic_intent: ctx.deterministic_intent,
    orchestration_stage: ctx.stage,
    failed_stage: ctx.failed_stage,
    fallback_used: ctx.fallback_used,
    payoff_engine_used: ctx.payoff_engine_used,
    loan_type: ctx.loan_type,
    help_fast_lane_used: ctx.help_fast_lane_used,
    help_fast_lane_intent: ctx.help_fast_lane_intent || null,
    ...(metadata ? { metadata } : {}),
  };

  try {
    await sb.from('chat_usage_log').insert(orchestrationPayload);
  } catch (orchestrationError: any) {
    if (process.env.NETLIFY_DEV === 'true') {
      console.warn('[Chat] Orchestration telemetry columns unavailable, retrying with base payload:', orchestrationError?.message || orchestrationError);
    }
    try {
      const withoutMetadata = {
        ...basePayload,
        deterministic_path: ctx.deterministic_path,
        deterministic_intent: ctx.deterministic_intent,
        orchestration_stage: ctx.stage,
        failed_stage: ctx.failed_stage,
        fallback_used: ctx.fallback_used,
        payoff_engine_used: ctx.payoff_engine_used,
        loan_type: ctx.loan_type,
        help_fast_lane_used: ctx.help_fast_lane_used,
        help_fast_lane_intent: ctx.help_fast_lane_intent || null,
      };
      await sb.from('chat_usage_log').insert(withoutMetadata);
    } catch {
      try {
        await sb.from('chat_usage_log').insert(basePayload);
      } catch (baseError: any) {
        console.warn('[Chat] Failed to log usage metrics:', baseError);
      }
    }
  }
}

