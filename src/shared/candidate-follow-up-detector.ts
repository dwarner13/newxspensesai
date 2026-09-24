/**
 * CANDIDATE FOLLOW-UP DETECTOR (P1)
 *
 * Narrow deterministic detector for identity-sensitive references to an
 * existing authoritative candidate frame.
 *
 * Runs BEFORE the financial grounding classifier in the Phase1D decision
 * path. When a follow-up reference is detected and candidates exist,
 * the grounding system preserves the existing candidate frame instead of
 * treating the message as a new search.
 *
 * This detector does NOT:
 * - Call select_transaction (the model does that)
 * - Authorize mutations
 * - Bypass the Mutation Identity Gate
 * - Handle complex NLP references ("the Costco one", "the biggest one")
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateFollowUp {
  /** Is this message a follow-up reference to existing candidates? */
  isFollowUp: boolean;
  /** What kind of reference was detected? */
  referenceType: 'ordinal' | 'demonstrative' | null;
  /** If ordinal, the 1-based number referenced (e.g., "third" → 3) */
  ordinalNumber?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDINAL WORD MAP
// ─────────────────────────────────────────────────────────────────────────────

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
  sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
  '6th': 6, '7th': 7, '8th': 8, '9th': 9, '10th': 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/** Transaction-like nouns that confirm the reference is about a candidate. */
const TX_NOUN = /(?:one|transaction|charge|purchase|payment|entry)/i;

/**
 * Ordinal word reference: "the third one", "the third transaction", "third one"
 * Also catches mutation+ordinal: "change the third one", "update the second transaction"
 */
const ORDINAL_WORD_RE = /\b(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i;

/**
 * Numeric ordinal reference: "#3", "number 3", "transaction 3", "number3"
 */
const NUMERIC_REF_RE = /(?:#(\d{1,2})\b|\bnumber\s*(\d{1,2})\b|\btransaction\s+(\d{1,2})\b)/i;

/**
 * Demonstrative reference: "that transaction", "this one", "that one", "this transaction"
 */
const DEMONSTRATIVE_RE = /\b(?:that|this)\s+(?:one|transaction|charge|purchase|payment|entry)\b/i;

/**
 * New-search indicators that override follow-up detection.
 * "Show me my last 3 ..." is clearly a new search, not a follow-up.
 */
const NEW_SEARCH_RE = /\b(?:show\s+me|find|search|look\s+up|list|display)\s+(?:my\s+)?(?:last|recent|latest|first|oldest|newest|\d+)\b/i;

// ─────────────────────────────────────────────────────────────────────────────
// DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect whether a user message is a follow-up reference to an existing
 * authoritative candidate frame.
 *
 * @param message - The user's message (raw or masked)
 * @param hasExistingCandidates - Whether a valid candidate frame exists
 * @returns Detection result with reference type and optional ordinal
 */
export function detectCandidateFollowUp(
  message: string,
  hasExistingCandidates: boolean,
): CandidateFollowUp {
  const NO_MATCH: CandidateFollowUp = { isFollowUp: false, referenceType: null };

  // No candidates → nothing to follow up on
  if (!hasExistingCandidates) return NO_MATCH;

  const msg = message.trim();
  if (!msg) return NO_MATCH;
  const lower = msg.toLowerCase();

  // If the message is clearly a new search request, it's not a follow-up
  if (NEW_SEARCH_RE.test(lower)) return NO_MATCH;

  // ── Check ordinal word references ──
  const ordinalWordMatch = lower.match(ORDINAL_WORD_RE);
  if (ordinalWordMatch) {
    const word = ordinalWordMatch[1].toLowerCase();
    const num = ORDINAL_WORDS[word];
    if (num !== undefined) {
      // Verify context: the ordinal should appear near a transaction noun
      // or in a mutation context, not in an unrelated phrase
      const afterOrdinal = lower.slice(lower.indexOf(ordinalWordMatch[0]) + ordinalWordMatch[0].length);
      const beforeOrdinal = lower.slice(0, lower.indexOf(ordinalWordMatch[0]));
      const hasTxNoun = TX_NOUN.test(afterOrdinal.slice(0, 20));
      const hasMutationVerb = /\b(?:change|update|set|recategorize|re-categorize|categorize|move|switch|fix|rename|delete|remove)\b/i.test(beforeOrdinal);
      const hasInfoVerb = /\b(?:tell|about|describe|explain|detail|what|more)\b/i.test(lower);

      if (hasTxNoun || hasMutationVerb || hasInfoVerb) {
        return { isFollowUp: true, referenceType: 'ordinal', ordinalNumber: num };
      }
    }
  }

  // ── Check numeric references ──
  const numericMatch = lower.match(NUMERIC_REF_RE);
  if (numericMatch) {
    const numStr = numericMatch[1] || numericMatch[2] || numericMatch[3];
    const num = parseInt(numStr, 10);
    if (num >= 1 && num <= 25) {
      return { isFollowUp: true, referenceType: 'ordinal', ordinalNumber: num };
    }
  }

  // ── Check demonstrative references ──
  if (DEMONSTRATIVE_RE.test(lower)) {
    return { isFollowUp: true, referenceType: 'demonstrative' };
  }

  return NO_MATCH;
}
