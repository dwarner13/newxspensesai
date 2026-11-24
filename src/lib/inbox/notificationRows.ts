/**
 * Security batch (Inbox, 2026-11-23): normalize rows from the two notification tables using the
 * LIVE column layout (verified from the API schema), not the outdated repo migration.
 *
 *   notifications      : id, user_id, employee_slug, type, title, message, action_url, priority,
 *                        payload, read_at, sent_at, created_at          (no `read` column)
 *   user_notifications : id, user_id, type, title, body, href, meta, read_at, created_at
 *
 * Read state is `read_at` on both tables; mark-as-read writes only `read_at`.
 */

export const NOTIFICATIONS_SELECT = 'id, user_id, employee_slug, type, title, message, action_url, priority, read_at, created_at';
export const USER_NOTIFICATIONS_SELECT = 'id, user_id, type, title, body, href, meta, read_at, created_at';

export interface InboxRow {
  id: string;
  employee_slug: string;
  priority: string;
  title: string;
  description: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
  source: 'notifications' | 'user_notifications';
}

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Only same-app paths are followed ("/x"), never external or protocol-relative links. */
export function safeInternalHref(v: unknown): string | null {
  const s = str(v);
  return s && s.startsWith('/') && !s.startsWith('//') ? s : null;
}

export function normalizeNotificationRow(r: Raw): InboxRow {
  return {
    id: String(r.id ?? ''),
    employee_slug: str(r.employee_slug) ?? 'prime-boss',
    priority: str(r.priority) ?? 'info',
    title: str(r.title) ?? 'Notification',
    description: str(r.message),
    href: safeInternalHref(r.action_url),
    read: !!r.read_at,
    created_at: String(r.created_at ?? ''),
    source: 'notifications',
  };
}

export function normalizeUserNotificationRow(r: Raw): InboxRow {
  const meta = r.meta && typeof r.meta === 'object' ? (r.meta as Raw) : {};
  return {
    id: String(r.id ?? ''),
    employee_slug: str(meta.employee_slug) ?? 'prime-boss',
    priority: str(meta.priority) ?? 'info',
    title: str(r.title) ?? 'Notification',
    description: str(r.body),
    href: safeInternalHref(r.href),
    read: !!r.read_at,
    created_at: String(r.created_at ?? ''),
    source: 'user_notifications',
  };
}
