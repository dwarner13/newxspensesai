/**
 * C2-G1 — financial context and evidence guard.
 *
 * Owner-observed: a retirement answer presented two-month-old user statements (savings,
 * income, timeline, debt) and a 38-month imported-spending total as current, verified facts.
 * Fixes: dated user-stated memory presentation, imported-only spending/income labels, the
 * snapshot CONTEXT-FIRST instruction aligned with C2-F, and a planning rule in the
 * personality contract. Labels/text only — no evidence routing, storage or model change.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatUserStatedFacts, describeUserStatedFact, humanizeFact, factDate,
  USER_STATED_FACTS_HEADING,
} from '../_shared/memoryFactPresentation';
import { formatPositionForPrompt } from '../_shared/financial-position';
import { buildPrimePersonalityMessage } from '../_shared/primePersonality';
import { PRIME_PERSONALITY_V1 } from '../../../src/shared/prime-personality-contract';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const chat = read('netlify/functions/chat.ts');
const memorySrc = read('netlify/functions/_shared/memory.ts');
const ctxSrc = read('netlify/functions/_shared/context-retrieval.ts');

describe('1. remembered facts are user-stated and dated (never verified records)', () => {
  it('humanizes stored key=value facts without changing their value', () => {
    expect(humanizeFact('fact:savings_balance=310000')).toEqual({ text: 'savings balance: 310000', kind: 'fact' });
    expect(humanizeFact('pref:export_format=csv')).toEqual({ text: 'export format: csv', kind: 'preference' });
    expect(humanizeFact('User prefers short answers')).toEqual({ text: 'User prefers short answers', kind: 'note' });
  });

  it('uses the stored date when present and never invents one', () => {
    expect(factDate('2026-09-14T18:02:00Z')).toBe('2026-09-14');
    expect(factDate(undefined)).toBeNull();
    expect(factDate('not a date')).toBeNull();
    expect(describeUserStatedFact({ fact: 'fact:retirement_timeline=4 years', created_at: '2026-09-14T18:02:00Z' }))
      .toBe('- retirement timeline: 4 years (user-stated, shared 2026-09-14)');
    expect(describeUserStatedFact({ fact: 'fact:annual_income=150000' }))
      .toBe('- annual income: 150000 (user-stated, date unknown)');
  });

  it('the block is headed as previously shared, possibly outdated, not verified', () => {
    const block = formatUserStatedFacts([{ fact: 'fact:savings_balance=310000', created_at: '2026-09-14T00:00:00Z' }]);
    expect(block.startsWith(USER_STATED_FACTS_HEADING)).toBe(true);
    expect(block).toContain('may be outdated or unverified');
    expect(block).toContain('not as current verified facts');
    expect(block).not.toContain('Known User Facts');
    expect(formatUserStatedFacts([])).toBe('');
  });

  it('both memory formatting sites use it; dates flow from the stored records', () => {
    for (const src of [memorySrc, ctxSrc]) {
      expect(src).toContain('formatUserStatedFacts(');
      expect(src).not.toContain('## Known User Facts & Preferences');
    }
    expect(memorySrc).toContain('created_at?: string;');
    expect(memorySrc).toContain("created_at: f.created_at || undefined,");
    expect(memorySrc).toContain('if (existing && !existing.created_at && f.created_at) existing.created_at = f.created_at;');
    // stored records are not written by this change
    expect(memorySrc.slice(memorySrc.indexOf('formatUserStatedFacts(prioritizedFacts)') - 400, memorySrc.indexOf('formatUserStatedFacts(prioritizedFacts)'))).not.toMatch(/\.(insert|update|upsert)\(/);
  });
});

describe('2. imported spending/income are labelled as imported-only, with the real range', () => {
  const pos = {
    asOf: '2026-11-22T00:00:00Z', currency: 'CAD', userId: 'synthetic',
    income: { status: 'verified', source: 'verified_db', periodTotal: { amount: 198440.12, source: 'verified_db', periodStart: '2023-02-01', periodEnd: '2026-05-31' } },
    spending: { status: 'verified', source: 'verified_db', periodTotal: { amount: 142310.55, source: 'verified_db', periodStart: '2023-02-01', periodEnd: '2026-05-31' } },
    cashFlow: { status: 'unavailable', source: 'unavailable' },
    savings: { status: 'unavailable', source: 'unavailable' }, debt: { status: 'unavailable', source: 'unavailable' },
    goals: { status: 'verified_zero', source: 'verified_db', activeCount: 0 }, timeHorizon: { status: 'unavailable', source: 'unavailable' },
    dataCoverage: { firstTransaction: '2023-02-01', lastTransaction: '2026-05-31', transactionCount: 2310, monthsCovered: 40 },
    missingAreas: [],
  } as unknown as Parameters<typeof formatPositionForPrompt>[0];
  const text = formatPositionForPrompt(pos);

  it('spending: imported only, may not be all accounts/household, not annual, real dates from the data', () => {
    const line = text.split('\n').find(l => l.startsWith('Spending:'))!;
    expect(line).toContain('2023-02-01 to 2026-05-31');
    expect(line).toContain('verified sum of imported transactions only');
    expect(line).toContain('may not include every account or all household spending');
    expect(line).toContain('not annual living expenses');
    expect(line).toContain('do not annualize');
  });

  it('income: imported only, not an annual salary', () => {
    const line = text.split('\n').find(l => l.startsWith('Income:'))!;
    expect(line).toContain('verified sum of imported transactions only');
    expect(line).toContain('not an annual salary');
  });

  it('no hardcoded counts or ranges in the formatter', () => {
    const fpSrc = read('netlify/functions/_shared/financial-position.ts');
    expect(fpSrc).not.toMatch(/2023-04-17|2026-06-16|74 imports|170,?428/);
  });
});

describe('3. the dashboard snapshot is never authoritative (C2-F alignment)', () => {
  it('CONTEXT-FIRST "answer from Tax Summary or Snapshot" is gone; evidence-first replaces it', () => {
    expect(chat).not.toContain('CONTEXT-FIRST: When a question can be answered from Tax Summary or Snapshot above');
    expect(chat).toContain('2. EVIDENCE-FIRST: Use verified evidence (server evidence blocks above or your tools) for any specific figure.');
    expect(chat).toContain('never answer from it as an authoritative or period total');
    // Owner 2026-11-26 (unified engine): stronger than labelling — the browser snapshot never reaches Prime.
    expect(chat).not.toContain('Dashboard snapshot (browser-computed');
    expect(chat).toContain('the browser-computed dashboard tax snapshot is');
  });
});

describe('4. planning questions — extends the existing personality contract', () => {
  const msg = buildPrimePersonalityMessage({ preferredName: 'Sam' });
  it('contract carries the planning policy', () => {
    expect(PRIME_PERSONALITY_V1.planning).toMatchObject({
      leadWithAssessment: true, separateUserStatedFromVerified: true, labelAssumptionsAndEstimates: true,
      confirmOldGoalsBeforeUsing: true, importedSpendingIsNotHouseholdTotal: true, numberedReportByDefault: false, maxClarifyingQuestions: 1,
    });
  });
  it('the live personality message renders it', () => {
    expect(msg).toContain('PLANNING QUESTIONS (retirement, debt payoff, big decisions):');
    expect(msg).toContain('no numbered report or headings by default');
    expect(msg).toContain('Never present something they told you as a verified record.');
    expect(msg).toMatch(/may have changed — check it before building on it, and never invent one/);
    expect(msg).toContain('do not call it their total household or annual living cost');
    expect(msg).toContain(`Ask at most ${PRIME_PERSONALITY_V1.planning.maxClarifyingQuestions} clarifying question`);
    expect(msg).not.toMatch(/\$\d/); // still no real figures in personality text
  });
});
