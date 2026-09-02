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
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns that indicate a query about the USER's actual financial data. */
const USER_DATA_PATTERNS = /\b(how much did i|what did i spend|my .*(expense|spending|transaction|income|charge|payment|purchase)|did i (spend|pay|buy|purchase)|tell me about my .*(expense|spending|fuel|gas|grocery|food|rent|insurance|income)|i (spent|paid|bought)|show me my|what were my|what was my|what are my|my .*(total|balance|budget)|compare my|my .*(this month|this year|last month|last year|in \d{4}))\b/i;

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

/**
 * Extract a merchant name from a user message.
 * Looks for patterns like "at Costco", "from Amazon", "spent at Walmart".
 * Excludes known financial category terms (e.g., "at restaurants" is not a merchant query).
 */
function extractMerchantHint(msg: string): string | undefined {
  const match = msg.match(/\b(?:at|from|to|paid to|spent at|bought at|purchased at|charges? from)\s+([A-Z][a-zA-Z0-9'&-]{1,30})\b/i);
  if (!match?.[1]) return undefined;
  const candidate = match[1].trim();
  // Strip trailing prepositions/time words that got captured
  const cleaned = candidate.replace(/\s+(in|for|on|during|from|to|this|last)\s.*$/i, '').trim();
  if (!cleaned) return undefined;
  // Don't treat known categories as merchants
  if (CATEGORY_NOT_MERCHANT.has(cleaned.toLowerCase())) return undefined;
  return cleaned;
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
      };
    }
  }

  // ── Resolve category term ──
  const categoryTerm = extractCategoryTerm(lower);
  const resolved = categoryTerm ? resolveCategory(categoryTerm) ?? undefined : undefined;

  // ── Merchant extraction ──
  const merchantHint = extractMerchantHint(msg);

  // ── Determine if this is about user data ──
  // Financial terms + possessive/first-person → user data
  // Financial terms + spending verbs (even without "my") → user data
  // Resolved category + year mention → user data (e.g., "how much fuel in 2024")
  const isUserDataQuery =
    USER_DATA_PATTERNS.test(lower) ||
    (FINANCIAL_CATEGORY_TERMS.test(lower) && /\b(my|i|me|mine)\b/i.test(lower)) ||
    (FINANCIAL_CATEGORY_TERMS.test(lower) && /\b(how much|total|spent|spend|spending|expense|expenses|paid)\b/i.test(lower)) ||
    (resolved && scope.mentionedYears.length > 0) ||
    scope.isMutation ||
    (merchantHint && /\b(how much|spend|spent|charge|total)\b/i.test(lower));

  if (!isUserDataQuery) {
    return {
      requiresGrounding: false,
      queryType: 'none',
      resolvedCategory: resolved,
      merchantHint,
      years: scope.mentionedYears,
      scope,
    };
  }

  // ── Determine query type ──
  let queryType: FinancialQueryType;

  if (merchantHint) {
    // Only treat as merchant query if we extracted an actual merchant name
    // (excludes known category terms like "restaurants")
    queryType = 'merchant';
  } else if (scope.needsDetail || DETAIL_PATTERNS.test(lower)) {
    queryType = 'detail';
  } else if (AGGREGATE_PATTERNS.test(lower) || resolved) {
    queryType = 'aggregate';
  } else {
    // Default: if about user data but unclear, treat as aggregate
    queryType = 'aggregate';
  }

  return {
    requiresGrounding: true,
    queryType,
    resolvedCategory: resolved,
    merchantHint,
    years: scope.mentionedYears,
    scope,
  };
}
