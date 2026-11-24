/**
 * PB-01: actual transaction coverage for the signed-in user (count, earliest and latest date).
 *
 * Gives Prime a server-verified answer to "what period does my data cover?" so it can say
 * "your imported history runs from X to Y" instead of filling a requested period with rows
 * from another period. Owner-scoped: every query is filtered by the verified user id.
 * Counts and dates only — no merchants, amounts or descriptions.
 */

export interface TransactionCoverage {
  transactionCount: number;
  earliestDate: string | null;
  latestDate: string | null;
}

interface CoverageQuery {
  select(columns: string, opts?: { count?: 'exact'; head?: boolean }): CoverageQuery;
  eq(column: string, value: unknown): CoverageQuery;
  not(column: string, op: string, value: unknown): CoverageQuery;
  order(column: string, opts: { ascending: boolean }): CoverageQuery;
  limit(n: number): PromiseLike<{ data: Array<{ date?: unknown }> | null; error: unknown }>;
}
interface CountQuery {
  eq(column: string, value: unknown): PromiseLike<{ count: number | null; error: unknown }>;
}
export interface CoverageClient {
  from(table: 'transactions'): {
    select(columns: string, opts?: { count?: 'exact'; head?: boolean }): CoverageQuery & CountQuery;
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function dateOnly(v: unknown): string | null {
  return typeof v === 'string' && ISO_DATE.test(v) ? v.slice(0, 10) : null;
}

/** Returns null when coverage cannot be established (any query error or no user). */
export async function fetchTransactionCoverage(
  client: CoverageClient,
  userId: string,
): Promise<TransactionCoverage | null> {
  if (!userId) return null;
  try {
    const [countRes, firstRes, lastRes] = await Promise.all([
      client.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      client.from('transactions').select('date').eq('user_id', userId).not('date', 'is', null).order('date', { ascending: true }).limit(1),
      client.from('transactions').select('date').eq('user_id', userId).not('date', 'is', null).order('date', { ascending: false }).limit(1),
    ]);
    if (countRes.error || firstRes.error || lastRes.error) return null;
    return {
      transactionCount: typeof countRes.count === 'number' ? countRes.count : 0,
      earliestDate: dateOnly(firstRes.data?.[0]?.date),
      latestDate: dateOnly(lastRes.data?.[0]?.date),
    };
  } catch {
    return null;
  }
}

/**
 * Coverage note for the model. When a requested period is given and lies wholly outside
 * the imported range, the note says so explicitly.
 */
export function formatCoverageNote(
  coverage: TransactionCoverage,
  requested?: { startDate?: string; endDate?: string } | null,
): string {
  const lines: string[] = ['DATA COVERAGE (server-verified, imported transactions only):'];
  if (coverage.transactionCount === 0 || !coverage.earliestDate || !coverage.latestDate) {
    lines.push('- The user has no imported transactions yet.');
  } else {
    lines.push(`- ${coverage.transactionCount} imported transactions, dated ${coverage.earliestDate} through ${coverage.latestDate}.`);
    const rs = requested?.startDate;
    const re = requested?.endDate;
    if (rs && re) {
      if (rs > coverage.latestDate) {
        lines.push(`- The requested period (${rs} through ${re}) is AFTER the latest imported transaction (${coverage.latestDate}). Say there is no imported data for that period yet and state the available coverage.`);
      } else if (re < coverage.earliestDate) {
        lines.push(`- The requested period (${rs} through ${re}) is BEFORE the earliest imported transaction (${coverage.earliestDate}). Say there is no imported data for that period and state the available coverage.`);
      }
    }
  }
  lines.push('- This data comes from statements and files the user imported. There is no live bank connection; do not describe it as linked or connected accounts.');
  lines.push('- Never fill a requested period with transactions dated outside it.');
  return lines.join('\n');
}

/** The first explicit period (startDate and endDate) among proven-empty P3.1C results, if any. */
export function emptyRequestedPeriod(
  results: Array<{ status: string; authoritative?: boolean; scope?: { startDate?: string; endDate?: string } }> | null | undefined,
): { startDate: string; endDate: string } | null {
  for (const r of results ?? []) {
    if (r.status === 'successful_empty' && r.authoritative === true && r.scope?.startDate && r.scope?.endDate) {
      return { startDate: r.scope.startDate, endDate: r.scope.endDate };
    }
  }
  return null;
}
