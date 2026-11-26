/**
 * TAG ACTION SAFETY (owner authorization, 2026-11-25)
 *
 * "All AI-initiated transaction modifications must use the existing authoritative server-side
 *  proposal, explicit customer confirmation and signed receipt architecture. No AI tool may bypass
 *  confirmation based solely on prompt instructions."
 *
 * The authoritative architecture is Tag's: a server-built proposal stored as a signed receipt
 * (tag-copilot / typed preview), the customer's explicit "yes", and tag-action commit_single /
 * commit_proposal committing exactly what was signed.
 *
 * chat.ts therefore gives NO employee a transaction-modifying tool — including Tag (owner rule:
 * one action-safety contract however a change is initiated; Tag HQ, 2026-11-25). chat.ts's own
 * signed token confirmation (TOOL_CONFIRM_SECRET) remains for other mutating tools (goals,
 * reminders…) but is no longer a path for transaction changes. Enforced in code because
 * employee_profiles.tools_allowed is not versioned.
 */

/** Every registered tool that creates, changes or deletes a transaction. */
export const TRANSACTION_MUTATION_TOOLS: ReadonlySet<string> = new Set([
  'tag_update_transaction_category',
  // 'tag_bulk_recategorize' retired and deleted (owner GO 2026-11-25; Tag HQ, Prime HQ agreed).
  'tag_create_manual_transaction',
  'tx_update_category',
  'bulk_categorize',
]);

/**
 * The tool list an employee may actually receive in chat.ts: never a transaction-modifying tool,
 * for any employee. Returns the filtered list and what was removed (for logging).
 */
export function stripTransactionMutationTools(
  _employeeSlug: string | null | undefined,
  tools: readonly string[],
): { tools: string[]; removed: string[] } {
  void _employeeSlug; // kept for call-site stability and logging; the rule applies to every employee
  const removed = tools.filter(t => TRANSACTION_MUTATION_TOOLS.has(t));
  return { tools: tools.filter(t => !TRANSACTION_MUTATION_TOOLS.has(t)), removed };
}
