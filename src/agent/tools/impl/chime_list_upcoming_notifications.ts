import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'chime_list_upcoming_notifications';

export const inputSchema = z.object({
  days_ahead: z.number().int().min(1).max(30).optional().default(7),
  status_filter: z.enum(['queued', 'sent', 'dismissed', 'cancelled']).optional(),
  channel_filter: z.enum(['in_app', 'email', 'push']).optional(),
});

export const outputSchema = z.object({
  notifications: z.array(z.object({
    id: z.string(),
    type: z.string(),
    channel: z.string(),
    scheduled_at: z.string(),
    title: z.string(),
    merchant_label: z.string().nullable(),
    amount: z.number().nullable(),
    days_until: z.number().nullable(),
  })),
  total_count: z.number(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * List upcoming notifications queued for the user
 * 
 * Returns notifications that are scheduled to be sent within the specified window.
 * Use this when users ask about their reminders or want to see what notifications
 * are coming up.
 * 
 * Guardrails:
 * - All queries scoped by user_id
 * - No sensitive data in response
 * - Merchant names sanitized
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const { days_ahead, status_filter, channel_filter } = input;

    const supabase = getSupabaseServerClient();

    // Calculate date range
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() + days_ahead);

    // Build query
    let query = supabase
      .from('user_notifications')
      .select('id, type, channel, scheduled_at, title, meta, status')
      .eq('user_id', userId)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', cutoffDate.toISOString())
      .order('scheduled_at', { ascending: true });

    if (status_filter) {
      query = query.eq('status', status_filter);
    } else {
      // Default to queued if no filter specified
      query = query.eq('status', 'queued');
    }

    if (channel_filter) {
      query = query.eq('channel', channel_filter);
    }

    const { data: notifications, error } = await query;

    if (error) {
      // If table doesn't exist, return empty list
      if (error.code === '42P01') {
        return Ok({
          notifications: [],
          total_count: 0,
        });
      }
      return Err(new Error(`Failed to query notifications: ${error.message}`));
    }

    const notificationsList = notifications || [];
    const nowTime = now.getTime();

    // Map to clean output format
    const cleanNotifications = notificationsList.map(notif => {
      const scheduledAt = new Date(notif.scheduled_at);
      const daysUntil = Math.ceil((scheduledAt.getTime() - nowTime) / (1000 * 60 * 60 * 24));

      // Extract merchant label and amount from meta if available
      const meta = notif.meta || {};
      const merchantLabel = meta.merchant_name ? sanitizeMerchantName(meta.merchant_name) : null;
      const amount = meta.amount ? Number(meta.amount) : null;

      return {
        id: notif.id,
        type: notif.type,
        channel: notif.channel,
        scheduled_at: scheduledAt.toISOString(),
        title: notif.title,
        merchant_label: merchantLabel,
        amount,
        days_until: daysUntil,
      };
    });

    return Ok({
      notifications: cleanNotifications,
      total_count: cleanNotifications.length,
    });
  } catch (error) {
    console.error('[Chime List Upcoming Notifications] Error:', error);
    return Err(error as Error);
  }
}

/**
 * Sanitize merchant name to remove any potential PII
 */
function sanitizeMerchantName(merchantName: string): string {
  return merchantName
    .replace(/\d{4,}/g, (match) => {
      if (match.length >= 12) {
        return `****${match.slice(-4)}`;
      }
      return match;
    })
    .trim();
}

export const metadata = {
  name: 'Chime List Upcoming Notifications',
  description: 'List notifications queued for the user within a specified time window. Returns notification type, channel, scheduled time, and context. Use when users ask "what reminders do I have?" or "show me my upcoming notifications".',
  requiresConfirmation: false,
  dangerous: false,
  category: 'notifications',
};



