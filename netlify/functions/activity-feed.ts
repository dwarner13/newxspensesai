/**
 * Activity Feed Function
 * 
 * Returns activity events for the authenticated user.
 * Used by the Prime dashboard and workspace layouts to show recent AI employee activity.
 * 
 * GET /.netlify/functions/activity-feed?userId=...&limit=30&category=prime&unreadOnly=false
 * 
 * Response: { events: ActivityEvent[], ok: true }
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || '30', 10);
    const category = params.category;
    const unreadOnly = params.unreadOnly === 'true';

    // Build query for activity_events table
    let query = sb
      .from('activity_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Filter unread only if requested
    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: events, error } = await query;

    if (error) {
      // If table doesn't exist yet, return empty array (non-fatal)
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('[ActivityFeed] activity_events table not found, returning empty array');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ok: true, events: [] }),
        };
      }

      console.error('[ActivityFeed] Error fetching events:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to fetch activity events' }),
      };
    }

    // Transform to match ActivityEvent type expected by frontend
    const transformedEvents = (events || []).map((event: any) => ({
      id: event.id || event.event_id,
      createdAt: event.created_at,
      actorSlug: event.actor_slug || event.employee_slug || 'unknown',
      actorLabel: event.actor_label || event.employee_name || 'Unknown',
      title: event.title || event.action || 'Activity',
      description: event.description || event.details,
      category: event.category || 'general',
      severity: event.severity || 'info',
      metadata: event.metadata || {},
      readAt: event.read_at || null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        events: transformedEvents,
      }),
    };
  } catch (error: any) {
    console.error('[ActivityFeed] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message || 'Internal server error',
      }),
    };
  }
};
