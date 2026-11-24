/**
 * Employee capability and entitlement enforcement point (owner directive 2026-11-24:
 * "Shared infrastructure. Specialized employees. Controlled collaboration. Protected premium
 * capabilities.").
 *
 * This is the SINGLE server-side hook every tool execution and every Prime specialist consultation
 * passes through. Today it records ownership metadata and ALLOWS everything (no paid restrictions
 * are active — owner: "do not activate paid restrictions prematurely"). When the entitlement
 * matrix is approved, a resolver is installed here and the same call sites start enforcing it,
 * with deny-by-default when authorization cannot be established.
 *
 * Pure and side-effect free at import (no I/O, no logging of customer data).
 */

export type EmployeeId = 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'finley' | 'custodian' | 'liberty' | 'ledger' | 'chime' | 'blitz';

export interface CapabilitySpec {
  /** Stable capability id, e.g. "tag.categorization_status". */
  capability: string;
  /** The employee whose specialty this capability is. */
  ownerEmployee: EmployeeId;
  /** Read-only consultation vs. a change to customer data. */
  kind: 'read' | 'write';
}

/**
 * Ownership of tools Prime currently uses (code-owned; extend as tools are added). Tools not listed
 * resolve to an "unclassified" spec so the gap is visible, never silently trusted when enforcement
 * starts.
 */
export const TOOL_CAPABILITIES: Readonly<Record<string, CapabilitySpec>> = Object.freeze({
  tag_status: { capability: 'tag.categorization_status', ownerEmployee: 'tag', kind: 'read' },
  tag_document_findings: { capability: 'tag.document_findings', ownerEmployee: 'tag', kind: 'read' },
  tag_explain_category: { capability: 'tag.explain_category', ownerEmployee: 'tag', kind: 'read' },
  tag_merchant_insights: { capability: 'tag.merchant_insights', ownerEmployee: 'tag', kind: 'read' },
  tag_update_transaction_category: { capability: 'tag.change_category', ownerEmployee: 'tag', kind: 'write' },
  tag_bulk_recategorize: { capability: 'tag.bulk_recategorize', ownerEmployee: 'tag', kind: 'write' },
  statement_coverage: { capability: 'byte.statement_inventory', ownerEmployee: 'byte', kind: 'read' },
  // Not a tool: server-loaded chat-document excerpts (Attachments E1 reads them through this hook).
  chat_document_context: { capability: 'byte.chat_document_context', ownerEmployee: 'byte', kind: 'read' },
  tx_search: { capability: 'prime.transaction_search', ownerEmployee: 'prime', kind: 'read' },
  tx_get: { capability: 'prime.transaction_search', ownerEmployee: 'prime', kind: 'read' },
  select_transaction: { capability: 'prime.transaction_search', ownerEmployee: 'prime', kind: 'read' },
  merchant_totals: { capability: 'prime.financial_summary', ownerEmployee: 'prime', kind: 'read' },
  merchant_analysis_refine: { capability: 'prime.financial_summary', ownerEmployee: 'prime', kind: 'read' },
  transaction_category_totals: { capability: 'prime.financial_summary', ownerEmployee: 'prime', kind: 'read' },
  cash_flow_summary: { capability: 'prime.financial_summary', ownerEmployee: 'prime', kind: 'read' },
  tax_summary: { capability: 'prime.tax_organizing_summary', ownerEmployee: 'prime', kind: 'read' },
  analytics_forecast: { capability: 'crystal.forecast', ownerEmployee: 'crystal', kind: 'read' },
  finley_debt_payoff_forecast: { capability: 'goalie.debt_payoff_scenario', ownerEmployee: 'goalie', kind: 'read' },
  finley_savings_forecast: { capability: 'goalie.savings_scenario', ownerEmployee: 'goalie', kind: 'read' },
  finley_loan_forecast: { capability: 'crystal.loan_scenario', ownerEmployee: 'crystal', kind: 'read' },
  goalie_create_goal: { capability: 'goalie.create_goal', ownerEmployee: 'goalie', kind: 'write' },
  goalie_list_goals: { capability: 'goalie.list_goals', ownerEmployee: 'goalie', kind: 'read' },
  crystal_summarize_income: { capability: 'crystal.income_summary', ownerEmployee: 'crystal', kind: 'read' },
  crystal_summarize_expenses: { capability: 'crystal.expense_summary', ownerEmployee: 'crystal', kind: 'read' },
  request_employee_handoff: { capability: 'prime.handoff', ownerEmployee: 'prime', kind: 'read' },
});

export function capabilityForTool(toolId: string): CapabilitySpec & { classified: boolean } {
  const spec = TOOL_CAPABILITIES[toolId];
  return spec ? { ...spec, classified: true } : { capability: `unclassified.${toolId}`, ownerEmployee: 'prime', kind: 'read', classified: false };
}

export interface CapabilityRequest {
  userId: string;
  /** The employee the customer is talking to (server-resolved, never client-claimed). */
  actingEmployee: string;
  toolId: string;
  /** How the capability is reached: the model's tool call, or a server-side Prime consultation. */
  via: 'tool_call' | 'prime_consultation' | 'document_access';
}

export interface CapabilityDecision {
  allowed: boolean;
  reason: 'not_enforced_yet' | 'entitled' | 'not_entitled' | 'unknown_customer' | 'unclassified_capability';
  spec: CapabilitySpec & { classified: boolean };
}

/** Future entitlement source (subscription / add-ons / usage). Not installed yet. */
export type EntitlementResolver = (req: CapabilityRequest, spec: CapabilitySpec & { classified: boolean }) => Promise<boolean>;

let resolver: EntitlementResolver | null = null;

/** Installed once the owner approves the entitlement matrix (tests may install one). */
export function setEntitlementResolver(r: EntitlementResolver | null): void {
  resolver = r;
}

export async function authorizeCapability(req: CapabilityRequest): Promise<CapabilityDecision> {
  const spec = capabilityForTool(req.toolId);
  if (!resolver) return { allowed: true, reason: 'not_enforced_yet', spec };
  // Enforcement mode: deny by default when authorization cannot be established.
  if (!req.userId) return { allowed: false, reason: 'unknown_customer', spec };
  if (!spec.classified) return { allowed: false, reason: 'unclassified_capability', spec };
  try {
    return (await resolver(req, spec)) ? { allowed: true, reason: 'entitled', spec } : { allowed: false, reason: 'not_entitled', spec };
  } catch {
    return { allowed: false, reason: 'not_entitled', spec };
  }
}
