/**
 * AR-VALIDATORS (AI Architecture HQ review of 3cec60b9, 2026-11-26). Owner: Prime HQ.
 * Prime's final reply may be replaced by exactly two code validators, in this order:
 *   1. validateGroundedAnswer (D3 false-zero / grounding fallback),
 *   2. guardReconciledAnswer (P-LIVE-03 statement reconciliation).
 * Both fold into the single author-keyed TurnEvidenceLedger verifier later (Phase 2 plan §2.6,
 * Phase G). Until then this pins the order and stops a third replacing validator being bolted on.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const chat = fs.readFileSync(path.join(__dirname, '../../chat.ts'), 'utf8');

describe('AR-VALIDATORS: Prime answer validators', () => {
  it('grounding validation runs before the reconciliation guard, both before the reply is saved', () => {
    const grounding = chat.indexOf('validateGroundedAnswer(assistantContent');
    const reconciliation = chat.indexOf('guardReconciledAnswer(assistantContent');
    const save = chat.indexOf("await sb.from('chat_messages').insert({", reconciliation);
    expect(grounding).toBeGreaterThan(0);
    expect(reconciliation).toBeGreaterThan(grounding);
    expect(save).toBeGreaterThan(reconciliation);
  });

  it('both validators key on the final author being Prime', () => {
    expect(chat).toMatch(/if \(isPrime && finalAuthorIsPrime && financialClassification\?\.requiresGrounding/);
    expect(chat).toMatch(/if \(isPrime && isPrimeConversationSlug\(finalEmployeeSlug\) && assistantContent && turnCashFlowForGuard\)/);
  });

  it('only these two record a replacement in the message metadata', () => {
    const replacements = chat.match(/assistantMsgMetadata\.(\w+) = \w+;/g) ?? [];
    const replacing = replacements.filter(r => /Fallback|Guard/.test(r));
    expect(replacing.sort()).toEqual([
      'assistantMsgMetadata.breakdownGuard = breakdownGuard;',
      'assistantMsgMetadata.groundingFallback = groundingFallback;',
    ]);
  });
});
