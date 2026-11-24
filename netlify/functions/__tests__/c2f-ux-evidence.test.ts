/**
 * C2-F — Prime UX and financial evidence repair.
 *
 * Reported flow: "How much did I spend in May 2026?" → "Which category did I spend the most on?"
 * → a 2026 "Personal" (tax-style) total plus 25 unrelated June cards. Causes fixed here:
 *  F3-a the browser-computed dashboard snapshot was labelled AUTHORITATIVE and could strip tools;
 *  F3-b with no period, a legacy full-year tax_summary silently answered a different scope;
 *  F3-c the model's undated tx_search created cards for a non-list (category-summary) answer.
 * Plus F1 (short New Chat welcome) and F2 (visible Chat History in the Prime panel).
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyPrimeIntent } from '../../../src/shared/prime-intent-classifier';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';
import { buildTemporalScope } from '../../../src/shared/prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../../../src/shared/prime-evidence-contract';
import { buildEvidencePlan } from '../../../src/shared/prime-evidence-resolver';
import { buildPreExecutionPlan } from '../../../src/shared/financial-grounding';
import {
  resolveModelSearchOwnership,
  resolveCandidateOwnership,
  createCandidateOwnershipGate,
} from '../../../src/shared/tx-candidate-ownership';

const CTX = { timezone: 'America/Edmonton', referenceDate: new Date('2026-11-22T03:00:00Z') };
const AV = { memoryLoaded: true, memoryFactCount: 0, conversationHistoryLoaded: true, candidateIdentityAvailable: false, pipelineSnapshotLoaded: false };
const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
const v2 = fs.readFileSync(path.resolve(__dirname, '../../../src/pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');

function plan(message: string) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, CTX, intent.financialClassification?.years);
  return { intent, plan: buildEvidencePlan(buildRuntimeEvidenceContract(intent, AV, ts ?? undefined), intent) };
}
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// What an undated tx_search returns: the newest rows (June), unrelated to a May question.
const juneRows = { rows: Array.from({ length: 25 }, (_, i) => ({ id: uuid(i + 1), date: '2026-06-16', amount: -10, category: 'Groceries' })) };

describe('F3 — the reported May follow-up', () => {
  it('the follow-up has no period of its own: P3.1C leaves it unresolved (ambiguous_request)', () => {
    const { intent, plan: p } = plan('Which category did I spend the most on?');
    expect(intent.financialClassification?.requestShape).toBe('aggregate');
    expect(p.unresolved).toContainEqual({ evidenceKind: 'cash_flow', reason: 'ambiguous_request' });
    // ...which is exactly when the legacy grounding planner would pick a full-year tax_summary
    expect(buildPreExecutionPlan(classifyFinancialQuery('Which category did I spend the most on?'), 2026)).toMatchObject({ toolName: 'tax_summary', shouldPreExecute: true });
  });

  it('F3-b: chat.ts skips that legacy tax_summary (pre-exec AND false-zero retry) when the period is unresolved', () => {
    expect(chat).toContain("const periodUnresolvedTaxSummary = plan.toolName === 'tax_summary'");
    expect(chat).toMatch(/!untrustedMerchantPreExec && !periodUnresolvedTaxSummary\) \{/);
    expect(chat).toContain("const periodUnresolvedRetry = plan.toolName === 'tax_summary' && !!evidencePlanForExecution?.unresolved.some(u => u.reason === 'ambiguous_request');");
    expect(chat).toMatch(/!untrustedMerchantRetry && !periodUnresolvedRetry\) \{/);
  });

  it('F3-a: the browser snapshot is never presented as authoritative and never strips tools', () => {
    expect(chat).not.toContain('AUTHORITATIVE — use these numbers');
    expect(chat).not.toContain('answer directly with that number');
    expect(chat).toContain('Dashboard snapshot (browser-computed, NOT verified, NOT period-specific');
    expect(chat).not.toContain("tools stripped (exact-scope match in Tax Summary)");
    expect(chat).not.toMatch(/shouldRetainTools\(/);
  });

  it('F3-c: an undated model search in a category-summary answer creates NO cards (June rows stay out)', async () => {
    const fc = classifyFinancialQuery('Which category did I spend the most on?');
    const intent = resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, explicitListRequest: fc.requestShape === 'list', args: { limit: 25 } });
    expect(intent).toBe('analytical_evidence');
    const persistLayer2 = vi.fn(async (frame: unknown) => frame !== undefined);
    const gate = createCandidateOwnershipGate({ persistLayer2, applyLayer1: vi.fn(), clearLayer1: vi.fn() });
    expect(await gate.submitSearchResult(juneRows, 'non-streaming', intent)).toBe('skipped_analytical');
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(persistLayer2).not.toHaveBeenCalled();
  });

  it('explicit lists keep their cards (May list, merchant list, "show me those transactions")', () => {
    for (const m of ['Show me my transactions from May 2026.', 'Show me Costco purchases.', 'Show me those transactions.']) {
      expect(classifyFinancialQuery(m).requestShape).toBe('list');
      expect(resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, explicitListRequest: true, args: {} }))
        .toBe('candidate_establishment');
    }
  });

  it('dated searches and unknown request shapes are unchanged', () => {
    expect(resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, explicitListRequest: false, args: { startDate: '2026-05-01', endDate: '2026-05-31' } }))
      .toBe('candidate_establishment');
    for (const purpose of [undefined, 'new_candidate_scope']) {
      for (const hasExistingCandidates of [false, true]) {
        expect(resolveModelSearchOwnership({ purpose, hasExistingCandidates, aggregateEvidenceSatisfied: false, args: {} }))
          .toBe(resolveCandidateOwnership(purpose, hasExistingCandidates));
      }
    }
  });

  it('chat.ts passes the explicit-list signal for Prime only, at all four model-search sites', () => {
    expect(chat).toMatch(/const primeExplicitListShape: boolean \| undefined = isPrime\s+\? shadowIntentResult\?\.financialClassification\?\.requestShape === 'list'\s+: undefined;/);
    expect(chat.match(/explicitListRequest: primeExplicitListShape, summaryOrInventoryRequest: primeSummaryOrInventory, unscopedReference: primeUnscopedReference, args/g)?.length).toBe(4); // F2 adds unscopedReference; PB-03 adds summaryOrInventoryRequest
  });
});

describe('F1 — New Chat welcome', () => {
  const nc = v2.slice(v2.indexOf('const handleNewChat = useCallback(() => {'), v2.indexOf('}, [userId]);', v2.indexOf('const handleNewChat = useCallback(() => {')));

  it('New Chat: fresh session, nothing carried over, short welcome instead of the auto briefing', () => {
    expect(nc).toContain('localStorage.setItem(primeSessionStorageKey(userId), newId);');
    expect(nc).toContain('clearMessages();');
    expect(nc).toContain('setHistory([]);');
    expect(nc).toContain('setFreshWelcome(true);');
    expect(nc).toContain('setShowBriefing(false);');
    expect(nc).not.toMatch(/\.delete\(|from\(['"]chat_/);
  });

  it('the welcome has three suggestions that send, and the briefing stays available on demand', () => {
    const w = v2.slice(v2.indexOf('C2-F: New Chat welcome'), v2.indexOf(') : briefingCollapsed ? ('));
    expect(w).toContain('["How much did I spend last month?", "What are my biggest spending categories?", "Show me my recent transactions"]');
    expect(w).toContain('onClick={() => handleSend(q)}');
    expect(w).toContain("Show today&apos;s briefing");
    expect(w).toContain('setShowBriefing(true); setRevealStep(8);');
  });

  it('the automatic briefing does not override the welcome; opening a conversation clears it', () => {
    expect(v2).toContain('if (lastSessionChecked && historyChecked && !lastSession && history.length === 0 && !freshWelcome) setShowBriefing(true);');
    const c2b = v2.slice(v2.indexOf('storePrimeSessionId(userId, target);'), v2.indexOf('sessionSwitchInFlightRef.current = null;'));
    expect(c2b).toContain('setFreshWelcome(false);');
  });
});

describe('F2 — Chat History in the Prime panel', () => {
  it('reuses useChatSessions (incl. unsummarized chats), lists Prime conversations only', () => {
    expect(v2).toContain('import { useChatSessions } from "@/hooks/useChatSessions";');
    expect(v2).toContain('useChatSessions({ limit: 40, perEmployee: 40, autoLoad: false })');
    expect(v2).toContain('historySessions.filter(h => isPrimeSlug(h.employee_slug) && h.id)');
  });

  it('selecting a conversation goes through the existing ownership-verified request (no new DB path)', () => {
    const s = v2.indexOf('const handleOpenHistorySession = useCallback(');
    const body = v2.slice(s, v2.indexOf('}, [sessionId, setRequestedSessionId]);', s));
    expect(body).toContain('setRequestedSessionId(id);');
    expect(body).not.toMatch(/\.from\(|setSessionId\(|send/);
  });

  it('the header has a visible History control next to New chat', () => {
    const header = v2.slice(v2.indexOf('onClick={toggleSessionsOpen}'), v2.indexOf('onClick={handleNewChat}'));
    expect(header).toContain('title="Chat history"');
    // P1-e: rows moved from the header popover into ConversationHistoryDrawer, which calls
    // onSelect(id) → handleOpenHistorySession (same ownership-verified path).
    expect(v2).toContain('onSelect={handleOpenHistorySession}');
  });
});
