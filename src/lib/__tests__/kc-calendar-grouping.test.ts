/**
 * K-c — Categories year / month grouping uses the calendar day, never a timezone-shifted
 * instant. These assertions must hold in every timezone; the suite is run under several
 * TZ values (UTC, America/Edmonton, America/St_Johns, Pacific/Auckland).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calendarDayOfTx, periodKeyOf, yearOf, inSelectedPeriod } from '../categoryPeriod';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const hook = read('src/pages/CategoriesV2/useCategoriesData.ts');
const drawer = read('src/pages/CategoriesV2/CategoryDetailDrawer.tsx');

// Stored the way commit-import stores them: posted_at = UTC midnight of the statement day.
const utcMidnight = (day: string) => ({ posted_at: `${day}T00:00:00.000Z` });

describe('boundaries (independent of the viewer timezone)', () => {
  it('month end / month start', () => {
    expect(periodKeyOf(calendarDayOfTx(utcMidnight('2025-06-30')))).toBe('2025-06');
    expect(periodKeyOf(calendarDayOfTx(utcMidnight('2025-07-01')))).toBe('2025-07');
  });

  it('year end / year start', () => {
    expect(yearOf(calendarDayOfTx(utcMidnight('2024-12-31')))).toBe(2024);
    expect(yearOf(calendarDayOfTx(utcMidnight('2025-01-01')))).toBe(2025);
    expect(inSelectedPeriod(calendarDayOfTx(utcMidnight('2025-01-01')), 2025, '2025-01')).toBe(true);
    expect(inSelectedPeriod(calendarDayOfTx(utcMidnight('2025-01-01')), 2024, undefined)).toBe(false);
  });

  it('leap day', () => {
    expect(periodKeyOf(calendarDayOfTx(utcMidnight('2024-02-29')))).toBe('2024-02');
    expect(periodKeyOf(calendarDayOfTx(utcMidnight('2024-03-01')))).toBe('2024-03');
  });

  it('daylight-saving change days (North America and Europe)', () => {
    for (const day of ['2025-03-09', '2025-11-02', '2025-03-30', '2025-10-26']) {
      expect(calendarDayOfTx(utcMidnight(day))).toBe(day);
    }
  });

  it('prefers the date-only `date` column when present', () => {
    expect(calendarDayOfTx({ date: '2025-06-01', posted_at: '2025-06-01T00:00:00.000Z' })).toBe('2025-06-01');
    expect(calendarDayOfTx({ date: null, posted_at: '2025-06-01T00:00:00.000Z' })).toBe('2025-06-01');
    expect(calendarDayOfTx({})).toBeNull();
  });
});

describe('Categories uses calendar grouping everywhere', () => {
  it('useCategoriesData no longer reads posted_at as an instant', () => {
    expect(hook).not.toMatch(/new Date\(t\.posted_at/);
    // UX-FST2-6: the period becomes the server scope (categoriesDates); rows match by calendar day.
    expect(hook).toMatch(/yearOf\(calendarDayOfTx\(t\)\) === selectedYear/);
    expect(hook).toMatch(/const d = calendarDayOfTx\(t\); return !!d && d >= dates\.startDate && d <= dates\.endDate;/);
    expect(hook).toMatch(/export function categoriesDates\(/);
  });

  it('the detail drawer uses the same rule', () => {
    // K-d: matchesCategoryFilters calls calendarDayOfTx internally.
    expect(drawer).toMatch(/matchesCategoryFilters\(t, \{ selectedYear, selectedPeriod, range, importIds \}\)/);
  });
});
