/**
 * Coverage-gated comparisons and insights (owner GO 2026-11-26). Synthetic data only. Built on the
 * existing statement coverage (summarizeStatementCoverage).
 */
import { describe, it, expect } from 'vitest';
import { summarizeStatementCoverage, type StatementRecord } from '../statement-coverage';
import { comparablePeriods, canCompare, periodFigures, buildInsights, comparisonAllowed } from '../coverage-insights';
import { buildPeriodAggregate } from '../period-aggregate';

const rec = (inst: string, l4: string, s: string | null, e: string | null): StatementRecord => ({
  institution: inst, accountLast4: l4, statementType: 'bank', periodStart: s, periodEnd: e, periodText: null, periodEndingOnly: false,
  periodSource: s ? 'statement_meta' : 'none', uploadedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:00Z', state: 'completed', fileName: null, metadataMissing: false,
} as StatementRecord);
const cov = (...r: StatementRecord[]) => summarizeStatementCoverage(r);

describe('comparability', () => {
  it('one statement (17 Sep – 16 Oct): one period, nothing comparable — the incident shape', () => {
    const c = cov(rec('Bank', '1111', '2026-09-17', '2026-10-16'));
    expect(comparablePeriods(c)).toHaveLength(1);
    expect(comparisonAllowed(c)).toMatchObject({ allowed: false, periodsAvailable: 1 });
  });

  it('two consecutive statements of one account are comparable', () => {
    const c = cov(rec('Bank', '1111', '2026-08-17', '2026-09-16'), rec('Bank', '1111', '2026-09-17', '2026-10-16'));
    const p = comparablePeriods(c);
    expect(canCompare(p[0], p[1])).toBe(true);
    expect(comparisonAllowed(c).allowed).toBe(true);
  });

  it('a completed statement without a recorded period makes coverage unknown: nothing comparable', () => {
    const c = cov(rec('Bank', '1111', '2026-08-17', '2026-09-16'), rec('Bank', '1111', '2026-09-17', '2026-10-16'), rec('Bank', '1111', null, null));
    expect(comparablePeriods(c)).toHaveLength(0);
    expect(comparisonAllowed(c)).toMatchObject({ allowed: false, reason: 'some imported statements have no recorded period' });
  });

  it('several accounts: only months every account fully covers', () => {
    const c = cov(
      rec('Bank', '1111', '2026-01-01', '2026-01-31'), rec('Bank', '1111', '2026-02-01', '2026-02-28'), rec('Bank', '1111', '2026-03-01', '2026-03-31'),
      rec('Card', '2222', '2026-01-15', '2026-02-14'), rec('Card', '2222', '2026-02-15', '2026-03-14'),
    );
    expect(comparablePeriods(c).map(p => p.label)).toEqual(['2026-02']);
  });

  it('periods of very different length are not comparable', () => {
    const c = cov(rec('Bank', '1111', '2026-01-01', '2026-01-31'), rec('Bank', '1111', '2026-02-01', '2026-03-31'));
    const p = comparablePeriods(c);
    expect(canCompare(p[0], p[1])).toBe(false);
    expect(comparisonAllowed(c).allowed).toBe(false);
  });
});

describe('insights: thresholds on the server; clients only render', () => {
  const tx = (date: string, amount: number) => ({ id: `${date}-${amount}`, date, amount: -amount, type: 'expense', category: 'Groceries', subcategory: null });
  const c3 = cov(rec('Bank', '1111', '2026-01-01', '2026-01-31'), rec('Bank', '1111', '2026-02-01', '2026-02-28'), rec('Bank', '1111', '2026-03-01', '2026-03-31'));
  const totals = (rows: ReturnType<typeof tx>[]) => buildPeriodAggregate(rows, { fetch: { complete: true, truncated: false, rowsFetched: rows.length } });

  it('trend only with 2+ comparable periods and ≥10% change', () => {
    const rows = [tx('2026-02-10', 100), tx('2026-03-10', 150)];
    expect(buildInsights(totals(rows), periodFigures(rows, comparablePeriods(c3)), 0).find(i => i.kind === 'trend')).toMatchObject({ direction: 'up', percent: 50 });
  });

  it('"stable" only with 3 comparable periods and every change under 10%', () => {
    const rows = [tx('2026-01-10', 100), tx('2026-02-10', 104), tx('2026-03-10', 99)];
    expect(buildInsights(totals(rows), periodFigures(rows, comparablePeriods(c3)), 0).map(i => i.kind)).toContain('stable');
  });

  it('one statement: not_enough_history; never trend or stable (Crystal "stable", "up 50%" defects)', () => {
    const c1 = cov(rec('Bank', '1111', '2026-09-17', '2026-10-16'));
    const rows = [tx('2026-09-20', 100), tx('2026-10-10', 150)];
    const kinds = buildInsights(totals(rows), periodFigures(rows, comparablePeriods(c1)), 2).map(i => i.kind);
    expect(kinds).toEqual(expect.arrayContaining(['not_enough_history', 'needs_review', 'top_category']));
    expect(kinds).not.toContain('trend');
    expect(kinds).not.toContain('stable');
  });
});

describe('Architecture review gaps', () => {
  it('G1: comparisons are scoped to the requested range', async () => {
    const { comparisonAllowedInRange } = await import('../coverage-insights');
    const c = cov(rec('Bank', '1111', '2026-01-01', '2026-01-31'), rec('Bank', '1111', '2026-02-01', '2026-02-28'), rec('Bank', '1111', '2026-03-01', '2026-03-31'));
    expect(comparisonAllowed(c).allowed).toBe(true);                                       // all time: yes
    expect(comparisonAllowedInRange(c, '2026-03-01', '2026-03-31').allowed).toBe(false);   // only one period in range
    expect(comparisonAllowedInRange(c, '2026-02-01', '2026-03-31').allowed).toBe(true);
  });
  it('G4: a coverage read error is unknown, never "none"', async () => {
    const { coverageForPeriod } = await import('../statement-coverage');
    const err = { ...cov(), status: 'query_error' as const };
    expect(coverageForPeriod(err, '2026-01-01', '2026-01-31').overall).toBe('unknown');
  });
  it('G14: a truncated import list is unknown coverage and nothing is comparable', async () => {
    const { coverageForPeriod } = await import('../statement-coverage');
    const c = { ...cov(rec('Bank', '1111', '2026-01-01', '2026-01-31'), rec('Bank', '1111', '2026-02-01', '2026-02-28')), importsTruncated: true };
    expect(coverageForPeriod(c, '2026-01-01', '2026-01-31').overall).toBe('unknown');
    expect(comparablePeriods(c)).toEqual([]);
  });
});
