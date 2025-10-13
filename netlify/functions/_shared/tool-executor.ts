/**
 * Tool Executor - Runs tools and returns results
 * 
 * Maps tool names to endpoints or direct DB queries
 * Handles errors and retries
 */

import { supabaseAdmin } from '../supabase';

type ToolContext = {
  userId: string;
  convoId: string;
};

export async function executeTool(
  name: string, 
  args: any, 
  ctx: ToolContext
): Promise<{ ok: boolean; result?: any; error?: string }> {
  console.log(`[Tool] Executing ${name}`, args);
  
  try {
    switch (name) {
      case 'searchEmail':
        return await callEndpoint('/tools/email-search', {
          userId: ctx.userId,
          query: args.query,
          days: args.days || 90,
          limit: args.limit || 5
        });
      
      case 'fetchAttachments':
        return await callEndpoint('/tools/email-fetch-attachments', {
          userId: ctx.userId,
          messageId: args.messageId
        });
      
      case 'startSmartImport':
        // Find document by storage path and call finalize
        const { data: doc } = await supabaseAdmin
          .from('user_documents')
          .select('id')
          .eq('storage_path', args.storagePath)
          .single();
        
        if (!doc) return { ok: false, error: 'Document not found' };
        
        return await callEndpoint('/smart-import-finalize', {
          userId: ctx.userId,
          docId: doc.id
        });
      
      case 'getRecentImportSummary':
        return await callEndpoint('/tools/get-recent-import-summary', {
          userId: ctx.userId
        });
      
      case 'getTransactions':
        // Direct DB query (faster than HTTP)
        let query = supabaseAdmin
          .from('transactions')
          .select('date, merchant, amount, category, review_status, description')
          .eq('user_id', ctx.userId)
          .order('date', { ascending: false })
          .limit(args.limit || 50);
        
        if (args.from) query = query.gte('date', args.from);
        if (args.to) query = query.lte('date', args.to);
        if (args.vendor) query = query.ilike('merchant', `%${args.vendor}%`);
        if (args.category) query = query.eq('category', args.category);
        
        const { data, error } = await query;
        if (error) throw error;
        
        const total = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
        
        return {
          ok: true,
          result: {
            transactions: data || [],
            count: data?.length || 0,
            total
          }
        };
      
      case 'getNeedsReview':
        const { data: needsReview, error: reviewErr } = await supabaseAdmin
          .from('transactions')
          .select('date, merchant, amount, category, review_reason, description')
          .eq('user_id', ctx.userId)
          .eq('review_status', 'needs_review')
          .order('date', { ascending: false })
          .limit(args.limit || 50);
        
        if (reviewErr) throw reviewErr;
        
        return {
          ok: true,
          result: {
            transactions: needsReview || [],
            count: needsReview?.length || 0
          }
        };
      
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`[Tool] Error in ${name}:`, error);
    return { ok: false, error: error.message || 'Tool execution failed' };
  }
}

async function callEndpoint(path: string, body: any): Promise<{ ok: boolean; result?: any; error?: string }> {
  const baseUrl = process.env.URL || 'http://localhost:8888';
  
  try {
    const response = await fetch(`${baseUrl}/.netlify/functions${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, error: errorText };
    }
    
    const result = await response.json();
    return { ok: true, result };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

