/**
 * FINANCIAL QUERY CLASSIFIER
 *
 * Deterministic classifier that identifies factual queries about the user's
 * actual financial data — as opposed to general education / advice questions.
 *
 * Used by the server-enforced grounding system (Phase 1B.2) to decide
 * when authoritative financial evidence is REQUIRED before Prime can answer.
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import { resolveCategory } from './financial-taxonomy';
import { analyzeQueryScope, type UserQueryScope } from './tool-gate';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FinancialQueryType =
  | 'aggregate'    // "how much did I spend on fuel in 2025?" → use tax_summary
  | 'detail'       // "show me my fuel transactions in March" → use tx_search
  | 'merchant'     // "how much at Costco?" → use tx_search with q
  | 'none';        // general education, not about user's data

export interface FinancialQueryClassification {
  /** Is this a factual query about the user's actual financial data? */
  requiresGrounding: boolean;
  /** Which tool path should be preferred? */
  queryType: FinancialQueryType;
  /** Resolved category scope (if a category term was found) */
  resolvedCategory?: { category: string; subcategory?: string; section?: string };
  /** Merchant hint extracted from message */
  merchantHint?: string;
  /** Years mentioned */
  years: number[];
  /** The analyzed scope from tool-gate */
  scope: UserQueryScope;
  /** Exact dollar amount mentioned (e.g., "$76.72" → 76.72) */
  exactAmount?: number;
  /** Exact calendar date mentioned (YYYY-MM-DD) */
  exactDate?: string;
  /** Explicit result count requested by user (e.g., "last 3" → 3). Capped at 25. */
  requestedCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns that indicate a query about the USER's actual financial data. */
const USER_DATA_PATTERNS = /\b(how much did i|what did i spend|my .*(expenses?|spending|transactions?|income|charges?|payments?|purchases?)|did i (spend|pay|buy|purchase)|tell me about my .*(expenses?|spending|fuel|gas|grocery|food|rent|insurance|income)|i (spent|paid|bought)|show me my|what were my|what was my|what are my|my .*(total|balance|budget)|compare my|my .*(this month|this year|last month|last year|in \d{4}))\b/i;

/** Patterns that indicate aggregate questions (full-period totals). */
const AGGREGATE_PATTERNS = /\b(how much|total|altogether|in total|sum|all of|overall|full year|year to date|ytd|all .*(in|for|during) \d{4}|spend(ing)? on|expense[ds]? (on|for|in)|what .* my .* expense)\b/i;

/** Patterns that indicate detail / transaction-list questions. */
const DETAIL_PATTERNS = /\b(show me|list|which|when did|last time|transaction(s)? (on|from|in|at)|breakdown|detail|itemize|each|every|individual|specific|particular|march|april|january|february|may|june|july|august|september|october|november|december|last month|this month)\b/i;

