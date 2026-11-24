/**
 * COLLAB-2a — the review rules were extracted from tag-smart-review into
 * src/shared/tag-review-rules.ts. The expected output was captured from the ORIGINAL handler
 * (a475034) on a fixture that exercises every rule (pattern rules, inconsistent merchant,
 * duplicates, amount anomaly, empty merchant). Both the extracted function and the refactored
 * handler must reproduce it exactly.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectReviewIssues } from '../../../src/shared/tag-review-rules';

const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/tag-review-fixture.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/tag-review-expected.json'), 'utf8'));

let n = 0;
vi.mock('crypto', async (orig) => ({ ...(await orig<typeof import('crypto')>()), randomUUID: () => `id-${++n}` }));
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: 'u1' }) }));
vi.mock('../_shared/verifyAuth', () => ({ verifyAuth: async () => ({ userId: 'u1' }) }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const c: any = { select: () => c, eq: () => c, limit: async () => ({ data: fixture, error: null }) };
      return c;
    },
  }),
}));

describe('tag review rules parity', () => {
  it('the captured original output covers every rule type', () => {
    const kinds = new Set(expected.issues.map((i: { issueType?: string; id: string }) => i.issueType ?? (i.id.startsWith('dup-') ? 'duplicate' : 'category')));
    expect(kinds).toEqual(new Set(['category', 'duplicate', 'amount_anomaly']));
    expect(expected.issueCount).toBe(7);
  });

  it('extracted detectReviewIssues reproduces the original issues exactly', () => {
    let k = 0;
    expect(detectReviewIssues(fixture, () => `id-${++k}`)).toEqual(expected.issues);
  });

  it('the refactored tag-smart-review handler returns the identical response', async () => {
    n = 0;
    process.env.SUPABASE_URL = 'x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'y';
    const { handler } = await import('../tag-smart-review');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
    const res: any = await (handler as any)({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: '{}' }, {});
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(expected);
  });
});
