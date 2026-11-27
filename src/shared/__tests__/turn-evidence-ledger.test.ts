/**
 * C-1 reply verifier — the owner's five categories (2026-11-27). Synthetic figures only.
 */
import { describe, it, expect } from 'vitest';
import { verifyReplyFigures } from '../turn-evidence-ledger';

const TOOL = { toolFigures: [1500.25, 1620.4, -120.15], userMessage: 'How did that statement look?' };

describe('C-1 verifyReplyFigures', () => {
  it('VERIFIED: amounts a tool returned this turn pass (any sign, ±1¢, label lines included)', () => {
    const r = verifyReplyFigures('Deposits: $1,500.25\nWithdrawals: $1,620.40\nNet Cash Flow: -$120.15', TOOL);
    expect(r.ok).toBe(true);
    expect(r.counts.verified).toBe(3);
  });

  it('UNVERIFIED: an actual-activity claim not in this turn\'s tools is rejected (prose and label lines)', () => {
    const a = verifyReplyFigures('Your deposits for that statement were $1,345.67.', TOOL);
    expect(a.ok).toBe(false);
    expect(a.unsupported.map(f => f.cents)).toEqual([134567]);
    const b = verifyReplyFigures('**Deposits:** $1,345.67', TOOL);
    expect(b.ok).toBe(false);
  });

  it('UNVERIFIED historical AI statement: an earlier reply\'s amount is never evidence', () => {
    // The previous assistant turn said $999.99; it is NOT passed as evidence, so repeating it fails.
    const r = verifyReplyFigures('As I said before, you spent $999.99 on dining.', { toolFigures: [], userMessage: 'and dining?' });
    expect(r.ok).toBe(false);
  });

  it('CUSTOMER-PROVIDED: figures the customer stated this turn pass', () => {
    const r = verifyReplyFigures('With your $5,000 monthly income, your rent of $1,800 is 36% of it.', { toolFigures: [], userMessage: 'I earn $5,000 a month and pay $1,800 rent.' });
    expect(r.ok).toBe(true);
    expect(r.counts.customer).toBe(2);
  });

  it('HYPOTHETICAL: examples and "if" calculations are never blocked', () => {
    const r = verifyReplyFigures('If you paid an extra $300 a month, you would save about $1,240 in interest.', { toolFigures: [], userMessage: 'what if I pay more?' });
    expect(r.ok).toBe(true);
    expect(r.counts.hypothetical).toBe(2);
  });

  it('DERIVED: arithmetic on verified or customer figures passes (sum, difference, multiple, division)', () => {
    const sum = verifyReplyFigures('Together that is $3,120.65 of money moving through your account.', TOOL); // 1500.25 + 1620.40
    expect(sum.ok).toBe(true);
    const yearly = verifyReplyFigures('That is $21,600 a year in rent for you.', { toolFigures: [], userMessage: 'my rent is $1,800' }); // ×12
    expect(yearly.ok).toBe(true);
    expect(yearly.counts.derived + yearly.counts.customer).toBeGreaterThan(0);
  });

  it('a NAMED TOTAL must match a tool figure directly — arithmetic does not rescue it (f64d820f class)', () => {
    // true deposits 1,500.25 and a 300.00 transaction in the same tool result: 1,200.25 is "derivable"
    const ev = { toolFigures: [1500.25, 300, 1620.4, -120.15], userMessage: 'that statement again?' };
    expect(verifyReplyFigures('Deposits: $1,200.25', ev).ok).toBe(false);
    expect(verifyReplyFigures('Your deposits were $1,200.25 for the period.', ev).ok).toBe(false);
    expect(verifyReplyFigures('Deposits: $1,500.25', ev).ok).toBe(true);
    // unlabelled arithmetic stays allowed
    expect(verifyReplyFigures('Without that one transfer, about $1,200.25 came in for you.', ev).ok).toBe(true);
  });

  it('GENERAL facts that are not the customer\'s activity are not blocked', () => {
    const r = verifyReplyFigures('The 2026 TFSA annual limit is $7,000.', { toolFigures: [], userMessage: 'what is the TFSA limit?' });
    expect(r.ok).toBe(true);
    expect(r.counts.general).toBe(1);
  });

  it('FINANCIAL POSITION figures count only when the sentence states their all-accounts scope', () => {
    const pos = { toolFigures: [], userMessage: 'how am I doing?', positionFigures: [8200] };
    expect(verifyReplyFigures('Across all your accounts, your spending is $8,200.', pos).ok).toBe(true);
    expect(verifyReplyFigures('Your spending on that statement is $8,200.', pos).ok).toBe(false);
  });

  it('no money in the reply → nothing to check', () => {
    const r = verifyReplyFigures('Happy to help — which statement would you like to look at?', { toolFigures: [], userMessage: 'hi' });
    expect(r.ok).toBe(true);
    expect(r.figures).toEqual([]);
  });
});
