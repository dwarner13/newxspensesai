/**
 * Get Recent Import Summary - Tool for Prime
 * 
 * Returns summary of most recent document import
 * Prime can use this to answer "what did I upload recently?"
 */

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
    const { userId } = JSON.parse(event.body||'{}');
    if (!userId) return { statusCode:400, body: JSON.stringify({ error: 'Missing userId' }) };
    
    const sb = createClient(URL, SRK, { auth: { persistSession:false }});
    
    // Get most recent document
    const { data: doc } = await sb.from('user_documents')
      .select('id, original_name, source_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!doc) {
      return { 
        statusCode:200, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ found:false }) 
      };
    }

    // Get transactions from that document
    const { data: txs } = await sb.from('transactions')
      .select('id, date, merchant, amount, category, review_status')
      .eq('user_id', userId)
      .eq('document_id', doc.id);

    const totalAmount = (txs||[]).reduce((a,t)=>a+(t.amount||0),0);
    const needsReview = (txs||[]).filter(t=>t.review_status==='needs_review').length;

    return {
      statusCode:200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        found:true,
        document: {
          id: doc.id,
          name: doc.original_name,
          source: doc.source_type,
          created_at: doc.created_at
        },
        summary: {
          transactions: (txs||[]).length,
          total_amount: totalAmount,
          needs_review: needsReview,
          first_vendor: txs?.[0]?.merchant ?? null,
          date: txs?.[0]?.date ?? null
        }
      })
    };
  } catch (e:any) {
    return { statusCode:500, body: JSON.stringify({ error: e.message }) };
  }
};

