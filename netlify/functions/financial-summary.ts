/**
 * financial-summary — FST-2 S2b. Authoritative totals for the app's screens.
 *
 * POST { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', importIds?: string[] }
 * Authorization: Bearer <Supabase access token>   (the customer is taken ONLY from the token)
 *
 * One complete, count-verified read (financial-ledger) → buildPeriodAggregate (the shared engine,
 * D-1 included) → the same definitions as Prime, Tag and financial-export. Browser-supplied totals
 * are never accepted. Totals are returned ONLY when every transaction was read: a partial read
 * returns status 'partial' with no totals (fails closed). No caching (Cache-Control: no-store).
 * XspensesAI organizes data for the customer and their accountant; this endpoint gives no tax advice.
 */
import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { readAuthoritativeLedger, loadAccountLabels, loadProfileCurrency, parseScope } from './_shared/financial-ledger';
import { buildPeriodAggregate, toCompletenessOutput } from '../../src/shared/period-aggregate';
import { computeIntegritySignals } from '../../src/shared/financial-integrity-signals';
import { merchantGroupingKey } from './_shared/merchantNormalize';
import { buildSummaryV2 } from './_shared/financial-summary-v2';
import { loadStatementCoverage, type CoverageDbClient } from '../../src/shared/statement-coverage';

// fst2-summary-2 (owner 2026-11-26): additive to -1. Net cash flow = deposits − withdrawals; labels,
// refunds, reconciled breakdown, statement coverage and comparability, typed insights.
export const SUMMARY_CONTRACT_VERSION = 'fst2-summary-2';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (statusCode: number, body: unknown) => ({ statusCode, headers, body: JSON.stringify(body) });
const dollars = (c: number) => Math.round(c) / 100;

export type SummaryStatus = 'verified' | 'verified_zero' | 'partial' | 'no_data' | 'unavailable';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed. Use POST.' });

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return json(401, { error: 'Unauthorized' });
  const userId = auth.userId;

  let body: Record<string, unknown>;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON body' }); }
  const scope = parseScope(body);
  if (!scope.ok) return json(400, { error: scope.error });

  const started = Date.now();
  const sb = admin();
  const [read, currency, accounts, coverage] = await Promise.all([
    readAuthoritativeLedger(sb, { userId, startDate: scope.startDate, endDate: scope.endDate, importIds: scope.importIds }),
    loadProfileCurrency(sb, userId),
    loadAccountLabels(sb, userId).catch(() => new Map<string, string>()),
    // Statement coverage (the statements' own periods); an error yields status 'query_error', so nothing is comparable.
    loadStatementCoverage(sb as unknown as CoverageDbClient, userId),
  ]);

  const accountScope = scope.importIds
    ? scope.importIds.map(id => ({ importId: id, label: accounts.get(id) ?? 'Imported statement' }))
    : 'all_imported_accounts' as const;
  const scopeOut = {
    startDate: scope.startDate,
    endDate: scope.endDate,
    accounts: accountScope,
    currency,
    currencyBasis: 'profile_assumed' as const,
    label: `${scope.startDate} to ${scope.endDate}; ${scope.importIds ? `${scope.importIds.length} selected account(s)` : 'all imported accounts'}; ${currency}`,
  };
  const base = { contractVersion: SUMMARY_CONTRACT_VERSION, scope: scopeOut, generatedAt: new Date().toISOString() };
  const perf = { durationMs: Date.now() - started, databaseRequests: read.requests, attempts: read.attempts };

  if (read.status === 'unavailable') {
    return json(503, { ...base, status: 'unavailable' satisfies SummaryStatus, message: 'Your financial figures could not be loaded right now. Nothing was guessed. Please try again.', perf });
  }
  if (read.status === 'no_data') {
    return json(200, { ...base, status: 'no_data' satisfies SummaryStatus, transactionCount: 0, message: 'No transactions have been imported yet.', perf });
  }
  if (read.status === 'partial') {
    return json(200, {
      ...base,
      status: 'partial' satisfies SummaryStatus,
      transactionsRead: read.rowsFetched,
      totals: null,
      message: 'Not every transaction could be read consistently, so no totals are shown. Please try again.',
      perf,
    });
  }

  const agg = buildPeriodAggregate(read.rows, {
    fetch: { complete: true, truncated: false, rowsFetched: read.rows.length },
    period: { start: scope.startDate, end: scope.endDate },
  });
  const signals = computeIntegritySignals(read.rows, { merchantKey: merchantGroupingKey });
  const status: SummaryStatus = read.rows.length === 0 ? 'verified_zero' : 'verified';
  const c = agg.cents;

  return json(200, {
    ...base,
    status,
    transactionCount: read.rows.length,
    totals: {
      cents: { ...c },
      amounts: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, dollars(v)])),
    },
    counts: { ...agg.counts },
    categories: agg.categories.map(e => ({
      category: e.category, purpose: e.purpose, direction: e.direction,
      totalCents: e.totalCents, amount: dollars(e.totalCents), count: e.count, firstDate: e.firstDate, lastDate: e.lastDate,
    })),
    signals: {
      possibleDuplicates: { ...signals.possibleDuplicates, amount: dollars(signals.possibleDuplicates.cents) },
      possibleRefunds: { ...signals.possibleRefunds, amount: dollars(signals.possibleRefunds.cents) },
    },
    completeness: { ...toCompletenessOutput(agg), countVerified: read.countVerified },
    ...buildSummaryV2({ rows: read.rows, agg, scope: { startDate: scope.startDate, endDate: scope.endDate }, coverage, accountLabels: accounts }),
    notice: 'Organized financial data for you and your accountant. Not tax advice; deductibility is not determined by XspensesAI.',
    perf,
  });
};
