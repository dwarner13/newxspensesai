/**
 * FST-2 — the ONE authoritative server read of a customer's transactions for a period.
 *
 * Used by financial-summary, financial-export, tax-summary and generate-tax-report so that every
 * surface counts the same rows with the same definitions (buildPeriodAggregate / classifyCashFlow).
 *
 *  - Identity: userId comes only from verifyAuth (never request data); every query filters by it.
 *  - Complete: fetchTransactionsInRange pages (1,000-row pages = the hosted API cap), ordered by
 *    date then id; truncation decided by a probe row.
 *  - Consistent: a head count with the same filters must equal the rows read. A mismatch means
 *    rows were inserted/deleted DURING the read (e.g. an import or a deletion racing the export):
 *    the read is retried once, then reported as 'partial' — never silently short.
 *  - Fresh: no cache. A confirmed Tag correction is visible to the next request.
 *  - One read per request: callers build every figure from the returned rows.
 */
import {
  fetchTransactionsInRange,
  fetchAllTransactions,
  TRANSACTION_SIGNAL_COLUMNS,
  type RangeFetchClient,
  type TransactionRangeRow,
} from '../../../src/shared/transaction-range-fetch';
import { pagedSelectAll } from '../../../src/shared/paged-select';

export const LEDGER_PAGE_SIZE = 1000;
export const LEDGER_MAX_ROWS = 50_000;
const LEDGER_EXTRA_COLUMNS = [...TRANSACTION_SIGNAL_COLUMNS, 'merchant', 'category_source'];

export type LedgerStatus =
  /** Rows were read completely and consistently (may be zero rows for the period). */
  | 'ok'
  /** The customer has no imported transactions at all. */
  | 'no_data'
  /** Not every transaction could be read consistently. */
  | 'partial'
  /** The read failed. */
  | 'unavailable';

export type LedgerRow = TransactionRangeRow & {
  merchant_name?: string | null;
  merchant?: string | null;
  description?: string | null;
  import_id?: string | null;
  category_source?: string | null;
};

export interface LedgerRead {
  status: LedgerStatus;
  rows: LedgerRow[];
  rowsFetched: number;
  complete: boolean;
  truncated: boolean;
  /** Head count of the same filter matched the rows read. */
  countVerified: boolean;
  attempts: number;
  /** Database requests made (pages + probes + counts) — performance evidence. */
  requests: number;
  error: string | null;
}

export interface LedgerScopeInput {
  userId: string;
  /** Both null = all time with NO date filter (undated rows included). Otherwise both YYYY-MM-DD. */
  startDate: string | null;
  endDate: string | null;
  /** Optional account scope (imports). Rows outside are excluded after the complete read. */
  importIds?: readonly string[] | null;
  /** Extra columns for this read (validated names only; see rangeFetchColumns). */
  extraColumns?: readonly string[];
}

const isAllTime = (s: LedgerScopeInput) => s.startDate === null && s.endDate === null;

/** Minimal Supabase-compatible query chain used here (injectable for tests). */
interface QueryChain extends PromiseLike<{ data: unknown; error: { message?: string } | null; count?: number | null }> {
  eq(column: string, value: unknown): QueryChain;
  gte(column: string, value: unknown): QueryChain;
  lte(column: string, value: unknown): QueryChain;
  order(column: string, options: { ascending: boolean }): QueryChain;
  range(from: number, to: number): QueryChain;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
}
interface DbClient {
  from(table: string): { select(columns: string, options?: { count: 'exact'; head: true }): QueryChain };
}
type CountClient = DbClient;

async function countRows(sb: CountClient, s: LedgerScopeInput, ranged: boolean): Promise<number | null> {
  try {
    let q: QueryChain = sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', s.userId);
    if (ranged && !isAllTime(s)) q = q.gte('date', s.startDate).lte('date', s.endDate);
    const { count, error } = await q;
    return error || typeof count !== 'number' ? null : count;
  } catch {
    return null;
  }
}

