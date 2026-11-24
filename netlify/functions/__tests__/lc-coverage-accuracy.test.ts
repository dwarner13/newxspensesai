/**
 * L-C — financial coverage accuracy for zero-result answers (owner live finding LIVE-03, GO 2026-11-24).
 *
 * Live: "How much did I spend at Costco last month?" correctly reported October with no matches and
 * no widening, but did not state the imported coverage. Now: the coverage note always requires the
 * period searched and coverage on a zero answer, adds per-account statement coverage (complete /
 * incomplete / none / unknown — never inferred from transaction dates), and a server-side safeguard
 * appends one sentence if the model still omits it.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatCoverageNote,
  answerMentionsCoverage,
  buildCoverageGuardSentence,
  type TransactionCoverage,
  type PeriodStatementCoverage,
} from '../../../src/shared/prime-data-coverage';
import { summarizeStatementCoverage, coverageForPeriod, type StatementRecord } from '../../../src/shared/statement-coverage';

const OCT = { startDate: '2026-10-01', endDate: '2026-10-31' };
const COV: TransactionCoverage = { transactionCount: 412, earliestDate: '2026-01-03', latestDate: '2026-06-16' };

function rec(inst: string, l4: string, ps: string, pe: string): StatementRecord {
  return { institution: inst, accountLast4: l4, statementType: 'bank', periodStart: ps, periodEnd: pe, uploadedAt: `${pe}T12:00:00Z`, completedAt: `${pe}T12:05:00Z`, state: 'completed', fileName: null, metadataMissing: false };
}

describe('L-C coverage note', () => {
  it('always requires the period searched and the coverage on a zero answer', () => {
    const note = formatCoverageNote(COV, OCT, null);
    expect(note).toMatch(/REQUIRED when your answer is zero or no matching transactions: state the exact period searched and this imported coverage/);
    expect(note).toMatch(/Never present missing statements as confirmed zero spending/);
  });
  it('the owner case (October after June 16): explicit AFTER instruction plus per-account NONE', () => {
    const sc = summarizeStatementCoverage([rec('BMO', '1234', '2026-05-17', '2026-06-16')]);
    const per = coverageForPeriod(sc, OCT.startDate, OCT.endDate);
    const note = formatCoverageNote(COV, OCT, per);
    expect(note).toMatch(/is AFTER the latest imported transaction \(2026-06-16\)/);
    expect(note).toMatch(/Statement coverage for 2026-10-01 through 2026-10-31: NONE\./);
    expect(note).toMatch(/BMO •••• 1234: not covered/);
    expect(note).toMatch(/a zero result is NOT confirmed zero spending/);
  });
  it('complete coverage is the only case allowed to call it a confirmed zero', () => {
    const sc = summarizeStatementCoverage([rec('BMO', '1234', '2026-09-17', '2026-10-16'), rec('BMO', '1234', '2026-10-17', '2026-11-16'), rec('Visa', '9876', '2026-10-01', '2026-10-31')]);
    const per = coverageForPeriod(sc, OCT.startDate, OCT.endDate);
    expect(per.overall).toBe('complete');
    const note = formatCoverageNote({ transactionCount: 50, earliestDate: '2026-09-17', latestDate: '2026-11-16' }, OCT, per);
    expect(note).toMatch(/: COMPLETE\./);
    expect(note).toMatch(/a zero result here is a confirmed zero for the imported accounts/);
  });
  it('incomplete coverage names the uncovered account', () => {
    const sc = summarizeStatementCoverage([rec('BMO', '1234', '2026-09-17', '2026-11-16'), rec('Visa', '9876', '2026-06-01', '2026-06-30')]);
    const per = coverageForPeriod(sc, OCT.startDate, OCT.endDate);
    expect(per.overall).toBe('incomplete');
    expect(formatCoverageNote(COV, OCT, per)).toMatch(/Visa •••• 9876: not covered/);
  });
});

describe('L-C safeguard', () => {
  it('detects coverage stated in ISO or month-name forms', () => {
    expect(answerMentionsCoverage('Your data runs to 2026-06-16.', COV)).toBe(true);
    expect(answerMentionsCoverage('Your imported history ends June 16, 2026.', COV)).toBe(true);
    expect(answerMentionsCoverage('From January 2026 through June 2026.', COV)).toBe(true);
    expect(answerMentionsCoverage("You didn't spend anything at Costco in October.", COV)).toBe(false);
  });
  it('builds an honest sentence for each coverage class', () => {
    const none: PeriodStatementCoverage = { overall: 'none', byAccount: [{ label: 'BMO •••• 1234', coverage: 'not_covered' }] };
    expect(buildCoverageGuardSentence(COV, OCT, none)).toBe('I searched 2026-10-01 through 2026-10-31. Your imported transactions run from 2026-01-03 to 2026-06-16, and no imported statement covers that period, so this is not confirmed zero spending — there is no imported data for it yet.');
    const inc: PeriodStatementCoverage = { overall: 'incomplete', byAccount: [{ label: 'BMO •••• 1234', coverage: 'covered' }, { label: 'Visa •••• 9876', coverage: 'not_covered' }] };
    expect(buildCoverageGuardSentence(COV, OCT, inc)).toMatch(/not every account has a statement for that period \(not covered: Visa •••• 9876\), so this may not be complete\./);
    const comp: PeriodStatementCoverage = { overall: 'complete', byAccount: [{ label: 'BMO •••• 1234', coverage: 'covered' }] };
    expect(buildCoverageGuardSentence(COV, OCT, comp)).toMatch(/so this is a confirmed zero for those accounts\./);
    expect(buildCoverageGuardSentence(COV, OCT, null)).toMatch(/could not be fully confirmed, so this may not be complete\./);
    expect(buildCoverageGuardSentence({ transactionCount: 0, earliestDate: null, latestDate: null }, OCT, null)).toMatch(/no imported transactions yet, so this is not confirmed zero spending/);
  });
  it('the owner\'s live answer (no coverage) gets exactly one appended sentence; a complete answer is untouched', () => {
    const live = "You didn't spend anything at Costco in October 2026.";
    const none: PeriodStatementCoverage = { overall: 'none', byAccount: [] };
    const guarded = answerMentionsCoverage(live, COV) ? live : `${live}\n\n${buildCoverageGuardSentence(COV, OCT, none)}`;
    expect(guarded).toMatch(/^You didn't spend anything at Costco in October 2026\.\n\nI searched 2026-10-01 through 2026-10-31\./);
    const good = "There are no Costco transactions in October 2026; your imported data ends June 16, 2026.";
    expect(answerMentionsCoverage(good, COV)).toBe(true);
  });
});

describe('L-C chat.ts wiring', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  it('loads per-account statement coverage for the empty period and passes it to the note', () => {
    expect(chat).toMatch(/const sc = await loadStatementCoverage\(admin\(\) as unknown as CoverageDbClient, userId\);/);
    expect(chat).toMatch(/periodStatements = coverageForPeriod\(sc, emptyPeriod\.startDate, emptyPeriod\.endDate\)/);
    expect(chat).toMatch(/formatCoverageNote\(coverage, emptyPeriod, periodStatements\)/);
  });
  it('the safeguard runs before the assistant message is saved, only when coverage is missing', () => {
    const guardAt = chat.indexOf('// ── L-C: server-side coverage safeguard (before saving) ──');
    const saveAt = chat.indexOf('      // Save assistant message - non-blocking');
    expect(guardAt).toBeGreaterThan(0);
    expect(saveAt).toBeGreaterThan(guardAt);
    expect(chat).toMatch(/if \(isPrime && coverageGuard && assistantContent && !answerMentionsCoverage\(assistantContent, coverageGuard\.coverage\)\)/);
  });
  it('PB-01 behaviour is preserved (empty-period detection and coverage fetch unchanged)', () => {
    expect(chat).toMatch(/const emptyPeriod = p31cResult \? emptyRequestedPeriod\(p31cResult\.results\) : null;/);
    expect(chat).toMatch(/fetchTransactionCoverage\(admin\(\) as unknown as CoverageClient, userId\)/);
  });
});
