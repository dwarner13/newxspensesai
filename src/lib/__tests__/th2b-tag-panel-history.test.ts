/**
 * T-H2b — Tag panel uses server conversations: restore, resume across devices, New
 * conversation, shared History drawer, honest save notices, safe retry, no 6-hour wipe.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tagReplyOutcome, legacyTagTranscript, newClientMessageId } from '../tagConversation';
import { isValidClientMessageId } from '../../shared/conversation-identity';

const root = path.resolve(__dirname, '../../..');
const panel = fs.readFileSync(path.join(root, 'src/components/transactions/TagCopilotPanel.tsx'), 'utf8');
const SID = '11111111-1111-4111-8111-111111111111';

describe('reply outcomes (contract agreed with Tag HQ)', () => {
  it('duplicate and conflict are display-only; not saved still shows; ok applies', () => {
    expect(tagReplyOutcome({ duplicate: true, persisted: true, sessionId: SID })).toEqual({ kind: 'duplicate', mayApply: false, sessionId: SID });
    expect(tagReplyOutcome({ conflict: true, persisted: false })).toEqual({ kind: 'conflict', mayApply: false, sessionId: null });
    expect(tagReplyOutcome({ persisted: false, sessionId: SID }).kind).toBe('not_saved');
    expect(tagReplyOutcome({ persisted: true, sessionId: 'bogus' })).toEqual({ kind: 'ok', mayApply: true, sessionId: null });
  });
  it('client message ids are valid idempotency keys', () => {
    for (let i = 0; i < 5; i++) expect(isValidClientMessageId(newClientMessageId())).toBe(true);
  });
  it('legacy transcript: read for display, no expiry', () => {
    expect(legacyTagTranscript(JSON.stringify([{ role: 'user', content: 'hi' }, { role: 'tag', text: 'hello' }, { role: 'user', content: '  ' }])))
      .toEqual([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]);
    expect(legacyTagTranscript('{bad')).toEqual([]);
    expect(legacyTagTranscript(null)).toEqual([]);
  });
});

describe('TagCopilotPanel', () => {
  it('no 6-hour wipe and no writes to the old global transcript key', () => {
    expect(panel).not.toMatch(/SESSION_WINDOW_MS|6 \* 60 \* 60 \* 1000/);
    expect(panel).not.toMatch(/localStorage\.setItem\("tag_chat_history"/);
    expect(panel).not.toMatch(/localStorage\.removeItem\("tag_chat_history"\)/);
  });

  it('sends sessionId and clientMessageId, never the client history', () => {
    expect(panel).not.toMatch(/history: updatedMessages/);
    expect(panel).toMatch(/sessionId: tagSessionIdRef\.current \|\| undefined,\s*clientMessageId,/);
    expect(panel).toMatch(/\{ newConversation: true \}/);
  });

  it('restores from the server (owner + employee scoped) and caches per account', () => {
    expect(panel).toMatch(/verifyOwnedSession\(sb, userId, target, "tag-ai"\)/);
    expect(panel).toMatch(/loadEmployeeSessions\(sb, userId, "tag-ai", 1\)/);
    expect(panel).toMatch(/restoreSessionMessages\(sb, userId, target\)/);
    expect(panel).toMatch(/writeCachedConversation\(window\.localStorage, userId, "tag-ai", \{/);
  });

  it('History uses the shared drawer with Tag conversations only; New conversation deletes nothing', () => {
    expect(panel).toMatch(/<ConversationHistoryDrawer/);
    expect(panel).toMatch(/useChatSessions\(\{ employee: "tag-ai"/);
    expect(panel).toMatch(/aria-label="Previous Tag conversations"/);
    expect(panel).toMatch(/aria-label="New conversation"/);
    const fn = panel.slice(panel.indexOf('const startNewConversation = () => {'), panel.indexOf('// T-H2: open a previous conversation'));
    expect(fn).not.toMatch(/delete|removeItem/);
    expect(fn).toMatch(/setTagSessionId\(null\);/);
  });

  it('duplicate / conflict replies apply and refresh nothing', () => {
    expect(panel).toMatch(/if \(!outcome\.mayApply\) return;\s*const actionFired/);
  });

  it('retry reuses the same clientMessageId, only for an unanswered message, and never re-enters the action path', () => {
    expect(panel).toMatch(/const clientMessageId = retryClientMessageId \|\| newClientMessageId\(\);/);
    expect(panel).toMatch(/if \(!retryClientMessageId && pendingProposal && isConfirmation\(text\)\)/);
    expect(panel).toMatch(/const userIntent = retryClientMessageId \? null : detectUserActionIntent\(text\);/);
    expect(panel).toMatch(/\{saveNotice\.kind === "failed" && \(/);
    expect(panel).toMatch(/This conversation couldn't be saved/);
    expect(panel).not.toMatch(/setTimeout\([^)]*handleSend/); // never automatic
  });

  it('Tag-owned action code is untouched', () => {
    expect(panel).toMatch(/await commitPendingProposal\(pendingProposal\);/);
    expect(panel).toMatch(/const preview = await previewAction\(userIntent\);/);
  });
});