export async function readAuthoritativeLedger(sb: unknown, scope: LedgerScopeInput): Promise<LedgerRead> {
  let requests = 0;
  const counting = new Proxy(sb as object, {
    get(t, p, r) {
      const v = Reflect.get(t, p, r);
      if (p !== 'from' || typeof v !== 'function') return v;
      return (table: string) => { requests++; return v.call(t, table); };
    },
  }) as unknown as RangeFetchClient & CountClient;

  let last: LedgerRead | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const fetchOpts = {
      pageSize: LEDGER_PAGE_SIZE,
      maxRows: LEDGER_MAX_ROWS,
      columns: [...LEDGER_EXTRA_COLUMNS, ...(scope.extraColumns ?? [])],
    };
    const fetching = isAllTime(scope)
      ? fetchAllTransactions(counting, { userId: scope.userId }, fetchOpts)
      : fetchTransactionsInRange(counting, { userId: scope.userId, startDate: String(scope.startDate), endDate: String(scope.endDate) }, fetchOpts);
    const read = await fetching.catch((e: unknown) => ({ rows: [], rowsFetched: 0, pagesFetched: 0, complete: false, truncated: false, duplicatesSkipped: 0, error: e instanceof Error ? e.message : 'read_failed' }));
    if (read.error) {
      return { status: 'unavailable', rows: [], rowsFetched: 0, complete: false, truncated: false, countVerified: false, attempts: attempt, requests, error: read.error };
    }
    const expected = await countRows(counting, scope, true);
    const countVerified = expected !== null && expected === read.rowsFetched;
    let rows = read.rows as LedgerRow[];
    if (scope.importIds && scope.importIds.length > 0) {
      const allowed = new Set(scope.importIds);
      rows = rows.filter(r => r.import_id && allowed.has(String(r.import_id)));
    }
    last = {
      status: read.complete && countVerified ? 'ok' : 'partial',
      rows,
      rowsFetched: read.rowsFetched,
      complete: read.complete && countVerified,
      truncated: read.truncated,
      countVerified,
      attempts: attempt,
      requests,
      error: null,
    };
    if (last.status === 'ok' || read.truncated) break; // a truncated read will not improve on retry
  }
  const result = last!;
  if (result.status === 'ok' && result.rowsFetched === 0) {
    const any = await countRows(counting, scope, false);
    if (any === 0) return { ...result, status: 'no_data', requests };
    if (any === null) return { ...result, status: 'unavailable', complete: false, error: 'count_failed', requests };
  }
  return { ...result, requests };
}

/** Account labels for imports (statement issuer + last 4 when stored, else file name). */
export async function loadAccountLabels(sb: unknown, userId: string): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  type ImportRow = { id?: unknown; file_url?: unknown; statement_breakdown_json?: { statement_meta?: { issuer?: unknown; account_last4?: unknown } } | null };
  const read = async (cols: string) => pagedSelectAll<ImportRow>(() =>
    (sb as DbClient).from('imports').select(cols).eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
  );
  let r = await read('id, file_url, statement_breakdown_json, created_at');
  if (r.error) r = await read('id, file_url, created_at');
  for (const row of r.rows) {
    const id = String(row.id ?? '');
    if (!id) continue;
    const meta = row.statement_breakdown_json?.statement_meta;
    const issuer = typeof meta?.issuer === 'string' && meta.issuer ? meta.issuer : null;
    const last4 = typeof meta?.account_last4 === 'string' && /^\d{4}$/.test(meta.account_last4) ? meta.account_last4 : null;
    const file = String(row.file_url ?? '').split('/').pop() || null;
    labels.set(id, issuer ? `${issuer}${last4 ? ` ••${last4}` : ''}` : file || 'Imported statement');
  }
  return labels;
}

/** Profile currency (ISO 4217), default CAD. A missing column never fails the request. */
export async function loadProfileCurrency(sb: unknown, userId: string): Promise<string> {
  try {
    const { data } = await (sb as DbClient).from('profiles').select('currency').eq('id', userId).maybeSingle();
    const currency = data?.currency;
    if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) return currency;
  } catch { /* default */ }
  return 'CAD';
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate a requested period and optional account scope. */
export function parseScope(body: Record<string, unknown>): { ok: true; startDate: string; endDate: string; importIds: string[] | null } | { ok: false; error: string } {
  const startDate = String(body.startDate ?? '');
  const endDate = String(body.endDate ?? '');
  if (!YMD.test(startDate) || !YMD.test(endDate) || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    return { ok: false, error: 'startDate and endDate are required (YYYY-MM-DD).' };
  }
  if (startDate > endDate) return { ok: false, error: 'startDate must not be after endDate.' };
  let importIds: string[] | null = null;
  if (body.importIds !== undefined && body.importIds !== null) {
    if (!Array.isArray(body.importIds) || body.importIds.length > 100 || !body.importIds.every(x => typeof x === 'string' && UUID.test(x))) {
      return { ok: false, error: 'importIds must be a list of up to 100 import ids.' };
    }
    importIds = [...new Set(body.importIds as string[])];
  }
  return { ok: true, startDate, endDate, importIds };
}

/**
 * Scope for the rows-only export: BOTH dates omitted = all time (no date filter, undated rows kept);
 * otherwise both dates are required and validated exactly as parseScope. importIds as parseScope.
 */
export function parseRowsScope(body: Record<string, unknown>): { ok: true; startDate: string | null; endDate: string | null; importIds: string[] | null } | { ok: false; error: string } {
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  if (has(body.startDate) !== has(body.endDate)) return { ok: false, error: 'Give both startDate and endDate (YYYY-MM-DD), or neither for all time.' };
  if (has(body.startDate)) return parseScope(body);
  const ids = parseScope({ ...body, startDate: '2000-01-01', endDate: '2000-01-01' });
  if (!ids.ok) return ids;
  return { ok: true, startDate: null, endDate: null, importIds: ids.importIds };
}
