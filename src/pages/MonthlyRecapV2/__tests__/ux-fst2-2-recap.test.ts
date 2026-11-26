/**
 * UX-FST2-2 Monthly Recap on the shared engine (owner 2026-11-26; AR-1b FR-004). Synthetic data.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { toEpisodes, monthName, monthCoverageText } from '../useRecapData';
import type { CalendarMonth } from '@/lib/financialSummary';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const month = (k: string, coverage: CalendarMonth['coverage'], net: number): CalendarMonth => ({
  start: `${k}-01`, end: `${k}-28`, label: k, deposits: 100, withdrawals: 100 - net, netCashFlow: net,
  actualIncome: 0, actualSpending: 0, refunds: 0, count: 3, coverage, comparable: false,
});

describe('UX-FST2-2 Recap', () => {
  it('episodes are the server months, newest first, figures passed through untouched', () => {
    const eps = toEpisodes([month('2026-10', 'unknown', -5), month('2026-11', 'complete', 12.34)]);
    expect(eps.map(e => e.id)).toEqual(['2026-11', '2026-10']);
    expect(eps[0]).toMatchObject({ title: 'November 2026', deposits: 100, withdrawals: 87.66, netCashFlow: 12.34, count: 3, coverage: 'complete' });
  });
  it('every month carries its coverage label; unknown is said plainly', () => {
    expect(monthCoverageText('2026-11', 'unknown')).toBe('Recorded transactions dated in Nov 2026 (statement coverage unknown)');
    expect(monthCoverageText('2026-10', 'partial')).toMatch(/statement coverage partial\)$/);
    // G3: months no statement covers are 'none' (server), shown as such.
    expect(monthCoverageText('2026-07', 'none')).toBe('Recorded transactions dated in Jul 2026 (no imported statement covers this month)');
    expect(monthName('2026-01')).toBe('January 2026');
  });
  it('no browser money, grades, comparisons or invented copy', () => {
    const hook = code(read('useRecapData.ts'));
    expect(hook).toMatch(/useFinancialSummary\(/);
    expect(hook).not.toMatch(/useTransactions|PAYMENT\|CREDIT|\.reduce\(|healthGrade|grade/);
    const card = code(read('RecapCard.tsx'));
    expect(card).not.toMatch(/Grade|healthGrade|"Income"|"Expenses"|"Net"/);
    expect(card).toMatch(/ep\.coverageText/);
    const page = code(read('MonthlyRecapPageV2.tsx'));
    expect(page).not.toMatch(/February|Xspense Score|improved by|Total Duration/);
    expect(page).toMatch(/sum\.dataQuality\.totalsLabel/);
    expect(page).toMatch(/<FinancialStateNotice state=\{data\.financial\}/);
  });
});
