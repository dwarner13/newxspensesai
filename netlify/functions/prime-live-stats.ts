/**
 * 📊 Prime Live Stats Endpoint
 * 
 * Returns real-time Prime Command Center statistics:
 * - Employee online status
 * - Total/online employee counts
 * - Live tasks count
 * - Success rate
 * 
 * RESILIENT: This function handles missing columns/tables gracefully,
 * returning safe defaults instead of throwing errors.
 */

// ====== PRIME STATE / LIVE STATS ======

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
    message.includes('column') && message.includes('does not exist') ||
    message.includes('table') && message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Verify authentication from JWT token
  const { userId, error: authError } = await verifyAuth(event);
  if (authError || !userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: authError || 'Authentication required' }),
    };
  }

  const sb = admin();

  // ============================================================================
  // 1. EMPLOYEE QUERY (with fallback columns)
  // ============================================================================
  let employees: any[] = [];
  let employeesError: any = null;

  try {
    // Try with name column first
    const result = await sb
      .from('employee_profiles')
      .select('slug, name, role')
      .order('name');
    
    employees = result.data || [];
    employeesError = result.error;
    
    // If name column doesn't exist, try fallback columns
    if (isSchemaError(employeesError)) {
      console.warn('[prime-live-stats] Employees query skipped (missing column/table):', employeesError.message || employeesError);
      
      try {
        // Try with title or display_name instead of name
        const fallbackResult = await sb
          .from('employee_profiles')
          .select('slug, title, role, display_name')
          .order('slug');
        
        if (!fallbackResult.error && fallbackResult.data) {
          employees = fallbackResult.data.map((emp: any) => ({
            slug: emp.slug,
            name: emp.title || emp.display_name || emp.slug, // Use title/display_name as fallback
            role: emp.role || 'assistant',
          }));
          employeesError = null; // Clear error since fallback worked
        }
      } catch (fallbackErr: any) {
        // If fallback also fails, employees stays empty array
        console.warn('[prime-live-stats] Employees fallback query also failed:', fallbackErr.message || fallbackErr);
      }
    } else if (employeesError) {
      // Non-schema error - log as error
      console.error('[prime-live-stats] Unexpected error fetching employees:', employeesError);
    }
  } catch (err: any) {
    console.warn('[prime-live-stats] Employees query exception (missing column/table):', err.message || err);
    employees = []; // Safe default
  }

  // ============================================================================
  // 2. LIVE TASKS QUERY (with fallback for ended_at column)
  // ============================================================================
  let liveTasksData: any[] = [];
  let liveTasksError: any = null;

  try {
    // Try with ended_at column first
    const result = await sb
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null);
    
    liveTasksData = result.data || [];
    liveTasksError = result.error;
    
    // If ended_at column doesn't exist, try fallback
    if (isSchemaError(liveTasksError)) {
      console.warn('[prime-live-stats] Live tasks query skipped (missing column/table):', liveTasksError.message || liveTasksError);
      
      try {
        // Fallback: use last_message_at or created_at, or just get all recent sessions
        const fallbackResult = await sb
          .from('chat_sessions')
          .select('id, last_message_at, created_at')
          .eq('user_id', userId)
          .order('last_message_at', { ascending: false })
          .limit(50); // Limit to recent sessions
        
        if (!fallbackResult.error && fallbackResult.data) {
          // Consider sessions active if they have a recent last_message_at (within last hour)
          // or if created_at is recent (within last hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          liveTasksData = fallbackResult.data.filter((session: any) => {
            const lastActivity = session.last_message_at || session.created_at;
            return lastActivity && new Date(lastActivity) > new Date(oneHourAgo);
          });
          liveTasksError = null; // Clear error since fallback worked
        }
      } catch (fallbackErr: any) {
        // If fallback also fails, liveTasksData stays empty array
        console.warn('[prime-live-stats] Live tasks fallback query also failed:', fallbackErr.message || fallbackErr);
      }
    } else if (liveTasksError) {
      // Non-schema error - log as error
      console.error('[prime-live-stats] Unexpected error fetching live tasks:', liveTasksError);
    }
  } catch (err: any) {
    console.warn('[prime-live-stats] Live tasks query exception (missing column/table):', err.message || err);
    liveTasksData = []; // Safe default
  }

  // ============================================================================
  // 3. USAGE STATS QUERY (chat_usage_log may not exist)
  // ============================================================================
  let usageData: any[] = [];
  let usageError: any = null;

  try {
    const result = await sb
      .from('chat_usage_log')
      .select('success')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    usageData = result.data || [];
    usageError = result.error;
    
    if (isSchemaError(usageError)) {
      console.warn('[prime-live-stats] Usage stats query skipped (missing chat_usage_log table):', usageError.message || usageError);
      usageData = []; // Safe default
      usageError = null; // Treat as expected, not an error
    } else if (usageError) {
      // Non-schema error - log as error
      console.error('[prime-live-stats] Unexpected error fetching usage stats:', usageError);
      usageData = []; // Safe default on any error
    }
  } catch (err: any) {
    if (isSchemaError(err)) {
      console.warn('[prime-live-stats] Usage stats query exception (missing chat_usage_log table):', err.message || err);
    } else {
      console.error('[prime-live-stats] Unexpected exception fetching usage stats:', err);
    }
    usageData = []; // Safe default
  }

  // ============================================================================
  // 4. CALCULATE STATS (always succeeds with defaults)
  // ============================================================================
  try {
    // Build employee list with safe defaults
    const employeeList = (employees || []).map((emp: any) => ({
      slug: emp.slug || 'unknown',
      name: emp.name || emp.title || emp.display_name || emp.slug || 'Unknown',
      role: emp.role || 'assistant',
      status: 'online' as const, // Default to online for now
      lastActivityAt: null,
    }));

    const totalEmployees = employeeList.length;
    const onlineEmployees = employeeList.filter((e: any) => e.status === 'online').length;
    const liveTasks = liveTasksData?.length || 0;
    
    // Calculate success rate (default to 1.0 if no data)
    const totalUsage = usageData?.length || 0;
    const successfulUsage = usageData?.filter((u: any) => u.success === true).length || 0;
    const successRate = totalUsage > 0 ? successfulUsage / totalUsage : 1.0;

    // Always return HTTP 200 with consistent shape
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        employees: employeeList,
        totalEmployees,
        onlineEmployees,
        liveTasks,
        successRate,
      }),
    };
  } catch (error: any) {
    // Final safety net - return defaults even if calculation fails
    console.error('[prime-live-stats] Error calculating stats:', error);
    return {
      statusCode: 200, // Still return 200, not 500
      headers,
      body: JSON.stringify({
        employees: [],
        totalEmployees: 0,
        onlineEmployees: 0,
        liveTasks: 0,
        successRate: 1.0,
      }),
    };
  }
};
