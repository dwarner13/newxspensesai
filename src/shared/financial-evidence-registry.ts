/**
 * Financial evidence registry (owner GO 2026-11-27 "FINANCIAL EVIDENCE TRUST APPROVAL"; scope-aware
 * rules approved in "EMPLOYEE TOOL MATRIX DIRECTION" / "RELEASE READINESS DECISIONS").
 * Tool authorization does NOT establish financial accuracy. A figure counts as evidence for a claim
 * about the customer's actual finances only when it comes from an approved evidence class, the read
 * was COMPLETE and (for totals) the scope matches. Meaning is checked by the C-1 verifier.
 *
 * The owner's seven distinctions:
 *  1. Verified engine totals       → class `engine` (may support named totals of the same meaning/scope)
 *  2. Statement evidence           → class `statement_records` (one imported transaction, quoted singly)
 *  3. Individual stored values     → class `stored_values` (one account balance etc., quoted singly)
 *  4. Review counts and amounts    → class `review` (counts are not money; review AMOUNTS are served
 *                                    by the engine — buildNeedsReview — never by a count tool)
 *  5. Forecasts and assumptions    → class `forecast` (never evidence of actual money; projections are
 *                                    labelled as estimates by the verifier's hypothetical rule)
 *  6. Customer-provided figures    → not a tool: the verifier's `customer` category (current message)
 *  7. Unverified historical AI statements → never evidence: the ledger is built only from THIS turn's
 *                                    tool results and the customer's current message — no prior
 *                                    assistant reply, summary or memory feeds it.
 * Plus `non_financial` (no money figures) and `ineligible` (anything else). Unknown tools fail closed.
 * Single values (2, 3) are never a named total and are never summed into one.
 */

export type EvidenceClass =
  | 'engine' | 'statement_records' | 'stored_values' | 'review' | 'forecast' | 'non_financial' | 'ineligible';

export const FINANCIAL_EVIDENCE_REGISTRY: Readonly<Record<string, EvidenceClass>> = Object.freeze({
  // 1. verified engine totals
  cash_flow_summary: 'engine',
  transaction_category_totals: 'engine',
  merchant_totals: 'engine',
  tax_summary: 'engine',
  crystal_summarize_income: 'engine',
  crystal_summarize_expenses: 'engine',
  transactions_query: 'engine',          // totals only (complete + unfiltered scope); rows are display
  // 2. statement evidence (single imported transactions)
  tx_search: 'statement_records',        // row amounts; its own totals are NOT evidence (FR-022)
  tx_get: 'statement_records',
  select_transaction: 'statement_records',
  // 3. individual stored values
  account_balances_query: 'stored_values', // each account's stored balance singly (PB-04 note); never totalBalance
  goals_query: 'stored_values',          // admitted once a verified per-goal extractor exists
  goalie_list_goals: 'stored_values',
  goalie_summarize_goals: 'stored_values',
  chime_list_obligations: 'stored_values',
  chime_list_upcoming_notifications: 'stored_values',
  chime_summarize_upcoming_obligations: 'stored_values',
  // 4. review counts
  tag_status: 'review',                  // counts only (no amounts served)
  // 5. forecasts and assumptions
  analytics_forecast: 'forecast',
  finley_debt_payoff_forecast: 'forecast',
  finley_savings_forecast: 'forecast',
  finley_loan_forecast: 'forecast',
  goalie_suggest_actions: 'forecast',    // suggestions/estimates (its spending figure is engine-backed prose)
  // non-financial
  statement_coverage: 'non_financial',
  tag_category_brain: 'non_financial',
  tag_explain_category: 'non_financial',
  request_employee_handoff: 'non_financial',
  merchant_analysis_refine: 'non_financial',
  chime_draft_notification_copy: 'non_financial',
  chime_generate_notification: 'non_financial',
  // not eligible as financial evidence
  tag_merchant_insights: 'ineligible',   // until reviewed against the engine
  tag_document_findings: 'ineligible',
  get_document_by_id: 'ineligible',
  get_recent_documents: 'ineligible',
  vision_ocr_light: 'ineligible',
});

export function evidenceClassFor(tool: string | null | undefined): EvidenceClass {
  return (tool && FINANCIAL_EVIDENCE_REGISTRY[tool]) || 'ineligible';
}

export interface EvidenceAdmission {
  /** 'engine' figures may support named totals; 'single_value' only figures quoted as themselves; null = none. */
  admit: 'engine' | 'single_value' | null;
  /** What to read figures from (a sub-object for tools whose other fields are not evidence). */
  payload: unknown;
  reason: 'admitted' | 'not_evidence_class' | 'incomplete_read' | 'filtered_scope' | 'no_payload' | 'no_verified_extractor';
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const completeStatus = (s: unknown) => s === 'verified' || s === 'verified_zero';
const none = (reason: EvidenceAdmission['reason']): EvidenceAdmission => ({ admit: null, payload: null, reason });

/**
 * Decide whether a same-turn tool result may enter the C-1 ledger, and which part of it.
 * Requires the approved class, a COMPLETE read, and (for engine totals) a declared unfiltered scope.
 */
export function admitToolEvidence(tool: string | null | undefined, data: unknown): EvidenceAdmission {
  const cls = evidenceClassFor(tool);
  if (!isObj(data)) return none('no_payload');

  switch (cls) {
    case 'statement_records': {
      if (tool === 'tx_search') {
        // rows only — tx_search totals are not engine figures (FR-022)
        const rows = data.rows ?? data.transactions ?? data.results;
        return Array.isArray(rows) ? { admit: 'single_value', payload: { rows }, reason: 'admitted' } : none('no_payload');
      }
      return { admit: 'single_value', payload: data, reason: 'admitted' };
    }
    case 'stored_values': {
      if (tool === 'account_balances_query') {
        const accounts = data.accounts;
        if (!Array.isArray(accounts)) return none('no_payload');
        return { admit: 'single_value', payload: { balances: accounts.map(a => (isObj(a) ? a.balance : null)) }, reason: 'admitted' };
      }
      // goals / obligations: summaries may carry sums computed outside the engine — not admitted
      // until a per-item extractor is verified for that tool.
      return none('no_verified_extractor');
    }
    case 'engine': {
      if (tool === 'transactions_query') {
        const totals = data.totals;
        const scope = data.scope;
        if (!isObj(totals) || totals.complete !== true) return none('incomplete_read');
        // fail closed: totals without a declared unfiltered scope are not evidence for an overall claim
        if (!isObj(scope) || scope.filtered !== false) return none('filtered_scope');
        return { admit: 'engine', payload: { totals }, reason: 'admitted' };
      }
      // A POSITIVE completeness signal is required (fail closed): a payload with no marker, an error
      // shape or an alternative return shape is not evidence.
      const positive = 'queryStatus' in data ? completeStatus(data.queryStatus) : data.complete === true;
      if (!positive || data.complete === false || data.truncated === true) return none('incomplete_read');
      return { admit: 'engine', payload: data, reason: 'admitted' };
    }
    default:
      return none('not_evidence_class');
  }
}
