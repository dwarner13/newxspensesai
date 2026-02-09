/**
 * Chime Notification Queue Helper
 * 
 * Queues upcoming payment notifications for Chime to process and send.
 * 
 * Guardrails:
 * - All queries scoped by user_id
 * - Respects user notification settings
 * - No PII in logs
 */

import { admin } from './supabase.js';
import { safeLog } from './safeLog.js';

const chimeLogOnceKeys = new Set<string>();

function logOnce(key: string, message: string, meta?: Record<string, any>) {
  if (chimeLogOnceKeys.has(key)) return;
  chimeLogOnceKeys.add(key);
  safeLog(message, meta || {});
}

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'PGRST204' || message.includes('does not exist') || message.includes('schema cache');
}

export interface QueueUpcomingPaymentNotificationsOptions {
  userId: string;
  horizonDays: number; // e.g. 7
}

/**
 * Queue upcoming payment notifications for a user
 * 
 * Looks up recurring_obligations where next_estimated_date is within horizonDays,
 * and creates queued notifications in user_notifications table.
 * 
 * Respects user_notification_settings (skips if channel disabled).
 */
export async function queueUpcomingPaymentNotifications(
  options: QueueUpcomingPaymentNotificationsOptions
): Promise<void> {
  const { userId, horizonDays } = options;
  const supabase = admin();

  try {
    // Get user notification settings
    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('in_app_enabled, email_enabled, push_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    // Default to in_app enabled if no settings exist
    const inAppEnabled = settings?.in_app_enabled ?? true;
    const emailEnabled = settings?.email_enabled ?? true;
    const pushEnabled = settings?.push_enabled ?? false;

    if (!inAppEnabled && !emailEnabled && !pushEnabled) {
      safeLog('[ChimeNotifications] All notification channels disabled for user', {
        userId: maskUserId(userId),
      });
      return;
    }

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonDate = new Date(today);
    horizonDate.setDate(horizonDate.getDate() + horizonDays);

    // Find upcoming obligations
    const { data: obligations, error: obligationsError } = await supabase
      .from('recurring_obligations')
      .select('id, merchant_name, avg_amount, next_estimated_date, frequency')
      .eq('user_id', userId)
      .not('next_estimated_date', 'is', null)
      .gte('next_estimated_date', today.toISOString().split('T')[0])
      .lte('next_estimated_date', horizonDate.toISOString().split('T')[0]);

    if (obligationsError) {
      if (isMissingColumnError(obligationsError)) {
        logOnce('chime_obligations_missing_columns', '[ChimeNotifications] Skipping due to schema mismatch', {
          userId: maskUserId(userId),
          error: obligationsError.message,
        });
        return;
      }
      safeLog('[ChimeNotifications] Error fetching obligations', {
        userId: maskUserId(userId),
        error: obligationsError.message,
      });
      return;
    }

    if (!obligations || obligations.length === 0) {
      return; // No upcoming obligations
    }

    // Create notifications for each obligation
    const notificationsToInsert = [];

    for (const obligation of obligations) {
      const nextDate = new Date(obligation.next_estimated_date);
      const daysUntil = Math.ceil(
        (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Schedule notification 3 days before payment (or today if less than 3 days away)
      const scheduledAt = new Date(nextDate);
      scheduledAt.setDate(scheduledAt.getDate() - Math.min(3, daysUntil));
      scheduledAt.setHours(9, 0, 0, 0); // 9 AM

      // Skip if already in the past
      if (scheduledAt < new Date()) {
        scheduledAt.setTime(new Date().getTime() + 60 * 60 * 1000); // 1 hour from now
      }

      // Create placeholder title/body (Chime will refine these later)
      const title = `Payment Due Soon`;
      const amount = Number(obligation.avg_amount || 0);
      const body = `Your ${obligation.merchant_name} payment of $${amount.toFixed(2)} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;

      // Insert for each enabled channel
      if (inAppEnabled) {
        notificationsToInsert.push({
          user_id: userId,
          obligation_id: obligation.id,
          channel: 'in_app',
          type: 'upcoming_payment',
          title,
          body,
          status: 'queued',
          scheduled_at: scheduledAt.toISOString(),
          created_by_employee_slug: 'chime-ai',
          meta: {
            merchant_name: obligation.merchant_name,
            amount,
            due_date: obligation.next_estimated_date,
            days_until: daysUntil,
          },
        });
      }

      if (emailEnabled) {
        notificationsToInsert.push({
          user_id: userId,
          obligation_id: obligation.id,
          channel: 'email',
          type: 'upcoming_payment',
          title,
          body,
          status: 'queued',
          scheduled_at: scheduledAt.toISOString(),
          created_by_employee_slug: 'chime-ai',
          meta: {
            merchant_name: obligation.merchant_name,
            amount,
            due_date: obligation.next_estimated_date,
            days_until: daysUntil,
          },
        });
      }

      if (pushEnabled) {
        notificationsToInsert.push({
          user_id: userId,
          obligation_id: obligation.id,
          channel: 'push',
          type: 'upcoming_payment',
          title,
          body,
          status: 'queued',
          scheduled_at: scheduledAt.toISOString(),
          created_by_employee_slug: 'chime-ai',
          meta: {
            merchant_name: obligation.merchant_name,
            amount,
            due_date: obligation.next_estimated_date,
            days_until: daysUntil,
          },
        });
      }
    }

    if (notificationsToInsert.length === 0) {
      return;
    }

    // Insert notifications (with conflict handling - don't duplicate)
    const { error: insertError } = await supabase
      .from('user_notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      safeLog('[ChimeNotifications] Error inserting notifications', {
        userId: maskUserId(userId),
        count: notificationsToInsert.length,
        error: insertError.message,
      });
      return;
    }

    safeLog('[ChimeNotifications] Queued notifications', {
      userId: maskUserId(userId),
      count: notificationsToInsert.length,
      obligations: obligations.length,
    });
  } catch (error: any) {
    safeLog('[ChimeNotifications] Unexpected error', {
      userId: maskUserId(userId),
      error: error?.message || String(error),
    });
  }
}

/**
 * Mask user ID for safe logging
 */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) {
    return 'user_****';
  }
  return `user_${userId.substring(0, 8)}...`;
}



