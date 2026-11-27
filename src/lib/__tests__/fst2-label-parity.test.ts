/**
 * Label parity (AR-1b P1 / R6): the client's shared label map and the engine's served wording
 * table must say exactly the same thing, so every screen and the server agree.
 */
import { describe, it, expect } from 'vitest';
import { SUMMARY_WORDING, POSSIBLE_BUSINESS_EXPENSES_WORDING } from '../../../netlify/functions/_shared/financial-summary-v2';
import { FINANCIAL_LABELS } from '../financialLabels';
import { POSSIBLE_BUSINESS_EXPENSES_TEXT } from '../insightWording';

describe('possible business expense wording = server wording (owner 2026-11-27)', () => {
  it('the client line is the server template filled in', () => {
    expect(POSSIBLE_BUSINESS_EXPENSES_TEXT(3, '$63.40')).toBe(POSSIBLE_BUSINESS_EXPENSES_WORDING.replace('{count}', '3').replace('{amount}', '$63.40'));
    expect(POSSIBLE_BUSINESS_EXPENSES_TEXT(3, '$63.40')).toMatch(/^Possible business expense — requires review by your accountant\./);
  });
});

describe('client labels = server wording.labels', () => {
  it('every server label has the identical client label', () => {
    for (const [k, v] of Object.entries(SUMMARY_WORDING.labels)) {
      expect(FINANCIAL_LABELS[k as keyof typeof FINANCIAL_LABELS], k).toBe(v);
    }
  });
});
