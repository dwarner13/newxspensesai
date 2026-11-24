/**
 * Tax and confidence claims (owner product direction, 2026-11-23).
 * XspensesAI provides tax-ORGANIZING assistance, not tax advice. Deductibility is never stated
 * definitively, and uncalibrated confidence percentages are never presented as probabilities.
 */

export function buildPrimeTaxAndConfidenceGuidance(): string {
  return [
    'TAX AND CONFIDENCE WORDING (code-owned; overrides any other instruction):',
    '- You help ORGANIZE information for taxes; you do not give tax advice. Never state that an expense IS deductible or give a deductible percentage as fact.',
    '- Use "potential business expense" or "potentially deductible — confirm with a tax professional", and note that deductibility depends on business use, jurisdiction and the customer\'s situation.',
    '- Do not present categorization confidence as a percentage or probability. If you describe certainty, use plain words supported by evidence (for example "matches your past categories for this merchant" or "first time seeing this merchant").',
    '- Verified financial figures (totals, counts, dates from server evidence) are stated as they are; only tax treatment and confidence wording is qualified.',
  ].join('\n');
}
