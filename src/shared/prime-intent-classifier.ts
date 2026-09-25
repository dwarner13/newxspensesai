/**
 * PRIME INTENT CLASSIFIER (P3.0A — Shadow Mode)
 *
 * Deterministic intent classification for Prime messages.
 * Assigns one of 12 semantic lanes plus a confidence level.
 *
 * SHADOW MODE: This classifier is observational only. It logs what it
 * WOULD do but does NOT change any runtime behavior — no tool gating,
 * no evidence enforcement, no grounding changes.
 *
 * Design principles:
 * - Deterministic gates for high-confidence signals only
 * - Ambiguous messages → GENERAL / low confidence (no forced guessing)
 * - P1 (candidate follow-up) and P2.3 (historical reference) are
 *   supplied externally — this module does NOT duplicate their detection
 * - Existing classifiers are called, not replaced
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import { classifyFinancialQuery, type FinancialQueryClassification } from './financial-query-classifier';

// ─────────────────────────────────────────────────────────────────────────────
// INTENT ENUM
// ─────────────────────────────────────────────────────────────────────────────

export enum PrimeIntent {
  FINANCIAL_DATA_LOOKUP = 'financial_data_lookup',
  FINANCIAL_CALCULATION = 'financial_calculation',
  FINANCIAL_ANALYSIS    = 'financial_analysis',
  FINANCIAL_EDUCATION   = 'financial_education',
  PRODUCT_HELP          = 'product_help',
  DOCUMENT_QUERY        = 'document_query',
  GOAL_PLANNING         = 'goal_planning',
  SPECIALIST_ACTION     = 'specialist_action',
  CANDIDATE_FOLLOW_UP   = 'candidate_follow_up',
  HISTORICAL_REFERENCE  = 'historical_reference',
  CONVERSATION          = 'conversation',
  GENERAL               = 'general',
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type IntentConfidence = 'deterministic' | 'high' | 'medium' | 'low';
export type IntentSource = 'p1' | 'p2.3' | 'rule' | 'financial_classifier' | 'fallback';

export interface EvidenceContract {
  required: string[];
  allowed: string[];
  forbidden: string[];
}

export interface PrimeIntentClassification {
  intent: PrimeIntent;
  confidence: IntentConfidence;
  source: IntentSource;
  reason: string;
  proposedEvidence: EvidenceContract;
  financialClassification?: FinancialQueryClassification;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE CONTRACTS (observational only — not enforced)
// ─────────────────────────────────────────────────────────────────────────────

const EVIDENCE_CONTRACTS: Record<PrimeIntent, EvidenceContract> = {
  [PrimeIntent.FINANCIAL_DATA_LOOKUP]: {
    required: ['authoritative_financial_data'],
    allowed: ['user_memory_facts', 'candidate_frame'],
    forbidden: ['hallucinated_numbers'],
  },
  [PrimeIntent.FINANCIAL_CALCULATION]: {
    required: ['verified_calculation_inputs', 'deterministic_calculator'],
    allowed: ['user_memory_facts', 'loan_snapshots'],
    forbidden: ['unverified_numeric_projections'],
  },
  [PrimeIntent.FINANCIAL_ANALYSIS]: {
    required: ['authoritative_financial_data'],
    allowed: ['user_memory_facts', 'analytics_tools'],
    forbidden: ['unsourced_trend_claims'],
  },
  [PrimeIntent.FINANCIAL_EDUCATION]: {
    required: [],
    allowed: ['general_knowledge'],
    forbidden: ['user_financial_data'],
  },
  [PrimeIntent.PRODUCT_HELP]: {
    required: ['product_knowledge'],
    allowed: [],
    forbidden: ['user_financial_data', 'tool_calls'],
  },
  [PrimeIntent.DOCUMENT_QUERY]: {
    required: ['document_import_evidence'],
    allowed: ['conversation_history'],
    forbidden: ['tx_search_preexec'],
  },
  [PrimeIntent.GOAL_PLANNING]: {
    required: ['goal_data'],
    allowed: ['user_memory_facts', 'deterministic_calculator'],
    forbidden: ['invented_goal_progress'],
  },
  [PrimeIntent.SPECIALIST_ACTION]: {
    required: ['authoritative_target', 'confirmation_architecture'],
    allowed: ['select_transaction', 'request_employee_handoff'],
    forbidden: ['auto_execute_mutation'],
  },
  [PrimeIntent.CANDIDATE_FOLLOW_UP]: {
    required: ['current_candidate_state'],
    allowed: ['select_transaction'],
    forbidden: ['new_tx_search'],
  },
  [PrimeIntent.HISTORICAL_REFERENCE]: {
    required: ['conversation_history'],
    allowed: ['candidate_frame'],
    forbidden: ['new_tx_search'],
  },
  [PrimeIntent.CONVERSATION]: {
    required: [],
    allowed: [],
    forbidden: ['tool_calls', 'financial_data'],
  },
  [PrimeIntent.GENERAL]: {
    required: [],
    allowed: [],
    forbidden: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GATE PATTERNS — kept intentionally narrow
// ─────────────────────────────────────────────────────────────────────────────

// Gate 1: PRODUCT_HELP — "how do I use the app?"
const PRODUCT_HELP_RE = /\b(?:how (?:do|can|would) (?:i|we|you) (?:upload|import|add|connect|set up|configure|use|navigate)|(?:can i|where (?:do i|can i|the hell do i)) (?:upload|import|put|add|find|see|access|navigate)|what (?:can (?:you|the app|xspensesai|prime|this) do|(?:kind of |types? of )?files?(?: types?| formats?)? (?:do you|can i|are|support))|where (?:do i find|is the|can i (?:see|find|access)) (?:settings?|dashboard|reports?|transactions?|budget))\b/i;
const PRODUCT_HELP_BLOCK_RE = /\$\d|(?:my|your) (?:spending|transactions?|expenses?|charges?|balance)/i;

// Gate 2: FINANCIAL_EDUCATION — "what is compound interest?"
// Requires a definitional opener AND must not reference user's own data.
// "Tell me about this" is blocked because "this" is a demonstrative, not a concept.
const EDUCATION_RE = /^(?:what (?:is|are|does) (?:a |an |the )?(?!my |our |this[. !?]|that[. !?]|this$|that$))|^(?:explain (?!my ))|^(?:define )|^(?:tell me about (?!my |this|that|the )(?:a |an )?[a-z])|^(?:what'?s the (?:difference|meaning|definition))|^(?:how does (?!my )(?:compound interest|amortization|depreciation|inflation|interest|apr|tfsa|rrsp|fhsa|resp|cpp|oas|ei|gic|etf|reit|rrif))/i;
const EDUCATION_BLOCK_RE = /\b(?:my|i|me|mine)\b.*\b(?:spending|expenses?|transactions?|balance|charges?|payments?|purchases?)\b/i;

// Gate 3: DOCUMENT_QUERY — "did my statement process?"
const DOCUMENT_QUERY_RE = /\b(?:(?:my|the|that) (?:statement|receipt|document|pdf|upload|import|file|bank statement) (?:finish|complete|process|fail|succeed|ready|status|progress|done|missing|upload|work)|(?:did|has|is|was) (?:byte|(?:my|the|that) (?:upload|import|statement|bank statement|pdf|receipt|document)) (?:finish|read|process|extract|parse|complete|fail|work|upload)|(?:status|progress) of (?:my|the|that) (?:import|upload|document|statement)|what (?:happened|went wrong) with (?:my|the|that) (?:import|upload|statement|pdf)|why did (?:my|the|that) (?:statement|bank statement|import|upload|pdf) (?:fail|only (?:bring|import|get|show))|(?:anything|something) missing from (?:my|the|that) (?:upload|import|statement)|(?:my|the|that) (?:statement|bank statement) (?:import|upload) (?:only|just|merely))\b/i;

// Gate 4: SPECIALIST_ACTION — "change that to groceries"
// Allow optional words between mutation verb and target (e.g., "move the third one to")
const SPECIALIST_ACTION_RE = /\b(?:(?:change|update|set|move|switch|fix|rename) (?:that|this|the|it|them|those)(?: \w+)* (?:to|as|into)|(?:recategorize|re-categorize|categorize) (?:that|this|the|it|them|those)|(?:have|ask|tell|get) (?:tag|byte) (?:to )?(?:fix|change|recategorize|re-categorize|categorize|re-process|reprocess)|(?:delete|remove) (?:that|this|the) (?:goal|transaction|entry))\b/i;

// Gate 5: FINANCIAL_CALCULATION — requires calc verb + financial parameter
const CALCULATION_RE = /\b(?:(?:what (?:if|happens|would happen) (?:if )?i (?:pay|contribute|save|invest|put|throw|bump|increase|decrease|add|drop))|(?:how (?:long|much (?:interest|faster|sooner|money|time)|many (?:months|years)|soon|quickly) (?:(?:would i|will i|do i|to|until|before|till|would it take to|if i) )?(?:pay off|payoff|save|reach|hit|clear|eliminate|be (?:debt[- ]free|paid off)))|(?:how (?:long|much (?:sooner|faster)) (?:until|before|till|is) (?:it|this|that|this thing|that thing|my \w+) (?:is )?(?:paid off|gone|done|cleared|eliminated|free))|(?:calculate|project|forecast|estimate) (?:my )?(?:payoff|pay-off|debt|savings|interest|mortgage|loan|balance|payment)|(?:if i (?:increase|decrease|change|bump|raise|lower|double) (?:my )?(?:payment|contribution|deposit)))\b/i;
// Block: bare "what if" without financial context, or education about loans
const CALCULATION_BLOCK_RE = /^(?:what is|what are|what does|explain|define|tell me about)/i;

// Gate 6: CONVERSATION — greetings, thanks, identity
const CONVERSATION_RE = /^(?:hi|hello|hey|good (?:morning|afternoon|evening)|thanks?(?:\s+(?:you|so much|a lot))?|thx|ty|bye|goodbye|see you|later|ok(?:ay)?|got it|makes sense|understood|cool|nice|great|perfect|awesome|lol|haha|that'?s (?:perfect|great|good|helpful|awesome)|who are you\??|what'?s your name\??)\.?!?\s*$/i;

// GOAL_PLANNING signals
const GOAL_RE = /\b(?:(?:my|the|a) (?:savings?|emergency|retirement|debt|financial) (?:goal|target|plan)|(?:am i|how (?:am i|close am i)) (?:on track|doing|tracking)|(?:set|create|add|start|make) (?:a |my )?(?:savings?|emergency|retirement|financial) (?:goal|target)|(?:i want to save|save) \$[\d,.]+\s+(?:by|before|in|within|over|for)|(?:how long|when will i) (?:until|before|till) (?:i )?(?:hit|reach|meet) (?:my )?goal)\b/i;

// FINANCIAL_ANALYSIS markers (used after financial classifier confirms grounding)
const ANALYSIS_MARKERS_RE = /\b(?:compare|vs\.?|versus|compared to|trend|trending|over time|month (?:over|to) month|mom|yoy|year (?:over|to) year|increas(?:ing|ed)|decreas(?:ing|ed)|growing|shrinking|worse|better|spike|anomal|unusual|pattern|breakdown|distribution)\b/i;

// FINANCIAL_ANALYSIS standalone patterns — colloquial analysis queries that may
// not trigger the financial grounding classifier but are clearly about spending analysis
const ANALYSIS_STANDALONE_RE = /\b(?:where (?:is|am i|the (?:hell )?(?:is|am i)) .*(?:money|spending|cash) (?:going|disappearing|bleeding)|(?:where|what) (?:is|am i) .*(?:wasting|losing|bleeding)|what'?s (?:killing|eating|costing) (?:me|my)|why (?:were|are|was|is) my (?:expenses?|spending|charges?|bills?) (?:so )?(?:high|expensive|much|more)|did (?:my )?(?:eating out|dining|groceries?|gas|fuel|spending) (?:get|go|become|increase) (?:worse|up|higher))\b/i;

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifierContext {
  /** P1 result: was a candidate follow-up detected? */
  candidateFollowUpDetected: boolean;
  /** P2.3 result: was a historical reference detected? */
  historicalReferenceDetected: boolean;
}

