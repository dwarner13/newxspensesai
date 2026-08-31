import { describe, it, expect } from 'vitest';
import {
  buildTemporalContext,
  resolveRelativeDateRange,
  formatTemporalContextForPrompt,
  detectRelativePeriods,
  buildAuthoritativeRanges,
  normalizeToolDateArgs,
} from './temporalContext';

describe('buildTemporalContext', () => {
  // Aug 30, 2026 11:00 PM Edmonton = Aug 31, 2026 05:00 AM UTC
  // This is the "Edmonton 11PM problem" — user is still in August, UTC is September
  const edmontonLateNight = new Date('2026-08-31T05:00:00.000Z');

  it('resolves correct user-local date for Edmonton timezone', () => {
    const tc = buildTemporalContext('America/Edmonton', edmontonLateNight);
    expect(tc.localDate).toBe('2026-08-30');
    expect(tc.localDayOfWeek).toBe('Sunday');
    expect(tc.currentMonthStart).toBe('2026-08-01');
    expect(tc.currentMonthEnd).toBe('2026-08-31');
  });

  it('resolves correct previous month', () => {
    const tc = buildTemporalContext('America/Edmonton', edmontonLateNight);
    expect(tc.previousMonthStart).toBe('2026-07-01');
    expect(tc.previousMonthEnd).toBe('2026-07-31');
  });

  it('falls back to UTC when no timezone provided', () => {
    const tc = buildTemporalContext(null, edmontonLateNight);
    // UTC: Aug 31
    expect(tc.localDate).toBe('2026-08-31');
  });

  it('falls back to UTC for invalid timezone', () => {
    const tc = buildTemporalContext('Invalid/Timezone', edmontonLateNight);
    expect(tc.localDate).toBe('2026-08-31'); // UTC fallback
  });

  it('includes server UTC ISO timestamp', () => {
    const tc = buildTemporalContext('America/Edmonton', edmontonLateNight);
    expect(tc.serverUtcNow).toBe('2026-08-31T05:00:00.000Z');
  });
});

