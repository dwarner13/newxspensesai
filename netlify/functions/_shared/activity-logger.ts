/**
 * Activity Logger - Helper to log activity events from Netlify functions
 * 
 * Usage:
 *   import { logActivityEvent } from './_shared/activity-logger';
 *   
 *   await logActivityEvent(userId, {
 *     actorSlug: 'byte-ai',
 *     actorLabel: 'Byte',
 *     title: 'Byte processed 24 new transactions',
 *     category: 'import',
 *     severity: 'success',
 *   });
 */

import { admin } from './supabase';

export interface ActivityEventPayload {
  actorSlug: string;
  actorLabel: string;
  title: string;
  description?: string;
  category?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity event to the activity_events table
 * 
 * This function is designed to be non-blocking - it logs errors but doesn't throw
 * to prevent activity logging from breaking the main application flow.
 * 
 * @param userId - User ID (UUID)
 * @param payload - Event payload
 */
export async function logActivityEvent(
  userId: string,
  payload: ActivityEventPayload
): Promise<void> {
  if (!userId || !payload.actorSlug || !payload.title) {
    console.warn('[logActivityEvent] Missing required fields:', { userId, payload });
    return;
  }

  try {
    const sb = admin();

    const { error } = await sb.from('activity_events').insert({
      user_id: userId,
      actor_slug: payload.actorSlug,
      actor_label: payload.actorLabel,
      title: payload.title,
      description: payload.description || null,
      category: payload.category || 'system',
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
    });

    if (error) {
      console.error('[logActivityEvent] Failed to insert event:', error);
      // Don't throw - activity logging should not break main flow
    }
  } catch (error: any) {
    console.error('[logActivityEvent] Unexpected error:', error);
    // Don't throw - activity logging should not break main flow
  }
}

/**
 * Batch log multiple activity events
 * 
 * @param userId - User ID (UUID)
 * @param events - Array of event payloads
 */
export async function logActivityEvents(
  userId: string,
  events: ActivityEventPayload[]
): Promise<void> {
  if (!userId || !events.length) {
    return;
  }

  try {
    const sb = admin();

    const eventsToInsert = events.map((payload) => ({
      user_id: userId,
      actor_slug: payload.actorSlug,
      actor_label: payload.actorLabel,
      title: payload.title,
      description: payload.description || null,
      category: payload.category || 'system',
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
    }));

    const { error } = await sb.from('activity_events').insert(eventsToInsert);

    if (error) {
      console.error('[logActivityEvents] Failed to insert events:', error);
    }
  } catch (error: any) {
    console.error('[logActivityEvents] Unexpected error:', error);
  }
}










