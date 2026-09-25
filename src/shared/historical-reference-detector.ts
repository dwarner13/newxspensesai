/**
 * HISTORICAL CONVERSATION REFERENCE DETECTOR (P2.3)
 *
 * Deterministic detector for conversational back-references — questions
 * about what was previously discussed, attempted, or agreed upon.
 *
 * Runs AFTER the P1 candidate follow-up detector and BEFORE the financial
 * query classifier in the Phase1D decision path. When a historical
 * reference is detected, the system:
 *   - keeps isNewGroundedSearch = false
 *   - preserves the current candidate frame
 *   - suppresses generic tx_search
 *   - injects a historical-evidence directive
 *
 * This detector does NOT:
 * - Parse which specific transaction was discussed
 * - Authorize mutations
 * - Replace the candidate follow-up detector (P1)
 * - Handle new financial data queries
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface HistoricalReference {
  /** Is this message a reference to prior conversation? */
  isHistorical: boolean;
  /** Does the user want to resume/continue a prior action (vs just asking about it)? */
  continuationIntent: boolean;
}

// ---------------------------------------------------------------------------
// PATTERNS
// ---------------------------------------------------------------------------

/**
 * Past-tense collaborative back-reference: the user refers to something
 * "we/I/you" were doing, discussing, or trying earlier.
 *
 * Structural signature:
 *   interrogative/verb + past-tense collaborative pronoun + conversational verb
 *
 * Examples:
 *   "Which transaction were we trying to change earlier?"
 *   "What did I ask you to recategorize?"
 *   "What was I trying to do before?"
 */
const PAST_COLLAB_RE = /\b(?:what|which|where)\s+(?:transaction|one|change|thing)?\s*(?:were|was|did)\s+(?:we|i|you)\s+(?:trying|doing|discussing|talking|working|changing|asking|looking|saying)/i;

/**
 * Direct past-action inquiry: asks about a prior action without a leading
 * interrogative pronoun.
 *
 * Examples:
 *   "What happened with that change?"
 *   "What happened earlier?"
 *   "What failed last time?"
 */
const PAST_ACTION_RE = /\b(?:what|how)\s+(?:happened|failed|changed|went wrong)\s+(?:with|to|earlier|before|last time|just now)/i;

/**
 * Prior-discussion reference: directly asks about what was said/discussed.
 *
 * Examples:
 *   "What were we talking about?"
 *   "What were we doing before?"
 *   "Which one were we discussing?"
 */
const PRIOR_DISCUSSION_RE = /\b(?:what|which)\s+(?:were|was)\s+(?:we|i|you)\s+(?:talking|discussing|doing|working|looking)\s+(?:about|on|at|before|earlier)/i;

/**
 * Delegated-action inquiry: asks about what a specific employee did.
 *
 * Examples:
 *   "What did I ask Tag to do?"
 *   "What did you just tell me?"
 *   "What did Tag change?"
 */
const DELEGATED_ACTION_RE = /\b(?:what|which)\s+did\s+(?:i|we|you|tag|byte|prime|crystal|finley)\s+(?:\w+\s+)?(?:ask|tell|say|try|change|do|discuss|suggest|recommend)\b/i;

/**
 * Resumption / go-back reference: the user wants to return to a prior state.
 *
 * Examples:
 *   "Go back to what we were discussing."
 *   "Can we continue where we left off?"
 *   "Continue what we were doing."
 */
const RESUMPTION_RE = /\b(?:go\s+back\s+to\s+(?:what|that|the)|continue\s+(?:what|where)\s+(?:we|i)\s+(?:were|left)|pick\s+up\s+where\s+(?:we|i)\s+(?:left|stopped))\b/i;

/**
 * Temporal-only back-reference with a conversational verb.
 *
 * Examples:
 *   "What change failed earlier?"
 *   "Which one did we change before?"
 */
const TEMPORAL_BACKREF_RE = /\b(?:what|which|the)\s+(?:transaction|one|change|thing|categoriz\w*|recategoriz\w*)\s+.*?\b(?:earlier|before|previously|last time|just now|a moment ago|ago)\b/i;

/**
 * New-search override: if the message contains a clear new-search intent,
 * it is NOT a historical reference even if it superficially matches.
 *
 * Examples that should NOT be historical:
 *   "Which of my transactions is the biggest?"
 *   "Which grocery transaction cost the most?"
 *   "Show me which transactions were at Costco."
 */
const NEW_SEARCH_OVERRIDE_RE = /\b(?:show\s+me|find|search|look\s+up|list|display)\s+(?:my\s+)?(?:last|recent|latest|first|oldest|newest|\d+)\b/i;

/**
 * Possessive data inquiry: "which of MY transactions" is asking about
 * financial data, not conversation history.
 */
const POSSESSIVE_DATA_RE = /\bwhich\s+(?:of\s+)?my\s+(?:transactions?|charges?|purchases?|payments?|expenses?)\b/i;

/**
 * Superlative data inquiry: "which transaction cost the most" is a
 * financial data query.
 */
const SUPERLATIVE_DATA_RE = /\bwhich\s+(?:\w+\s+)?(?:transaction|charge|purchase|payment|expense)\s+(?:cost|was|is|had)\s+(?:the\s+)?(?:most|biggest|largest|smallest|highest|lowest)\b/i;

// ---------------------------------------------------------------------------
// CONTINUATION PATTERNS
// ---------------------------------------------------------------------------

/**
 * Explicit continuation: the user wants to resume a prior action, not just
 * ask about it.
 */
const CONTINUATION_RE = /\b(?:try\s+(?:that|it)\s+again|go\s+ahead\s+with\s+(?:that|the)\s+change|continue\s+(?:with\s+)?(?:that|the|where)|resume\s+(?:that|the)|pick\s+(?:that|it|up\s+where)\s+(?:back\s+up|we|i)|let'?s?\s+(?:do|finish|continue)\s+(?:that|it))\b/i;

// ---------------------------------------------------------------------------
// DETECTOR
// ---------------------------------------------------------------------------

/**
 * Detect whether a user message is a historical conversational reference.
 *
 * @param message - The user's message (raw or masked)
 * @returns Detection result
 */
export function detectHistoricalReference(message: string): HistoricalReference {
  const NO_MATCH: HistoricalReference = { isHistorical: false, continuationIntent: false };

  const msg = message.trim();
  if (!msg) return NO_MATCH;
  const lower = msg.toLowerCase();

  // ── Override: clear new-search or possessive/superlative data query ──
  if (NEW_SEARCH_OVERRIDE_RE.test(lower)) return NO_MATCH;
  if (POSSESSIVE_DATA_RE.test(lower)) return NO_MATCH;
  if (SUPERLATIVE_DATA_RE.test(lower)) return NO_MATCH;

  // ── Check each historical pattern ──
  const isHistorical =
    PAST_COLLAB_RE.test(lower) ||
    PAST_ACTION_RE.test(lower) ||
    PRIOR_DISCUSSION_RE.test(lower) ||
    DELEGATED_ACTION_RE.test(lower) ||
    RESUMPTION_RE.test(lower) ||
    TEMPORAL_BACKREF_RE.test(lower);

  if (!isHistorical) return NO_MATCH;

  // ── Check continuation intent ──
  const continuationIntent = CONTINUATION_RE.test(lower);

  return { isHistorical: true, continuationIntent };
}