/** Patterns that are definitely NOT about user data — general education. */
const EDUCATION_PATTERNS = /^(what is a?n?|what does|what are|explain|define|tell me about|how (should|do|does|would|could) (i|you|one|someone)|what'?s the (difference|meaning|definition)|is it (better|good|bad|wise))/i;

/** Category/financial terms that signal a data question when combined with
 *  possessive or first-person patterns. */
const FINANCIAL_CATEGORY_TERMS = /\b(fuel|gas|groceries|grocery|restaurant|restaurants|dining|food|rent|mortgage|insurance|parking|coffee|gym|pharmacy|medical|entertainment|golf|shopping|subscriptions|income|salary|pay|utilities|internet|phone|car payment|car loan|vehicle|transportation|healthcare|bank fees|transfers|investments|business expense|advertising|travel|streaming|software)\b/i;

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

/** Known category terms that should NOT be treated as merchant names. */
const CATEGORY_NOT_MERCHANT = new Set([
  'restaurants', 'restaurant', 'groceries', 'grocery', 'fuel', 'gas',
  'entertainment', 'shopping', 'dining', 'food', 'travel', 'parking',
  'coffee', 'gym', 'pharmacy', 'medical', 'dental', 'insurance',
  'streaming', 'software', 'subscriptions', 'healthcare', 'utilities',
  'transportation', 'housing', 'rent', 'mortgage', 'investments',
  'transfers', 'income', 'vehicle',
]);

/** Month name → number mapping for date extraction. */
const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH_NAMES = new Set(Object.keys(MONTH_MAP));
const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYear(y: number): boolean { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

/**
 * Extract a merchant name from a user message.
 * Looks for patterns like "at Costco", "from Amazon", "spent at Walmart",
 * and secondary patterns like "Costco transaction", "Petro-Canada charge".
 * Excludes month names in date phrases and known category terms.
 *
 * This is the SINGLE authoritative merchant extraction for the entire app.
 * Do not duplicate this logic — import and call this function instead.
 */
export function extractMerchantHint(msg: string): string | undefined {
  // Primary: preposition + word (e.g., "from Costco", "at Walmart")
  // NOTE: Bare "to" is excluded — it causes false positives on conversational
  // phrases like "talk to if", "go to for". Compound forms (paid to, sent to)
  // are retained because they strongly signal a merchant/payee context.
  const match = msg.match(/\b(?:at|from|paid to|sent to|spent at|bought at|purchased at|charges? from)\s+([A-Z][a-zA-Z0-9'&-]{1,30})\b/i);
  if (match?.[1]) {
    const candidate = match[1].trim();
    // Reject month names — they are part of date phrases ("from August 21")
    if (!MONTH_NAMES.has(candidate.toLowerCase())) {
      const cleaned = candidate.replace(/\s+(in|for|on|during|from|to|this|last)\s.*$/i, '').trim();
      if (cleaned && !CATEGORY_NOT_MERCHANT.has(cleaned.toLowerCase())) {
        return cleaned;
      }
    }
  }

  // Secondary: <Merchant> transaction/charge/purchase/payment
  // Catches "Costco transaction", "Petro-Canada charge" where no preposition is used
  const secondary = msg.match(/\b([A-Z][a-zA-Z0-9'&-]{1,30})\s+(?:transactions?|charges?|purchases?|payments?)\b/i);
  if (secondary?.[1]) {
    const candidate = secondary[1].trim();
    const lower = candidate.toLowerCase();
    const NON_MERCHANT_WORDS = new Set([
      'my', 'the', 'a', 'an', 'this', 'that', 'each', 'every', 'any',
      'no', 'your', 'his', 'her', 'our', 'their', 'some', 'one',
      'recent', 'last', 'first', 'next', 'new', 'old', 'all',
      'find', 'show', 'get', 'see', 'check', 'make', 'handles',
      'what', 'which', 'where', 'when', 'how', 'who',
      'did', 'does', 'do', 'is', 'was', 'were',
    ]);
    if (!CATEGORY_NOT_MERCHANT.has(lower) && !MONTH_NAMES.has(lower) && !NON_MERCHANT_WORDS.has(lower)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Extract financial category terms from a message for resolver lookup.
 */
function extractCategoryTerm(msg: string): string | undefined {
  const lower = msg.toLowerCase();
  // Try multi-word patterns first
  const multiWord = lower.match(/\b(gas & fuel|gas and fuel|gas \/ fuel|food & dining|food and dining|vehicle expenses|car loan|car payment|car payments|vehicle maintenance|car insurance|vehicle insurance|bank fees|credit card payment|debt payments|personal care|business expense|business income|home insurance|online shopping)\b/);
  if (multiWord?.[1]) return multiWord[1];

  // Then single-word category terms
  const single = lower.match(/\b(fuel|gas|gasoline|petrol|groceries|grocery|restaurants?|dining|food|meals|rent|mortgage|insurance|parking|coffee|gym|pharmacy|medical|dental|entertainment|golf|shopping|subscriptions|income|salary|utilities|internet|phone|vehicle|transportation|healthcare|transfers?|investments?|travel|streaming|software|advertising|chiropractic|vision|supplements)\b/);
  return single?.[1];
}

/**
 * Extract an exact calendar date from a message.
 * Recognizes: "August 21, 2025", "Aug 21 2025", "January 23rd, 2025".
 * Rejects impossible dates (e.g., February 30).
 */
function extractExactDate(msg: string): string | undefined {
  const match = msg.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})\b/i
  );
  if (!match) return undefined;
  const month = MONTH_MAP[match[1].toLowerCase()];
  if (!month) return undefined;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (year < 2020 || year > 2030) return undefined;
  let maxDays = DAYS_IN_MONTH[month];
  if (month === 2 && !isLeapYear(year)) maxDays = 28;
  if (day < 1 || day > maxDays) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extract an exact dollar amount from a message.
 * Recognizes "$76.72", "$60", "$50.00".
 * Does NOT interpret years as amounts (requires $ prefix).
 */
function extractExactAmount(msg: string): number | undefined {
  const match = msg.match(/\$(\d{1,7}(?:\.\d{1,2})?)\b/);
  if (!match) return undefined;
  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) return undefined;
  return amount;
}

/**
 * Extract an explicit result count from the user message.
 * Requires a keyword prefix (last/show/top/first/recent/latest/newest/oldest)
 * followed by a 1-2 digit number. Rejects dollar amounts, dates, and years.
 */
function extractRequestedCount(msg: string): number | undefined {
  const match = msg.match(
    /\b(?:last|show(?:\s+me)?|top|first|recent|latest|newest|oldest)\s+(\d{1,2})\b/i
  );
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  if (n < 1 || n > 25) return undefined;
  // Reject if the digit is actually part of a dollar amount or date
  // e.g. "show me $3 transactions" or "show me June 3 transactions"
  const fullMatch = match[0];
  const idx = msg.indexOf(fullMatch);
  if (idx >= 0) {
    const before = msg.slice(Math.max(0, idx - 1), idx);
    if (before === '$') return undefined;
  }
  return n;
}

/**
 * Classify a user message to determine if it's a factual query about
 * the user's actual financial data.
 *
 * This is deterministic — no LLM, no network calls.
 */
export function classifyFinancialQuery(message: string): FinancialQueryClassification {
  const msg = message.trim();
  const lower = msg.toLowerCase();
  const scope = analyzeQueryScope(msg);

  // ── Education check (early exit) ──
  // If the message is clearly general education and doesn't reference the user's data
  if (EDUCATION_PATTERNS.test(lower) && !USER_DATA_PATTERNS.test(lower)) {
    // But check: "what is a tax deduction" = education
    //            "what is my fuel expense" = user data (has "my")
    const hasMyData = /\bmy\b/i.test(lower);
    if (!hasMyData) {
      return {
        requiresGrounding: false,
        queryType: 'none',
        years: scope.mentionedYears,
        scope,
        requestedCount,
      };
    }
  }

  // ── Resolve category term ──
  const categoryTerm = extractCategoryTerm(lower);
  const resolved = categoryTerm ? resolveCategory(categoryTerm) ?? undefined : undefined;

  // ── Merchant extraction ──
  const merchantHint = extractMerchantHint(msg);

  // ── Exact identifiers ──
  const exactDate = extractExactDate(msg);
  const exactAmount = extractExactAmount(msg);
  const requestedCount = extractRequestedCount(msg);

  // ── Determine if this is about user data ──
  // Financial terms + possessive/first-person → user data
  // Financial terms + spending verbs (even without "my") → user data
  // Resolved category + year mention → user data (e.g., "how much fuel in 2024")
  // Transaction lookup verb + financial noun + strong identifier → user data
  const hasFinancialNoun = /\b(transactions?|charges?|purchases?|payments?|expenses?)\b/i.test(lower);
  const hasTransactionLookup = /\b(find|search|look|locate|show|get)\b/i.test(lower) && hasFinancialNoun;
  const hasStrongIdentifier = exactAmount !== undefined || exactDate !== undefined;
  // Financial noun + BOTH exact date and exact amount → clearly a specific transaction query
  const hasExactTransactionRef = hasFinancialNoun && exactAmount !== undefined && exactDate !== undefined;
  const isUserDataQuery =
    USER_DATA_PATTERNS.test(lower) ||
    (FINANCIAL_CATEGORY_TERMS.test(lower) && /\b(my|i|me|mine)\b/i.test(lower)) ||
    (FINANCIAL_CATEGORY_TERMS.test(lower) && /\b(how much|total|spent|spend|spending|expense|expenses|paid)\b/i.test(lower)) ||
    (resolved && scope.mentionedYears.length > 0) ||
    scope.isMutation ||
    (merchantHint && /\b(how much|spend|spent|charge|total)\b/i.test(lower)) ||
    (hasTransactionLookup && hasStrongIdentifier) ||
    (merchantHint && hasStrongIdentifier) ||
    hasExactTransactionRef ||
    (merchantHint && hasFinancialNoun);

  if (!isUserDataQuery) {
    return {
      requiresGrounding: false,
      queryType: 'none',
      resolvedCategory: resolved,
      merchantHint,
      years: scope.mentionedYears,
      scope,
      exactAmount,
      exactDate,
      requestedCount,
    };
  }

  // ── Determine query type ──
  // Strong explicit identifiers (exact date/amount) favor detail lookup,
  // but a real merchant hint still gets merchant queryType.
  let queryType: FinancialQueryType;

  if (merchantHint) {
    queryType = 'merchant';
  } else if (hasStrongIdentifier || scope.needsDetail || DETAIL_PATTERNS.test(lower)) {
    queryType = 'detail';
  } else if (AGGREGATE_PATTERNS.test(lower) || resolved) {
    queryType = 'aggregate';
  } else {
    queryType = 'aggregate';
  }

  return {
    requiresGrounding: true,
    queryType,
    resolvedCategory: resolved,
    merchantHint,
    years: scope.mentionedYears,
    scope,
    exactAmount,
    exactDate,
    requestedCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORAL INTENT CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export type TemporalIntent = 'future_spending' | 'withdrawal_capacity' | null;

/** Future spending patterns — questions about what the user WILL spend. */
const FUTURE_SPENDING_RE = /\b(how much will .*(spend|cost|need|expenses?)|what will .*(spend|expenses?|cost|budget)|retirement (spending|expenses?|budget|cost)|spend .*(in|during|after) retirement|expenses? .*(in|during|after) retirement|need .*(each|per|every) (month|year) .*(after|in|during) retirement|how much .* need .*(retire|after .* stop working)|budget .*(for|in|during) retirement)\b/i;

/** Withdrawal capacity patterns — questions about what savings can support. */
const WITHDRAWAL_CAPACITY_RE = /\b(how much can .* withdraw|sustainable withdrawal|withdrawal rate|how long will .*(savings?|investments?|portfolio|money|\$[\d,]+) (last|sustain)|portfolio .*(pay|support|generate)|safe .* withdraw|draw ?down rate|how much .*(savings?|investments?|portfolio) .*(pay|support|give|provide)|what can .*(savings?|portfolio|investments?) .*(support|pay|generate))\b/i;

/** Historical spending patterns — should NOT match future_spending. */
const HISTORICAL_SPENDING_RE = /\b(how much did|what did .* spend|what have .* spent|how much .* spent|spending (last|this) (month|year|week)|spent (on|at|in|for|last|this))\b/i;

/**
 * Classify whether a user message is asking about future spending need
 * vs portfolio withdrawal capacity.
 *
 * Returns null for historical questions, general education, or anything
 * that doesn't clearly match either future pattern.
 */
export function classifyTemporalIntent(message: string): TemporalIntent {
  const lower = message.toLowerCase().trim();

  // Historical questions are never future_spending
  if (HISTORICAL_SPENDING_RE.test(lower)) return null;

  if (FUTURE_SPENDING_RE.test(lower)) return 'future_spending';
  if (WITHDRAWAL_CAPACITY_RE.test(lower)) return 'withdrawal_capacity';

  return null;
}
