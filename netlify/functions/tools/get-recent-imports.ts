/**
 * Get Recent Imports Tool for Prime
 * 
 * Purpose: Let Prime summarize recent document imports and transactions
 * 
 * Returns: Recent uploads, OCR results, and transaction counts
 */

import { Handler } from '@netlify/functions';
import { admin } from '../_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, days = 7, limit = 10 } = JSON.parse(event.body || '{}');
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    const sb = admin();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get recent documents
    const { data: docs, error: docsErr } = await sb
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (docsErr) throw docsErr;

    // Get recent transactions linked to these documents
    const docIds = (docs || []).map(d => d.id);
    const { data: transactions, error: txErr } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .in('document_id', docIds)
      .order('created_at', { ascending: false });

    if (txErr) throw txErr;

    // Group transactions by document
    const txByDoc = (transactions || []).reduce((acc: any, tx: any) => {
      const docId = tx.document_id;
      if (!acc[docId]) acc[docId] = [];
      acc[docId].push(tx);
      return acc;
    }, {});

    // Build summary
    const imports = (docs || []).map((doc: any) => ({
      docId: doc.id,
      filename: doc.original_name,
      source: doc.source_type,
      status: doc.status,
      uploaded_at: doc.created_at,
      transaction_count: (txByDoc[doc.id] || []).length,
      needs_review: (txByDoc[doc.id] || []).filter((t: any) => t.review_status === 'needs_review').length,
      total_amount: (txByDoc[doc.id] || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    }));

    // Stats
    const stats = {
      total_documents: imports.length,
      total_transactions: (transactions || []).length,
      needs_review: (transactions || []).filter((t: any) => t.review_status === 'needs_review').length,
      auto_categorized: (transactions || []).filter((t: any) => t.review_status === 'auto').length,
      total_amount: (transactions || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        imports,
        stats,
        days
      })
    };
  } catch (e: any) {
    console.error('[Get Recent Imports Error]', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || 'Failed to get recent imports' })
    };
  }
};

