import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

type RequestBody = {
  id?: string;
  table?: 'transactions' | 'transactions_staging';
};

type Row = Record<string, any>;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildSignedAmount(row: Row): number {
  let amount = toNumber(row.amount);
  const type = String(row.type || '').toLowerCase();
  const direction = String(row.direction || '').toLowerCase();
  const isDebit =
    row.is_debit === true ||
    direction === 'out' ||
    direction === 'debit' ||
    type === 'debit' ||
    type === 'expense';
  const isCredit =
    direction === 'in' ||
    direction === 'credit' ||
    type === 'credit' ||
    type === 'income';
  if (isDebit && amount > 0) amount = -Math.abs(amount);
  if (isCredit && amount < 0) amount = Math.abs(amount);
  return amount;
}

function normalizeCommitted(row: Row) {
  return {
    id: String(row.id),
    table: 'transactions',
    date: row.posted_at || row.date || row.occurred_at || null,
    merchant: row.merchant_name || row.merchant || null,
    description: row.description || null,
    memo: row.memo || null,
    amount: toNumber(row.amount),
    signed_amount: buildSignedAmount(row),
    category: row.category || null,
    type: row.type || null,
    import_id: row.import_id || null,
    document_id: row.document_id || null,
    status: 'committed',
  };
}

function normalizePending(row: Row) {
  const data = row?.data_json && typeof row.data_json === 'object' ? row.data_json : {};
  return {
    id: String(row.id),
    table: 'transactions_staging',
    date: data.date || data.posted_at || null,
    merchant: data.merchant || null,
    description: data.description || null,
    memo: data.memo || null,
    amount: toNumber(data.amount),
    signed_amount: toNumber(data.amount),
    category: data.category || null,
    type: data.type || null,
    import_id: row.import_id || null,
    document_id: data.document_id || null,
    status: 'pending',
  };
}

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
    const id = String(body.id || '').trim();
    const table = body.table === 'transactions_staging' ? 'transactions_staging' : 'transactions';

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
    }
    const sb = admin();

    if (table === 'transactions') {
      const { data, error } = await sb
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ row: normalizeCommitted(data) }),
      };
    }

    const { data, error } = await sb
      .from('transactions_staging')
      .select('id,user_id,import_id,parsed_at,data_json')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ row: normalizePending(data) }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'tx-get failed' }),
    };
  }
};

