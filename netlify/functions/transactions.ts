/**
 * Transactions API Endpoint
 * 
 * GET: Returns user's transactions with items
 * 
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - category: string (optional filter)
 */

import { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';

export interface TransactionWithItems {
  id: number;
  user_id: string;
  doc_id: string | null;
  kind: 'invoice' | 'receipt' | 'bank';
  date: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  category: string | null;
  subcategory: string | null;
  source: string | null;
  created_at: string;
  items?: Array<{
    id: number;
    name: string | null;
    qty: number | null;
    unit: string | null;
    price: number | null;
  }>;
}

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    // Get user ID from header
    const userId = event.headers['x-user-id'] || event.headers['X-User-Id'] || 'anonymous';
    
    if (userId === 'anonymous') {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Unauthorized: user ID required' })
      };
    }

    // Parse query params
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100); // Max 100
    const offset = parseInt(queryParams.offset || '0');
    const categoryFilter = queryParams.category || null;

    const sb = admin();

    // Build query
    let query = sb
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply category filter if provided
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('[Transactions] Query error:', txError);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: false, error: 'Failed to fetch transactions' })
      };
    }

    // Fetch items for each transaction
    const transactionsWithItems: TransactionWithItems[] = await Promise.all(
      (transactions || []).map(async (tx: any) => {
        const { data: items } = await sb
          .from('transaction_items')
          .select('*')
          .eq('transaction_id', tx.id)
          .order('id', { ascending: true });

        return {
          id: tx.id,
          user_id: tx.user_id,
          doc_id: tx.doc_id,
          kind: tx.kind,
          date: tx.date,
          merchant: tx.merchant,
          amount: tx.amount ? Number(tx.amount) : null,
          currency: tx.currency,
          category: tx.category,
          subcategory: tx.subcategory,
          source: tx.source,
          created_at: tx.created_at,
          items: (items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            qty: item.qty ? Number(item.qty) : null,
            unit: item.unit,
            price: item.price ? Number(item.price) : null
          }))
        };
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        data: transactionsWithItems,
        count: transactionsWithItems.length,
        limit,
        offset
      })
    };
  } catch (error: any) {
    console.error('[Transactions] Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ok: false, error: error?.message || 'Internal server error' })
    };
  }
};

