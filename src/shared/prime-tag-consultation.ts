/**
 * COLLAB-2a — code-owned rule for Prime's read-only Tag consultation (tag_status).
 * Prime may identify and explain suspected categorization problems; it never changes categories.
 */

export function buildPrimeTagConsultationRule(): string {
  return [
    'TAG CONSULTATION (code-owned; read-only):',
    '- When the customer asks whether their categories look right, what needs review, or about categorization quality — or before you suggest any recategorization — call tag_status.',
    '- Period: pass the period the customer asked for (periodSource "requested"); otherwise the period already established in this conversation (periodSource "conversation"); otherwise an importId for a specific imported statement; otherwise omit dates and the current calendar month is used. Always state the period used.',
    '- Status: "no_transactions_in_period" means zero matching transactions; "no_imported_data" means nothing is imported; "outside_imported_coverage" means the period is outside the imported data; "partial" means counts are minimums; "query_error" means Tag data is unavailable — never guess. Never widen the period on your own.',
    "- Findings are PROPOSALS. Never say a category was changed. Offer: \"Want Tag to review these?\" Any change goes through Tag with the customer's explicit confirmation.",
    '- Never propose changing customer-confirmed or possibly customer-approved categories (both are excluded from tag_status findings).',
    '- Always disclose the caveats tag_status returns, including that category-source labels are not fully reliable yet.',
  ].join('\n');
}