/**
 * Classify a Prime message into one of 12 semantic lanes.
 *
 * P1 and P2.3 results are supplied externally — this function does NOT
 * run those detectors. It only maps their results into the intent enum.
 *
 * @param message - The user's message (PII-masked)
 * @param ctx     - External detection results from frozen P1/P2.3
 * @returns Classification with intent, confidence, source, and proposed evidence
 */
export function classifyPrimeIntent(
  message: string,
  ctx: ClassifierContext,
): PrimeIntentClassification {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  // ── Frozen P1: Candidate Follow-Up (pre-empts everything) ──
  if (ctx.candidateFollowUpDetected) {
    return build(PrimeIntent.CANDIDATE_FOLLOW_UP, 'deterministic', 'p1', 'P1 candidate follow-up detected');
  }

  // ── Frozen P2.3: Historical Reference (pre-empts everything) ──
  if (ctx.historicalReferenceDetected) {
    return build(PrimeIntent.HISTORICAL_REFERENCE, 'deterministic', 'p2.3', 'P2.3 historical reference detected');
  }

  // ── Gate 6: CONVERSATION (checked early — short messages) ──
  if (CONVERSATION_RE.test(msg)) {
    return build(PrimeIntent.CONVERSATION, 'deterministic', 'rule', 'conversation pattern matched');
  }

  // ── Gate 1: PRODUCT_HELP ──
  if (PRODUCT_HELP_RE.test(lower) && !PRODUCT_HELP_BLOCK_RE.test(lower)) {
    return build(PrimeIntent.PRODUCT_HELP, 'high', 'rule', 'product help pattern matched');
  }

  // ── Gate 2: FINANCIAL_EDUCATION ──
  if (EDUCATION_RE.test(lower) && !EDUCATION_BLOCK_RE.test(lower)) {
    return build(PrimeIntent.FINANCIAL_EDUCATION, 'high', 'rule', 'education pattern matched');
  }

  // ── Gate 3: DOCUMENT_QUERY (before financial classifier — prevents "$42" grounding) ──
  if (DOCUMENT_QUERY_RE.test(lower)) {
    return build(PrimeIntent.DOCUMENT_QUERY, 'high', 'rule', 'document query pattern matched');
  }

  // ── Gate 4: SPECIALIST_ACTION ──
  if (SPECIALIST_ACTION_RE.test(lower)) {
    return build(PrimeIntent.SPECIALIST_ACTION, 'high', 'rule', 'specialist action pattern matched');
  }

  // ── Gate 5: FINANCIAL_CALCULATION (before financial classifier — prevents "$200" grounding) ──
  if (CALCULATION_RE.test(lower) && !CALCULATION_BLOCK_RE.test(lower)) {
    return build(PrimeIntent.FINANCIAL_CALCULATION, 'high', 'rule', 'calculation pattern matched');
  }

  // ── GOAL_PLANNING ──
  if (GOAL_RE.test(lower)) {
    return build(PrimeIntent.GOAL_PLANNING, 'high', 'rule', 'goal planning pattern matched');
  }

  // ── Standalone ANALYSIS (colloquial patterns that may not trigger financial grounding) ──
  if (ANALYSIS_STANDALONE_RE.test(lower)) {
    return build(PrimeIntent.FINANCIAL_ANALYSIS, 'high', 'rule', 'standalone analysis pattern matched');
  }

  // ── Financial classifier (existing, retained) ──
  const fc = classifyFinancialQuery(msg);
  if (fc.requiresGrounding) {
    // Distinguish DATA_LOOKUP vs ANALYSIS
    if (ANALYSIS_MARKERS_RE.test(lower)) {
      return buildWithFC(PrimeIntent.FINANCIAL_ANALYSIS, 'high', 'financial_classifier',
        `financial grounding required + analysis markers`, fc);
    }
    return buildWithFC(PrimeIntent.FINANCIAL_DATA_LOOKUP, 'high', 'financial_classifier',
      `financial grounding required (queryType=${fc.queryType})`, fc);
  }

  // ── Education fallback: financial classifier said no grounding + taxonomy ──
  if (/\b(?:what (?:category|section|type)|which (?:category|section))\b/i.test(lower)) {
    return build(PrimeIntent.FINANCIAL_EDUCATION, 'medium', 'rule', 'category taxonomy question');
  }

  // ── Fallback: GENERAL with low confidence ──
  return build(PrimeIntent.GENERAL, 'low', 'fallback', 'no gate matched');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function build(
  intent: PrimeIntent,
  confidence: IntentConfidence,
  source: IntentSource,
  reason: string,
): PrimeIntentClassification {
  return {
    intent,
    confidence,
    source,
    reason,
    proposedEvidence: EVIDENCE_CONTRACTS[intent],
  };
}

function buildWithFC(
  intent: PrimeIntent,
  confidence: IntentConfidence,
  source: IntentSource,
  reason: string,
  fc: FinancialQueryClassification,
): PrimeIntentClassification {
  return {
    intent,
    confidence,
    source,
    reason,
    proposedEvidence: EVIDENCE_CONTRACTS[intent],
    financialClassification: fc,
  };
}
