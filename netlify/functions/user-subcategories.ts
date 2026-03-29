import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const BUILT_IN: Record<string, string[]> = {
  'Food & Dining': ['Restaurants', 'Fast Food', 'Coffee & Drinks', 'Groceries', 'Delivery'],
  'Transportation': ['Gas & Fuel', 'Parking', 'Transit', 'Vehicle Insurance', 'Vehicle Services', 'Rideshare'],
  'Personal Care': ['Hair & Beauty', 'Massage & Wellness', 'Gym & Fitness', 'Clothing'],
  'Healthcare': ['Dental', 'Chiropractic', 'Pharmacy', 'Medical', 'Vision'],
  'Shopping': ['Electronics', 'Auto & Hardware', 'Home & Garden', 'General'],
  'Subscriptions': ['Software & AI', 'Streaming', 'Memberships', 'News & Media'],
  'Entertainment': ['Gaming & Lottery', 'Movies & Events', 'Sports', 'Hobbies'],
  'Bank Fees': ['Banking', 'Credit Services', 'Loans', 'ATM'],
  'Transfers': ['e-Transfer', 'Bill Payment', 'ATM Withdrawal'],
  'Income': ['Business Income', 'Government Rebate', 'Tax Refund', 'Investment'],
  'Housing': ['Rent', 'Mortgage', 'Utilities', 'Repairs', 'Insurance'],
  'Debt Payments': ['Credit Card', 'Line of Credit', 'Loan Payment'],
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const sb = serverSupabase();

  if (event.httpMethod === 'GET') {
    const params = new URLSearchParams(event.rawQuery || '');
    const category = params.get('category') || '';

    let custom: any[] = [];
    try {
      let query = sb.from('user_subcategories').select('*').eq('user_id', auth.userId);
      if (category) query = query.eq('category', category);
      const { data } = await query;
      custom = data ?? [];
    } catch { /* table may not exist */ }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        built_in: category ? (BUILT_IN[category] ?? []) : BUILT_IN,
        custom,
      }),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { category, subcategory, cra_line, deductible_pct } = body;
    if (!category || !subcategory) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'category and subcategory required' }) };
    }

    try {
      const { error } = await sb.from('user_subcategories').upsert({
        user_id: auth.userId,
        category,
        subcategory,
        cra_line: cra_line ?? null,
        deductible_pct: deductible_pct ?? null,
      }, { onConflict: 'user_id,category,subcategory' });

      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