describe('resolveRelativeDateRange', () => {
  const serverNow = new Date('2026-08-31T05:00:00.000Z'); // Aug 30 local in Edmonton

  it('resolves "today" to user-local date', () => {
    const result = resolveRelativeDateRange('today', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-08-30');
    expect(result!.endDate).toBe('2026-08-30');
  });

  it('resolves "yesterday" to previous local day', () => {
    const result = resolveRelativeDateRange('yesterday', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-08-29');
    expect(result!.endDate).toBe('2026-08-29');
  });

  it('resolves "this month" to current local month boundaries', () => {
    const result = resolveRelativeDateRange('this month', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-08-01');
    expect(result!.endDate).toBe('2026-08-31');
  });

  it('resolves "last month" to previous local month boundaries', () => {
    const result = resolveRelativeDateRange('last month', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-07-01');
    expect(result!.endDate).toBe('2026-07-31');
  });

  it('resolves "this year" correctly', () => {
    const result = resolveRelativeDateRange('this year', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-01-01');
    expect(result!.endDate).toBe('2026-12-31');
  });

  it('resolves "last 7 days" correctly', () => {
    const result = resolveRelativeDateRange('last 7 days', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe('2026-08-24');
    expect(result!.endDate).toBe('2026-08-30');
  });

  it('resolves "last 30 days" correctly', () => {
    const result = resolveRelativeDateRange('last 30 days', 'America/Edmonton', serverNow);
    expect(result).not.toBeNull();
    expect(result!.endDate).toBe('2026-08-30');
  });

  it('returns null for unrecognized expressions', () => {
    const result = resolveRelativeDateRange('next quarter', 'America/Edmonton', serverNow);
    expect(result).toBeNull();
  });

  // DST edge case: March transition
  it('handles DST spring-forward correctly', () => {
    // Mar 8 2026 is spring-forward in Edmonton (MST → MDT)
    const dstDay = new Date('2026-03-09T08:00:00.000Z'); // Mar 9, 1 AM MDT
    const tc = buildTemporalContext('America/Edmonton', dstDay);
    expect(tc.localDate).toBe('2026-03-09');
    expect(tc.currentMonthStart).toBe('2026-03-01');
    expect(tc.currentMonthEnd).toBe('2026-03-31');
  });
});

describe('formatTemporalContextForPrompt', () => {
  it('produces a readable prompt block', () => {
    const tc = buildTemporalContext('America/Edmonton', new Date('2026-08-31T05:00:00.000Z'));
    const prompt = formatTemporalContextForPrompt(tc);
    expect(prompt).toContain('TRUSTED TEMPORAL CONTEXT');
    expect(prompt).toContain('User-local date: 2026-08-30');
    expect(prompt).toContain('This month: 2026-08-01 to 2026-08-31');
    expect(prompt).toContain('Last month: 2026-07-01 to 2026-07-31');
    expect(prompt).toContain('America/Edmonton');
  });
});

// ── Section 4: Exact Edmonton Rollover (2026-09-01T05:00:00Z) ──────

describe('Edmonton rollover 2026-09-01T05:00:00Z', () => {
  // UTC: Sep 1, 2026 05:00 AM → Edmonton local: Aug 31, 2026 11:00 PM
  const serverNow = new Date('2026-09-01T05:00:00.000Z');
  const tz = 'America/Edmonton';

  it('today resolves to 2026-08-31', () => {
    const r = resolveRelativeDateRange('today', tz, serverNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-08-31');
    expect(r!.endDate).toBe('2026-08-31');
  });

  it('yesterday resolves to 2026-08-30', () => {
    const r = resolveRelativeDateRange('yesterday', tz, serverNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-08-30');
    expect(r!.endDate).toBe('2026-08-30');
  });

  it('this month resolves to 2026-08-01 → 2026-08-31', () => {
    const r = resolveRelativeDateRange('this month', tz, serverNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-08-01');
    expect(r!.endDate).toBe('2026-08-31');
  });

  it('last month resolves to 2026-07-01 → 2026-07-31', () => {
    const r = resolveRelativeDateRange('last month', tz, serverNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-07-01');
    expect(r!.endDate).toBe('2026-07-31');
  });

  it('financial snapshot month boundaries match local August', () => {
    const tc = buildTemporalContext(tz, serverNow);
    expect(tc.localDate).toBe('2026-08-31');
    expect(tc.currentMonthStart).toBe('2026-08-01');
    expect(tc.currentMonthEnd).toBe('2026-08-31');
    expect(tc.previousMonthStart).toBe('2026-07-01');
    expect(tc.previousMonthEnd).toBe('2026-07-31');
  });
});

// ── Section 5: DST Tests ───────────────────────────────────────────

describe('DST spring-forward (America/Edmonton)', () => {
  // Mar 8 2026 02:00 MST → 03:00 MDT (spring forward)
  // Test at Mar 8 2026 11:30 PM MDT = Mar 9 05:30 UTC
  const springNow = new Date('2026-03-09T05:30:00.000Z');
  const tz = 'America/Edmonton';

  it('today resolves to local Mar 8', () => {
    const r = resolveRelativeDateRange('today', tz, springNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-03-08');
    expect(r!.endDate).toBe('2026-03-08');
  });

  it('this month boundaries are correct', () => {
    const r = resolveRelativeDateRange('this month', tz, springNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-03-01');
    expect(r!.endDate).toBe('2026-03-31');
  });
});

describe('DST fall-back (America/Edmonton)', () => {
  // Nov 1 2026 02:00 MDT → 01:00 MST (fall back)
  // Test at Nov 1 2026 12:30 AM MST = Nov 1 07:30 UTC
  const fallNow = new Date('2026-11-01T07:30:00.000Z');
  const tz = 'America/Edmonton';

  it('today resolves to local Nov 1', () => {
    const r = resolveRelativeDateRange('today', tz, fallNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-11-01');
    expect(r!.endDate).toBe('2026-11-01');
  });

  it('this month boundaries are correct', () => {
    const r = resolveRelativeDateRange('this month', tz, fallNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-11-01');
    expect(r!.endDate).toBe('2026-11-30');
  });

  it('yesterday resolves to Oct 31 (month boundary)', () => {
    const r = resolveRelativeDateRange('yesterday', tz, fallNow);
    expect(r).not.toBeNull();
    expect(r!.startDate).toBe('2026-10-31');
    expect(r!.endDate).toBe('2026-10-31');
  });
});

// ── detectRelativePeriods ──────────────────────────────────────────

describe('detectRelativePeriods', () => {
  it('detects "this month"', () => {
    expect(detectRelativePeriods('How much did I spend this month?')).toContain('this month');
  });

  it('detects multiple periods for comparison', () => {
    const periods = detectRelativePeriods('Compare this month with last month');
    expect(periods).toContain('this month');
    expect(periods).toContain('last month');
  });

  it('detects "yesterday"', () => {
    expect(detectRelativePeriods('What did I spend yesterday?')).toContain('yesterday');
  });

  it('detects "last 7 days"', () => {
    expect(detectRelativePeriods('Show me the last 7 days')).toContain('last 7 days');
  });

  it('returns empty for explicit dates', () => {
    expect(detectRelativePeriods('Show spending from August 3 to August 17')).toEqual([]);
  });

  it('returns empty for no date reference', () => {
    expect(detectRelativePeriods('What is my balance?')).toEqual([]);
  });
});

// ── normalizeToolDateArgs — Authoritative Date Enforcement ─────────

describe('normalizeToolDateArgs', () => {
  // Edmonton 11PM: 2026-09-01T05:00:00Z = Aug 31 11PM local
  const serverNow = new Date('2026-09-01T05:00:00.000Z');
  const tz = 'America/Edmonton';

  it('corrects UTC-shifted "this month" to local month', () => {
    const ranges = buildAuthoritativeRanges(['this month'], tz, serverNow);
    // UTC "this month" = Sep 1-30 (wrong), Local "this month" = Aug 1-31 (correct)
    const result = normalizeToolDateArgs(
      { startDate: '2026-09-01', endDate: '2026-09-30' },
      ranges,
    );
    expect(result.corrected).toBe(true);
    expect(result.startDate).toBe('2026-08-01');
    expect(result.endDate).toBe('2026-08-31');
    expect(result.correctionLabel).toBe('this month');
  });

  it('passes through already-correct local dates', () => {
    const ranges = buildAuthoritativeRanges(['this month'], tz, serverNow);
    const result = normalizeToolDateArgs(
      { startDate: '2026-08-01', endDate: '2026-08-31' },
      ranges,
    );
    expect(result.corrected).toBe(false);
    expect(result.startDate).toBe('2026-08-01');
    expect(result.endDate).toBe('2026-08-31');
  });

  it('preserves explicit dates that do not match any period', () => {
    const ranges = buildAuthoritativeRanges(['this month'], tz, serverNow);
    const result = normalizeToolDateArgs(
      { startDate: '2026-08-03', endDate: '2026-08-17' },
      ranges,
    );
    expect(result.corrected).toBe(false);
    expect(result.startDate).toBe('2026-08-03');
    expect(result.endDate).toBe('2026-08-17');
  });

  it('passes through when no ranges detected', () => {
    const result = normalizeToolDateArgs(
      { startDate: '2026-09-01', endDate: '2026-09-30' },
      [],
    );
    expect(result.corrected).toBe(false);
  });

  it('passes through when dates are missing', () => {
    const ranges = buildAuthoritativeRanges(['this month'], tz, serverNow);
    const result = normalizeToolDateArgs({}, ranges);
    expect(result.corrected).toBe(false);
  });

  // ── Tool argument evidence: "What did I spend yesterday?" ──────

  it('deterministic tx_search args for "yesterday" — correct LLM dates', () => {
    // User asks "What did I spend yesterday?" at Edmonton 11PM (UTC Sep 1)
    // Detected: ["yesterday"] → authoritative: Aug 30
    const ranges = buildAuthoritativeRanges(['yesterday'], tz, serverNow);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].startDate).toBe('2026-08-30');
    expect(ranges[0].endDate).toBe('2026-08-30');

    // LLM correctly uses Aug 30 → no correction
    const correct = normalizeToolDateArgs(
      { startDate: '2026-08-30', endDate: '2026-08-30' },
      ranges,
    );
    expect(correct.corrected).toBe(false);
    expect(correct.startDate).toBe('2026-08-30');
  });

  it('deterministic tx_search args for "yesterday" — UTC-shifted LLM dates', () => {
    const ranges = buildAuthoritativeRanges(['yesterday'], tz, serverNow);
    // UTC yesterday = Aug 31, but local yesterday = Aug 30
    const shifted = normalizeToolDateArgs(
      { startDate: '2026-08-31', endDate: '2026-08-31' },
      ranges,
    );
    expect(shifted.corrected).toBe(true);
    expect(shifted.startDate).toBe('2026-08-30');
    expect(shifted.endDate).toBe('2026-08-30');
    expect(shifted.correctionLabel).toBe('yesterday');
  });

  // ── Multi-period comparison: "Compare this month with last month" ──

  it('multi-period: both authoritative ranges resolved independently', () => {
    const ranges = buildAuthoritativeRanges(['this month', 'last month'], tz, serverNow);
    expect(ranges).toHaveLength(2);

    const thisMonth = ranges.find(r => r.label === 'this month')!;
    const lastMonth = ranges.find(r => r.label === 'last month')!;

    // Local: this month = Aug, last month = Jul
    expect(thisMonth.startDate).toBe('2026-08-01');
    expect(thisMonth.endDate).toBe('2026-08-31');
    expect(lastMonth.startDate).toBe('2026-07-01');
    expect(lastMonth.endDate).toBe('2026-07-31');
  });

  it('multi-period: LLM uses correct local dates → both pass through', () => {
    const ranges = buildAuthoritativeRanges(['this month', 'last month'], tz, serverNow);

    // First tx_search: this month (correct)
    const q1 = normalizeToolDateArgs({ startDate: '2026-08-01', endDate: '2026-08-31' }, ranges);
    expect(q1.corrected).toBe(false);
    expect(q1.startDate).toBe('2026-08-01');

    // Second tx_search: last month (correct)
    const q2 = normalizeToolDateArgs({ startDate: '2026-07-01', endDate: '2026-07-31' }, ranges);
    expect(q2.corrected).toBe(false);
    expect(q2.startDate).toBe('2026-07-01');
  });

  it('multi-period: LLM uses UTC-shifted "this month" → corrected, "last month" preserved', () => {
    const ranges = buildAuthoritativeRanges(['this month', 'last month'], tz, serverNow);

    // First tx_search: UTC this month (Sep) → corrected to Aug
    const q1 = normalizeToolDateArgs({ startDate: '2026-09-01', endDate: '2026-09-30' }, ranges);
    expect(q1.corrected).toBe(true);
    expect(q1.startDate).toBe('2026-08-01');
    expect(q1.endDate).toBe('2026-08-31');

    // Second tx_search: correct local last month (Jul)
    const q2 = normalizeToolDateArgs({ startDate: '2026-07-01', endDate: '2026-07-31' }, ranges);
    expect(q2.corrected).toBe(false);
    expect(q2.startDate).toBe('2026-07-01');
  });
});
