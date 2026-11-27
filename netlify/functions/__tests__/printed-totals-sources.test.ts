/**
 * AR-1c §C5 write-order fix (owner GO 2026-11-26): every printed-total source is kept; the
 * independent OCR-text totals are never overwritten by Claude Vision's. Synthetic numbers only.
 *
 * Live defect reproduced: normalize captured the BMO OCR-text totals into statementTotals, then the
 * Vision-primary branch replaced statementTotals with Claude's totals, and the independent values
 * were lost (not moved to flatTextTotals as the A′ design required).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mergePrintedTotals, comparePrintedTotalsSources, totalsFamily, recordRowsSource, rowsSourceFromViaMethod } from '../_shared/printedTotals';

const OCR = { totalDeducted: 1000.25, totalAdded: 900.1, source: 'closing_totals_inline' };
const VISION = { totalDeducted: 1000.25, totalAdded: 900.1, openingBalance: 50, closingBalance: -50.15, source: 'claude_vision' };
const VISION_OFF = { ...VISION, totalDeducted: 990.25 };

describe('mergePrintedTotals', () => {
  it('reproduction: OCR-text totals first, then Vision → the independent totals are preserved', () => {
    const afterOcr = mergePrintedTotals({}, OCR);
    const afterVision = mergePrintedTotals(afterOcr, VISION);
    expect(afterVision.statementTotals).toEqual(VISION); // gate contract unchanged
    expect(afterVision.flatTextTotals).toEqual(OCR); // no longer lost
    expect(afterVision.printedTotalsSources).toEqual({ ocr_text: OCR, claude_vision: VISION });
    // Rows channel not known yet at this point → no independence claimed.
    expect(afterVision.printedTotalsCheck).toEqual({ sources: ['claude_vision', 'ocr_text'], independentSources: [], comparison: 'agree', tolerance: 0.05 });
    // Vision produced the rows → only the OCR-text totals are independent.
    expect(recordRowsSource(afterVision, 'claude_vision').printedTotalsCheck).toEqual({ sources: ['claude_vision', 'ocr_text'], rowsSource: 'claude_vision', independentSources: ['ocr_text'], comparison: 'agree', tolerance: 0.05 });
  });

  it('Vision first, then OCR text → Vision stays statementTotals; OCR text kept alongside', () => {
    const sbd = mergePrintedTotals(mergePrintedTotals({}, VISION), OCR);
    expect(sbd.statementTotals).toEqual(VISION);
    expect(sbd.flatTextTotals).toEqual(OCR);
    expect(sbd.printedTotalsSources).toEqual({ claude_vision: VISION, ocr_text: OCR });
  });

  it('disagreeing sources are recorded as disagree (C5 holds on this; the gate is unchanged here)', () => {
    const sbd = mergePrintedTotals(mergePrintedTotals({}, OCR), VISION_OFF);
    expect((sbd.printedTotalsCheck as { comparison: string }).comparison).toBe('disagree');
    expect(sbd.statementTotals).toEqual(VISION_OFF);
    expect(sbd.flatTextTotals).toEqual(OCR);
  });

  it('OCR text only (Vision off or failed) → statementTotals is the OCR-text totals, as before', () => {
    const sbd = mergePrintedTotals({}, OCR);
    expect(sbd.statementTotals).toEqual(OCR);
    expect(sbd.printedTotalsCheck).toMatchObject({ sources: ['ocr_text'], independentSources: [], comparison: 'single_source' });
    // Rows from an OCR-text parser + OCR-text totals = same channel (reconciled_same_source in C5).
    expect(recordRowsSource(sbd, 'ocr_text').printedTotalsCheck).toMatchObject({ rowsSource: 'ocr_text', independentSources: [] });
  });

  it('Vision only → same-source only, no independent evidence claimed', () => {
    const sbd = mergePrintedTotals({}, VISION);
    expect(sbd.statementTotals).toEqual(VISION);
    expect(sbd.flatTextTotals).toBeUndefined();
    expect(sbd.printedTotalsCheck).toMatchObject({ sources: ['claude_vision'], independentSources: [], comparison: 'single_source' });
  });

  it('a re-run refreshes only its own family; other keys and unrelated breakdown fields survive', () => {
    const base = { statement_meta: { period_start: '2031-01-01' }, attestedBalances: { opening: 1 } };
    const refreshed = { ...OCR, totalAdded: 901.1 };
    const sbd = mergePrintedTotals(mergePrintedTotals(mergePrintedTotals(base, OCR), VISION), refreshed);
    expect(sbd.statement_meta).toEqual(base.statement_meta);
    expect(sbd.attestedBalances).toEqual(base.attestedBalances);
    expect(sbd.statementTotals).toEqual(VISION);
    expect(sbd.flatTextTotals).toEqual(refreshed);
    expect((sbd.printedTotalsSources as Record<string, unknown>).claude_vision).toEqual(VISION);
  });

  it('breakdowns written before this change are migrated, never dropped', () => {
    // Old shape 1: flat-text in statementTotals (BMO-only import), Vision arrives on a re-run.
    expect(mergePrintedTotals({ statementTotals: OCR }, VISION).flatTextTotals).toEqual(OCR);
    // Old shape 2: Vision in statementTotals + flat-text in flatTextTotals.
    const s2 = mergePrintedTotals({ statementTotals: VISION, flatTextTotals: OCR }, VISION);
    expect(s2.printedTotalsSources).toEqual({ ocr_text: OCR, claude_vision: VISION });
  });

  it('input without a source is ignored (nothing invented)', () => {
    const base = { statementTotals: OCR };
    expect(mergePrintedTotals(base, { totalDeducted: 1, totalAdded: 2, source: '' })).toEqual(base);
    expect(totalsFamily(null)).toBeNull();
  });

  it('independence is relative to the rows channel (AR-1c §C5 ruling)', () => {
    const both = mergePrintedTotals(mergePrintedTotals({}, OCR), VISION);
    expect((recordRowsSource(both, 'ocr_text').printedTotalsCheck as { independentSources: string[] }).independentSources).toEqual(['claude_vision']);
    expect((recordRowsSource(both, 'openai_vision').printedTotalsCheck as { independentSources: string[] }).independentSources).toEqual(['claude_vision', 'ocr_text']);
    // recordRowsSource never touches the totals themselves; a later merge keeps rowsSource.
    const withRows = recordRowsSource(both, 'claude_vision');
    expect(withRows.statementTotals).toEqual(VISION);
    expect(withRows.flatTextTotals).toEqual(OCR);
    expect((mergePrintedTotals(withRows, OCR).printedTotalsCheck as { rowsSource?: string }).rowsSource).toBe('claude_vision');
  });

  it('viaMethod maps to channels: ai_fallback/text parsers read the OCR text', () => {
    expect(rowsSourceFromViaMethod('claude-vision')).toBe('claude_vision');
    expect(rowsSourceFromViaMethod('vision-parse')).toBe('openai_vision');
    expect(rowsSourceFromViaMethod('ocr')).toBe('ocr_text');
  });

  it('attestedBalances (customer-entered) stay their own key, never folded into printedTotalsSources', () => {
    const sbd = mergePrintedTotals({ attestedBalances: { opening: 1, closing: 2 } }, VISION);
    expect(sbd.attestedBalances).toEqual({ opening: 1, closing: 2 });
    expect(Object.keys(sbd.printedTotalsSources as object)).toEqual(['claude_vision']);
  });

  it('missing numbers never count as agreement', () => {
    expect(comparePrintedTotalsSources({ claude_vision: { ...VISION, totalAdded: null }, ocr_text: OCR }).comparison).toBe('single_source');
  });
});

describe('wiring (static)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../normalize-transactions.ts'), 'utf8');
  it('both printed-total writes in normalize go through mergePrintedTotals', () => {
    expect(src).toMatch(/import \{ mergePrintedTotals, recordRowsSource, rowsSourceFromViaMethod \} from '\.\/_shared\/printedTotals\.js';/);
    expect(src).toMatch(/const mergedSbdEarly = mergePrintedTotals\(existingSbdEarly, bmoTotalsEarly\);/);
    expect(src).toMatch(/statement_breakdown_json: mergePrintedTotals\(existingSbd, visionTotals\)/);
    expect(src).not.toMatch(/statementTotals: visionTotals/);
    expect(src).not.toMatch(/\[totalsKey\]: bmoTotalsEarly/);
    expect(src).toMatch(/recordRowsSource\(existingSbdRows, rowsSourceFromViaMethod\(viaMethod\)\)/);
  });
  it('the extraction path is untouched: no Claude/Google model or prompt change in this fix', () => {
    const ocr = fs.readFileSync(path.resolve(__dirname, '../smart-import-ocr-background.ts'), 'utf8');
    expect(ocr).toMatch(/model: CLAUDE_VISION_MODEL/);
  });
});
