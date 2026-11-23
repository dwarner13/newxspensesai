/**
 * Activity Feed Function
 * 
 * Returns activity events for the authenticated user.
 * Reads from ai_activity_events table and converts to ActivityEvent format.
 *
 * GET /.netlify/functions/activity-feed?limit=30&category=prime&unreadOnly=false
 *
 * Security (S0 activity-feed): identity comes only from the verified Supabase JWT
 * (Authorization: Bearer). A userId in the query, body or x-user-id header is never
 * identity; if present it must equal the verified user (403 otherwise). Every read
 * is filtered by the verified user id.
 *
 * Response: { events: ActivityEvent[], ok: true }
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;

function parseLimit(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export const handler: Handler = async (event) => {
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

  // Identity comes only from the verified JWT, before any data access.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
  }
  const verifiedUserId = authn.principal.userId;

  try {
    // Optional filters from query params (GET) or JSON body (POST). A claimed userId is not identity.
    let claimedUserId: string | undefined;
    let limit: unknown = DEFAULT_LIMIT;
    let category: string | undefined;
    let unreadOnly: string | undefined;
    
    if (event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        claimedUserId = body.userId;
        limit = body.limit;
        category = body.category;
        unreadOnly = body.unreadOnly?.toString();
      } catch {
        // If POST body can't be parsed, fall back to query params
        const params = event.queryStringParameters || {};
        claimedUserId = params.userId;
        limit = params.limit;
        category = params.category;
        unreadOnly = params.unreadOnly;
      }
    } else {
      // GET method - use query params
      const params = event.queryStringParameters || {};
      claimedUserId = params.userId;
      limit = params.limit;
      category = params.category;
      unreadOnly = params.unreadOnly;
    }
    void unreadOnly; // unread filtering is disabled (read_at filter below is commented out)

    const claimedHeaderUserId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
    if (!claimedUserIdMatches(claimedUserId, verifiedUserId) || !claimedUserIdMatches(claimedHeaderUserId, verifiedUserId)) {
      return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Forbidden' }) };
    }

    // P0 FIX: Use admin client instead of anon client to avoid RLS permission issues
    // The ai_activity_events table requires service role permissions
    const sb = admin();

    // Build query - include read_at because code references e.read_at and filters on read_at
    let query = sb
      .from('ai_activity_events')
      .select('id, employee_id, event_type, status, label, details, created_at, read_at')
      .eq('user_id', verifiedUserId) // service-role client: this filter IS the isolation boundary
      .order('created_at', { ascending: false })
      .limit(parseLimit(limit));

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
      console.error('[activity-feed] Error fetching events:', (error as { code?: string })?.code ?? 'unknown');
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
    console.error('[activity-feed] Unexpected error:', error?.name ?? 'Error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Internal server error' }),
    };
  }
};
