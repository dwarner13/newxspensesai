import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { TAX_SECTIONS, SECTION_BUCKETS, classifyTransactions, groupIntoBuckets } from '../../src/shared/financial-sections';
import { readAuthoritativeLedger } from './_shared/financial-ledger';
import { buildPeriodAggregate } from '../../src/shared/period-aggregate';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestBody = {
  year?: number;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}') as RequestBody;
    const userId = auth.userId;
    const sb = admin();

    const currentYear = new Date().getFullYear();
    const year = body.year && body.year >= 2015 && body.year <= 2100 ? body.year : currentYear;
    // FST-2 S3: complete, count-verified read of the whole year (was .limit(5000), cut to the
    // newest 1,000 rows by the API — a busy year lost its earliest months while reported 'verified').
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const read = await readAuthoritativeLedger(sb, { userId, startDate, endDate });
    if (read.status === 'unavailable') {
      return { statusCode: 503, headers, body: JSON.stringify({ year, error: 'Tax summary could not be loaded; nothing was guessed.', queryStatus: 'query_error' }) };
    }
    if (read.status === 'partial') {
      return { statusCode: 200, headers, body: JSON.stringify({ year, sections: [], grandTotal: null, transactionCount: read.rowsFetched, queryStatus: 'partial', message: 'Not every transaction for this year could be read consistently, so no section totals are given.' }) };
    }
    const txns = read.rows as any[];

    if (txns.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          year,
          sections: [],
          grandTotal: 0,
          transactionCount: 0,
          queryStatus: 'verified_zero',
          dataStatus: read.status === 'no_data' ? 'no_data' : 'no_transactions_in_year',
        }),
      };
    }

    // Classify using canonical first-match-wins
    const classified = classifyTransactions(txns, TAX_SECTIONS);

    // Build section summaries with buckets
    const sections = TAX_SECTIONS.map(section => {
      const sectionResult = classified.get(section.id);
      const sectionTxns = sectionResult?.transactions || [];
      const total = sectionResult?.total ?? 0;
      const bucketDefs = SECTION_BUCKETS[section.id];

      let buckets: { label: string; total: number; count: number }[] = [];
      if (bucketDefs) {
        const bucketResults = groupIntoBuckets(sectionTxns, bucketDefs);
        buckets = bucketResults
          .filter(b => b.count > 0)
          .map(b => ({
            label: b.label,
            total: Math.round(b.amount * 100) / 100,
            count: b.count,
          }));
      }

      return {
        id: section.id,
        title: section.title,
        total: Math.round(total * 100) / 100,
        count: sectionTxns.length,
        buckets,
      };
    }).filter(s => s.count > 0);

    // grandTotal keeps its meaning (sum of all sections) for compatibility; expense and income
    // totals now exclude internal movement (transfers, card/loan payments both sides, savings).
    const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);
    const sectioned = sections.reduce((n, sec) => n + sec.count, 0);
    const agg = buildPeriodAggregate(txns, { fetch: { complete: true, truncated: false, rowsFetched: txns.length }, period: { start: startDate, end: endDate } });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        year,
        sections,
        grandTotal: Math.round(grandTotal * 100) / 100,
        transactionCount: txns.length,
        // Rows no section claims: their type has no direction (e.g. 'Credit'); disclosed, never guessed.
        unsectionedCount: txns.length - sectioned,
        // Reconciliation with the shared engine (same rows, same definitions as every other surface).
        engine: { incomeCents: agg.cents.income, spendingCents: agg.cents.spending, debtRepaymentsInCents: agg.cents.debtRepaymentsIn, transferInCents: agg.cents.transferIn, transferOutCents: agg.cents.transferOut, debtPaymentsCents: agg.cents.debtPayments, savingsInvestmentCents: agg.cents.savingsInvestment },
        countVerified: read.countVerified,
        notice: 'Organized for your accountant. Not tax advice; deductibility is not determined.',
        queryStatus: 'verified',
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error?.message || 'tax-summary failed',
        queryStatus: 'query_error',
      }),
    };
  }
};
