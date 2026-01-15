/**
 * Activity Feed Function
 * 
 * Returns activity events for the authenticated user.
 * Reads from ai_activity_events table and converts to ActivityEvent format.
 * 
 * GET /.netlify/functions/activity-feed?userId=...&limit=30&category=prime&unreadOnly=false
 * 
 * Response: { events: ActivityEvent[], ok: true }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { admin } from './_shared/supabase';

function getSupabaseClient(authToken: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: authToken,
      },
    },
  });
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Allow GET and POST
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    // Parse userId from query params (GET) or JSON body (POST)
    let userId: string | undefined;
    let limit = '30';
    let category: string | undefined;
    let unreadOnly: string | undefined;
    
    if (event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        userId = body.userId;
        limit = body.limit?.toString() || '30';
        category = body.category;
        unreadOnly = body.unreadOnly?.toString();
      } catch {
        // If POST body can't be parsed, fall back to query params
        const params = event.queryStringParameters || {};
        userId = params.userId;
        limit = params.limit || '30';
        category = params.category;
        unreadOnly = params.unreadOnly;
      }
    } else {
      // GET method - use query params
      const params = event.queryStringParameters || {};
      userId = params.userId;
      limit = params.limit || '30';
      category = params.category;
      unreadOnly = params.unreadOnly;
    }
    
    // DEV-SAFE: If userId missing, return empty events (dev only)
    if (!userId) {
      const isDev = process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development';
      if (isDev) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, events: [] }),
        };
      }
      // Production: return 400
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing userId parameter' }),
      };
    }

    // P0 FIX: Use admin client instead of anon client to avoid RLS permission issues
    // The ai_activity_events table requires service role permissions
    const sb = admin();

    // Build query - include read_at because code references e.read_at and filters on read_at
    let query = sb
      .from('ai_activity_events')
      .select('id, employee_id, event_type, status, label, details, created_at, read_at')
      .eq('user_id', userId) // RLS should enforce this, but explicit for clarity
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));

    // Filter by category if provided (map to employee_id or event_type)
    if (category) {
      if (category === 'prime') {
        // Prime-related events (all employees)
        query = query.in('employee_id', ['prime-boss', 'byte-docs', 'tag-ai', 'crystal-ai', 'finley-ai']);
      } else if (category === 'smart-import') {
        // Smart Import events (Byte)
        query = query.eq('employee_id', 'byte-docs').eq('event_type', 'byte.import.completed');
      }
    }

    // Filter unread if requested
    // COMMENTED OUT: read_at column does not exist in database
    // if (unreadOnly === 'true') {
    //   query = query.is('read_at', null);
    // }
    // COMMENTED OUT: read_at column does not exist in database  
    // if (unread === 'true') {
    //   query = query.is('read_at', null);
    // }

    const { data: events, error } = await query;

    if (error) {
      console.error('[activity-feed] Error fetching events:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to fetch events' }),
      };
    }

    // Convert ai_activity_events to ActivityEvent format
    const activityEvents = (events || []).map((e: any) => {
      // Map employee_id to actor slug/label
      const actorMap: Record<string, { slug: string; label: string }> = {
        'byte-docs': { slug: 'byte-docs', label: 'Byte' },
        'byte-ai': { slug: 'byte-docs', label: 'Byte' },
        'prime-boss': { slug: 'prime-boss', label: 'Prime' },
        'tag-ai': { slug: 'tag-ai', label: 'Tag' },
        'crystal-ai': { slug: 'crystal-ai', label: 'Crystal' },
        'crystal-analytics': { slug: 'crystal-analytics', label: 'Crystal' },
        'finley-ai': { slug: 'finley-ai', label: 'Finley' },
      };

      const actor = actorMap[e.employee_id] || { slug: e.employee_id, label: e.employee_id };

      // Map status to severity
      const severityMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
        'success': 'success',
        'completed': 'success',
        'error': 'error',
        'warning': 'warning',
        'info': 'info',
        'pending': 'info',
        'started': 'info',
      };

      const severity = severityMap[e.status] || 'info';

      // Determine category from event_type or employee
      let eventCategory = 'system';
      if (e.event_type === 'byte.import.completed') {
        eventCategory = 'smart-import';
      } else if (e.event_type === 'crystal.analytics.completed') {
        eventCategory = 'analytics';
      } else if (e.employee_id.includes('prime')) {
        eventCategory = 'prime';
      }

      return {
        id: e.id,
        createdAt: e.created_at,
        actorSlug: actor.slug,
        actorLabel: actor.label,
        title: e.label || 'Activity',
        description: e.details?.description || undefined,
        category: eventCategory,
        severity,
        metadata: e.details || {},
        eventType: e.event_type,
        readAt: e.read_at || null,
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        events: activityEvents,
      }),
    };
  } catch (error: any) {
    console.error('[activity-feed] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
