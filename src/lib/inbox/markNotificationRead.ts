/**
 * Security batch (Inbox mark-as-read, 2026-11-23): mark one notification read for its owner.
 *
 * Updates only the row's own table, filtered by id AND the signed-in user's id, and reports
 * success only when exactly that row was updated. Errors and zero-row updates return false.
 * The client-side owner filter is defence in depth; table RLS remains the authorization boundary.
 */

export type NotificationSource = 'notifications' | 'user_notifications';

interface UpdateResult {
  data: Array<{ id?: unknown }> | null;
  error: unknown;
}
interface UpdateChain {
  eq(column: string, value: unknown): UpdateChain;
  select(columns: string): PromiseLike<UpdateResult>;
}
export interface NotificationUpdateClient {
  from(table: NotificationSource): { update(values: Record<string, unknown>): UpdateChain };
}

export async function markNotificationReadForOwner(
  sb: NotificationUpdateClient,
  n: { id: string; source?: NotificationSource },
  ownerId: string,
): Promise<boolean> {
  if (!ownerId || !n.id) return false;
  const query = n.source === 'user_notifications'
    ? sb.from('user_notifications').update({ read_at: new Date().toISOString() })
    : sb.from('notifications').update({ read: true });
  const { data, error } = await query.eq('id', n.id).eq('user_id', ownerId).select('id');
  if (error) return false;
  return Array.isArray(data) && data.length === 1 && data[0]?.id === n.id;
}
