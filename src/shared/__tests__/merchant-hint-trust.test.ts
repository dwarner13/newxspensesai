/**
 * Semantic repair Stage 1 — merchant-hint trust.
 *
 * Extraction is not trust: noun-suffix hints ("these ten transactions",
 * "Costco purchases") are lexical candidates that must be grounded against real
 * merchant group keys before they become authoritative merchant scope.
 *
 * Exercises PRODUCTION code: the classifier, the P3.0A→P3.1B planner, the P3.1C
 * executor, the trust module and chat.ts wiring. No word lists anywhere.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyFinancialQuery, extractMerchantHint, extractMerchantHintWithSource } from '../financial-query-classifier';
import {
  isMerchantHintGrounded,
  resolveMerchantHintTrust,
  isUntrustedMerchantHint,
  merchantGroupKeysFromEvidence,
  withholdMerchantAggregationEvidence,
} from '../merchant-hint-trust';
import { classifyPrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan } from '../prime-evidence-resolver';
import { buildPreExecutionPlan } from '../financial-grounding';
import { executeEvidencePlan, type DedupCache } from '../prime-evidence-executor';
import { selectCandidateFromFrame } from '../tx-candidate-ownership';

const CHAT_SRC = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

/** Production P3.0A → P3.1B plan, as chat.ts composes it. */
function planFor(message: string) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, { timezone: 'America/Edmonton', referenceDate: new Date('2026-09-30T12:00:00Z') }, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, {
    memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: true,
    candidateIdentityAvailable: true, pipelineSnapshotLoaded: false,
  }, ts ?? undefined);
  return { intent, plan: buildEvidencePlan(contract, intent, undefined) };
}

/** Real executor run with a merchant_totals stand-in returning the given groups (ILIKE-like). */
async function runP31C(message: string, merchantGroups: string[]) {
  const { intent, plan } = planFor(message);
  const result = await executeEvidencePlan(plan, async (tool, args) => {
    if (tool !== 'merchant_totals') return { rows: [], queryStatus: 'verified_zero' };
    const q = String((args as { merchant?: string }).merchant ?? '').toLowerCase();
    const merchants = merchantGroups
      .filter(g => g.toLowerCase().includes(q)) // DB ILIKE %q% (substring) — trust must not rely on it
      .map(g => ({ merchant: g.toUpperCase(), groupingKey: g, total: 10, count: 1, average: 10, firstSeen: '2025-01-01', lastSeen: '2025-01-01' }));
    return { merchants, grandTotal: merchants.length * 10, transactionCount: merchants.length, dateRange: { start: '', end: '' }, queryStatus: merchants.length ? 'verified' : 'verified_zero' };
  }, new Map() as DedupCache);
  const fc = intent.financialClassification;
  const keys = merchantGroupKeysFromEvidence(result.results);
  const trusted = resolveMerchantHintTrust(fc, keys);
  const withheld = isUntrustedMerchantHint(fc, trusted) ? withholdMerchantAggregationEvidence(result, plan) : result;
  return { fc, plan, result, keys, trusted, withheld };
}

const USER_GROUPS = ['costco', 'costco wholesale', 'costco gas', 'walmart', 'tennis club', 'content co', 'freight company'];

