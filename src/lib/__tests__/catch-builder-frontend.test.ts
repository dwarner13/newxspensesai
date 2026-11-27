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
    // TB-5 W11 (owner GO 2026-11-26): that rule save lived in the dead onTagAction handler
    // (TagCopilotPanel never declared or called it); the handler is retired. Rule changes go
    // only through Tag's proposals.
    expect(src).not.toMatch(/onTagAction=|onMerchantCategorize=/);
  });
  it('Categories: a saved budget is never reported as failed because of the notification insert', () => {
    const src = read('pages/CategoriesV2/CategoriesPageV2.tsx');
    expect(src).not.toMatch(/sent_at: new Date\(\)\.toISOString\(\),\s*\}\)\.catch\(/);
    // NOTIFY-1: the budget notice goes to `notifications` (the table with these columns).
    expect(src).toMatch(/const \{ error: notifyErr \} = await sb\.from\('notifications'\)\.insert\(/);
    expect(src).not.toMatch(/sent_at: new Date\(\)\.toISOString\(\)/);
  });
});

describe('primeSecurityMessages: guardrail_events logging no longer uses .catch() on a builder', () => {
  it('reads { error } instead of chaining .catch()', () => {
    const src = readFileSync(resolve(__dirname, '../primeSecurityMessages.ts'), 'utf8');
    const live = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(live).not.toMatch(/from\('guardrail_events'\)\.insert\([\s\S]{0,400}?\}\)\.catch\(/);
    expect(live).toMatch(/const \{ error: logError \} = await supabase\.from\('guardrail_events'\)\.insert\(/);
  });
});
