/**
 * Financial evidence registry (owner GO 2026-11-27, "FINANCIAL EVIDENCE TRUST APPROVAL").
 * Tool authorization does NOT establish financial accuracy: a figure counts as evidence for a claim
 * about the customer's actual finances only when it comes from an approved evidence source, the
 * read was COMPLETE, and (for totals) the scope is unfiltered. Meaning is checked by the C-1 verifier.
 *
 * Classes (owner's categories):
 *  - engine:            engine-backed financial tool — complete totals from the shared financial engine;
 *  - statement_records: verified statement evidence — individual stored transaction values from
 *                       imported statements (quotable singly; never summed into a total);
 *  - non_financial:     produces no customer money figures;
 *  - ineligible:        returns figures that are NOT financial evidence (projections, documents,
 *                       drafted text, unreviewed or non-engine sums).
 * Unknown tools are ineligible (fail closed). Code-owned; changes are reviewed like code.
 */

export type EvidenceClass = 'engine' | 'statement_records' | 'non_financial' | 'ineligible';

export const FINANCIAL_EVIDENCE_REGISTRY: Readonly<Record<string, EvidenceClass>> = Object.freeze({
  // engine-backed financial tools
  cash_flow_summary: 'engine',
  transaction_category_totals: 'engine',
  merchant_totals: 'engine',
  tax_summary: 'engine',
  crystal_summarize_income: 'engine',
  crystal_summarize_expenses: 'engine',
  transactions_query: 'engine',          // totals only (complete + unfiltered); rows are display
  // verified statement evidence (single stored values)
  tx_search: 'statement_records',        // row amounts; its own totals are NOT evidence (FR-022)
  tx_get: 'statement_records',
  select_transaction: 'statement_records',
  // stored account records (PB-04 provenance note): each account's balance singly; its summed
  // totalBalance is computed outside the engine and is NOT evidence
  account_balances_query: 'statement_records',
  // non-financial
  statement_coverage: 'non_financial',
  tag_status: 'non_financial',           // counts only (no amounts served)
  tag_category_brain: 'non_financial',
  tag_explain_category: 'non_financial',
  request_employee_handoff: 'non_financial',
  merchant_analysis_refine: 'non_financial',
  // not eligible as financial evidence
  goals_query: 'ineligible',
  goalie_list_goals: 'ineligible',
  goalie_summarize_goals: 'ineligible',
  goalie_suggest_actions: 'ineligible',  // engine-backed but returns prose, not structured figures
  tag_merchant_insights: 'ineligible',
  tag_document_findings: 'ineligible',
  analytics_forecast: 'ineligible',
  finley_debt_payoff_forecast: 'ineligible',
  finley_savings_forecast: 'ineligible',
  finley_loan_forecast: 'ineligible',
  get_document_by_id: 'ineligible',
  get_recent_documents: 'ineligible',
  vision_ocr_light: 'ineligible',
  chime_list_obligations: 'ineligible',
  chime_list_upcoming_notifications: 'ineligible',
  chime_summarize_upcoming_obligations: 'ineligible',
  chime_draft_notification_copy: 'ineligible',
  chime_generate_notification: 'ineligible',
});

export function evidenceClassFor(tool: string | null | undefined): EvidenceClass {
  return (tool && FINANCIAL_EVIDENCE_REGISTRY[tool]) || 'ineligible';
}

export interface EvidenceAdmission {
  /** 'engine' figures may support totals; 'statement_records' only single values; null = none. */
  admit: 'engine' | 'statement_records' | null;
  /** What to read figures from (a sub-object for tools whose other fields are not evidence). */
  payload: unknown;
  reason: 'admitted' | 'not_evidence_class' | 'incomplete_read' | 'filtered_scope' | 'no_payload';
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const completeStatus = (s: unknown) => s === 'verified' || s === 'verified_zero';

/**
 * Decide whether a same-turn tool result may enter the C-1 ledger, and which part of it.
 * Requires the approved class, a COMPLETE read, and (for engine totals) an unfiltered scope.
 */
export function admitToolEvidence(tool: string | null | undefined, data: unknown): EvidenceAdmission {
  const cls = evidenceClassFor(tool);
  if (!isObj(data)) return { admit: null, payload: null, reason: 'no_payload' };
  if (cls === 'non_financial' || cls === 'ineligible') return { admit: null, payload: null, reason: 'not_evidence_class' };

  if (cls === 'statement_records') {
    if (tool === 'tx_search') {
      // rows only — tx_search totals are not engine figures (FR-022)
      const rows = (data as Obj).rows ?? (data as Obj).transactions ?? (data as Obj).results;
      return Array.isArray(rows) ? { admit: 'statement_records', payload: { rows }, reason: 'admitted' } : { admit: null, payload: null, reason: 'no_payload' };
    }
    if (tool === 'account_balances_query') {
      const accounts = (data as Obj).accounts;
      if (!Array.isArray(accounts)) return { admit: null, payload: null, reason: 'no_payload' };
      return { admit: 'statement_records', payload: { balances: accounts.map(a => (isObj(a) ? a.balance : null)) }, reason: 'admitted' };
    }
    return { admit: 'statement_records', payload: data, reason: 'admitted' };
  }

  // engine
  if (tool === 'transactions_query') {
    const totals = (data as Obj).totals;
    const scope = (data as Obj).scope;
    if (!isObj(totals) || totals.complete !== true) return { admit: null, payload: null, reason: 'incomplete_read' };
    // fail closed: totals without a declared unfiltered scope are not evidence for an overall claim
    if (!isObj(scope) || scope.filtered !== false) return { admit: null, payload: null, reason: 'filtered_scope' };
    return { admit: 'engine', payload: { totals }, reason: 'admitted' };
  }
  // A POSITIVE completeness signal is required (fail closed): a payload with no marker, an error
  // shape or an alternative return shape is not evidence.
  const d = data as Obj;
  const positive = 'queryStatus' in d ? completeStatus(d.queryStatus) : d.complete === true;
  if (!positive || d.complete === false || d.truncated === true) return { admit: null, payload: null, reason: 'incomplete_read' };
  return { admit: 'engine', payload: data, reason: 'admitted' };
}
