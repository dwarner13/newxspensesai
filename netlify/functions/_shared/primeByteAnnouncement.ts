/**
 * Prime Byte Announcement Handler
 * 
 * Creates Prime summary messages from Byte completion events.
 * Ensures exactly-once announcements using "announced_at" tracking.
 */

import { admin } from './supabase';
import { randomUUID } from 'crypto';

export interface PrimeAnnouncementResult {
  announced: boolean;
  messageId?: string;
  eventId?: string;
  reason?: string;
}

/**
 * Announce Byte completion to Prime thread
 * 
 * Checks for unannounced Byte completion events and creates a system message
 * in Prime's thread. Marks event as announced to prevent duplicates.
 * 
 * @param userId - User ID
 * @param threadId - Prime thread ID (optional, will find/create if not provided)
 * @returns Announcement result
 */
export async function announceByteCompletionToPrime(
  userId: string,
  threadId?: string
): Promise<PrimeAnnouncementResult> {
  const sb = admin();

  try {
    // Step 1: Find unannounced Byte completion event (most recent)
    const { data: unannouncedEvent, error: eventError } = await sb
      .from('ai_activity_events')
      .select('id, details, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'byte.import.completed')
      .is('announced_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) {
      console.error('[announceByteCompletionToPrime] Error fetching unannounced event:', eventError);
      return { announced: false, reason: `Event fetch error: ${eventError.message}` };
    }

    if (!unannouncedEvent) {
      // No unannounced events - this is fine, not an error
      return { announced: false, reason: 'No unannounced Byte completion events' };
    }

    const eventDetails = unannouncedEvent.details || {};
    const docCount = (eventDetails.doc_count as number) || 0;
    const txnCount = (eventDetails.txn_count as number) || 0;
    const pages = (eventDetails.pages as number) || 0;
    const warnings = (eventDetails.warnings as string[]) || [];
    const integrityVerified = eventDetails.integrity_verified as boolean | undefined;
    const importRunId = eventDetails.import_run_id as string;

    // Step 2: Ensure Prime thread exists
    let finalThreadId = threadId;
    if (!finalThreadId) {
      const { getEmployeeKeyFromSlug } = await import('./employeeRegistryBackend.js');
      const employeeKey = await getEmployeeKeyFromSlug(sb, 'prime-boss');
      const { ensureThread } = await import('./ensureThread.js');
      finalThreadId = await ensureThread(sb, userId, employeeKey);
    }

    // Step 3: Build announcement message
    const txnText = txnCount > 0 ? ` and created ${txnCount} transaction${txnCount > 1 ? 's' : ''}` : '';
    const pagesText = pages > 0 ? ` (${pages} page${pages > 1 ? 's' : ''})` : '';
    const warningText = warnings.length > 0 ? ` ⚠️ Note: ${warnings.join(', ')}` : '';
    const integrityText = integrityVerified === false ? ' ⚠️ Integrity check failed' : integrityVerified === true ? ' ✅ Verified' : '';

    const announcementMessage = `Byte finished importing ${docCount} document${docCount > 1 ? 's' : ''}${txnText}${pagesText}${integrityText}${warningText}. View results in Smart Import.`;

    // Step 4: Generate stable message ID for idempotency
    const messageId = randomUUID();
    const clientMessageId = `byte-announce-${importRunId}`;
    const requestId = `prime-announce-${importRunId}`;

    // Step 5: Insert system message with idempotency (ON CONFLICT DO NOTHING)
    const { data: messageData, error: messageError } = await sb
      .from('chat_messages')
      .insert({
        id: messageId,
        thread_id: finalThreadId,
        user_id: userId,
        role: 'system',
        content: announcementMessage,
        client_message_id: clientMessageId,
        request_id: requestId,
        tokens: Math.ceil(announcementMessage.length / 4), // Rough token estimate
      })
      .select('id')
      .single();

    if (messageError) {
      // Check if error is due to unique constraint violation (idempotency)
      if (messageError.code === '23505' || messageError.message?.includes('unique')) {
        console.log(`[announceByteCompletionToPrime] Message already exists (DB constraint), skipping: ${clientMessageId}`);
        // Still mark event as announced (message exists, so announcement happened)
        await sb
          .from('ai_activity_events')
          .update({ announced_at: new Date().toISOString() })
          .eq('id', unannouncedEvent.id);
        return { announced: true, messageId, eventId: unannouncedEvent.id, reason: 'Message already exists' };
      }
      throw messageError;
    }

    // Step 6: Mark event as announced
    const { error: updateError } = await sb
      .from('ai_activity_events')
      .update({ announced_at: new Date().toISOString() })
      .eq('id', unannouncedEvent.id);

    if (updateError) {
      console.error('[announceByteCompletionToPrime] Error marking event as announced:', updateError);
      // Don't fail - message was created successfully
    }

    console.log(`[announceByteCompletionToPrime] Announced Byte completion to Prime: ${importRunId}`);
    return { announced: true, messageId: messageData?.id, eventId: unannouncedEvent.id };
  } catch (error: any) {
    console.error('[announceByteCompletionToPrime] Error:', error);
    return { announced: false, reason: error.message || 'Unknown error' };
  }
}

/**
 * Check if Byte completion event has been announced
 * 
 * @param userId - User ID
 * @param importRunId - Import run ID
 * @returns True if announced, false otherwise
 */
export async function isByteCompletionAnnounced(
  userId: string,
  importRunId: string
): Promise<boolean> {
  const sb = admin();

  const { data: event } = await sb
    .from('ai_activity_events')
    .select('announced_at')
    .eq('user_id', userId)
    .eq('event_type', 'byte.import.completed')
    .eq('details->>import_run_id', importRunId)
    .maybeSingle();

  return !!event?.announced_at;
}

