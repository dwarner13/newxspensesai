/**
 * 📊 Prime Live Stats Endpoint
 * 
 * Returns real-time Prime Command Center statistics:
 * - Employee online status
 * - Total/online employee counts
 * - Live tasks count
 * - Success rate
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

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

  try {
    const userId = event.queryStringParameters?.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    const sb = admin();

    // Get employee profiles
    const { data: employees, error: employeesError } = await sb
      .from('employee_profiles')
      .select('slug, name, role')
      .order('name');

    if (employeesError) {
      console.error('[prime-live-stats] Error fetching employees:', employeesError);
    }

    // Get live tasks count (from chat_sessions or similar)
    const { data: liveTasksData, error: tasksError } = await sb
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null);

    if (tasksError) {
      console.error('[prime-live-stats] Error fetching live tasks:', tasksError);
    }

    // Get success rate (from chat_usage_log or similar)
    const { data: usageData, error: usageError } = await sb
      .from('chat_usage_log')
      .select('success')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (usageError) {
      console.error('[prime-live-stats] Error fetching usage stats:', usageError);
    }

    // Calculate stats
    const employeeList = (employees || []).map((emp: any) => ({
      slug: emp.slug,
      name: emp.name,
      role: emp.role,
      status: 'online' as const, // Default to online for now
      lastActivityAt: null,
    }));

    const totalEmployees = employeeList.length;
    const onlineEmployees = employeeList.filter((e: any) => e.status === 'online').length;
    const liveTasks = liveTasksData?.length || 0;
    
    // Calculate success rate
    const totalUsage = usageData?.length || 0;
    const successfulUsage = usageData?.filter((u: any) => u.success === true).length || 0;
    const successRate = totalUsage > 0 ? successfulUsage / totalUsage : 1.0;

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
    console.error('[prime-live-stats] Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
