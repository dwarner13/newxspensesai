/**
 * L-D3 — statement periods from EXISTING metadata (owner conditional GO 2026-11-24; sources verified
 * by Attachments HQ). Order: statement_meta → claude_vision ISO → legacy user_documents columns →
 * printed text (verbatim; range only from an unambiguous parse) → not recorded. No guessing.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseUnambiguousDate, parsePrintedPeriod, resolveStatementPeriod } from '../../../src/shared/statement-period';
import { toStatementRecord, summarizeStatementCoverage } from '../../../src/shared/statement-coverage';
import { formatStatementCoverageEvidence } from '../../../src/shared/prime-statement-guidance';

describe('unambiguous date parsing only', () => {
  it.each([
    ['2025-10-15', '2025-10-15'], ['Oct 15, 2025', '2025-10-15'], ['October 15 2025', '2025-10-15'],
    ['15 Oct 2025', '2025-10-15'], ['Sept 3, 2025', '2025-09-03'],
  ])('%s → %s', (t, want) => { expect(parseUnambiguousDate(t)).toBe(want); });
  it.each(['10/11/2025', '11-10-2025', '2025/10/15', 'Feb 30, 2025', 'Octember 1, 2025', '', 'Oct 2025'])('ambiguous or invalid: %s → null', (t) => {
    expect(parseUnambiguousDate(t)).toBeNull();
  });
  it('printed ranges parse only when both ends are unambiguous', () => {
    expect(parsePrintedPeriod('Oct 15, 2025 - Nov 14, 2025')).toEqual({ start: '2025-10-15', end: '2025-11-14' });
    expect(parsePrintedPeriod('Oct 15, 2025 to Nov 14, 2025')).toEqual({ start: '2025-10-15', end: '2025-11-14' });
    expect(parsePrintedPeriod('10/15/2025 - 11/14/2025')).toBeNull();
    expect(parsePrintedPeriod('Nov 14, 2025 - Oct 15, 2025')).toBeNull(); // reversed
  });
});

describe('source order', () => {
  it('statement_meta wins', () => {
    expect(resolveStatementPeriod({ statementMeta: { period_start: '2026-05-17', period_end: '2026-06-16' }, visionPeriod: { start: '2026-01-01', end: '2026-01-31' } }))
      .toEqual({ start: '2026-05-17', end: '2026-06-16', printedText: null, printedEndingOnly: false, source: 'statement_meta' });
  });
  it('then Vision ISO', () => {
    expect(resolveStatementPeriod({ visionPeriod: { start: '2026-01-01', end: '2026-01-31' }, printedPeriod: 'Jan 1, 2026 - Jan 31, 2026' }).source).toBe('vision_extraction');
  });
  it('then printed text, verbatim, with an unambiguous range', () => {
    expect(resolveStatementPeriod({ printedPeriod: 'Oct 15, 2025 - Nov 14, 2025' }))
      .toEqual({ start: '2025-10-15', end: '2025-11-14', printedText: 'Oct 15, 2025 - Nov 14, 2025', printedEndingOnly: false, source: 'printed_text' });
  });
  it('printed text that cannot be parsed unambiguously is still shown, with NO range', () => {
    expect(resolveStatementPeriod({ printedPeriod: '10/15/25 - 11/14/25' }))
      .toEqual({ start: null, end: null, printedText: '10/15/25 - 11/14/25', printedEndingOnly: false, source: 'printed_text' });
  });
  it('nothing → not recorded', () => {
    expect(resolveStatementPeriod({})).toEqual({ start: null, end: null, printedText: null, printedEndingOnly: false, source: 'none' });
  });
});

describe('statement inventory uses it', () => {
  const imp = { status: 'committed', created_at: '2025-11-20T00:00:00Z', committed_at: '2025-11-20T00:05:00Z', statement_breakdown_json: { statement_meta: { issuer: 'BMO', account_last4: '1234' } } };
  it('Vision period fills coverage when statement_meta lacks it', () => {
    const r = toStatementRecord(imp, { id: 'd', vision_period: { start: '2025-10-15', end: '2025-11-14' } });
    expect(r).toMatchObject({ periodStart: '2025-10-15', periodEnd: '2025-11-14', periodSource: 'vision_extraction', metadataMissing: false });
    expect(summarizeStatementCoverage([r]).accounts[0]).toMatchObject({ earliestPeriodStart: '2025-10-15', latestPeriodEnd: '2025-11-14' });
  });
  it('printed text is shown verbatim and labelled "as printed"', () => {
    const r = toStatementRecord(imp, { id: 'd', printed_period: 'Oct 15, 2025 - Nov 14, 2025' });
    const ev = formatStatementCoverageEvidence(summarizeStatementCoverage([r]));
    expect(ev).toContain('statement period as printed on the statement: "Oct 15, 2025 - Nov 14, 2025" (2025-10-15 to 2025-11-14)');
  });
  it('unparseable printed text: verbatim, no range, and no coverage counted for it', () => {
    const r = toStatementRecord(imp, { id: 'd', printed_period: '10/15/25 - 11/14/25' });
    const c = summarizeStatementCoverage([r]);
    expect(formatStatementCoverageEvidence(c)).toContain('statement period as printed on the statement: "10/15/25 - 11/14/25"');
    expect(c.accounts).toEqual([]);
    expect(c.completedWithoutPeriod).toBe(1);
  });
  it('the query reads only the two JSON paths (no document text) and stays owner-scoped', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../src/shared/statement-coverage.ts'), 'utf8');
    expect(src).toMatch(/vision_period:extracted_data->claude_vision->period, printed_period:metadata->statement_summary->>statement_period/);
    expect(src).not.toMatch(/select\([^)]*(ocr_text|raw_text|page_texts|storage_path)/);
    expect(src.match(/\.eq\('user_id', userId\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Attachments HQ review fixes', () => {
  it('MUST: BMO "period ending X" stored as "X - X" is an END date only — no one-day range, no coverage', () => {
    const p = resolveStatementPeriod({ printedPeriod: 'Oct 15, 2025 - Oct 15, 2025' });
    expect(p).toEqual({ start: null, end: null, printedText: 'Oct 15, 2025', printedEndingOnly: true, source: 'printed_text' });
    const imp = { status: 'committed', created_at: '2025-11-20T00:00:00Z', statement_breakdown_json: { statement_meta: { issuer: 'BMO', account_last4: '1234' } } };
    const r = toStatementRecord(imp, { id: 'd', printed_period: 'Oct 15, 2025 - Oct 15, 2025' });
    const c = summarizeStatementCoverage([r]);
    expect(c.accounts).toEqual([]);
    expect(c.completedWithoutPeriod).toBe(1);
    expect(formatStatementCoverageEvidence(c)).toContain('statement period ending "Oct 15, 2025" (as printed; start date not recorded)');
    expect(formatStatementCoverageEvidence(c)).not.toContain('Oct 15, 2025 - Oct 15, 2025');
  });
  it('SHOULD: legacy user_documents columns have their own provenance label', () => {
    expect(resolveStatementPeriod({ documentPeriod: { start: '2026-01-01', end: '2026-01-31' } }).source).toBe('document_period');
  });
  it('NICE: whitespace/newlines collapsed; "Oct 15,2025" accepted', () => {
    expect(parseUnambiguousDate('Oct 15,2025')).toBe('2025-10-15');
    const p = resolveStatementPeriod({ printedPeriod: 'Oct 15,\n2025 - Nov 14,\n2025' });
    expect(p).toMatchObject({ start: '2025-10-15', end: '2025-11-14', printedText: 'Oct 15, 2025 - Nov 14, 2025', source: 'printed_text' });
  });
});
