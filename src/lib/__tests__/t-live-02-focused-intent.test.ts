/**
 * T-LIVE-02 — focused transaction intent (owner live finding, staging 9275ddb).
 * The owner focused a transaction and typed "can we change this to food and beverage"; the panel
 * read "this" as a merchant name and Tag answered "I searched your transactions but didn't find any
 * matching 'THIS'." These tests pin the client routing: a reference to the focused transaction is a
 * single-transaction request and is NEVER a merchant pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { detectFocusedChangeRequest, detectUserActionIntent, isFocusedReference } from '../tagActionConversation';

describe('T-LIVE-02 — the owner\'s exact message', () => {
  it('"can we change this to food and beverage" is a focused request for "food and beverage"', () => {
    expect(detectFocusedChangeRequest('can we change this to food and beverage')).toEqual({ targetPhrase: 'food and beverage' });
  });
  it('and is NEVER a merchant-wide search for "this"', () => {
    expect(detectUserActionIntent('can we change this to food and beverage')).toBeNull();
  });
});

describe('T-LIVE-02 — natural references to the focused transaction', () => {
  const cases: Array<[string, string]> = [
    ['change it to Groceries', 'Groceries'],
    ['Change this expense to Travel please', 'Travel'],
    ['categorize this as Food & Dining', 'Food & Dining'],
    ['move this one into transportation', 'transportation'],
    ['change this transaction to Personal Care', 'Personal Care'],
    ['could you please set this charge to Bank Fees?', 'Bank Fees'],
    ['this should be groceries', 'groceries'],
    ['it should go under Food & Dining', 'Food & Dining'],
    ['hey tag, can you change this to Healthcare', 'Healthcare'],
    ['make this Shopping instead', 'Shopping'],
  ];
  for (const [text, target] of cases) {
    it(`"${text}" → focused "${target}", never a merchant pattern`, () => {
      expect(detectFocusedChangeRequest(text)).toEqual({ targetPhrase: target });
      expect(detectUserActionIntent(text)).toBeNull();
    });
  }
  it('"change it" alone (no category) is not an action', () => {
    expect(detectFocusedChangeRequest('change it')).toBeNull();
    expect(detectUserActionIntent('change it')).toBeNull();
  });
  it('a reference as the "category" is not a request', () => {
    expect(detectFocusedChangeRequest('change this to that')).toBeNull();
  });
  it('references are recognised; merchant names are not', () => {
    for (const r of ['this', 'it', 'that one', 'this expense', 'the transaction', 'THIS', '"this"']) expect(isFocusedReference(r)).toBe(true);
    for (const m of ['Uber', 'SAMPLE EVENTS CO', 'this is it cafe', 'Itsy Bitsy']) expect(isFocusedReference(m)).toBe(false);
  });
});

describe('T-LIVE-02 — explicit merchant requests keep working', () => {
  it('"change all Uber to Transportation" stays merchant-wide (with its own preview + confirmation)', () => {
    expect(detectUserActionIntent('change all Uber to Transportation')).toEqual({ matchValue: 'Uber', targetCategory: 'Transportation', matchType: 'contains' });
    expect(detectFocusedChangeRequest('change all Uber to Transportation')).toBeNull();
  });
  it('questions are neither', () => {
    expect(detectFocusedChangeRequest('how much did I spend on groceries?')).toBeNull();
    expect(detectUserActionIntent('how much did I spend on groceries?')).toBeNull();
  });
});

describe('T-LIVE-02 — panel routing (source guarantees)', () => {
  const panel = readFileSync(resolve(__dirname, '../../components/transactions/TagCopilotPanel.tsx'), 'utf8');
  it('the focused interceptor runs BEFORE the merchant interceptor and sends only the focused id + words', () => {
    const focusedAt = panel.indexOf('detectFocusedChangeRequest(text)');
    const merchantAt = panel.indexOf('detectUserActionIntent(text)');
    expect(focusedAt).toBeGreaterThan(0);
    expect(merchantAt).toBeGreaterThan(focusedAt);
    expect(panel).toContain("intent: 'preview_single'");
    expect(panel).toContain("intent: 'commit_single'");
  });
  it('the panel no longer carries its own merchant regex (single source in tagActionConversation)', () => {
    expect(panel).not.toContain('const detectUserActionIntent =');
  });
});

describe('T-LIVE-02 — chat-path proposals', () => {
  const panel = readFileSync(resolve(__dirname, '../../components/transactions/TagCopilotPanel.tsx'), 'utf8');
  it('a single-transaction proposal from Tag chat is held so "yes" goes to tag-action commit_single', () => {
    expect(panel).toContain("if (p && p.kind === 'single' && typeof p.transactionId === 'string'");
    expect(panel).toContain("setPendingProposal({ kind: 'single', transactionId: p.transactionId");
  });
  it('a proposal (nothing written) does not trigger a transactions refresh', () => {
    expect(panel).toContain('if (data.rule_saved || data.action?.applied || (data.backfill_count || 0) > 0) {');
  });
});

describe('T-ACT-SAFE — panel holds rule / bulk / rename proposals for commit_proposal', () => {
  const panel = readFileSync(resolve(__dirname, '../../components/transactions/TagCopilotPanel.tsx'), 'utf8');
  it('holds the signed proposal exactly as sent and confirms through tag-action commit_proposal', () => {
    expect(panel).toContain("setPendingProposal({ kind: 'action', action: p.action, subject: p.subject });");
    expect(panel).toContain("postTagAction({ intent: 'commit_proposal', action: proposal.action, subject: proposal.subject, conversation })");
  });
});
