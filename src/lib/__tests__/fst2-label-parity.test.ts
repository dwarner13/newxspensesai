/**
 * Label parity (AR-1b P1 / R6): the client's shared label map and the engine's served wording
 * table must say exactly the same thing, so every screen and the server agree.
 */
import { describe, it, expect } from 'vitest';
import { SUMMARY_WORDING } from '../../../netlify/functions/_shared/financial-summary-v2';
import { FINANCIAL_LABELS } from '../financialLabels';

describe('client labels = server wording.labels', () => {
  it('every server label has the identical client label', () => {
    for (const [k, v] of Object.entries(SUMMARY_WORDING.labels)) {
      expect(FINANCIAL_LABELS[k as keyof typeof FINANCIAL_LABELS], k).toBe(v);
    }
  });
});
