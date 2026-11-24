/**
 * L-D2 — incomplete statement uploads (owner live finding LIVE-02 on ba4bc3a, GO 2026-11-24).
 * Live: "Most recent upload: September 24, 2026, bank unknown." The upload had not completed, and
 * bank/period are recorded only at commit. Prime now says WHY, shows the file name and a
 * customer-friendly status, keeps attempt vs completed separate, and invents nothing.
 */

import { describe, it, expect } from 'vitest';
import { summarizeStatementCoverage, type StatementRecord } from '../../../src/shared/statement-coverage';
import { formatStatementCoverageEvidence, friendlyImportStatus, isStatementInventoryQuestion } from '../../../src/shared/prime-statement-guidance';

const OWNER_Q = 'What is the last month I uploaded a bank statement and also tell me what was the bank?';

function rec(over: Partial<StatementRecord>): StatementRecord {
  return { institution: null, accountLast4: null, statementType: 'unknown', periodStart: null, periodEnd: null, uploadedAt: null, completedAt: null, state: 'completed', fileName: null, metadataMissing: true, ...over };
}

describe('L-D2', () => {
  it('the owner question is a statement inventory question', () => {
    expect(isStatementInventoryQuestion(OWNER_Q)).toBe(true);
  });
  it.each([
    ['completed', 'imported'], ['awaiting_review', 'waiting for your review'], ['in_progress', 'still processing'],
    ['failed', 'did not complete'], ['unknown', 'status unknown'],
  ] as const)('friendly status %s → %s', (s, w) => { expect(friendlyImportStatus(s)).toBe(w); });

  it('live shape: Sep 24 attempt (incomplete, no bank) vs Aug 26 completed BMO', () => {
    const c = summarizeStatementCoverage([
      rec({ state: 'in_progress', uploadedAt: '2026-09-24T18:00:00Z', fileName: 'Statement_Sep.pdf' }),
      rec({ state: 'completed', institution: 'BMO', accountLast4: '1234', uploadedAt: '2026-08-26T10:00:00Z', completedAt: '2026-08-26T10:05:00Z', fileName: 'BMO_Aug.pdf' }),
    ]);
    const ev = formatStatementCoverageEvidence(c);
    expect(ev).toContain('Most recent upload attempt: bank not identified — this import is still processing, and bank details are recorded only when an import completes; file "Statement_Sep.pdf"; statement period not recorded; uploaded 2026-09-24; import status: still processing');
    expect(ev).toContain('Most recent COMPLETED import: BMO •••• 1234; file "BMO_Aug.pdf"; statement period not recorded; uploaded 2026-08-26; import status: imported');
  });
  it('a completed import without a bank says "not recorded" (no invented bank)', () => {
    const ev = formatStatementCoverageEvidence(summarizeStatementCoverage([rec({ state: 'completed', uploadedAt: '2026-08-01T00:00:00Z' })]));
    expect(ev).toContain('bank not recorded on this statement');
    expect(ev).not.toMatch(/BMO|TD|RBC|CIBC|Scotia/);
  });
  it('no file name → no file field (nothing invented)', () => {
    const ev = formatStatementCoverageEvidence(summarizeStatementCoverage([rec({ state: 'failed', uploadedAt: '2026-09-24T00:00:00Z' })]));
    expect(ev).not.toMatch(/file "/);
  });
});
