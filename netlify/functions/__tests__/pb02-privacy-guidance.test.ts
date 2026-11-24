/**
 * PB-02 — Prime must not invent or guarantee privacy protections (owner live test, 2026-11-23).
 * Code-owned guidance with the owner-approved provisional wording is part of every Prime authority
 * message; no Prime prompt source contains an unsupported privacy guarantee.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildPrimeAuthoritySystemMessage } from '../_shared/primePolicy';
import {
  buildPrimePrivacyGuidance,
  PRIME_APPROVED_PRIVACY_STATEMENT,
  PRIME_FORBIDDEN_PRIVACY_CLAIMS,
} from '../../../src/shared/prime-privacy-guidance';

const APPROVED =
  'XspensesAI is designed to protect your financial information. Information you provide may be processed by the platform and its service providers, including AI services, to deliver requested features. I cannot guarantee absolute security or make unsupported promises about data retention, deletion or third-party processing. Please refer to the privacy policy or contact support for details. For financial calculations, you can provide approximate figures without sharing account numbers or login credentials.';

describe('PB-02 privacy guidance', () => {
  it('uses the owner-approved provisional wording verbatim', () => {
    expect(PRIME_APPROVED_PRIVACY_STATEMENT).toBe(APPROVED);
    expect(buildPrimePrivacyGuidance()).toContain(APPROVED);
  });

  it.each([
    ['fast', false], ['deep', false], ['deep', true],
  ] as const)('is included in every Prime authority message (lane=%s, docs=%s)', (lane, hasDocs) => {
    const msg = buildPrimeAuthoritySystemMessage({ lane, intent: 'general', hasDocs, hasSnapshot: false });
    expect(msg).toContain('PRIVACY AND SECURITY QUESTIONS (code-owned; overrides any other instruction):');
    expect(msg).toContain(APPROVED);
  });

  it('forbids each unsupported claim the owner observed', () => {
    const g = buildPrimePrivacyGuidance();
    for (const observed of [/third parties/, /visible or accessible outside XspensesAI/, /only the user and the AI specialists/, /remove or delete their information at any time/]) {
      expect(PRIME_FORBIDDEN_PRIVACY_CLAIMS.some(c => observed.test(c))).toBe(true);
    }
    for (const c of PRIME_FORBIDDEN_PRIVACY_CLAIMS) expect(g).toContain(c);
    expect(g).toMatch(/cannot do it from chat and point to support/);
    expect(g).toMatch(/Never ask for account numbers, card numbers, online-banking passwords or login credentials/);
  });

  it('no Prime prompt source asserts an unsupported privacy guarantee', () => {
    const files = [
      'netlify/functions/_shared/primePersonality.ts',
      'netlify/functions/_shared/primePolicy.ts',
      'src/lib/ai/brains/prime.ts',
    ].map(f => fs.readFileSync(path.resolve(__dirname, '../../..', f), 'utf8'));
    const guarantee = /(never|not) (be )?shared with (any )?third[- ]part|bank[- ]level (security|encryption)|your data is (completely |fully )?(private|secure)|delete (all )?your (data|information) at any time/i;
    for (const src of files) expect(src).not.toMatch(guarantee);
  });
});
