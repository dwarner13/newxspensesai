/**
 * S0 Inbox batch — live notification schema (2026-11-23).
 * The Inbox selected and updated columns that do not exist live (notifications.read,
 * user_notifications.employee_slug/message/priority/payload/sent_at). It now uses the live
 * columns, and mark-as-read writes only read_at — the single column customers may update once
 * the notifications RLS migration is applied.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  NOTIFICATIONS_SELECT,
  USER_NOTIFICATIONS_SELECT,
  normalizeNotificationRow,
  normalizeUserNotificationRow,
  safeInternalHref,
} from '../../../src/lib/inbox/notificationRows';

const LIVE = {
  notifications: ['id', 'user_id', 'employee_slug', 'type', 'title', 'message', 'action_url', 'priority', 'payload', 'read_at', 'sent_at', 'created_at'],
  user_notifications: ['id', 'user_id', 'type', 'title', 'body', 'href', 'meta', 'read_at', 'created_at'],
};
const cols = (sel: string) => sel.split(',').map(s => s.trim());

describe('Inbox selects only live columns', () => {
  it('notifications', () => {
    for (const c of cols(NOTIFICATIONS_SELECT)) expect(LIVE.notifications).toContain(c);
    expect(cols(NOTIFICATIONS_SELECT)).not.toContain('read');
  });
  it('user_notifications', () => {
    for (const c of cols(USER_NOTIFICATIONS_SELECT)) expect(LIVE.user_notifications).toContain(c);
  });
  it('the page uses the shared selects (no select("*"), no stale column list)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../src/pages/Inbox/InboxPage.tsx'), 'utf8');
    expect(src).toMatch(/\.select\(NOTIFICATIONS_SELECT\)/);
    expect(src).toMatch(/\.select\(USER_NOTIFICATIONS_SELECT\)/);
    expect(src).not.toMatch(/select\("\*"\)/);
    expect(src).not.toMatch(/employee_slug, type, title, message, priority, payload, read_at, sent_at/);
  });
  it('mark-as-read writes read_at only, on either table', () => {
    const helper = fs.readFileSync(path.resolve(__dirname, '../../../src/lib/inbox/markNotificationRead.ts'), 'utf8');
    expect(helper).toMatch(/update\(\{ read_at: new Date\(\)\.toISOString\(\) \}\)/);
    expect(helper).not.toMatch(/update\(\{ read: true \}\)/);
  });
});

describe('row normalization', () => {
  it('notifications: message → description, read_at → read, safe href', () => {
    const r = normalizeNotificationRow({ id: 'n1', employee_slug: 'tag-ai', priority: 'action', title: 'T', message: 'M', action_url: '/transactions', read_at: '2026-11-01T00:00:00Z', created_at: 'c' });
    expect(r).toEqual({ id: 'n1', employee_slug: 'tag-ai', priority: 'action', title: 'T', description: 'M', href: '/transactions', read: true, created_at: 'c', source: 'notifications' });
  });
  it('user_notifications: body → description, meta.employee_slug, unread when read_at is null', () => {
    const r = normalizeUserNotificationRow({ id: 'u1', title: 'T', body: 'B', href: null, meta: { employee_slug: 'byte-docs' }, read_at: null, created_at: 'c' });
    expect(r).toMatchObject({ id: 'u1', employee_slug: 'byte-docs', description: 'B', read: false, source: 'user_notifications', priority: 'info' });
  });
  it('defaults when fields are missing', () => {
    expect(normalizeUserNotificationRow({ id: 'u2', created_at: 'c' })).toMatchObject({ employee_slug: 'prime-boss', title: 'Notification', description: null, href: null, read: false });
  });
  it('only same-app links are followed', () => {
    expect(safeInternalHref('/dashboard')).toBe('/dashboard');
    expect(safeInternalHref('https://evil.example')).toBeNull();
    expect(safeInternalHref('//evil.example')).toBeNull();
    expect(safeInternalHref('javascript:alert(1)')).toBeNull();
    expect(safeInternalHref(undefined)).toBeNull();
  });
});

describe('migration file (prepared, not executed)', () => {
  const sqlPath = 'C:/Users/user/Desktop/xspensesai-security-evidence/NOTIFICATIONS_rls_migration.sql';
  const exists = fs.existsSync(sqlPath);
  it.skipIf(!exists)('grants customers only SELECT and UPDATE(read_at), revokes anon, keeps service_role', () => {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/alter table public\.notifications enable row level security;/);
    expect(sql).toMatch(/grant update \(read_at\) on table public\.notifications {6}to authenticated;/);
    expect(sql).toMatch(/grant update \(read_at\) on table public\.user_notifications to authenticated;/);
    expect(sql).toMatch(/revoke all on table public\.notifications {6}from anon;/);
    expect(sql).toMatch(/grant all on table public\.notifications {6}to service_role;/);
    expect(sql).not.toMatch(/^grant (insert|delete|truncate)[^\n]*to authenticated/im);
  });
});
