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

/** Which extraction pattern produced a merchant hint. */
export type MerchantHintSource = 'preposition' | 'noun_suffix';

/**
 * V1-A CP4 — WHAT the financial question is about (bounded vocabulary; see
 * SUBJECT grammar below). Absent when no high-confidence subject is present.
 */
export type FinancialSubject =
  | 'spending'
  | 'income'
  | 'inflow'
  | 'outflow'
  | 'cash_flow'
  | 'transfer'
  | 'debt'
  | 'savings'
  | 'refund';

/**
 * V1-A CP4 — request shape. A period answers WHEN, never LIST vs AGGREGATE.
 *   list      — the user asks for actual transactions / items
 *   aggregate — the user asks for a financial quantity or summary
 *   unknown   — no confident structural signal (no pre-run plan is fabricated)
 */
export type FinancialRequestShape = 'aggregate' | 'list' | 'unknown';

export interface FinancialQueryClassification {
  /** Is this a factual query about the user's actual financial data? */
  requiresGrounding: boolean;
  /** Which tool path should be preferred? */
  queryType: FinancialQueryType;
  /** Resolved category scope (if a category term was found) */
  resolvedCategory?: { category: string; subcategory?: string; section?: string };
  /** Merchant hint extracted from message (lexical — see merchantHintSource) */
  merchantHint?: string;
  /**
   * Where the merchant hint came from. 'preposition' ("at Costco") is trusted
   * as today; 'noun_suffix' ("Costco transactions") is only a lexical candidate
   * and must be grounded against real merchant data before it is trusted.
   */
  merchantHintSource?: MerchantHintSource;
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
  /** V1-A CP4: financial subject (bounded grammar), when confidently present. */
  subject?: FinancialSubject;
  /** V1-A CP4: aggregate vs list (period words never decide this). */
  requestShape?: FinancialRequestShape;
  /** V1-A CP4: the user asked for a category breakdown / per-category summary. */
  wantsBreakdown?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns that indicate a query about the USER's actual financial data. */
const USER_DATA_PATTERNS = /\b(how much did i|what did i spend|my .*(expenses?|spending|transactions?|income|charges?|payments?|purchases?)|did i (spend|pay|buy|purchase)|tell me about my .*(expenses?|spending|fuel|gas|grocery|food|rent|insurance|income)|i (spent|paid|bought)|show me my|what were my|what was my|what are my|my .*(total|balance|budget)|compare my|my .*(this month|this year|last month|last year|in \d{4}))\b/i;

/** Patterns that indicate aggregate questions (full-period totals). */
const AGGREGATE_PATTERNS = /\b(how much|total|altogether|in total|sum|all of|overall|full year|year to date|ytd|all .*(in|for|during) \d{4}|spend(ing)? on|expense[ds]? (on|for|in)|what .* my .* expense)\b/i;

/** Patterns that indicate detail / transaction-list questions. */
// V1-A CP4: period words (month names, "this/last month") and "breakdown" were
// removed — a period answers WHEN, not LIST vs AGGREGATE; a breakdown is an
// aggregate. Remaining terms are genuine detail/list signals.
const DETAIL_PATTERNS = /\b(show me|list|which|when did|last time|transaction(s)? (on|from|in|at)|detail|itemize|each|every|individual|specific|particular)\b/i;

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

/** Month name → 1-indexed number mapping for date extraction.
 *  Canonical source — imported by prime-temporal-scope.ts. */
// ─────────────────────────────────────────────────────────────────────────────
// V1-A CP4 — SUBJECT / REQUEST-SHAPE GRAMMAR (bounded; no sentence patterns)
// ─────────────────────────────────────────────────────────────────────────────
// Canonical subject categories: these financial categories describe WHAT the
// money is (income, transfers, debt, savings), not an ordinary spend filter.
const SUBJECT_CATEGORY: Readonly<Record<string, FinancialSubject>> = {
  'income': 'income',
  'business income': 'income',
  'employment income': 'income',
  'transfers': 'transfer',
  'debt payments': 'debt',
  'savings': 'savings',
  'investments': 'savings',
};

/** Canonical category that is a financial SUBJECT rather than a spend filter. */
export function subjectForCategory(category: string | null | undefined): FinancialSubject | undefined {
  return category ? SUBJECT_CATEGORY[category.trim().toLowerCase()] : undefined;
}

// Bounded subject vocabulary (high-confidence structural terms only). Anything
// outside it is left to Prime's own interpretation and tool choice.
const SUBJECT_TERMS: ReadonlyArray<[FinancialSubject, RegExp]> = [
  ['refund', /\b(refunds?|refunded|reimburse(?:d|ment|ments)?)\b/],
  ['cash_flow', /\b(cash ?flows?|net (?:movement|cash(?: movement)?|flow))\b/],
  ['inflow', /\b((?:came|come|coming|comes) in(?:to)?|money in(?:to)?|inflows?)\b/],
  ['outflow', /\b((?:went|go|going|goes) out|money out|outflows?)\b/],
  ['income', /\b(income|earn|earned|earnings|(?:did|do) i (?:make|earn))\b/],
  ['debt', /\b(debts?)\b/],
  ['transfer', /\b(transfer(?:s|red|ring)?)\b/],
  ['savings', /\b(savings|invest(?:ed|ing|ment|ments)?)\b/],
  ['spending', /\b(spend|spent|spending|expenses?|expenditures?)\b/],
];

/** Subject: refund/cash-flow terms, then in+out together, then canonical category, then terms. */
export function extractFinancialSubject(lower: string, resolvedCategory?: string): FinancialSubject | undefined {
  const hits = new Set(SUBJECT_TERMS.filter(([, re]) => re.test(lower)).map(([subj]) => subj));
  if (hits.has('refund')) return 'refund';
  if (hits.has('cash_flow') || (hits.has('inflow') && hits.has('outflow'))) return 'cash_flow';
  if (hits.has('inflow')) return 'inflow';
  if (hits.has('outflow')) return 'outflow';
  const fromCategory = subjectForCategory(resolvedCategory);
  if (fromCategory) return fromCategory;
  for (const subj of ['income', 'debt', 'transfer', 'savings', 'spending'] as const) {
    if (hits.has(subj)) return subj;
  }
  return undefined;
}

// Subjects with no authoritative evidence yet (refund/reversal semantics are not modelled).
const UNSUPPORTED_SUBJECTS: ReadonlySet<FinancialSubject> = new Set<FinancialSubject>(['refund']);

/**
 * V1-A CP4: the question's subject has no authoritative evidence — no CP4 plan and
 * no legacy FinancialGrounding evidence may stand in for it (Prime discloses the limit).
 */
export function isUnsupportedFinancialSubject(fc: { subject?: FinancialSubject } | null | undefined): boolean {
  return !!fc?.subject && UNSUPPORTED_SUBJECTS.has(fc.subject);
}

/** Quantity / summary signals (aggregate shape). */
const AGGREGATE_SIGNAL_RE = /\b(how much|total|totals|totaled|sum|altogether|overall|average|avg|net|ytd|year to date|so far|breakdown|categor(?:y|ies))\b|\bbreak\w*\s+(?:\w+\s+){0,3}down\b/;
/** Breakdown signal (per-category summary). */
const BREAKDOWN_RE = /\b(breakdown|by categor(?:y|ies)|categories)\b|\bbreak\w*\s+(?:\w+\s+){0,3}down\b/;
/** Transaction nouns that can be the OBJECT of a list request. */
const LIST_NOUN_RE = /\b(transactions?|charges?|purchases?|payments?)\b/;
/** Listing verbs (only a list request when a transaction noun is present). */
const LIST_VERB_RE = /\b(show|list|itemi[sz]e|display|view|see|pull up|find|search|look up)\b/;
/** Other structural list signals. */
const LIST_OTHER_RE = /\b(which|what) (?:\w+ )?(transactions?|charges?|purchases?|payments?)\b|\b(each|every|individual|itemi[sz]ed)\b|\bwhen did\b|\blast time\b/;
/** Period expression present (WHEN only; never decides list vs aggregate). */
const PERIOD_HINT_RE = /\b(today|yesterday|(?:this|last|past|previous|prior|current)\s+(?:week|month|quarter|year|\d{1,3}\s+(?:days?|weeks?|months?))|ytd|year to date|so far|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|\d{4}-\d{2}-\d{2})\b/;
/** First-person / possessive reference to the user's own data. */
const PERSONAL_REF_RE = /\b(my|i|me|mine|we|our|us)\b/;
/** Range separator right after an exact date ("Sep 1, 2026 to …") — part of a range, not an identifier. */
const RANGE_CONTINUATION_RE = /^\s*(to|through|thru|until|till|and|-|–|—)\s/;

export const MONTH_MAP: Record<string, number> = {
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
  return extractMerchantHintWithSource(msg)?.hint;
}

/**
 * Same extraction as extractMerchantHint, plus which pattern produced the hint.
 * Extraction is NOT trust: noun-suffix hints are lexical candidates only.
 */
export function extractMerchantHintWithSource(msg: string): { hint: string; source: MerchantHintSource } | undefined {
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
        return { hint: cleaned, source: 'preposition' };
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
      return { hint: candidate, source: 'noun_suffix' };
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
  if (year < 2020 || year > 2039) return undefined;
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
        requestedCount: extractRequestedCount(msg),
      };
    }
  }

  // ── Resolve category term ──
  const categoryTerm = extractCategoryTerm(lower);
  const resolved = categoryTerm ? resolveCategory(categoryTerm) ?? undefined : undefined;

  // ── Merchant extraction (lexical; trust is decided downstream) ──
  const merchantExtraction = extractMerchantHintWithSource(msg);
  const merchantHint = merchantExtraction?.hint;
  const merchantHintSource = merchantExtraction?.source;

  // ── Exact identifiers ──
  const rawExactDate = extractExactDate(msg);
  // V1-A CP4: a date that starts a range ("Sep 1, 2026 to Sep 15") is a period, not an identifier.
  const exactDate = rawExactDate && !startsDateRange(msg) ? rawExactDate : undefined;
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

  // ── V1-A CP4: subject × request shape (bounded grammar) ──
  const subject = extractFinancialSubject(lower, resolved?.category);
  const wantsBreakdown = BREAKDOWN_RE.test(lower);
  const hasPersonalRef = PERSONAL_REF_RE.test(lower);
  const hasPeriod = PERIOD_HINT_RE.test(lower) || scope.mentionedYears.length > 0;
  const isListRequest =
    hasStrongIdentifier ||
    requestedCount !== undefined ||
    (LIST_VERB_RE.test(lower) && LIST_NOUN_RE.test(lower)) ||
    LIST_OTHER_RE.test(lower);
  const requestShape: FinancialRequestShape = isListRequest
    ? 'list'
    : (AGGREGATE_SIGNAL_RE.test(lower) || AGGREGATE_PATTERNS.test(lower) || subject !== undefined || wantsBreakdown)
      ? 'aggregate'
      : 'unknown';
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
    (merchantHint && hasFinancialNoun) ||
    // V1-A CP4 composition: a financial subject, breakdown or category scoped by
    // the user's own data or a period — never an aggregate-looking word alone.
    // A category names goods/services (it also has a general-world reading), so
    // category + period needs a financial request shape too ("Grocery prices in
    // September" has none and stays with Prime's own interpretation).
    (subject !== undefined && (hasPersonalRef || hasPeriod)) ||
    (wantsBreakdown && (hasPersonalRef || hasPeriod)) ||
    (resolved !== undefined && hasPeriod && requestShape !== 'unknown');

  if (!isUserDataQuery) {
    return {
      requiresGrounding: false,
      queryType: 'none',
      resolvedCategory: resolved,
      merchantHint,
      merchantHintSource,
      years: scope.mentionedYears,
      scope,
      exactAmount,
      exactDate,
      requestedCount,
      subject,
      requestShape,
      wantsBreakdown,
    };
  }

  // ── Determine query type ──
  // V1-A CP4: request shape decides list vs aggregate; period words never do.
  // A real merchant hint still gets merchant queryType (merchant architecture owns it).
  let queryType: FinancialQueryType;
  if (merchantHint) {
    // Merchant architecture owns merchant questions (Stage 1 trust applies downstream).
    queryType = 'merchant';
  } else if (requestShape === 'list') {
    queryType = 'detail';
  } else if (requestShape === 'aggregate') {
    queryType = 'aggregate';
  } else if (hasStrongIdentifier || scope.needsDetail || DETAIL_PATTERNS.test(lower)) {
    queryType = 'detail';
  } else {
    queryType = 'aggregate';
  }

  return {
    requiresGrounding: true,
    queryType,
    resolvedCategory: resolved,
    merchantHint,
    merchantHintSource,
    years: scope.mentionedYears,
    scope,
    exactAmount,
    exactDate,
    requestedCount,
    subject,
    requestShape,
    wantsBreakdown,
  };
}

/** V1-A CP4: does the first exact calendar date in the message start a date range? */
function startsDateRange(msg: string): boolean {
  const m = msg.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b/i,
  );
  if (!m || m.index === undefined) return false;
  return RANGE_CONTINUATION_RE.test(msg.slice(m.index + m[0].length).toLowerCase());
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