// ─────────────────────────────────────────────────────────────────────────────
// Hint source
// ─────────────────────────────────────────────────────────────────────────────
describe('merchantHintSource', () => {
  it('preposition sources', () => {
    expect(extractMerchantHintWithSource('What did I spend at Costco?')).toEqual({ hint: 'Costco', source: 'preposition' });
    expect(extractMerchantHintWithSource('How much did I spend at Walmart?')).toEqual({ hint: 'Walmart', source: 'preposition' });
    expect(classifyFinancialQuery('Show me transactions from Costco').merchantHintSource).toBe('preposition');
  });

  it('noun-suffix sources (lexical candidates only)', () => {
    for (const [msg, hint] of [
      ['Show me Costco purchases.', 'Costco'],
      ['Show me Costco transactions.', 'Costco'],
      ["What's the total of these ten transactions?", 'ten'],
      ["What's the total of these eight transactions?", 'eight'],
      ["What's the average of these transactions?", 'these'],
      ['Which of these transactions was the biggest?', 'these'],
      ['Show me those transactions.', 'those'],
      ['Show me eight transactions.', 'eight'],
    ] as const) {
      const fc = classifyFinancialQuery(msg);
      expect(fc.merchantHint).toBe(hint);
      expect(fc.merchantHintSource).toBe('noun_suffix');
    }
  });

  it('extractMerchantHint behavior is unchanged (string result)', () => {
    expect(extractMerchantHint('What did I spend at Costco?')).toBe('Costco');
    expect(extractMerchantHint('these ten transactions')).toBe('ten');
    expect(extractMerchantHint('hello there')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K–M. Whole-token grounding
// ─────────────────────────────────────────────────────────────────────────────
describe('isMerchantHintGrounded (whole-token, never substring)', () => {
  it('K. "ten" does not ground against Tennis Club or Content Co', () => {
    expect(isMerchantHintGrounded('ten', ['tennis club', 'content co'])).toBe(false);
  });
  it('L. "eight" does not ground against Freight Company', () => {
    expect(isMerchantHintGrounded('eight', ['freight company'])).toBe(false);
  });
  it('M. "costco" grounds against Costco and Costco Wholesale', () => {
    expect(isMerchantHintGrounded('costco', ['costco'])).toBe(true);
    expect(isMerchantHintGrounded('Costco', ['costco wholesale'])).toBe(true);
    expect(isMerchantHintGrounded('Costco Wholesale', ['costco wholesale w1270'])).toBe(true);
  });
  it('no groups / empty hint never ground', () => {
    expect(isMerchantHintGrounded('costco', [])).toBe(false);
    expect(isMerchantHintGrounded('costco', null)).toBe(false);
    expect(isMerchantHintGrounded('', ['costco'])).toBe(false);
  });
  it('does not mutate its inputs', () => {
    const keys = ['costco wholesale'];
    isMerchantHintGrounded('costco', keys);
    expect(keys).toEqual(['costco wholesale']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A–F. Fake hints are never trusted; G–J. real merchants still work
// ─────────────────────────────────────────────────────────────────────────────
describe('trust through the real P3.1B plan + P3.1C executor', () => {
  for (const [label, msg] of [
    ['A', "What's the total of these ten transactions?"],
    ['B', "What's the total of these eight transactions?"],
    ['C', "What's the average of these transactions?"],
    ['D', 'Which of these transactions was the biggest?'],
    ['E', 'Show me those transactions.'],
    ['F', 'Show me eight transactions.'],
  ] as const) {
    it(`${label}. "${msg}" → untrusted; merchant evidence withheld`, async () => {
      const r = await runP31C(msg, USER_GROUPS);
      expect(r.fc?.merchantHintSource).toBe('noun_suffix');
      expect(r.trusted).toBe(false);
      expect(isUntrustedMerchantHint(r.fc, r.trusted)).toBe(true);
      // merchant_totals did run (lexical substring may even match), but nothing is presented
      expect(r.result.results.some(x => x.tool === 'merchant_totals')).toBe(true);
      expect(r.withheld?.results.some(x => x.tool === 'merchant_totals') ?? false).toBe(false);
    });
  }

  it('the ILIKE substring match for "ten"/"eight" returns Tennis/Content/Freight groups — still untrusted', async () => {
    const ten = await runP31C("What's the total of these ten transactions?", USER_GROUPS);
    expect(ten.keys).toEqual(['tennis club', 'content co']);
    expect(ten.trusted).toBe(false);
    const eight = await runP31C('Show me eight transactions.', USER_GROUPS);
    expect(eight.keys).toEqual(['freight company']);
    expect(eight.trusted).toBe(false);
  });

  it('G. "What did I spend at Costco?" → preposition, trusted, evidence kept', async () => {
    const r = await runP31C('What did I spend at Costco?', USER_GROUPS);
    expect(r.trusted).toBe(true);
    expect(r.withheld).toBe(r.result);
  });

  it('H. "How much did I spend at Walmart?" → preposition, trusted', async () => {
    const r = await runP31C('How much did I spend at Walmart?', USER_GROUPS);
    expect(r.trusted).toBe(true);
  });

  it('preposition hints stay trusted even with zero groups (verified-zero answers preserved)', async () => {
    const r = await runP31C('What did I spend at Costco?', []);
    expect(r.keys).toEqual([]);
    expect(r.trusted).toBe(true);
  });

  for (const [label, msg] of [['I', 'Show me Costco purchases.'], ['J', 'Show me Costco transactions.']] as const) {
    it(`${label}. "${msg}" → noun-suffix grounded against real Costco groups → trusted, evidence kept`, async () => {
      const r = await runP31C(msg, USER_GROUPS);
      expect(r.fc?.merchantHintSource).toBe('noun_suffix');
      expect(r.keys).toEqual(['costco', 'costco wholesale', 'costco gas']);
      expect(r.trusted).toBe(true);
      expect(r.withheld).toBe(r.result);
    });
  }

  it('noun-suffix hint with no grounding data at all (P3.1C did not run) → untrusted', () => {
    expect(resolveMerchantHintTrust(classifyFinancialQuery('Show me Costco purchases.'), null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N. No frame: no merchant pre-exec for fake hints
// ─────────────────────────────────────────────────────────────────────────────
describe('N. grounding pre-exec never runs for an untrusted merchant hint', () => {
  it('"these ten transactions" would plan tx_search q:"ten" — the trust gate blocks it', () => {
    const fc = classifyFinancialQuery("What's the total of these ten transactions?");
    const pre = buildPreExecutionPlan(fc);
    expect(pre.toolName).toBe('tx_search');
    expect((pre.toolArgs as { q?: string }).q).toBe('ten');
    expect(isUntrustedMerchantHint(fc, resolveMerchantHintTrust(fc, ['tennis club', 'content co']))).toBe(true);
    expect(isUntrustedMerchantHint(fc, resolveMerchantHintTrust(fc, null))).toBe(true);
  });

  it('a trusted preposition merchant still pre-executes', () => {
    const fc = classifyFinancialQuery('What did I spend at Costco?');
    expect(isUntrustedMerchantHint(fc, resolveMerchantHintTrust(fc, null))).toBe(false);
  });

  it('chat.ts gates both the pre-exec and the false-zero retry with the same rule', () => {
    expect(CHAT_SRC).toContain('const untrustedMerchantPreExec = isUntrustedMerchantHint(financialClassification, resolveMerchantHintTrust(financialClassification, merchantGroundingKeys));');
    expect(CHAT_SRC).toContain('!merchantAggGate && !untrustedMerchantPreExec) {');
    expect(CHAT_SRC).toContain('const untrustedMerchantRetry = isUntrustedMerchantHint(financialClassification, resolveMerchantHintTrust(financialClassification, merchantGroundingKeys));');
    expect(CHAT_SRC).toContain('toolModules[plan.toolName] && !untrustedMerchantRetry) {');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E/O. Merchant context + P3.3A + evidence wiring
// ─────────────────────────────────────────────────────────────────────────────
describe('chat.ts trust wiring', () => {
  it('one derived trust state, recomputed from real P3.1C group keys', () => {
    expect(CHAT_SRC).toContain('let merchantHintTrusted = resolveMerchantHintTrust(shadowIntentResult?.financialClassification, null);');
    expect(CHAT_SRC).toContain('merchantGroundingKeys = merchantGroupKeysFromEvidence(p31cResult.results);');
    expect(CHAT_SRC).toContain('merchantHintTrusted = resolveMerchantHintTrust(shadowIntentResult?.financialClassification, merchantGroundingKeys);');
  });

  it('E/O. an untrusted hint cannot create or overwrite MerchantAnalysisContext', () => {
    expect(CHAT_SRC).toContain('if (merchantHint && merchantHintTrusted) {');
  });

  it('fake hints cannot satisfy P3.3A', () => {
    expect(CHAT_SRC).toMatch(/const merchantAggSatisfied = !!\(\s*isPrime\s*&& merchantHintTrusted\s*&& p31cResult\?\.overallSufficiency === 'sufficient'/);
  });

  it('untrusted merchant evidence is withheld before P3.1D accumulation, P3.3A and prompt injection', () => {
    const withholdIdx = CHAT_SRC.indexOf('p31cResult = withholdMerchantAggregationEvidence(p31cResult, evidencePlanForExecution);');
    expect(withholdIdx).toBeGreaterThan(0);
    expect(withholdIdx).toBeLessThan(CHAT_SRC.indexOf('const p31dAccumulatedEvidence: AccumulatedEvidenceMap = new Map();'));
    expect(withholdIdx).toBeLessThan(CHAT_SRC.indexOf('const merchantAggSatisfied = !!('));
    expect(withholdIdx).toBeLessThan(CHAT_SRC.indexOf('const evidenceCtxMsg = buildEvidenceContextMessage(p31cResult);'));
  });

  it('withholding leaves no evidence block when only skipped context steps remain', async () => {
    const r = await runP31C("What's the total of these ten transactions?", USER_GROUPS);
    expect(r.result.results.some(x => x.tool === 'merchant_totals')).toBe(true);
    expect(r.withheld).toBeNull(); // no "verified empty for ten" and no evidence-authority directive
  });

  it('withholding keeps other executed evidence and recomputes counts/sufficiency', () => {
    const base = {
      intent: 'financial_data_lookup', overallSufficiency: 'sufficient', executedCount: 2, skippedCount: 0,
      failedCount: 0, resolvedCount: 2, successfulEmptyCount: 0, totalDurationMs: 1, dedupHitCount: 0,
      results: [
        { evidenceKind: 'merchant_aggregation', status: 'resolved', authoritative: true, source: 's', tool: 'merchant_totals', data: { merchants: [] } },
        { evidenceKind: 'transaction_data', status: 'resolved', authoritative: true, source: 's', tool: 'tx_search', data: { rows: [] } },
      ],
    } as unknown as Parameters<typeof withholdMerchantAggregationEvidence>[0];
    const out = withholdMerchantAggregationEvidence(base, null);
    expect(out?.results.map(x => x.tool)).toEqual(['tx_search']);
    expect(out?.resolvedCount).toBe(1);
    expect(out?.executedCount).toBe(1);
  });

  it('documented limit: a REAL merchant whose name contains the word is grounded (data, not word lists)', async () => {
    // If the user genuinely has "These Days Cafe Bar", "these transactions" is lexically
    // ambiguous; Stage 1 grounds against real data and does not guess. Stage 2 (frame
    // reference semantics) is where an existing candidate frame should win.
    const r = await runP31C("What's the average of these transactions?", [...USER_GROUPS, 'these days cafe bar']);
    expect(r.trusted).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P. Mutation identity unchanged
// ─────────────────────────────────────────────────────────────────────────────
describe('P. mutation identity is unaffected', () => {
  it('fuzzy set language carries no identity; ordinals still require the verified frame', () => {
    const fc = classifyFinancialQuery('Change one of these eight to Groceries');
    expect(fc.merchantHint).toBeUndefined();
    const frame = { candidates: [{ id: '00000001-0000-4000-8000-000000000001', merchant: 'COSTCO', amount: 1, date: null, category: null }], selectedId: null, selectedIndex: null, updatedAt: 1 };
    expect(selectCandidateFromFrame(frame, 'one of these eight').ok).toBe(false);
    expect(selectCandidateFromFrame(frame, 3).ok).toBe(false);
    expect(selectCandidateFromFrame(frame, 1).ok).toBe(true);
  });

  it('trust wiring never touches select_transaction or the ownership gate', () => {
    for (const marker of ['merchantHintTrusted', 'untrustedMerchantPreExec', 'untrustedMerchantRetry']) {
      const lines = CHAT_SRC.split('\n').filter(l => l.includes(marker));
      for (const l of lines) {
        expect(l).not.toMatch(/select_transaction|handleSelectTransaction|ownershipGate|promoteLayer2SelectedTx/);
      }
    }
  });
});
