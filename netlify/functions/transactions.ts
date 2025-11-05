/**
 * 📊 Transactions API Endpoint
 * 
 * GET /transactions
 * - Returns recent transactions with items count
 * - Auth-scoped by userId (from X-User-Id header or query param)
 * - Order by date desc, limit 200
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';
import { buildResponseHeaders } from './chat';

/**
 * Extract userId from headers or query params
 */
function extractUserId(event: any): string {
  // Try X-User-Id header
  const headerUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
  if (headerUserId) {
    return headerUserId;
  }
  
  // Try query param
  const queryUserId = event.queryStringParameters?.userId;
  if (queryUserId) {
    return queryUserId;
  }
  
  // Try body (for POST)
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.userId) {
        return body.userId;
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }
  
  throw new Error('Unauthorized: userId required (X-User-Id header or userId query param)');
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      },
      body: '',
    };
  }

  // Only GET supported
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 0.5,
      }),
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    // Extract userId
    const userId = extractUserId(event);
    
    // Get limit from query (default 200, max 200)
    const limit = Math.min(
      parseInt(event.queryStringParameters?.limit || '200', 10),
      200
    );
    
    // Optional: category filter
    const category = event.queryStringParameters?.category;
    
    // Query transactions with items count
    let query = admin()
      .from('transactions')
      .select(`
        *,
        transaction_items (*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    
    // Apply category filter if provided
    if (category && category !== 'All' && category !== 'Uncategorized') {
      query = query.eq('category', category);
    } else if (category === 'Uncategorized') {
      query = query.is('category', null);
    }
    
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('[Transactions] Query error:', error);
      return {
        statusCode: 500,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.5,
        }),
        body: JSON.stringify({ ok: false, error: 'Failed to fetch transactions' }),
      };
    }
    
    // Transform: add items count and format
    const transformed = (transactions || []).map((tx: any) => ({
      id: tx.id,
      userId: tx.user_id,
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount,
      currency: tx.currency || 'USD',
      category: tx.category || null,
      subcategory: tx.subcategory || null,
      source: tx.source || 'ocr',
      createdAt: tx.created_at,
      itemsCount: tx.transaction_items?.length || 0,
      items: tx.transaction_items || [],
      // Confidence from meta if available
      confidence: tx.meta?.confidence || null,
    }));
    
    return {
      statusCode: 200,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 0.5,
      }),
      body: JSON.stringify({
        ok: true,
        data: transformed,
        count: transformed.length,
      }),
    };
  } catch (err: any) {
    console.error('[Transactions] Handler error:', err);
    
    // Unauthorized error
    if (err.message?.includes('Unauthorized')) {
      return {
        statusCode: 401,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 0.5,
        }),
        body: JSON.stringify({ ok: false, error: err.message }),
      };
    }
    
    return {
      statusCode: 500,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 0.5,
      }),
      body: JSON.stringify({ ok: false, error: 'Internal server error' }),
    };
  }
};
