/**
 * T-H1b client rules for Tag action turns (src/lib/tagActionConversation.ts) and the panel wiring
 * that uses them (TagCopilotPanel: previewAction / commitPendingProposal / cancelPendingProposal).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildActionConversation, interpretActionResponse, isRejection, ACTION_UNKNOWN_OUTCOME } from '../tagActionConversation';

const SID = '11111111-2222-4333-8444-555555555555';

describe('buildActionConversation', () => {
  it('sends the customer words, the client id and the current session', () => {
    expect(buildActionConversation({ sessionId: SID, clientMessageId: 'msg_abc12345', customerText: 'yes', startNewConversation: false }))
      .toEqual({ sessionId: SID, clientMessageId: 'msg_abc12345', customerText: 'yes' });
  });
  it('asks for a new conversation only after New conversation and before a session exists', () => {
    expect(buildActionConversation({ sessionId: null, clientMessageId: 'msg_abc12345', customerText: 'x', startNewConversation: true }))
      .toEqual({ clientMessageId: 'msg_abc12345', customerText: 'x', newConversation: true });
    expect(buildActionConversation({ sessionId: SID, clientMessageId: 'msg_abc12345', customerText: 'x', startNewConversation: true }).newConversation).toBeUndefined();
  });
});

describe('interpretActionResponse', () => {
  const conv = (over: Record<string, unknown>) => ({ conversation: { sessionId: SID, persisted: true, duplicate: false, reply: 'server reply', receipt: null, ...over } });

  it('a recorded proposal stays pending and shows the server text; nothing is applied', () => {
    const r = interpretActionResponse({ ok: true, ...conv({ receipt: { state: 'proposed', result: { matchCount: 2 } } }) }, 'fallback');
    expect(r).toMatchObject({ kind: 'ok', reply: 'server reply', sessionId: SID, receiptState: 'proposed', proposalPending: true, completed: false });
  });
  it('a server-verified completion applies effects with the verified count', () => {
    const r = interpretActionResponse({ ok: true, ...conv({ receipt: { state: 'completed', result: { affectedCount: 3 } } }) }, 'fallback');
    expect(r).toMatchObject({ completed: true, affectedCount: 3, proposalPending: false });
  });
  it('failed / cancelled receipts never apply effects', () => {
    for (const state of ['failed', 'cancelled']) {
      expect(interpretActionResponse(conv({ receipt: { state } }), 'f')).toMatchObject({ completed: false, proposalPending: false, receiptState: state });
    }
  });
  it('a duplicate is display-only even if the stored receipt says completed', () => {
    const r = interpretActionResponse({ duplicate: true, ...conv({ receipt: { state: 'completed', result: { affectedCount: 2 } } }) }, 'f');
    expect(r).toMatchObject({ kind: 'duplicate', completed: false, proposalPending: false });
  });
  it('a conflict is display-only and asks for a resend (reply from the server)', () => {
    const r = interpretActionResponse({ ok: false, error: 'conflict', ...conv({ persisted: false, conflict: true, reply: 'Please send it again.' }) }, 'f');
    expect(r).toMatchObject({ kind: 'conflict', completed: false, reply: 'Please send it again.' });
  });
  it('a completed action whose save failed still applies (the change happened) and reports not_saved', () => {
    const r = interpretActionResponse({ executed: true, ...conv({ persisted: false, receipt: { state: 'completed', result: { affectedCount: 2 } } }) }, 'f');
    expect(r).toMatchObject({ kind: 'not_saved', completed: true, affectedCount: 2 });
  });
  it('without a server reply the fallback is shown and nothing is applied', () => {
    expect(interpretActionResponse({ ok: false }, 'fallback text')).toMatchObject({ reply: 'fallback text', completed: false, receiptState: null });
    expect(interpretActionResponse(null, 'fb')).toMatchObject({ reply: 'fb', completed: false });
  });
  it('a malformed receipt state is ignored', () => {
    expect(interpretActionResponse(conv({ receipt: { state: 'done' } }), 'f')).toMatchObject({ receiptState: null, completed: false });
  });
});

describe('isRejection', () => {
  it('recognises declines and not other messages', () => {
    for (const t of ['no', 'No thanks', 'nope', 'cancel', 'never mind', 'nevermind!', "don't"]) expect(isRejection(t)).toBe(true);
    for (const t of ['yes', 'no, move them to Travel instead', 'what about uber?', 'notes']) expect(isRejection(t)).toBe(false);
  });
});

describe('TagCopilotPanel wiring (static)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../components/transactions/TagCopilotPanel.tsx'), 'utf8');
  const fn = (name: string) => {
    const start = src.indexOf(`const ${name} = async`);
    expect(start).toBeGreaterThan(-1);
    return src.slice(start, src.indexOf('\n  };\n', start));
  };
  it('preview, commit and cancel all send the conversation to tag-action', () => {
    expect(fn('previewAction')).toMatch(/intent: 'preview'[\s\S]*conversation,/);
    // T-ACT-FINAL: every confirmation is a signed-proposal confirmation (commit_proposal / commit_single);
    // the retired merchant `commit` is never sent.
    expect(fn('commitPendingProposal')).toMatch(/intent: 'commit_proposal'[\s\S]*conversation/);
    expect(fn('commitPendingProposal')).toMatch(/intent: 'commit_single'[\s\S]*conversation,/);
    expect(fn('commitPendingProposal')).not.toMatch(/intent: 'commit',/);
    expect(fn('cancelPendingProposal')).toMatch(/intent: 'cancel_proposal', conversation/);
  });
  it('the panel no longer composes "Done" or the proposal text itself', () => {
    expect(src).not.toMatch(/content: `Done\. Moved/);
    expect(src).not.toMatch(/Say yes to confirm\.`/);
  });
  it('effects (toast / refresh) run only for a server-verified completion', () => {
    expect(fn('commitPendingProposal')).toMatch(/if \(r\.completed\) \{[\s\S]*toast\.success/);
  });
  it('a failed request shows the unknown-outcome notice and never retries through the chat path', () => {
    expect(fn('commitPendingProposal')).toContain('ACTION_UNKNOWN_OUTCOME');
    expect(fn('commitPendingProposal')).not.toContain('handleSend(');
    expect(ACTION_UNKNOWN_OUTCOME).toContain("couldn't confirm");
  });
});
