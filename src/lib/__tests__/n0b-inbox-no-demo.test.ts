/**
 * UX-N1 N0-b — the Inbox never shows invented sample messages or financial figures.
 * Empty results show the empty state; failures show a retryable error.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const inbox = fs.readFileSync(path.join(root, 'src/pages/Inbox/InboxPage.tsx'), 'utf8');

describe('InboxPage', () => {
  it('has no demo/sample messages or invented figures', () => {
    expect(inbox).not.toMatch(/DEMO_MESSAGES/);
    expect(inbox).not.toMatch(/demo-\d/);
    expect(inbox).not.toMatch(/\$32,194|691 transactions|BMO March 2025/);
  });

  it('shows only the fetched notifications', () => {
    expect(inbox).toMatch(/setNotifications\(combined\);/);
    expect(inbox).toMatch(/\.eq\("user_id", user\.id\)/);
  });

  it('shows a retryable error instead of fake content on failure', () => {
    expect(inbox).toMatch(/catch \{ setNotifications\(\[\]\); setLoadError\(true\); \}/);
    expect(inbox).toMatch(/We couldn't load your notifications\./);
    expect(inbox).toMatch(/onClick=\{\(\) => void fetchNotifications\(\)\}/);
  });

  it('keeps the empty state and mark-read behaviour', () => {
    expect(inbox).toMatch(/No messages yet/);
    // Security batch: mark-read moved into the owner-scoped helper (src/lib/inbox/markNotificationRead.ts).
    expect(inbox).toMatch(/markNotificationReadForOwner\(/);
  });
});
