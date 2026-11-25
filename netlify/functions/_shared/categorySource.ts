/**
 * C4 Batch 1 / owner GO 2026-11-25 "Tag customer correction protection" — the ONE rule every
 * automatic categorization writer uses. Pure, no I/O, no logging.
 *
 * Owner requirements:
 *  1. Automatic categorization never overwrites customer-confirmed classifications.
 *  2. Explicitly approved "Other" is preserved.
 *  5. Historical rows with ambiguous approval provenance are protected until separately reconciled.
 *  6. Never silently recategorize historical customer data.
 *
 * So an automatic writer may only FILL a gap:
 *  - a row with no real category (empty / Uncategorized / Needs Review) — unless a customer source
 *    put it there (e.g. a customer deliberately chose Needs Review);
 *  - an "Other" that AUTOMATION assigned (known automatic source). An "Other" from a customer, from
 *    tag_rule / tag_chat, or from an unknown / blank source is preserved.
 *  - Any real category is never changed by an automatic writer, whatever its source.
 *
 * Difference from the C4 Batch 1 draft (documented for Prime HQ): C4 treated a NULL source as
 * unprotected. Owner requirement 5 (ambiguous provenance) is stricter: a real category or "Other"
 * with a blank / unknown source is protected (older customer edits in the drawer wrote no source).
 */
import { CUSTOMER_SOURCES, AMBIGUOUS_SOURCES } from '../../../src/shared/tag-status';

export interface SourceRow { category?: string | null; category_source?: string | null }

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const GAP_CATEGORIES = new Set(['', 'uncategorized', 'needs review']);

/** Customer-confirmed or possibly customer-approved (tag_rule / tag_chat). */
export function isProtectedSource(source: unknown): boolean {
  const s = norm(source);
  return CUSTOMER_SOURCES.has(s) || AMBIGUOUS_SOURCES.has(s);
}

/** May an AUTOMATIC writer categorize this row? (see header) */
export function isAutoWritable(row: SourceRow): boolean {
  const cat = norm(row.category);
  if (GAP_CATEGORIES.has(cat)) return !isProtectedSource(row.category_source);
  if (cat === 'other') return MACHINE_ONLY.has(norm(row.category_source));
  return false;
}

/** Split rows into those an automatic writer may touch and those it must skip (reported). */
export function partitionAutoWritable<T extends SourceRow>(rows: ReadonlyArray<T>): { writable: T[]; skippedProtected: number } {
  const writable: T[] = [];
  let skippedProtected = 0;
  for (const r of rows) {
    if (isAutoWritable(r)) writable.push(r); else skippedProtected++;
  }
  return { writable, skippedProtected };
}

/**
 * Purely machine sources whose "Other" is a placeholder an automatic writer may replace. Sources
 * derived from a customer correction or a Tag conversation (learned, tag_single, tag_conversation,
 * tag_assisted) are deliberately NOT here: their "Other" may be the customer's own choice.
 */
export const AUTOMATIC_OTHER_SOURCES: ReadonlyArray<string> = [
  'ai', 'hardcoded', 'rule', 'merchant_map', 'merchant_sweep', 'sign_conflict', 'bulk_fix', 'xlsx-spreadsheet', 'inline_rule', 'needs_review',
].filter(s => !isProtectedSource(s));
const MACHINE_ONLY = new Set(AUTOMATIC_OTHER_SOURCES);

/**
 * PostgREST filters that re-check the same rule INSIDE the update (so a customer edit that lands
 * between the select and the update is never overwritten). Apply both with `.or(...)` (ANDed).
 */
export const AUTO_UPDATE_CATEGORY_FILTER =
  `category.is.null,category.eq.,category.eq.Uncategorized,category.eq.Needs Review,and(category.eq.Other,category_source.in.(${AUTOMATIC_OTHER_SOURCES.join(',')}))`;
export const AUTO_UPDATE_SOURCE_FILTER =
  `category_source.is.null,category_source.not.in.(${[...CUSTOMER_SOURCES, ...AMBIGUOUS_SOURCES].join(',')})`;

/**
 * Import-scoped processing (apply-category-rules with an import_id, right after upload): the rows of
 * a NEW import may additionally have a category that the import pipeline itself assigned (a purely
 * machine source) replaced by the customer's own rules / maps. That is processing the new import,
 * not editing history. Customer-confirmed, possibly-approved and unknown-provenance rows stay.
 */
export function isImportWritable(row: SourceRow): boolean {
  if (isAutoWritable(row)) return true;
  return MACHINE_ONLY.has(norm(row.category_source));
}
export const IMPORT_UPDATE_CATEGORY_FILTER =
  `category.is.null,category.eq.,category.eq.Uncategorized,category.eq.Needs Review,category_source.in.(${AUTOMATIC_OTHER_SOURCES.join(',')})`;
