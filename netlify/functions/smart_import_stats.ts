/**
 * 📊 Smart Import Stats Endpoint
 * 
 * Returns real-time statistics for Byte workspace (Smart Import AI)
 * - Queue statistics (pending, processing, completed, failed)
 * - Document counts
 * - Transaction counts
 * 
 * RESILIENT: This function handles errors gracefully and returns safe defaults
 * instead of throwing errors that break the UI.
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

/**
 * Check if error is a schema-related error (missing column/table)
 */
function isSchemaError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.error?.code || '';
  const message = (error.message || error.error?.message || '').toLowerCase();
  
  // PostgreSQL error codes
  // 42703 = undefined_column
  // 42P01 = undefined_table
  // PGRST205 = PostgREST "table not found in schema cache"
  return (
    code === '42703' ||
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('does not exist')) ||
    message.includes('could not find the table')
  );
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    // Verify authentication from JWT token
    const { userId, error: authError } = await verifyAuth(event);
    if (authError || !userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: authError || 'Authentication required' }),
      };
    }

    const sb = admin();
    
    // Safe defaults matching ByteQueueStats interface
    const defaultStats = {
      ok: true,
      demo: true,
      queue: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      monthly: {
        totalThisMonth: 0,
        totalLastMonth: 0,
        deltaPercent: 0,
      },
      health: {
        failedLast24h: 0,
        status: 'good' as 'good' | 'warning' | 'error',
      },
    };

    // Try to fetch imports statistics (fail gracefully if table doesn't exist)
    try {
      const { data: imports, error: importsError } = await sb
        .from('imports')
        .select('id, status')
        .eq('user_id', userId);

      if (importsError && !isSchemaError(importsError)) {
        console.warn('[smart_import_stats] Error fetching imports:', importsError.message);
      }

      if (imports && Array.isArray(imports)) {
        defaultStats.queue.pending = imports.filter(i => i.status === 'pending' || i.status === 'queued').length;
        defaultStats.queue.processing = imports.filter(i => i.status === 'processing').length;
        defaultStats.queue.completed = imports.filter(i => i.status === 'completed' || i.status === 'committed').length;
        defaultStats.queue.failed = imports.filter(i => i.status === 'failed' || i.status === 'error').length;
      }
    } catch (error: any) {
      console.debug('[smart_import_stats] Imports query failed (may not exist):', error.message);
      // Continue with defaults
    }

    // Try to fetch transactions statistics for monthly stats (fail gracefully if table doesn't exist)
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // This month's transactions
      const { count: thisMonthCount, error: thisMonthError } = await sb
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('posted_at', startOfMonth);

      if (thisMonthError && !isSchemaError(thisMonthError)) {
        console.warn('[smart_import_stats] Error fetching this month transaction count:', thisMonthError.message);
      }

      if (thisMonthCount !== null && thisMonthCount !== undefined) {
        defaultStats.monthly.totalThisMonth = thisMonthCount;
      }

      // Last month's transactions
      const { count: lastMonthCount, error: lastMonthError } = await sb
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('posted_at', startOfLastMonth)
        .lt('posted_at', endOfLastMonth);

      if (lastMonthError && !isSchemaError(lastMonthError)) {
        console.warn('[smart_import_stats] Error fetching last month transaction count:', lastMonthError.message);
      }

      if (lastMonthCount !== null && lastMonthCount !== undefined) {
        defaultStats.monthly.totalLastMonth = lastMonthCount;
        
        // Calculate delta percent
        if (lastMonthCount > 0) {
          defaultStats.monthly.deltaPercent = Math.round(
            ((defaultStats.monthly.totalThisMonth - lastMonthCount) / lastMonthCount) * 100
          );
        }
      }
    } catch (error: any) {
      console.debug('[smart_import_stats] Transactions query failed (may not exist):', error.message);
      // Continue with defaults
    }

    // Try to fetch failed imports in last 24h for health status (fail gracefully if table doesn't exist)
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count: failedCount, error: failedError } = await sb
        .from('imports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['failed', 'error'])
        .gte('updated_at', last24h);

      if (failedError && !isSchemaError(failedError)) {
        console.warn('[smart_import_stats] Error fetching failed imports:', failedError.message);
      }

      if (failedCount !== null && failedCount !== undefined) {
        defaultStats.health.failedLast24h = failedCount;
        
        // Set health status based on failures
        if (failedCount === 0) {
          defaultStats.health.status = 'good';
        } else if (failedCount < 5) {
          defaultStats.health.status = 'warning';
        } else {
          defaultStats.health.status = 'error';
        }
      }
    } catch (error: any) {
      console.debug('[smart_import_stats] Failed imports query failed (may not exist):', error.message);
      // Continue with defaults
    }

    // Always return 200 with stats (even if some queries failed)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(defaultStats),
    };

  } catch (error: any) {
    // Catch-all error handler - return safe defaults instead of 500
    console.error('[smart_import_stats] Unexpected error:', error);
    return {
      statusCode: 200, // Return 200 with demo data instead of 500
      headers,
      body: JSON.stringify({
        ok: true,
        demo: true,
        error: 'Stats temporarily unavailable',
        queue: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        },
        monthly: {
          totalThisMonth: 0,
          totalLastMonth: 0,
          deltaPercent: 0,
        },
        health: {
          failedLast24h: 0,
          status: 'good',
        },
      }),
    };
  }
};
