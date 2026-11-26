/**
 * AR-1b G11b rule (owner GO 2026-11-26: "coverage-aware comparisons for every employee").
 * Every Netlify function that calls a model must be classified. GATED endpoints must run the shared
 * comparison gate on model text. A NEW model-calling function fails until it is classified here.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const DIR = path.join(__dirname, '../..');
const GATE = /gateReplyForCoverage\(|applyComparisonGate\(/;
const CALLS_MODEL = /anthropic|openai|chat\.completions|messages\.create/;

/** Model prose reaches the user: the gate is mandatory. */
const GATED = ['chat.ts', 'custodian-chat.ts', 'prime-briefing.ts', 'tag-chat.ts', 'tag-copilot.ts'];
/** Tag's endpoints moved to GATED on Tag HQ's line (f8e25e22, owner GO 2026-11-26). */
const PENDING_TAG_INTEGRATION: string[] = [];
/** Structured extraction / categorization: no free-text reply reaches the user. */
const EXEMPT_STRUCTURED = [
  'byte-ocr-parse.ts', 'normalize-transactions.ts', 'ocr-ingest-simple.ts', 'openai-vision.ts',
  'prime-preview-statement.ts', 'process-spreadsheet.ts', 'process-statement.ts', 'receipt-upload.ts',
  'set-import-issuer.ts', 'smart-import-ocr-background.ts', 'tag-categorize-batch.ts', 'tag-categorize-committed.ts',
];
/** Model prose reaches the user but is single-document / report scoped; to be gated or justified (shrink-only). */
const OPEN_REVIEW = ['document-insights.ts', 'generate-tax-report.ts'];

const modelCallers = fs.readdirSync(DIR).filter(f => f.endsWith('.ts'))
  .filter(f => CALLS_MODEL.test(fs.readFileSync(path.join(DIR, f), 'utf8')));

describe('AR-1b G11b: model-reply endpoints use the comparison gate', () => {
  it('every model-calling function is classified exactly once', () => {
    const all = [...GATED, ...PENDING_TAG_INTEGRATION, ...EXEMPT_STRUCTURED, ...OPEN_REVIEW];
    expect(new Set(all).size).toBe(all.length);
    const ungated = modelCallers.filter(f => !GATE.test(fs.readFileSync(path.join(DIR, f), 'utf8')));
    expect(ungated.filter(f => !all.includes(f))).toEqual([]);
  });
  it.each(GATED)('%s runs the gate', (f) => {
    expect(fs.readFileSync(path.join(DIR, f), 'utf8')).toMatch(GATE);
  });
  it('a pending or open entry that now has the gate must move to GATED', () => {
    const nowGated = [...PENDING_TAG_INTEGRATION, ...OPEN_REVIEW]
      .filter(f => fs.existsSync(path.join(DIR, f)) && GATE.test(fs.readFileSync(path.join(DIR, f), 'utf8')));
    expect(nowGated).toEqual([]);
  });
});
