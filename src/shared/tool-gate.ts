/**
 * TOOL-GATE: Exact-scope sufficiency check for Prime financial tool stripping.
 *
 * Determines whether authoritative context (Tax Summary) contains the EXACT
 * answer the user is asking about, or whether Prime needs financial read tools
 * (tx_search, tax_summary) to investigate.
 *
 * RULE: A broader scope NEVER satisfies a narrower one.
 *   - Vehicle section total ≠ Gas & Fuel subcategory total
 *   - Food & Dining total ≠ Restaurants total
 *   - Shopping total ≠ Costco merchant total
 *   - 2025 data ≠ 2024 question
 *   - Single year ≠ year-over-year comparison
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of a Tax Summary section as received by the chat backend. */
export interface TaxSummaryContext {
  section: string;       // e.g., "Vehicle Expenses", "Meals & Entertainment"
  total: number;
  count: number;
  topSubcategories?: Array<{
    name: string;        // e.g., "Gas / Fuel", "Car Payments"
    amount: number;
    count?: number;
  }>;
}

/** What the user is asking about — extracted from their message. */
export interface UserQueryScope {
  /** The raw user message (lowercased) */
  message: string;
  /** Does the message mention a specific merchant? */
  hasMerchantQuery: boolean;
  /** Does the message request a year-over-year comparison? */
  isComparison: boolean;
  /** Years explicitly mentioned in the message (e.g., [2024], [2024, 2025]) */
  mentionedYears: number[];
  /** Does the message ask for detail (list, show, breakdown, which)? */
  needsDetail: boolean;
  /** Is the message a mutation intent? */
  isMutation: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** Detail-seeking patterns that always require tools. */
const NEEDS_DETAIL_RE = /\b(which|vendor|merchant|where did|most (common|frequent|used)|top \w+|biggest (transaction|purchase)|list (my|the)|show me (my|the) (transactions|purchases|charges)|breakdown by (merchant|vendor|store)|when did|last time|transaction on|\bon [a-z]+ \d+)\b/i;

/** Mutation patterns that always require tools (handoff, category change). */
const MUTATION_RE = /\b(change|update|set|recategorize|re-categorize|categorize as|move|switch|make it|mark as|mark this|fix|rename|create rule|remember this|delete|remove)\b/i;

/** Merchant-specific query patterns. */
const MERCHANT_RE = /\b(at |from |to |paid |spent at |bought at |purchased at |charges? from )\b/i;

/** Comparison patterns. */
const COMPARISON_RE = /\b(compare|comparing|comparison|compared to|vs\.?\b|versus|difference between|change from|year over year|month over month|more than last|less than last)\b/i;

/** Extract 4-digit years from a message. */
function extractYears(msg: string): number[] {
  const matches = msg.match(/\b(20[2-3]\d)\b/g);
  if (!matches) return [];
  return [...new Set(matches.map(Number))];
}

/**
 * Analyze a user message to determine what scope they're asking about.
 */
export function analyzeQueryScope(message: string): UserQueryScope {
  const msg = message.toLowerCase();
  return {
    message: msg,
    hasMerchantQuery: MERCHANT_RE.test(msg),
    isComparison: COMPARISON_RE.test(msg),
    mentionedYears: extractYears(msg),
    needsDetail: NEEDS_DETAIL_RE.test(msg),
    isMutation: MUTATION_RE.test(msg),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXACT-SCOPE SUFFICIENCY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether authoritative Tax Summary context contains the EXACT
 * answer the user is asking about.
 *
 * Returns true ONLY if tools can safely be stripped (context is sufficient).
 * Returns false if Prime needs tools to investigate.
 *
 * @param taxSummary - The Tax Summary sections from authoritative context
 * @param scope - The analyzed user query scope
 * @param contextYear - The year the Tax Summary covers (typically current year)
 */
export function isContextSufficient(
  taxSummary: TaxSummaryContext[],
  scope: UserQueryScope,
  contextYear: number,
): boolean {
  // 1. Always need tools for detail/mutation/merchant queries
  if (scope.needsDetail || scope.isMutation || scope.hasMerchantQuery) {
    return false;
  }

  // 2. Always need tools for comparisons
  if (scope.isComparison) {
    return false;
  }

  // 3. Always need tools if user asks about a year NOT in context
  if (scope.mentionedYears.length > 0) {
    const allYearsMatch = scope.mentionedYears.every(y => y === contextYear);
    if (!allYearsMatch) return false;
  }

  // 4. No Tax Summary data → can't answer from context
  if (!taxSummary || taxSummary.length === 0) {
    return false;
  }

  // 5. Check if the user's question matches an EXACT value in context.
  //    Build a set of all terms that have exact values in context.
  const exactTerms = new Set<string>();

  for (const section of taxSummary) {
    if (!section?.section) continue;
    // Section title is an exact term (e.g., "Vehicle Expenses" → user asks "vehicle expenses")
    exactTerms.add(section.section.toLowerCase());

    // Each subcategory with a value is an exact term
    if (Array.isArray(section.topSubcategories)) {
      for (const sub of section.topSubcategories) {
        if (sub?.name) {
          exactTerms.add(sub.name.toLowerCase());
        }
      }
    }
  }

  // 6. Check if user message contains a term that EXACTLY matches context.
  //    The match must be the FULL label, not a first-word prefix.
  const msg = scope.message;

  // Find which exact term matches
  let matched = false;
  for (const term of exactTerms) {
    if (msg.includes(term)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    // No exact match → need tools. This is the key fix:
    // A section title like "vehicle expenses" should NOT match a query about "fuel".
    // Only exact subcategory matches like "gas / fuel" or "gas & fuel" should match.
    return false;
  }

  return true;
}

/**
 * Convenience: should Prime's financial read tools be stripped?
 *
 * Returns true if tools should be KEPT (user needs investigation).
 * Returns false if tools can be stripped (context is sufficient).
 *
 * This is the inverse of isContextSufficient for clarity at call site.
 */
export function shouldRetainTools(
  taxSummary: TaxSummaryContext[],
  userMessage: string,
  contextYear: number,
): boolean {
  const scope = analyzeQueryScope(userMessage);
  return !isContextSufficient(taxSummary, scope, contextYear);
}
