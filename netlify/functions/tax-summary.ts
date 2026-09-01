import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { TAX_SECTIONS, SECTION_BUCKETS, classifyTransactions, groupIntoBuckets } from '../../src/shared/financial-sections';
import { getYearRange } from '../../src/shared/financial-dates';

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
    const year = body.year && body.year >= 2020 && body.year <= 2030 ? body.year : currentYear;
    const { start, end } = getYearRange(year);

    // Fetch all transactions for the year
    const { data: txns, error: txError } = await sb
      .from('transactions')
      .select('category, subcategory, merchant_name, merchant, amount, date, type')
      .eq('user_id', userId)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .limit(5000);

    if (txError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: txError.message, queryStatus: 'query_error' }),
      };
    }

    if (!txns || txns.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          year,
          sections: [],
          grandTotal: 0,
          transactionCount: 0,
          queryStatus: 'verified_zero',
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

    const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        year,
        sections,
        grandTotal: Math.round(grandTotal * 100) / 100,
        transactionCount: txns.length,
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
