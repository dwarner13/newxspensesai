/**
 * TX-EXPORT client for Prime HQ's financial-export kind 'rows'. Synthetic data only.
 */
import { describe, it, expect } from 'vitest';
import { rowsExportBody, filenameFromDisposition, readRowsRefusal } from '../financialExport';

describe('rows export client', () => {
  it('sends dates together or not at all (all time keeps undated rows)', () => {
    expect(rowsExportBody({})).toStrictEqual({ kind: 'rows' });
    expect(rowsExportBody({ startDate: '2026-01-01', endDate: '2026-12-31' })).toStrictEqual({ kind: 'rows', startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(rowsExportBody({ startDate: '2026-01-01' })).toStrictEqual({ kind: 'rows' }); // never one date
    expect(rowsExportBody({ importIds: ['a'] })).toStrictEqual({ kind: 'rows', importIds: ['a'] });
  });
  it('takes the server filename, with a safe fallback', () => {
    expect(filenameFromDisposition('attachment; filename="xspensesai-transactions-all-time.csv"', 'x.csv')).toBe('xspensesai-transactions-all-time.csv');
    expect(filenameFromDisposition('attachment; filename="../evil.csv"', 'x.csv')).toBe('x.csv');
    expect(filenameFromDisposition(null, 'x.csv')).toBe('x.csv');
  });
  it('refusals show the server wording; no file is created', () => {
    const over = readRowsRefusal(409, { status: 'partial', reason: 'over_limit', limit: 50000, error: 'This scope has more than 50,000 transactions, so no file was created.' });
    expect(over).toStrictEqual({ status: 'refused', message: 'This scope has more than 50,000 transactions, so no file was created.' });
    expect(readRowsRefusal(413, { status: 'too_large', error: 'This export is too large.' })).toMatchObject({ status: 'refused', message: 'This export is too large.' });
    expect(readRowsRefusal(503, null)).toMatchObject({ status: 'refused', message: expect.stringMatching(/No file was created/) });
    expect(readRowsRefusal(401, {})).toMatchObject({ status: 'refused', message: expect.stringMatching(/sign-in has expired/) });
    expect(readRowsRefusal(200, { status: 'no_data' })).toMatchObject({ status: 'no_data' });
  });
});
