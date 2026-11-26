/**
 * financial-export — FST-2 S2. Authoritative CSV exports (transactions, accountant-ready, tax year).
 *
 * POST { kind: 'transactions' | 'accountant', startDate, endDate, importIds? }
 *    | { kind: 'tax', year: 2015…2100, importIds? }
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
import { readAuthoritativeLedger, loadAccountLabels, loadProfileCurrency, parseScope } from './_shared/financial-ledger';
import { buildExportCsv, type ExportKind } from './_shared/financial-export-csv';
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

const KINDS: readonly ExportKind[] = ['transactions', 'accountant', 'tax'];

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed. Use POST.' });

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return json(401, { error: 'Unauthorized' });
  const userId = auth.userId;

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const kind = body.kind as ExportKind;
  if (!KINDS.includes(kind)) return json(400, { error: "kind must be 'transactions', 'accountant' or 'tax'." });

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

  if (read.status === 'unavailable') return json(503, { status: 'unavailable', error: 'The export could not be prepared right now. No file was created. Please try again.' });
  if (read.status === 'no_data') return json(200, { status: 'no_data', message: 'No transactions have been imported yet, so there is nothing to export.' });
  if (read.status === 'partial') {
    return json(409, { status: 'partial', transactionsRead: read.rowsFetched, error: 'Not every transaction could be read consistently, so no file was created (an incomplete export would mislead your accountant). Please try again.' });
  }

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
  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Financial-Status': read.rows.length === 0 ? 'verified_zero' : 'verified',
      'X-Transaction-Count': String(out.rowCount),
    },
    body: out.csv,
  };
};
