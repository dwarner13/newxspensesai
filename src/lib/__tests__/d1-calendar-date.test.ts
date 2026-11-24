/**
 * D-1 — transaction dates display as calendar dates, never shifted by timezone.
 * commit-import stores posted_at as UTC midnight; the drawer previously formatted it as an
 * instant, so Mountain-time users saw Jun 15 for a Jun 16 transaction.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { toCalendarDay, formatCalendarDate } from '../calendarDate';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('toCalendarDay', () => {
  it('takes the calendar day from date-only and UTC-midnight timestamps', () => {
    expect(toCalendarDay('2025-06-16')).toBe('2025-06-16');
    expect(toCalendarDay('2025-06-16T00:00:00.000Z')).toBe('2025-06-16');
    expect(toCalendarDay('2025-06-16T23:59:59-06:00')).toBe('2025-06-16');
  });

  it('rejects non-dates', () => {
    expect(toCalendarDay('')).toBeNull();
    expect(toCalendarDay(null)).toBeNull();
    expect(toCalendarDay('June 16')).toBeNull();
    expect(toCalendarDay('2025-13-01')).toBeNull();
  });
});

describe('formatCalendarDate', () => {
  it('formats the stored day regardless of the viewer timezone', () => {
    // Constructed from local Y/M/D, so the day cannot shift (the old code produced Jun 15 in UTC-6).
    expect(formatCalendarDate('2025-06-16T00:00:00.000Z', 'medium')).toBe('Jun 16, 2025');
    expect(formatCalendarDate('2025-06-16', 'long')).toBe('Mon, Jun 16, 2025');
    expect(formatCalendarDate('2025-06-16', 'short')).toBe('Jun 16');
  });

  it('returns null for impossible dates instead of rolling over', () => {
    expect(formatCalendarDate('2025-02-31')).toBeNull();
    expect(formatCalendarDate(undefined)).toBeNull();
  });
});

describe('surfaces use the calendar formatter', () => {
  it('drawer no longer parses posted_at as an instant', () => {
    const drawer = read('src/components/transactions/TransactionInsightDrawer.tsx');
    expect(drawer).toMatch(/formatCalendarDate\(postedAt, 'long'\)/);
    expect(drawer).not.toMatch(/new Date\(postedAt \+/);
  });

  it('Tag context strip no longer prints the raw ISO timestamp', () => {
    const tag = read('src/components/transactions/TagCopilotPanel.tsx');
    expect(tag).not.toMatch(/- \{focusedTransaction\.posted_at \|\| focusedTransaction\.date\}/);
    // D-4 moved the strip into an expandable card using the long style.
    expect(tag).toMatch(/formatCalendarDate\(focusedTransaction\.posted_at \|\| focusedTransaction\.date, '(medium|long)'\)/);
  });
});
