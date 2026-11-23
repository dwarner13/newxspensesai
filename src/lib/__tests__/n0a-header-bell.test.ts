/**
 * UX-N1 N0-a — the header bell no longer shows a hardcoded unread count.
 * The bell and its dropdown remain; Ask Prime (C2-E1) is untouched.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const header = fs.readFileSync(path.join(root, 'src/components/ui/DashboardHeader.tsx'), 'utf8');

describe('DashboardHeader bell', () => {
  it('has no hardcoded unread count, badge or "unread" text', () => {
    expect(header).not.toMatch(/useState\(4\)/);
    expect(header).not.toMatch(/unreadCount/);
    expect(header).not.toMatch(/ unread<\/span>/);
    expect(header).not.toMatch(/bg-rose-500 text-\[10px\]/);
  });

  it('keeps the bell button and dropdown', () => {
    expect(header).toMatch(/aria-label="Notifications"/);
    expect(header).toMatch(/<Bell className="w-\[18px\] h-\[18px\]" \/>/);
    expect(header).toMatch(/\{isNotificationsOpen && \(/);
  });

  it('keeps Ask Prime untouched', () => {
    expect(header).toMatch(/aria-label="Ask Prime"/);
    expect(header).toMatch(/data-testid="ask-prime-header"/);
    expect(header).toMatch(/setIsPrimeBriefingOpen/);
  });
});
