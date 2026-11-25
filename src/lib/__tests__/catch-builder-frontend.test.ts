/**
 * Customer-facing `.catch()` on Supabase query builders (thenables WITHOUT catch). Calling it throws
 * a TypeError before the request is sent — after the preceding write already succeeded — so the
 * customer was told an action failed (or saw stale data) although it had worked.
 * Owner GO 2026-11-25: prioritise "action succeeded but reported failure".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

describe('frontend: no .catch() chained on Supabase query builders in these flows', () => {
  it('Transactions (live page): the rule save after a category change no longer aborts the success path', () => {
    const src = read('pages/dashboard/TransactionsPageV2.tsx');
    expect(src).not.toMatch(/\{ onConflict: 'user_id,merchant_pattern' \}\)\.catch\(/);
    expect(src).toMatch(/const \{ error: ruleErr \} = await sb\.from\('category_rules'\)\.upsert\(/);
  });
  it('Categories: a saved budget is never reported as failed because of the notification insert', () => {
    const src = read('pages/CategoriesV2/CategoriesPageV2.tsx');
    expect(src).not.toMatch(/sent_at: new Date\(\)\.toISOString\(\),\s*\}\)\.catch\(/);
    expect(src).toMatch(/const \{ error: notifyErr \} = await sb\.from\('user_notifications'\)\.insert\(/);
  });
});
