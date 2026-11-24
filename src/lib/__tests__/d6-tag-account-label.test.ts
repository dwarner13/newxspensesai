/**
 * D-6 — Tag context card shows the account ("Issuer •••• 1234") from owner-scoped
 * tag-explain, display-only. It is never added to focusedTransaction (the tag-copilot
 * payload) and never shown stale for another transaction.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const tag = read('src/components/transactions/TagCopilotPanel.tsx');
const page = read('src/pages/dashboard/TransactionsPageV2.tsx');

describe('TagCopilotPanel', () => {
  it('renders the account only when a label is provided', () => {
    expect(tag).toMatch(/focusedAccountLabel\?: string \| null;/);
    expect(tag).toMatch(/\{focusedAccountLabel && \(/);
    expect(tag).toMatch(/>Account</);
  });

  it('does not send the label to Tag', () => {
    expect(tag).toMatch(/focusedTransaction: focusedTransaction \|\| null,/);
    expect(tag).not.toMatch(/focusedAccountLabel[^\n]*fetch|body:[^\n]*focusedAccountLabel/);
  });
});

describe('Transactions page', () => {
  it('captures the label from the tag-explain result of the handed-off transaction', () => {
    expect(page).toMatch(/setTagPanelAccountLabel\(typeof tagInsight\?\.accountLabel === 'string' \? tagInsight\.accountLabel : null\);/);
    expect(page).toMatch(/focusedAccountLabel=\{tagPanelTx \? tagPanelAccountLabel : null\}/);
  });

  it('clears it on close, on Back to transaction and on the Prime review path', () => {
    expect(page.match(/setTagPanelAccountLabel\(null\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps it out of focusedTransaction', () => {
    expect(page).toMatch(/<TagCopilotPanel focusedTransaction=\{tagPanelTx as any\}/);
  });
});
