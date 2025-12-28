/**
 * Activity Feed Function
 * 
 * Returns activity events for the authenticated user.
 * Reads from ai_activity_events table and converts to ActivityEvent format.
 * 
 * GET /.netlify/functions/activity-feed?limit=30&category=prime&unreadOnly=false
 * Headers: Authorization: Bearer <access_token>
 * 
 * userId is extracted from the JWT token (no longer required as query parameter).
 * If userId query param is provided, it must match the authenticated user (403 if mismatch).
 * 
 * Response: { events: ActivityEvent[], ok: true }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { admin } from './_shared/supabase';
import { verifyAuth } from './_shared/verifyAuth';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    const { userId: queryUserId, limit = '30', category, unreadOnly } = event.queryStringParameters || {};
    
    // Require Authorization header with Bearer token
    const authToken = event.headers.authorization || event.headers.Authorization || '';
    if (!authToken || !authToken.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing or invalid authorization token. Expected: Bearer <token>' }),
      };
    }

    // Extract userId from token
    const { userId, error: authError } = await verifyAuth(event);
    
    if (authError || !userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: authError || 'Invalid or expired token' }),
      };
    }

    // Backward compatibility: If query param userId is provided, verify it matches token user
    if (queryUserId && queryUserId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'userId mismatch: query parameter does not match authenticated user' }),
      };
    }

    const sb = getSupabaseClient(authToken);

    // Build query
    let query = sb
      .from('ai_activity_events')
      .select('id, employee_id, event_type, status, label, details, created_at')
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
    if (unreadOnly === 'true') {
      query = query.is('read_at', null);
    }

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
