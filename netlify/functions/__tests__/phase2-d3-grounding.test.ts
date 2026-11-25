/* eslint-disable @typescript-eslint/no-explicit-any -- evidence objects mirror chat.ts's loose shape */
/**
 * Phase 2 D3 (owner GO 2026-11-25) — the false-zero validator respects verified tool results.
 * Acceptance (AI Architecture HQ plan §4):
 *  - Prime calls cash_flow_summary, gets empty, says "no expenses in September" → accepted;
 *  - the tool returns $812 and Prime says "none" → still rejected;
 *  - the CORRECTION text states what the query actually returned (never "found results" when empty);
 *  - after a handoff the persisted text is the specialist's (validation runs only for a Prime author);
 *  - a fallback that replaces the reply is recorded in metadata.groundingFallback.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateGroundedAnswer } from '../../../src/shared/financial-grounding';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';

const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');

/** The fold chat.ts applies (kept identical; asserted against the source below). */
function foldModelEvidence(fin: any, accumulated: Array<{ tool: string; status: 'resolved' | 'successful_empty' }>) {
  if (fin.grounded || accumulated.length === 0) return fin;
  return { grounded: true, toolName: accumulated[0].tool, queryStatus: accumulated.some(e => e.status === 'resolved') ? 'verified' : 'verified_zero' };
}

describe('D3 behaviour with the real validator', () => {
  const cls = classifyFinancialQuery('How much did I spend in September?');

  it('empty model tool result + "no expenses in September" → accepted (was a false "false zero")', () => {
    const before = validateGroundedAnswer('You had no expenses in September.', { grounded: false } as any, cls);
    expect(before).not.toBeNull(); // the legacy behaviour: rejected
    const fin = foldModelEvidence({ grounded: false }, [{ tool: 'cash_flow_summary', status: 'successful_empty' }]);
    expect(validateGroundedAnswer('You had no expenses in September.', fin, cls)).toBeNull();
  });

  it('model tool found data ($812) but the answer says none → still rejected', () => {
    const fin = foldModelEvidence({ grounded: false }, [{ tool: 'cash_flow_summary', status: 'resolved' }]);
    expect(fin.queryStatus).toBe('verified');
    expect(validateGroundedAnswer('You had no expenses in September.', fin, cls)).not.toBeNull();
  });

  it('server pre-executed evidence is never overwritten by the fold', () => {
    const server = { grounded: true, toolName: 'tax_summary', queryStatus: 'verified' };
    expect(foldModelEvidence(server, [{ tool: 'cash_flow_summary', status: 'successful_empty' }])).toBe(server);
  });
});

describe('D3 wiring in chat.ts', () => {
  it('(1) validation runs only when the FINAL author is Prime', () => {
    expect(chat).toContain('const finalAuthorIsPrime = isPrimeConversationSlug(finalEmployeeSlug);');
    expect(chat).toMatch(/if \(isPrime && finalAuthorIsPrime && financialClassification\?\.requiresGrounding && !tagEvidenceGrounds\) \{/);
  });
  it('(2) the fold uses the model\'s accumulated complete evidence, only when not already grounded', () => {
    expect(chat).toContain('if (finalAuthorIsPrime && !financialEvidence.grounded && p31dAccumulatedEvidence.size > 0) {');
    expect(chat).toContain("queryStatus: entries.some(e => e.status === 'resolved') ? 'verified' : 'verified_zero',");
  });
  it('(3) the CORRECTION text follows the actual status', () => {
    expect(chat).toContain("content: retryQs === 'verified_zero'");
    expect(chat).toContain('CORRECTION: The database query for this request returned NO matching transactions');
  });
  it('(4) the retry uses the final author\'s model configuration', () => {
    expect(chat).toContain('openai.chat.completions.create(buildModelCallParams(retryModelConfig, messages, {');
  });
  it('(5) a replacing fallback is persisted as metadata.groundingFallback', () => {
    expect(chat).toContain('groundingFallback = { validation: validationResult, retryBlocked: retryBlockedByP31C, evidenceGrounded: !!financialEvidence.grounded };');
    expect(chat).toContain('if (groundingFallback) assistantMsgMetadata.groundingFallback = groundingFallback;');
  });
});
