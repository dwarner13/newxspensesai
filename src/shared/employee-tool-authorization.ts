/**
 * Code-owned employee tool authorization table — A-2 (owner "FINAL A-2 APPROVAL", 2026-11-27;
 * A-1: this table is the single source of employee tools, the database `tools_allowed` list is drift
 * telemetry only; A-3 approved). Versioned in git and reviewed like code.
 *
 * Activation (owner six-step plan): step 1 adds this table + its snapshot (no runtime use yet);
 * later steps switch chat.ts registration / handoff / confirmation / executeTool to it.
 *
 * Access classes:
 *  - read:           executes;
 *  - confirm_mutate: a NON-transaction write behind the customer confirmation gate (goals, import name);
 *  - propose:        a signed Tag proposal only, committed by tag-action; chat confirmation never runs it.
 * No entry may name a prohibited transaction-changing tool (TRANSACTION_MUTATION_TOOLS).
 *
 * Owner safeguard 1: forecast verification applies GLOBALLY — every forecast tool, for every employee,
 * is offered only once it is in VERIFIED_FORECAST_TOOLS (calculation + stated-assumption tests pass).
 */

export type ToolAccess = 'read' | 'confirm_mutate' | 'propose';

export interface EmployeeToolEntry {
  id: string;
  access: ToolAccess;
  /** Offered only when the chat-documents feature and the employee's E1 document access allow it. */
  requires?: 'chat_documents';
}

export interface EmployeeAuthorization {
  status: 'active' | 'hidden' | 'retired';
  tools: readonly EmployeeToolEntry[];
  /** Read-only specialist consultations this employee may run (never implies a change). */
  consults: readonly string[];
  /** Employees this employee may hand a conversation to (target must also be available). */
  handoffTargets: readonly string[];
}

/** Forecast / projection tools: offered to anyone only after verification (owner safeguard 1). */
export const FORECAST_TOOLS: ReadonlySet<string> = new Set([
  'analytics_forecast', 'finley_debt_payoff_forecast', 'finley_savings_forecast', 'finley_loan_forecast',
]);
/** Forecast tools whose calculations and stated assumptions have passed verification tests. */
export const VERIFIED_FORECAST_TOOLS: ReadonlySet<string> = new Set<string>([]);

const r = (id: string, extra: Partial<EmployeeToolEntry> = {}): EmployeeToolEntry => ({ id, access: 'read', ...extra });
const c = (id: string): EmployeeToolEntry => ({ id, access: 'confirm_mutate' });
const p = (id: string): EmployeeToolEntry => ({ id, access: 'propose' });

const SPECIALIST_HANDOFFS = ['prime-boss', 'byte-docs', 'tag-ai', 'crystal', 'goalie-ai', 'custodian'] as const;

export const EMPLOYEE_TOOLS: Readonly<Record<string, EmployeeAuthorization>> = Object.freeze({
  'prime-boss': {
    status: 'active',
    tools: [
      r('request_employee_handoff'), r('account_balances_query'), r('goalie_list_goals'),
      r('tx_search'), r('tx_get'), r('select_transaction'), r('merchant_analysis_refine'),
      r('transaction_category_totals'), r('cash_flow_summary'), r('merchant_totals'), r('statement_coverage'),
      r('tax_summary'), r('tag_status'), r('tag_document_findings', { requires: 'chat_documents' }),
      r('analytics_forecast'), r('finley_debt_payoff_forecast'), r('finley_loan_forecast'), r('finley_savings_forecast'),
    ],
    consults: ['tag-ai'],
    handoffTargets: ['byte-docs', 'tag-ai', 'crystal', 'goalie-ai', 'custodian'],
  },
  'tag-ai': {
    status: 'active',
    tools: [r('request_employee_handoff'), r('tag_category_brain'), r('tag_explain_category'), r('tag_merchant_insights'), r('transactions_query')],
    consults: [],
    handoffTargets: SPECIALIST_HANDOFFS,
  },
  /** Tag's own panel (tag-copilot.ts): corrections only as signed proposals. */
  'tag-copilot': {
    status: 'active',
    tools: [p('update_single_transaction'), p('set_category_rule'), p('bulk_recategorize'), p('rename_merchant'), r('search_transactions')],
    consults: [],
    handoffTargets: [],
  },
  'byte-docs': {
    status: 'active',
    tools: [
      r('get_document_by_id'), r('get_recent_documents'), r('vision_ocr_light'), r('transaction_category_totals'),
      r('transactions_query'), r('request_employee_handoff'), c('byte_rename_import'),
    ],
    consults: [],
    handoffTargets: SPECIALIST_HANDOFFS,
  },
  crystal: { status: 'active', tools: [r('crystal_summarize_income'), r('crystal_summarize_expenses')], consults: [], handoffTargets: [] },
  custodian: { status: 'active', tools: [], consults: [], handoffTargets: [] },
  'finley-ai': {
    status: 'active',
    tools: [r('transactions_query'), r('account_balances_query'), r('goals_query'), r('finley_loan_forecast'), r('finley_debt_payoff_forecast'), r('finley_savings_forecast')],
    consults: [],
    handoffTargets: [],
  },
  'goalie-ai': {
    status: 'active',
    tools: [
      r('goalie_list_goals'), r('goalie_summarize_goals'), r('goalie_suggest_actions'), r('crystal_summarize_income'),
      r('crystal_summarize_expenses'), r('finley_savings_forecast'), r('finley_debt_payoff_forecast'), r('transactions_query'),
      r('request_employee_handoff'), c('goalie_create_goal'), c('goalie_update_goal_progress'),
    ],
    consults: [],
    handoffTargets: SPECIALIST_HANDOFFS,
  },
  // G-1 / LT-1 / B-1: no tools — no unsupported personalized financial answers.
  'goalie-coach': { status: 'active', tools: [], consults: [], handoffTargets: [] },
  'liberty-ai': {
    status: 'active',
    tools: [
      r('tag_explain_category'), r('tag_merchant_insights'), r('goalie_suggest_actions'), r('goalie_list_goals'),
      r('goalie_summarize_goals'), r('crystal_summarize_income'), r('crystal_summarize_expenses'), r('finley_savings_forecast'),
      r('finley_debt_payoff_forecast'), r('finley_loan_forecast'), r('transactions_query'), r('request_employee_handoff'),
      // L-1: goalie_create_goal deferred — Goalie owns goal creation.
    ],
    consults: [],
    handoffTargets: SPECIALIST_HANDOFFS,
  },
  'ledger-tax': { status: 'active', tools: [], consults: [], handoffTargets: [] },
  'blitz-debt': { status: 'active', tools: [], consults: [], handoffTargets: [] },
  'chime-ai': {
    status: 'active',
    tools: [r('chime_list_obligations'), r('chime_list_upcoming_notifications'), r('chime_summarize_upcoming_obligations'), r('chime_draft_notification_copy'), r('chime_generate_notification')],
    consults: [],
    handoffTargets: [],
  },
});

