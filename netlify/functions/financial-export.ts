/**
 * financial-export — FST-2 S2. Authoritative CSV exports (transactions, accountant-ready, tax year).
 *
 * POST { kind: 'transactions' | 'accountant', startDate, endDate, importIds? }
 *    | { kind: 'tax', year: 2015…2100, importIds? }
 *    | { kind: 'rows', startDate?, endDate?, importIds? }   — Transactions page export (UI/UX TX-PAGING):
 *      plain CSV Date,Merchant,Amount (engine-direction sign),Category,Subcategory,Statement; both
 *      dates omitted = all time with no date filter (undated rows kept). Same completeness rules.
 * Authorization: Bearer <Supabase access token>   (customer taken ONLY from the token)
 *
 * Fails closed: a file is produced ONLY from a complete, count-verified read. Otherwise:
 *   partial → 409 JSON (no file), unavailable → 503 JSON, no_data → 200 JSON { status: 'no_data' }.
 * The file's header states scope, completeness and reconciliation totals that the rows add up to.
 * No caching. Not tax advice.
 */
import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { readAuthoritativeLedger, loadAccountLabels, loadProfileCurrency, parseScope, parseRowsScope, LEDGER_MAX_ROWS, type LedgerRead } from './_shared/financial-ledger';
import { buildExportCsv, buildRowsCsv, type ExportKind } from './_shared/financial-export-csv';
import { buildPeriodAggregate } from '../../src/shared/period-aggregate';
import { computeIntegritySignals } from '../../src/shared/financial-integrity-signals';
import { merchantGroupingKey } from './_shared/merchantNormalize';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition, X-Financial-Status, X-Transaction-Count',
  'Cache-Control': 'no-store',
};
const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const KINDS: readonly (ExportKind | 'rows')[] = ['transactions', 'accountant', 'tax', 'rows'];

/** Synchronous function responses are capped at 6 MB; refuse honestly instead of a broken download. */
export const EXPORT_MAX_BYTES = 5_500_000;

function refuseIncomplete(read: LedgerRead) {
  if (read.status === 'unavailable') return json(503, { status: 'unavailable', error: 'The export could not be prepared right now. No file was created. Please try again.' });
  if (read.status === 'no_data') return json(200, { status: 'no_data', message: 'No transactions have been imported yet, so there is nothing to export.' });
  if (read.status === 'partial' && read.truncated) {
    return json(409, { status: 'partial', reason: 'over_limit', limit: LEDGER_MAX_ROWS, transactionsRead: read.rowsFetched, error: `This scope has more than ${LEDGER_MAX_ROWS.toLocaleString('en-CA')} transactions, so no file was created. Choose a year, date range or statement and export again.` });
  }
  if (read.status === 'partial') {
    return json(409, { status: 'partial', transactionsRead: read.rowsFetched, error: 'Not every transaction could be read consistently, so no file was created (an incomplete export would mislead your accountant). Please try again.' });
  }
  return null;
}

function csvResponse(csv: string, filename: string, rowCount: number) {
  if (Buffer.byteLength(csv, 'utf8') > EXPORT_MAX_BYTES) {
    return json(413, { status: 'too_large', transactionCount: rowCount, error: 'This export is too large to download in one file, so no file was created. Choose a year, date range or statement and export again.' });
  }
  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Financial-Status': rowCount === 0 ? 'verified_zero' : 'verified',
      'X-Transaction-Count': String(rowCount),
    },
    body: csv,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed. Use POST.' });

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return json(401, { error: 'Unauthorized' });
  const userId = auth.userId;

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const requested = body.kind as ExportKind | 'rows';
  if (!KINDS.includes(requested)) return json(400, { error: "kind must be 'transactions', 'accountant', 'tax' or 'rows'." });

  if (requested === 'rows') {
    const rs = parseRowsScope(body);
    if (!rs.ok) return json(400, { error: rs.error });
    const sbRows = admin();
    const [read, accounts] = await Promise.all([
      readAuthoritativeLedger(sbRows, { userId, startDate: rs.startDate, endDate: rs.endDate, importIds: rs.importIds, extraColumns: ['posted_at'] }),
      loadAccountLabels(sbRows, userId).catch(() => new Map<string, string>()),
    ]);
    const refused = refuseIncomplete(read);
    if (refused) return refused;
    const out = buildRowsCsv({ rows: read.rows, accounts });
    const span = rs.startDate ? `${rs.startDate}-to-${rs.endDate}` : 'all-time';
    return csvResponse(out.csv, `xspensesai-transactions-${rs.importIds ? 'statement-' : ''}${span}.csv`, out.rowCount);
  }
  const kind: ExportKind = requested;

  let scopeBody = body;
  if (kind === 'tax') {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2015 || year > 2100) return json(400, { error: 'year (2015–2100) is required for a tax export.' });
    scopeBody = { ...body, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  const scope = parseScope(scopeBody);
  if (!scope.ok) return json(400, { error: scope.error });

  const sb = admin();
  const [read, currency, accounts] = await Promise.all([
    readAuthoritativeLedger(sb, { userId, startDate: scope.startDate, endDate: scope.endDate, importIds: scope.importIds }),
    loadProfileCurrency(sb, userId),
    loadAccountLabels(sb, userId).catch(() => new Map<string, string>()),
  ]);

  const refused = refuseIncomplete(read);
  if (refused) return refused;

  const agg = buildPeriodAggregate(read.rows, {
    fetch: { complete: true, truncated: false, rowsFetched: read.rows.length },
    period: { start: scope.startDate, end: scope.endDate },
  });
  const signals = computeIntegritySignals(read.rows, { merchantKey: merchantGroupingKey });
  const accountScopeLabel = scope.importIds
    ? `accounts: ${scope.importIds.map(id => accounts.get(id) ?? 'Imported statement').join(', ')}`
    : 'all imported accounts';
  const out = buildExportCsv({
    kind, rows: read.rows, startDate: scope.startDate, endDate: scope.endDate, currency, accounts, accountScopeLabel,
    agg, signals, countVerified: read.countVerified,
  });
  const filename = kind === 'tax' ? `xspensesai-tax-${scope.startDate.slice(0, 4)}.csv` : `xspensesai-${kind}-${scope.startDate}-to-${scope.endDate}.csv`;
  return csvResponse(out.csv, filename, out.rowCount);
};
