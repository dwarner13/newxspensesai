/**
 * PAGED SELECT (Financial source of truth, FST-1)
 *
 * Generic, deterministic, complete read of a filtered query — the same rules as
 * fetchTransactionsInRange, for queries that are not a date range (one import,
 * one statement):
 *   - the caller's query MUST carry a total order (e.g. date, then id);
 *   - paging advances by the rows actually returned, so an API row cap smaller
 *     than the page size (hosted PostgREST: 1,000) is never mistaken for "done";
 *   - the read stops only on an EMPTY page;
 *   - at the hard ceiling one probe row decides truncation;
 *   - an error or a truncated read is never complete.
 */

export interface PagedQuery extends PromiseLike<{ data: unknown; error: { message?: string } | null }> {
  range(from: number, to: number): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

export interface PagedSelectResult<T> {
  rows: T[];
  rowsFetched: number;
  pagesFetched: number;
  /** Every matching row was read (an empty page was observed) without error. */
  complete: boolean;
  /** Rows exist beyond the hard ceiling. */
  truncated: boolean;
  duplicatesSkipped: number;
  error: string | null;
}

export const PAGED_SELECT_PAGE_SIZE = 500;
export const PAGED_SELECT_MAX_ROWS = 20_000;

/**
 * `makeQuery` must return a FRESH, fully filtered and totally ordered query
 * each call (builders are single-use); this function only adds `.range()`.
 */
export async function pagedSelectAll<T extends { id?: unknown }>(
  makeQuery: () => PagedQuery,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<PagedSelectResult<T>> {
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? PAGED_SELECT_PAGE_SIZE));
  const maxRows = Math.max(1, Math.floor(opts.maxRows ?? PAGED_SELECT_MAX_ROWS));
  const rows: T[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let pagesFetched = 0;
  let duplicatesSkipped = 0;
  let exhausted = false;
  const fail = (message: string): PagedSelectResult<T> => ({
    rows: [], rowsFetched: 0, pagesFetched, complete: false, truncated: false, duplicatesSkipped: 0, error: message,
  });

  try {
    while (offset < maxRows) {
      const want = Math.min(pageSize, maxRows - offset);
      const { data, error } = await makeQuery().range(offset, offset + want - 1);
      pagesFetched++;
      if (error) return fail(error.message || 'query_error');
      const batch = Array.isArray(data) ? (data as T[]) : [];
      if (batch.length === 0) { exhausted = true; break; }
      for (const row of batch) {
        const id = row && row.id != null ? String(row.id) : '';
        if (id && seen.has(id)) { duplicatesSkipped++; continue; }
        if (id) seen.add(id);
        rows.push(row);
      }
      offset += batch.length;
    }
    let truncated = false;
    if (!exhausted) {
      const { data, error } = await makeQuery().range(offset, offset);
      pagesFetched++;
      if (error) return fail(error.message || 'query_error');
      truncated = Array.isArray(data) && data.length > 0;
    }
    return { rows, rowsFetched: rows.length, pagesFetched, complete: !truncated, truncated, duplicatesSkipped, error: null };
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : 'query_exception');
  }
}
