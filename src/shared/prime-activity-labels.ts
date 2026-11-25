/**
 * P-UI-4 — safe activity labels for Prime's "thinking" indicator (owner GO).
 *
 * Only a WHITELISTED tool id maps to a fixed, plain-language label. The label never contains tool
 * arguments, results, figures or model text; unknown tools map to null (show nothing specific).
 * Wording follows the owner's examples.
 */

const REVIEWING_TRANSACTIONS = 'Reviewing your transactions';
const CHECKING_COVERAGE = 'Checking your statement coverage';
const CONSULTING_TAG = 'Consulting Tag';
const PREPARING_SUMMARY = 'Preparing your financial summary';

export const PRIME_ACTIVITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  tx_search: REVIEWING_TRANSACTIONS,
  tx_get: REVIEWING_TRANSACTIONS,
  transactions_query: REVIEWING_TRANSACTIONS,
  transaction_category_totals: REVIEWING_TRANSACTIONS,
  merchant_totals: REVIEWING_TRANSACTIONS,
  merchant_analysis_refine: REVIEWING_TRANSACTIONS,
  select_transaction: REVIEWING_TRANSACTIONS,
  statement_coverage: CHECKING_COVERAGE,
  tag_status: CONSULTING_TAG,
  tag_explain: CONSULTING_TAG,
  tag_merchant_insights: CONSULTING_TAG,
  cash_flow_summary: PREPARING_SUMMARY,
  summarize_import: PREPARING_SUMMARY,
  tax_summary: PREPARING_SUMMARY,
  crystal_summarize_expenses: PREPARING_SUMMARY,
  crystal_summarize_income: PREPARING_SUMMARY,
});

/** Label for a tool id, or null when the tool is not whitelisted (or the input is not a plain id). */
export function activityLabelForTool(tool: unknown): string | null {
  if (typeof tool !== 'string' || !/^[a-z_]{2,64}$/.test(tool)) return null;
  return Object.prototype.hasOwnProperty.call(PRIME_ACTIVITY_LABELS, tool) ? PRIME_ACTIVITY_LABELS[tool] : null;
}
