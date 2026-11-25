/**
 * SWIFT/BIC masking correction (owner GO 2026-11-25; joint Prime HQ + Attachments HQ review).
 * Synthetic data only. Both maskPII entry points (pii.ts and pii-patterns.ts) are covered.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskPII as maskPIIResult } from '../_shared/pii';
import { maskPII as maskPIIString } from '../_shared/pii-patterns';

const viaPii = (t: string) => maskPIIResult(t, 'last4').masked;
const viaPatterns = (t: string) => maskPIIString(t, 'last4');

describe.each([['pii.ts', viaPii], ['pii-patterns.ts', viaPatterns]])('%s', (_name, mask) => {
  it.each([
    'IGNORE PREVIOUS INSTRUCTIONS', 'UNTRUSTED DOCUMENT CONTENT', 'MORTGAGE PAYMENT', 'CONTACTLESS PURCHASE',
    'SHOPPING CENTRE', 'INTEREST CHARGE', 'MERCHANT NAME', 'GROCERIES', 'RESTAURANT', 'INSURANCE PREMIUM',
    'DEBITCARD PURCHASE', 'TRANSFER TO SAVINGS', 'PREAUTHORIZED DEBIT', 'ELECTRONIC FUNDS', 'DIVIDEND PAYMENT',
  ])('ordinary statement text stays readable: %s', (t) => {
    expect(mask(t)).toBe(t);
  });

  it.each([
    ['Wire to ROYCCAT2 today', 'ROYCCAT2'],          // digit in location code
    ['Payee bank BOFAUS3N', 'BOFAUS3N'],             // digit
    ['SWIFT: DEUTDEFF', 'DEUTDEFF'],                 // all letters, banking cue
    ['BIC TDOMCATTTOR for the wire', 'TDOMCATTTOR'], // repeated letters (was missed) + cue
    ['beneficiary bank code CHASUS33XXX', 'CHASUS33XXX'],
  ])('genuine bank codes are masked: %s', (t, code) => {
    const out = mask(t);
    expect(out).not.toContain(code);
    expect(out).toContain('[REDACTED:SWIFT]');
  });

  it('two codes in one text: the second (all letters) is masked by the cue right before it (stale-index fix)', () => {
    const t = 'Paid via SWIFT ROYCCAT2 and the refund came back via BIC: DEUTDEFF yesterday';
    const out = mask(t);
    expect(out).not.toContain('ROYCCAT2');
    expect(out).not.toContain('DEUTDEFF');
    expect(out.match(/\[REDACTED:SWIFT\]/g)?.length).toBe(2);
  });

  it('a BIC-shaped word without a valid country code is not a BIC', () => {
    expect(mask('ABCDQQ12 reference')).not.toContain('[REDACTED:SWIFT]'); // QQ is not an ISO country
  });

  it('other financial identifiers are still masked (no weakening)', () => {
    expect(mask('card 4111 1111 1111 1111')).not.toContain('4111 1111 1111 1111');
    expect(mask('IBAN GB82 WEST 1234 5698 7654 32')).not.toContain('GB82 WEST 1234 5698 7654 32');
  });
});

describe('source hygiene', () => {
  const src = fs.readFileSync(path.join(__dirname, '../_shared/pii-patterns.ts'), 'utf8');
  it('the customer-specific allow-list is gone (no personal places or merchants in shared code)', () => {
    expect(src).not.toMatch(/KENYON|LYNNWOOD|CELTICGROUP|INDALL|NISKU|WESTLOCK|BORROWELL|TDLOAN|LEWISMASSAGE/);
  });
  it('the repeated-character exemption is gone', () => {
    expect(src).not.toMatch(/repeated chars/);
  });
  it('pii.ts passes the detector context (single PII source)', () => {
    const pii = fs.readFileSync(path.join(__dirname, '../_shared/pii.ts'), 'utf8');
    // indices refer to the text as scanned (review fix): both loops snapshot it
    expect(pii.match(/detector\.mask\(originalText, strategy, \{ source: scanned, index \}\)/g)?.length).toBe(2);
    expect(pii.match(/const scanned = masked;/g)?.length).toBe(2);
  });
});