/** Known spellings → table key. Unknown spellings are not guessed (deny). */
const ALIASES: Readonly<Record<string, string>> = Object.freeze({
  prime: 'prime-boss', 'prime-boss': 'prime-boss',
  tag: 'tag-ai', 'tag-ai': 'tag-ai', 'tag-copilot': 'tag-copilot',
  byte: 'byte-docs', 'byte-docs': 'byte-docs',
  crystal: 'crystal', 'crystal-analytics': 'crystal', 'crystal-ai': 'crystal',
  custodian: 'custodian', 'custodian-settings': 'custodian',
  finley: 'finley-ai', 'finley-ai': 'finley-ai',
  goalie: 'goalie-ai', 'goalie-ai': 'goalie-ai', 'goalie-goals': 'goalie-ai',
  'goalie-coach': 'goalie-coach',
  liberty: 'liberty-ai', 'liberty-ai': 'liberty-ai',
  ledger: 'ledger-tax', 'ledger-tax': 'ledger-tax',
  blitz: 'blitz-debt', 'blitz-debt': 'blitz-debt',
  chime: 'chime-ai', 'chime-ai': 'chime-ai',
});

export function canonicalEmployee(slug: unknown): string | null {
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  return ALIASES[s] ?? null;
}

export function employeeAuthorization(slug: unknown): EmployeeAuthorization | null {
  const key = canonicalEmployee(slug);
  return key ? EMPLOYEE_TOOLS[key] ?? null : null;
}

/**
 * The tools an employee is offered this turn: table entries only, forecasts only once verified,
 * document tools only when chat documents are allowed. Unknown employee → none (fail closed).
 */
export function effectiveEmployeeTools(slug: unknown, opts: { chatDocuments: boolean }): string[] {
  const auth = employeeAuthorization(slug);
  if (!auth || auth.status !== 'active') return [];
  return auth.tools
    .filter(t => !FORECAST_TOOLS.has(t.id) || VERIFIED_FORECAST_TOOLS.has(t.id))
    .filter(t => t.requires !== 'chat_documents' || opts.chatDocuments)
    .map(t => t.id);
}

/** Database drift telemetry (A-1): names the database lists that the table does not grant, and vice versa. */
export function toolAssignmentDrift(slug: unknown, databaseTools: readonly string[] | null | undefined): { extraInDatabase: string[]; missingFromDatabase: string[] } {
  const auth = employeeAuthorization(slug);
  const table = new Set((auth?.tools ?? []).map(t => t.id));
  const db = new Set((databaseTools ?? []).filter((x): x is string => typeof x === 'string'));
  return {
    extraInDatabase: [...db].filter(x => !table.has(x)).sort(),
    missingFromDatabase: [...table].filter(x => !db.has(x)).sort(),
  };
}
