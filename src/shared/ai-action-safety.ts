/**
 * TAG ACTION SAFETY (owner authorization, 2026-11-25)
 *
 * "All AI-initiated transaction modifications must use the existing authoritative server-side
 *  proposal, explicit customer confirmation and signed receipt architecture. No AI tool may bypass
 *  confirmation based solely on prompt instructions."
 *
 * The authoritative architecture is Tag's: a server-built proposal stored as a signed receipt,
 * the customer's explicit "yes", and tag-action committing exactly what was signed. Prime and the
 * other employees never modify transactions themselves; they hand off to Tag (or tell the customer
 * to ask Tag). This module removes every transaction-modifying tool from any non-Tag employee's
 * tool list in chat.ts, whatever the database tool list says (tools_allowed is not in git, so code
 * must enforce it).
 */

/** Every registered tool that creates, changes or deletes a transaction. */
export const TRANSACTION_MUTATION_TOOLS: ReadonlySet<string> = new Set([
  'tag_update_transaction_category',
  'tag_bulk_recategorize',
  'tag_create_manual_transaction',
  'tx_update_category',
  'bulk_categorize',
]);

export function isTagEmployeeSlug(slug: string | null | undefined): boolean {
  return slug === 'tag-ai' || slug === 'tag';
}

/**
 * The tool list an employee may actually receive in chat.ts. Non-Tag employees never receive a
 * transaction-modifying tool. Returns the filtered list and what was removed (for logging).
 */
export function stripTransactionMutationTools(
  employeeSlug: string | null | undefined,
  tools: readonly string[],
): { tools: string[]; removed: string[] } {
  if (isTagEmployeeSlug(employeeSlug)) return { tools: [...tools], removed: [] };
  const removed = tools.filter(t => TRANSACTION_MUTATION_TOOLS.has(t));
  return { tools: tools.filter(t => !TRANSACTION_MUTATION_TOOLS.has(t)), removed };
}
