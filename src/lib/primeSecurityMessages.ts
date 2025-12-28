/**
 * Prime Security Messages Helper
 * 
 * Emits system security messages into Prime chat feed.
 * Messages are shown once per event and persisted to prevent spam.
 */

import { getSupabase } from './supabase';
import { updateProfileMetadata } from './profileMetadataHelpers';

export type SecurityMessageEvent =
  | 'upload_processing_started'
  | 'upload_failed_or_canceled'
  | 'upload_discard_success'
  | 'upload_discard_failed';

interface SecurityMessage {
  event: SecurityMessageEvent;
  message: string;
  uploadId?: string;
}

const MESSAGE_TEMPLATES: Record<SecurityMessageEvent, (uploadId?: string) => string> = {
  upload_processing_started: () =>
    '🛡️ Secure processing is active. Sensitive details are protected while Byte reads this.',
  
  upload_failed_or_canceled: () =>
    'That upload didn\'t complete. Nothing was saved, and temporary data was cleared.',
  
  upload_discard_success: () =>
    'Done — I removed that upload and cleared extracted data.',
  
  upload_discard_failed: () =>
    'I stopped processing and blocked access, but couldn\'t fully remove it yet. Please retry or contact support.',
};

/**
 * Emit a security message to Prime chat
 * 
 * @param userId - User ID
 * @param event - Security message event type
 * @param uploadId - Optional upload ID for context
 * @returns Promise<boolean> - true if message was emitted, false otherwise
 */
export async function emitSecurityMessage(
  userId: string,
  event: SecurityMessageEvent,
  uploadId?: string
): Promise<boolean> {
  try {
    const message = MESSAGE_TEMPLATES[event](uploadId);

    // Dispatch custom event that UnifiedAssistantChat can listen to
    // This allows Prime chat to show the message without direct coupling
    window.dispatchEvent(new CustomEvent('prime:security-message', {
      detail: {
        event,
        message,
        uploadId,
        timestamp: new Date().toISOString(),
      },
    }));

    // Mark guardrails as acknowledged (once per user)
    await updateProfileMetadata(userId, {
      guardrails_acknowledged: true,
      guardrails_acknowledged_at: new Date().toISOString(),
    });

    // Log guardrail event
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('guardrail_events').insert({
        user_id: userId,
        event_type: event,
        severity: 'info',
        upload_id: uploadId || null,
        metadata: {
          message,
        },
        created_at: new Date().toISOString(),
      }).catch((err) => {
        // Don't fail if logging fails
        console.warn('[emitSecurityMessage] Failed to log event:', err);
      });
    }

    return true;
  } catch (error: any) {
    console.error('[emitSecurityMessage] Error:', error);
    return false;
  }
}

/**
 * Check if security message should be shown (prevents spam)
 * 
 * @param userId - User ID
 * @param event - Security message event type
 * @returns Promise<boolean> - true if message should be shown
 */
export async function shouldShowSecurityMessage(
  userId: string,
  event: SecurityMessageEvent
): Promise<boolean> {
  // For now, always show (can be enhanced to track per-event)
  // Future: Check guardrail_events table for recent events
  return true;
}










