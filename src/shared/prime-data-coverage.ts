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
/** L-C: statement coverage of the requested period, per account (from statement-coverage.ts). */
export interface PeriodStatementCoverage {
  overall: 'complete' | 'incomplete' | 'none' | 'unknown';
  byAccount: Array<{ label: string; coverage: 'covered' | 'partial' | 'not_covered' }>;
}

export function formatCoverageNote(
  coverage: TransactionCoverage,
  requested?: { startDate?: string; endDate?: string } | null,
  statements?: PeriodStatementCoverage | null,
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
  // L-C: statement coverage for the requested period, per account (not inferred from transaction dates).
  if (statements && requested?.startDate && requested?.endDate) {
    const label = { complete: 'COMPLETE', incomplete: 'INCOMPLETE', none: 'NONE', unknown: 'UNKNOWN' }[statements.overall];
    lines.push(`- Statement coverage for ${requested.startDate} through ${requested.endDate}: ${label}.`);
    for (const a of statements.byAccount) lines.push(`  • ${a.label}: ${a.coverage.replace('_', ' ')}`);
    if (statements.overall === 'complete') lines.push('- Every imported account has a completed statement covering this period, so a zero result here is a confirmed zero for the imported accounts.');
    else lines.push('- Coverage is not complete, so a zero result is NOT confirmed zero spending — it only means no matching imported records.');
  }
  // L-C: always required on a zero / no-match answer.
  lines.push('- REQUIRED when your answer is zero or no matching transactions: state the exact period searched and this imported coverage (and the statement coverage when given). Never present missing statements as confirmed zero spending.');
  lines.push('- This data comes from statements and files the user imported. There is no live bank connection; do not describe it as linked or connected accounts.');
  lines.push('- Never fill a requested period with transactions dated outside it.');
  return lines.join('\n');
}

// ── L-C: server-side safeguard ──────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dateTokens(iso: string | null | undefined): string[] {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return [];
  const [y, m, d] = iso.split('-').map(Number);
  const name = MONTHS[m - 1];
  return [iso, `${name} ${d}`, `${name.slice(0, 3)} ${d}`, `${name} ${y}`, `${name.slice(0, 3)} ${y}`].map(t => t.toLowerCase());
}

/** True when the answer already states the imported coverage (any form of the earliest or latest date). */
export function answerMentionsCoverage(answer: string, coverage: TransactionCoverage): boolean {
  const text = String(answer || '').toLowerCase();
  const tokens = [...dateTokens(coverage.earliestDate), ...dateTokens(coverage.latestDate)];
  return tokens.some(t => text.includes(t));
}

/** One deterministic sentence appended when the model omitted the required coverage. */
export function buildCoverageGuardSentence(
  coverage: TransactionCoverage,
  requested: { startDate: string; endDate: string },
  statements?: PeriodStatementCoverage | null,
): string {
  const searched = `I searched ${requested.startDate} through ${requested.endDate}.`;
  if (coverage.transactionCount === 0 || !coverage.earliestDate || !coverage.latestDate) {
    return `${searched} You have no imported transactions yet, so this is not confirmed zero spending.`;
  }
  const range = `Your imported transactions run from ${coverage.earliestDate} to ${coverage.latestDate}`;
  const missing = statements?.byAccount.filter(a => a.coverage !== 'covered').map(a => a.label) ?? [];
  switch (statements?.overall) {
    case 'complete':
      return `${searched} ${range}, and every imported account has a statement covering that period, so this is a confirmed zero for those accounts.`;
    case 'incomplete':
      return `${searched} ${range}, but not every account has a statement for that period${missing.length ? ` (not covered: ${missing.join(', ')})` : ''}, so this may not be complete.`;
    case 'none':
      return `${searched} ${range}, and no imported statement covers that period, so this is not confirmed zero spending — there is no imported data for it yet.`;
    default:
      return `${searched} ${range}. Statement coverage for that period could not be fully confirmed, so this may not be complete.`;
  }
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
