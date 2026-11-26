/**
 * APPLY-ALL (owner GO 2026-11-25): Upload "Apply all" uses Tag's signed proposal flow.
 * Contract: Tag HQ handoff (propose_import_suggestions -> commit_proposal). Review
 * conditions: Attachments HQ (exact bodies, echo, explicit confirm, no double commit, honest
 * outcomes, pipeline untouched). Synthetic data only.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildProposeBody, buildCommitBody, readProposeResponse, readCommitResponse,
  moreGroupsBeyondReply, APPLY_SUGGESTIONS_TEXT, UNKNOWN_OUTCOME_TEXT, NOT_CHECKED_TEXT,
} from '../importSuggestionsFlow';

const IMPORT = '00000000-0000-4000-8000-0000000000a1';
const SESSION = '00000000-0000-4000-8000-0000000000c1';
const SUBJECT = { importId: IMPORT, affected: 7, groups: 5, fingerprint: 'synthetic-fp-1' };
const proposed = {
  proposal: { kind: 'action', action: 'apply_import_suggestions', subject: SUBJECT },
  conversation: {
    sessionId: SESSION,
    reply: "Apply Tag's suggestions to **7** transactions from this statement (5 merchants: Sample Cafe → Dining (3); …)",
    receipt: { action: 'apply_import_suggestions', state: 'proposed', result: { matchCount: 7 } },
  },
};

describe('request bodies (exact)', () => {
  it('propose sends only intent, importId and the conversation fields', () => {
    expect(buildProposeBody(IMPORT, 'cmid-1')).toStrictEqual({
      intent: 'propose_import_suggestions',
      importId: IMPORT,
      conversation: { customerText: APPLY_SUGGESTIONS_TEXT, clientMessageId: 'cmid-1' },
    });
  });

  it('commit echoes action and subject exactly, with a fresh id and the propose session', () => {
    const r = readProposeResponse(proposed);
    if (r.kind !== 'proposed') throw new Error('expected proposal');
    const body = buildCommitBody(r.proposal, 'cmid-2');
    expect(body).toStrictEqual({
      intent: 'commit_proposal',
      action: 'apply_import_suggestions',
      subject: SUBJECT,
      conversation: { customerText: 'yes', clientMessageId: 'cmid-2', sessionId: SESSION },
    });
    expect(body.subject).toBe(SUBJECT); // the same object: never rebuilt or edited
  });

  it('each step gets its own client message id', () => {
    const a = buildProposeBody(IMPORT).conversation.clientMessageId;
    const b = buildProposeBody(IMPORT).conversation.clientMessageId;
    expect(a).not.toBe(b);
  });
});

describe('reading the server', () => {
  it('a saved proposal gives the server count and wording', () => {
    const r = readProposeResponse(proposed);
    expect(r.kind).toBe('proposed');
    if (r.kind !== 'proposed') return;
    expect(r.proposal.affected).toBe(7);
    expect(r.proposal.groups).toBe(5);
    expect(r.proposal.reply).not.toContain('**');
    expect(moreGroupsBeyondReply(r.proposal.groups)).toBe(2);
  });

  it('no proposal (failed or nothing to apply) shows the server text and offers no confirm', () => {
    const r = readProposeResponse({ conversation: { reply: 'Nothing to apply for this statement.', receipt: { state: 'failed', reason: 'nothing' } } });
    expect(r).toStrictEqual({ kind: 'nothing', reply: 'Nothing to apply for this statement.' });
    expect(readProposeResponse(null)).toStrictEqual({ kind: 'nothing', reply: NOT_CHECKED_TEXT });
  });

  it('only a completed receipt is success, with the saved count (not the suggestion count)', () => {
    expect(readCommitResponse({ conversation: { reply: 'Done.', receipt: { state: 'completed', count: 6 } } }))
      .toStrictEqual({ kind: 'completed', count: 6, reply: 'Done.' });
  });

  // Tag HQ review of 0e7bfee3: exact response shapes (tag-action.ts).
  it('duplicate whose earlier confirm completed: the stored receipt counts as done', () => {
    expect(readCommitResponse({ ok: true, intent: 'commit_proposal', duplicate: true, executed: false,
      conversation: { reply: 'Already saved.', receipt: { state: 'completed', success: true, count: 6 } } }))
      .toStrictEqual({ kind: 'completed', count: 6, reply: 'Already saved.' });
  });

  it('duplicate whose earlier attempt did not complete: show the server reply, never "applied"', () => {
    const r = readCommitResponse({ ok: true, duplicate: true, executed: false,
      conversation: { persisted: false, receipt: null, reply: 'Nothing was run again. Please check your transactions.' } });
    expect(r).toStrictEqual({ kind: 'not_changed', reply: 'Nothing was run again. Please check your transactions.' });
    const f = readCommitResponse({ ok: true, duplicate: true, conversation: { receipt: { state: 'failed' }, reply: 'That did not complete.' } });
    expect(f.kind).toBe('not_changed');
  });

  it('conflict: nothing changed; the customer may confirm again', () => {
    expect(readCommitResponse({ ok: false, error: 'conflict', conversation: { conflict: true, reply: "I couldn't safely record that message. Please send it again." } }))
      .toStrictEqual({ kind: 'retry', reply: "I couldn't safely record that message. Please send it again." });
  });

  it('anything else changed nothing', () => {
    expect(readCommitResponse({ conversation: { reply: 'That proposal has expired.', receipt: { state: 'failed' } } }))
      .toStrictEqual({ kind: 'not_changed', reply: 'That proposal has expired.' });
    expect(readCommitResponse({}).kind).toBe('not_changed');
  });
});

describe('UploadPageV2 wiring (source)', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../pages/UploadV2/UploadPageV2.tsx'), 'utf8');

  it('no bulk_apply and no browser-built groups are sent', () => {
    expect(page).not.toContain('bulk_apply');
    expect(page).not.toMatch(/groups: sweepSuggestion/);
    expect(page).not.toMatch(/Applied \$\{sweepSuggestion/);
  });

  it('propose and commit go through the shared flow helpers', () => {
    expect(page).toMatch(/postTagAction\(buildProposeBody\(importId\)\)/);
    expect(page).toMatch(/postTagAction\(buildCommitBody\(proposal\)\)/);
  });

  it('confirm runs only from the Confirm button, once at a time', () => {
    expect(page).toMatch(/data-testid="apply-all-confirm-btn" onClick=\{\(\) => void confirmImportSuggestions\(\)\} disabled=\{applyFlow\.phase === "committing"\}/);
    expect(page).toMatch(/if \(!proposal \|\| applyFlow\.phase !== "confirm" \|\| applyInFlightRef\.current\) return;/);
    expect(page.match(/confirmImportSuggestions\(\)/g)?.length).toBe(1);
  });

  it('no "already applied" claim exists; conflict returns to Confirm with the same proposal', () => {
    expect(page).not.toMatch(/already applied/i);
    expect(page).toMatch(/else if \(r\.kind === "retry"\) \{[\s\S]{0,160}setApplyFlow\(\{ phase: "confirm", proposal, notice: r\.reply \}\);/);
  });

  it('a refused sign-in (401) says nothing changed and asks to sign in', () => {
    expect(page).toMatch(/if \(res\.status === 401\) throw new SignedOutError\(\);/);
    expect(page.match(/e instanceof SignedOutError \? SIGNED_OUT_TEXT/g)?.length).toBe(2);
  });

  it('request failure shows the unknown-outcome message; success refreshes counts', () => {
    expect(page).toMatch(/setApplyFlow\(\{ phase: "failed", message: e instanceof SignedOutError \? SIGNED_OUT_TEXT : UNKNOWN_OUTCOME_TEXT \}\)/);
    expect(page).toMatch(/if \(r\.kind === "completed"\) \{[\s\S]{0,200}setHistoryRefreshKey\(k => k \+ 1\);/);
    expect(UNKNOWN_OUTCOME_TEXT).toMatch(/^Couldn't confirm whether that went through/);
  });

  it('the upload pipeline is untouched: the only pipeline-side change stores the import reference', () => {
    expect(page).toMatch(/setSweepSuggestion\(\{ \.\.\.sweepData, importId: importIdForSweep, statementLabel: current\.file\.name \}\)/);
  });
});
