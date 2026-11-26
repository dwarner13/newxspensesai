/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */
/**
 * Coverage gate for comparison / trend / stability claims (owner GO 2026-11-26; Architecture G11).
 * The incident shapes: Crystal "stable spending patterns", "Housing … up 50% from last month".
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { hasComparisonClaim, applyComparisonGate } from '../comparison-claim-guard';

const deny = { allowed: false, reason: 'only 1 complete comparable statement period(s)' };
const allow = { allowed: true, reason: 'comparable statement periods available' };

describe('comparison-claim gate', () => {
  it.each([
    'Your spending patterns look stable.',
    'Housing is up 50% from last month.',
    'Dining increased by 12% compared with the previous statement.',
    'Spending has been steady month over month.',
    'Groceries were higher than last month.',
  ])('detects: %s', (t) => expect(hasComparisonClaim(t)).toBe(true));

  it.each([
    'Your largest category was Groceries.',
    'You have 2 transactions to review.',
    'Total deposits were $2,165.00.',
  ])('ignores non-comparisons: %s', (t) => expect(hasComparisonClaim(t)).toBe(false));

  it('without coverage: removes the claim sentences and adds one honest sentence', () => {
    const r = applyComparisonGate('Your largest category was Groceries. Housing is up 50% from last month. Your spending patterns look stable.', deny);
    expect(r.applied).toBe(true);
    expect(r.removedSentences).toBe(2);
    expect(r.text).toContain('Your largest category was Groceries.');
    expect(r.text).not.toMatch(/50%|stable/);
    expect(r.text).toContain("there isn't enough complete statement history (only 1 complete comparable statement period(s))");
  });

  it('with coverage: unchanged', () => {
    const t = 'Housing is up 12% compared with the previous statement.';
    expect(applyComparisonGate(t, allow)).toEqual({ text: t, removedSentences: 0, applied: false });
  });

  it('chat.ts applies the gate to EVERY employee (not Prime-only) before saving', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
    const i = chat.indexOf('applyComparisonGate(assistantContent');
    expect(i).toBeGreaterThan(0);
    const block = chat.slice(Math.max(0, i - 900), i);
    expect(block).not.toMatch(/isPrime &&/);
    expect(chat.indexOf("await sb.from('chat_messages').insert({", i)).toBeGreaterThan(i);
  });
});

describe('G11b: every LLM-reply endpoint uses the gate', () => {
  it('async gate: allowed → unchanged; not allowed → claims removed; coverage read failure → fail closed', async () => {
    const { gateReplyForCoverage } = await import('../comparison-claim-guard');
    const t = 'Housing is up 50% from last month.';
    const noCov = { status: 'ok', accounts: [], completedWithoutPeriod: 0, limitations: [], statusCounts: {}, lastUploadAttempt: null, lastCompletedImport: null, readOnly: true } as any;
    expect((await gateReplyForCoverage(t, async () => noCov)).applied).toBe(true);
    const failed = await gateReplyForCoverage(t, async () => { throw new Error('db'); });
    expect(failed).toMatchObject({ applied: true, reason: 'statement coverage could not be read' });
    expect((await gateReplyForCoverage('No comparison here.', async () => { throw new Error('never called'); })).applied).toBe(false);
  });
  it.each(['custodian-chat.ts', 'prime-briefing.ts'])('%s applies gateReplyForCoverage before replying/saving', (file) => {
    const src = fs.readFileSync(path.join(__dirname, '../../../netlify/functions', file), 'utf8');
    expect(src).toContain('gateReplyForCoverage(');
  });
});
