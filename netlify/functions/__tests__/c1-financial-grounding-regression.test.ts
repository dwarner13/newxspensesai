/**
 * C-1 / C-3 financial grounding — the owner's five regression tests (GO 2026-11-27,
 * "FINANCIAL GROUNDING AUTHORIZATION"), from live staging request f64d820f: a statement question
 * answered with ZERO tool calls from all-time position figures, remembered context and an earlier
 * reply. Drives the real verifier and decision (enforceReplyEvidence) with an in-memory ledger and
 * fake tool / model; plus static wiring checks on chat.ts. Synthetic figures only.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  verifyReplyFigures, enforceReplyEvidence, VERIFIED_FIGURES_UNAVAILABLE_TEXT, WHICH_PERIOD_TEXT,
} from '../../../src/shared/turn-evidence-ledger';
import { REMEMBERED_CONTEXT_HEADER, EARLIER_CONVERSATION_LABEL, rememberedContextBlock } from '../../../src/shared/remembered-context-labels';

const STATEMENT = { from: '2026-10-01', to: '2026-11-01', label: 'October 2026' };
// Synthetic statement truth: deposits 1,525.84 · withdrawals 1,603.92 · net −78.08 (and one 180.00 transfer in).
const CASH_FLOW = { totalDeposits: 1525.84, totalWithdrawals: 1603.92, netCashFlow: -78.08, transfersIn: 180 };
const POSITION_TEXT_FIGURES = [9320.55, 11204.1]; // FINANCIAL POSITION (all accounts, all time)

function turn(userMessage: string, ledger: number[] = []) {
  const verify = (text: string) => verifyReplyFigures(text, { toolFigures: ledger, userMessage, positionFigures: POSITION_TEXT_FIGURES });
  const runCashFlow = vi.fn(async () => { ledger.push(...Object.values(CASH_FLOW)); return CASH_FLOW; });
  return { ledger, verify, runCashFlow };
}

describe('C-1 regression (owner five)', () => {
  it('1. latest statement question, zero tool calls (f64d820f): wrong deposits rejected → one lookup → verified reply', async () => {
    const t = turn('give me the statement summary again');
    // the model answered from context with a WRONG deposits total (true deposits minus the 180 transfer)
    const draft = 'Deposits: $1,345.84\nNet Cash Flow: -$258.08\nYou may be heading toward an overdraft.';
    const regenerate = vi.fn(async () => 'Deposits: $1,525.84\nWithdrawals: $1,603.92\nNet Cash Flow: -$78.08');
    const r = await enforceReplyEvidence({ reply: draft, verify: t.verify, period: STATEMENT, remainingMs: 40_000, runCashFlow: t.runCashFlow, regenerate });
    expect(r.first.ok).toBe(false);
    expect(t.runCashFlow).toHaveBeenCalledTimes(1);
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(r.action).toBe('regenerated');
    expect(r.text).toContain('$1,525.84');
    expect(r.text).not.toContain('1,345.84');
  });

  it('2. financial breakdown: a grounded breakdown (same-turn tool) is kept unchanged; arithmetic on it is allowed', async () => {
    const t = turn('break down that statement', Object.values(CASH_FLOW));
    const reply = 'Deposits: $1,525.84\nWithdrawals: $1,603.92\nNet Cash Flow: -$78.08\nTogether, $3,129.76 moved through your account.';
    const regenerate = vi.fn(async () => null);
    const r = await enforceReplyEvidence({ reply, verify: t.verify, period: STATEMENT, remainingMs: 40_000, runCashFlow: t.runCashFlow, regenerate });
    expect(r.action).toBe('kept');
    expect(r.text).toBe(reply);
    expect(regenerate).not.toHaveBeenCalled();
    expect(t.runCashFlow).not.toHaveBeenCalled();
  });

  it('3. follow-up financial question: the inherited period is used; with no resolvable period Prime asks (never guesses)', async () => {
    const inherited = turn('and withdrawals?');
    const r1 = await enforceReplyEvidence({
      reply: 'Your withdrawals were $1,700.00.', verify: inherited.verify, period: STATEMENT, remainingMs: 40_000,
      runCashFlow: inherited.runCashFlow, regenerate: async () => 'Your withdrawals for October 2026 were $1,603.92.',
    });
    expect(r1.action).toBe('regenerated');
    expect(r1.text).toContain('$1,603.92');
    const noScope = turn('and withdrawals?');
    const r2 = await enforceReplyEvidence({
      reply: 'Your withdrawals were $1,700.00.', verify: noScope.verify, period: null, remainingMs: 40_000,
      runCashFlow: noScope.runCashFlow, regenerate: async () => 'x',
    });
    expect(r2.action).toBe('asked');
    expect(r2.text).toBe(WHICH_PERIOD_TEXT);
    expect(noScope.runCashFlow).not.toHaveBeenCalled();
  });

  it('4. incorrect historical answer: an amount from an earlier reply / memory is never evidence', async () => {
    // Earlier assistant turn and a remembered fact both said "deposits $1,345.84" — neither enters the ledger.
    const t = turn('remind me what my deposits were');
    const draft = 'As I mentioned earlier, your deposits were $1,345.84.';
    const stillWrong = vi.fn(async () => 'Like before, your deposits were $1,345.84.');
    const r = await enforceReplyEvidence({ reply: draft, verify: t.verify, period: STATEMENT, remainingMs: 40_000, runCashFlow: t.runCashFlow, regenerate: stillWrong });
    expect(r.first.ok).toBe(false);
    // the regeneration repeated the historical figure → re-verification fails → limitation, never the wrong figure
    expect(r.action).toBe('unavailable');
    expect(r.text).toBe(VERIFIED_FIGURES_UNAVAILABLE_TEXT);
    expect(r.text).not.toContain('1,345.84');
  });

  it('5. financial tool unavailable: the limitation is stated, never a guess or a zero', async () => {
    const t = turn('what were my deposits last month?');
    const failing = vi.fn(async () => null); // query error / incomplete read
    const r = await enforceReplyEvidence({ reply: 'Your deposits were $1,400.00.', verify: t.verify, period: STATEMENT, remainingMs: 40_000, runCashFlow: failing, regenerate: async () => 'x' });
    expect(r.action).toBe('unavailable');
    expect(r.text).toBe(VERIFIED_FIGURES_UNAVAILABLE_TEXT);
    const noTime = await enforceReplyEvidence({ reply: 'Your deposits were $1,400.00.', verify: t.verify, period: STATEMENT, remainingMs: 8_000, runCashFlow: t.runCashFlow, regenerate: async () => 'x' });
    expect(noTime.action).toBe('unavailable'); // time budget: no lookup that could time the turn out
    expect(t.runCashFlow).not.toHaveBeenCalled();
  });
});

describe('C-1 does not block legitimate answers (owner: hypotheticals, customer figures)', () => {
  it('hypothetical calculation and customer-provided figures pass with no tool at all', async () => {
    const t = turn('If I put $250 a month aside, how much is that in a year?');
    const r = await enforceReplyEvidence({ reply: 'If you set aside $250 a month, that would be $3,000 over a year.', verify: t.verify, period: null, remainingMs: 40_000, runCashFlow: t.runCashFlow, regenerate: async () => null });
    expect(r.action).toBe('kept');
  });
  it('all-accounts position figures pass only when the reply states that scope', async () => {
    const t = turn('how am I doing overall?');
    expect((await enforceReplyEvidence({ reply: 'Across all your accounts, your spending is $11,204.10.', verify: t.verify, period: null, remainingMs: 40_000, runCashFlow: null, regenerate: async () => null })).action).toBe('kept');
    expect((await enforceReplyEvidence({ reply: 'Your spending on that statement is $11,204.10.', verify: t.verify, period: null, remainingMs: 40_000, runCashFlow: null, regenerate: async () => null })).action).toBe('asked');
  });
});

describe('C-1 / C-3 wiring in chat.ts', () => {
  const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');
  it('the verifier runs for every Prime-conversation reply, independent of classifyFinancialQuery, before P-LIVE-03 and before the save', () => {
    const c1 = chat.indexOf('const evidence = await enforceReplyEvidence({');
    const plive = chat.indexOf('guardReconciledAnswer(assistantContent');
    const save = chat.indexOf("await sb.from('chat_messages').insert({", plive);
    expect(c1).toBeGreaterThan(0);
    expect(plive).toBeGreaterThan(c1);
    expect(save).toBeGreaterThan(plive);
    const gate = chat.slice(chat.lastIndexOf('if (', c1), c1);
    expect(gate).toMatch(/isPrime && isPrimeConversationSlug\(finalEmployeeSlug\) && assistantContent/);
    expect(gate).not.toMatch(/requiresGrounding/);
  });
  it('every tool result point feeds the same ledger (pre-exec, model loop, specialist, bridge, Tag consultation)', () => {
    for (const marker of ['C-1 ledger (grounding pre-execution)', 'C-1 ledger (specialist)', "captureCashFlowForGuard('tx_search', b2cData); // C-1 ledger", 'C-1 ledger (Tag consultation)']) {
      expect(chat, marker).toContain(marker);
    }
    expect(chat).toMatch(/captureCashFlowForGuard\(tool, result\); \/\/ P-LIVE-03/);
  });
  it('only verified text is saved: evidenceCheck metadata is counts only', () => {
    expect(chat).toContain('if (evidenceCheck) assistantMsgMetadata.evidenceCheck = evidenceCheck; // C-1: counts only, never figures');
    expect(chat).toMatch(/let evidenceCheck: \{ ok: boolean; unsupportedCount: number; action: /);
  });
  it('C-3: remembered context and earlier turns carry the approved labels; personality stays last', () => {
    expect(chat).not.toMatch(/Relevant user context:/);
    expect(chat).toContain('memoryContext = `\\n\\n${REMEMBERED_CONTEXT_HEADER}\\n${memoryContext}`;');
    expect(chat).toContain("systemMessages.push({ role: 'system', content: EARLIER_CONVERSATION_LABEL });");
    const block = chat.slice(chat.indexOf('const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = ['));
    expect(block.indexOf('...(primePersonalityHint ? [primePersonalityHint] : []),')).toBeGreaterThan(block.indexOf('...systemMessages,'));
    expect(block.indexOf('...recentMessages.map(')).toBeGreaterThan(block.indexOf('...(primePersonalityHint ? [primePersonalityHint] : []),'));
  });
  it('C-3 labels are exactly the owner-confirmed wording', () => {
    expect(REMEMBERED_CONTEXT_HEADER).toBe("REMEMBERED CONTEXT (from earlier conversations — use it to stay personal and consistent; these are NOT verified financial facts: never quote an amount, total or balance from here as current; get figures from this turn's financial tools):");
    expect(EARLIER_CONVERSATION_LABEL).toBe("EARLIER IN THIS CONVERSATION (context only, not evidence): amounts in earlier replies may be out of date or wrong. Every amount you state now must come from this turn's financial tools.");
    expect(rememberedContextBlock([{ fact: 'Prefers weekly summaries' }])).toContain('- Prefers weekly summaries (remembered; date unknown)');
    expect(rememberedContextBlock([{ fact: 'Saving for a car', date: '2026-09-14T10:00:00Z' }])).toContain('(remembered, 2026-09-14)');
  });
});
