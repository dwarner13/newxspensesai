/**
 * TRANSACTION RANGE FETCH (Prime V1-A CP2)
 *
 * User-scoped, complete, paged fetch of transactions for an inclusive `date`
 * range — the dataset authoritative period aggregates are built from.
 *
 * Paging is robust to an API row cap smaller than the requested page size:
 * the fetch advances by the rows actually returned and stops only on an
 * EMPTY page. If the hard ceiling is reached first, one probe row decides
 * whether the set is truncated. A truncated or failed fetch is never complete.
 *
 * Rows whose `date` is NULL cannot match a date-range filter, so they are never
 * selected here and this fetch reports nothing about them (it does not observe
 * or count missing-date database rows).
 *
 * The 25-row candidate frame is unrelated and untouched.
 */

/** Minimal query-builder surface (Supabase-compatible) — injectable for tests. */
export interface RangeFetchQuery extends PromiseLike<{ data: unknown; error: { message?: string } | null }> {
  eq(column: string, value: unknown): RangeFetchQuery;
  gte(column: string, value: unknown): RangeFetchQuery;
  lte(column: string, value: unknown): RangeFetchQuery;
  order(column: string, options: { ascending: boolean }): RangeFetchQuery;
  range(from: number, to: number): RangeFetchQuery;
}

export interface RangeFetchClient {
  from(table: string): { select(columns: string): RangeFetchQuery };
}

export interface TransactionRangeRow {
  id: string;
  date: string | null;
  amount: unknown;
  type: string | null;
  category: string | null;
  subcategory: string | null;
}

export interface TransactionRangeFetchResult {
  rows: TransactionRangeRow[];
  rowsFetched: number;
  pagesFetched: number;
  /** The range was exhausted (an empty page was observed) without error. */
  complete: boolean;
  /** More rows exist beyond the hard ceiling. */
  truncated: boolean;
  /** Rows dropped because their id had already been returned (data moved between pages). */
  duplicatesSkipped: number;
  error: string | null;
}

/** Requested page size (kept at/below the default 1,000-row API cap). */
export const TRANSACTION_RANGE_PAGE_SIZE = 500;
/** Hard safety ceiling on rows fetched for one aggregate. */
export const TRANSACTION_RANGE_MAX_ROWS = 20_000;
export const TRANSACTION_RANGE_COLUMNS = 'id, date, amount, type, category, subcategory';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function failed(error: string, pagesFetched: number): TransactionRangeFetchResult {
  return { rows: [], rowsFetched: 0, pagesFetched, complete: false, truncated: false, duplicatesSkipped: 0, error };
}

/**
 * Fetch every transaction for `userId` with startDate <= date <= endDate
 * (inclusive), ordered by date then id.
 */
export async function fetchTransactionsInRange(
  client: RangeFetchClient,
  input: { userId: string; startDate: string; endDate: string },
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<TransactionRangeFetchResult> {
  const { userId, startDate, endDate } = input;
  if (!userId || !YMD.test(startDate) || !YMD.test(endDate) || startDate > endDate) {
    return failed('invalid_range', 0);
  }
  const pageSize = Math.max(1, Math.floor(opts.pageSize ?? TRANSACTION_RANGE_PAGE_SIZE));
  const maxRows = Math.max(1, Math.floor(opts.maxRows ?? TRANSACTION_RANGE_MAX_ROWS));

  const page = (from: number, to: number) =>
    client.from('transactions')
      .select(TRANSACTION_RANGE_COLUMNS)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

  const rows: TransactionRangeRow[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let pagesFetched = 0;
  let duplicatesSkipped = 0;
  let exhausted = false;

  while (offset < maxRows) {
    const want = Math.min(pageSize, maxRows - offset);
    const { data, error } = await page(offset, offset + want - 1);
    pagesFetched++;
    if (error) return failed(error.message || 'query_error', pagesFetched);
    const batch = Array.isArray(data) ? data as TransactionRangeRow[] : [];
    if (batch.length === 0) { exhausted = true; break; }
    for (const row of batch) {
      const id = String(row?.id ?? '');
      if (id && seen.has(id)) { duplicatesSkipped++; continue; }
      if (id) seen.add(id);
      rows.push(row);
    }
    // Advance by rows actually returned: a server cap below `want` is not "done".
    offset += batch.length;
  }

  let truncated = false;
  if (!exhausted) {
    // Ceiling reached: probe one row past it to decide truncation.
    const { data, error } = await page(offset, offset);
    pagesFetched++;
    if (error) return failed(error.message || 'query_error', pagesFetched);
    truncated = Array.isArray(data) && data.length > 0;
  }

  return {
    rows,
    rowsFetched: rows.length,
    pagesFetched,
    complete: !truncated,
    truncated,
    duplicatesSkipped,
    error: null,
  };
}
