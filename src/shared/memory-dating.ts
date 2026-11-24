/**
 * L-D4 — dating remembered information (owner GO 2026-11-24). Pure; no I/O.
 * Remembered amounts are historical customer statements: they carry the date they were recorded,
 * or "date unknown" — never an invented date, never a current verified balance.
 */

/** "said on 2026-08-01" from a stored timestamp, or "date unknown". */
export function formatSnippetDate(createdAt: unknown): string {
  return typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(createdAt) ? `said on ${createdAt.slice(0, 10)}` : 'date unknown';
}
