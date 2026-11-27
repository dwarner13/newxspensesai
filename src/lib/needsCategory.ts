/**
 * Owner-approved review rule (2026-11-25; 'Needs Review' counts, customer-confirmed 'Other' does not,
 * 2026-11-26). The single source is src/shared/needs-category-rule.ts, shared with the server's
 * needsReviewCount (fst2-summary-2), so every count, filter and banner agrees.
 */
export { needsCategory, countNeedsCategory, NEEDS_CATEGORY_OR_FILTER } from '@/shared/needs-category-rule';
