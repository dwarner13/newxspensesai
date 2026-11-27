/**
 * AR-VALIDATORS (AI Architecture HQ review of 3cec60b9, 2026-11-26). Owner: Prime HQ.
 * Prime's final reply may be replaced by exactly these code validators, in this order:
 *   1. validateGroundedAnswer (D3 false-zero / grounding fallback),
 *   2. enforceReplyEvidence — the TurnEvidenceLedger verifier, first slice (C-1, owner GO 2026-11-27):
 *      the sanctioned target the others fold into (Phase 2 plan §2.6, Phase G),
 *   3. guardReconciledAnswer (P-LIVE-03 statement reconciliation).
 * D3 and P-LIVE-03 move onto the ledger in the next slice; no other replacing validator may be added.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const chat = fs.readFileSync(path.join(__dirname, '../../chat.ts'), 'utf8');

describe('AR-VALIDATORS: Prime answer validators', () => {
  it('grounding validation runs before the reconciliation guard, both before the reply is saved', () => {
    const grounding = chat.indexOf('validateGroundedAnswer(assistantContent');
    const ledger = chat.indexOf('const evidence = await enforceReplyEvidence({');
    const reconciliation = chat.indexOf('guardReconciledAnswer(assistantContent');
    const save = chat.indexOf("await sb.from('chat_messages').insert({", reconciliation);
    expect(grounding).toBeGreaterThan(0);
    expect(ledger).toBeGreaterThan(grounding);
    expect(reconciliation).toBeGreaterThan(ledger);
    expect(save).toBeGreaterThan(reconciliation);
  });

  it('both validators key on the final author being Prime', () => {
    expect(chat).toMatch(/if \(isPrime && finalAuthorIsPrime && financialClassification\?\.requiresGrounding/);
    expect(chat).toMatch(/if \(isPrime && isPrimeConversationSlug\(finalEmployeeSlug\) && assistantContent && turnCashFlowForGuard\)/);
  });

  it('only these three record a replacement in the message metadata', () => {
    const replacements = chat.match(/assistantMsgMetadata\.(\w+) = \w+;/g) ?? [];
    const replacing = replacements.filter(r => /Fallback|Guard|evidenceCheck/.test(r));
    expect(replacing.sort()).toEqual([
      'assistantMsgMetadata.breakdownGuard = breakdownGuard;',
      'assistantMsgMetadata.evidenceCheck = evidenceCheck;',
      'assistantMsgMetadata.groundingFallback = groundingFallback;',
    ]);
  });
});
