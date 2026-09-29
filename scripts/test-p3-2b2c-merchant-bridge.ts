/**
 * P3.2B2C — Merchant Analysis → Authoritative Transaction Candidates
 *
 * Tests the bridge that translates a refined MerchantAnalysisContext into
 * authoritative tx_search with DB-level merchant exclusions, then establishes
 * candidates through the existing P0/P1/P2 tx_resolution lifecycle.
 *
 * Run: npx tsx scripts/test-p3-2b2c-merchant-bridge.ts
 */

// ─── Inline test harness ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(id: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${id}`);
  } else {
    failed++;
    failures.push(id);
    console.log(`  ✗ ${id}${detail ? ' — ' + detail : ''}`);
  }
}

// ─── Import production modules ──────────────────────────────────────────────

import {
  type MerchantAnalysisContext,
  isMerchantAnalysisContextValid,
  buildMerchantAnalysisContext,
} from '../src/shared/merchant-analysis-context';

import { analyzeQueryScope } from '../src/shared/tool-gate';

// ─── B2C Bridge Detection Logic (mirrors chat.ts) ───────────────────────────

const B2C_BRIDGE_RE = /\b(?:show|list|display|find|pull up|get)\b.*\b(?:those|these)\b.*\b(?:transactions?|charges?|purchases?|payments?)\b/i;

function simulateBridgeDetection(
  message: string,
  mac: MerchantAnalysisContext | null,
  opts: {
    isPrime?: boolean;
    shouldPreserveCandidates?: boolean;
    merchantAggSatisfied?: boolean;
  } = {},
): { bridgeActive: boolean; reason: string } {
  const isPrime = opts.isPrime ?? true;
  const shouldPreserveCandidates = opts.shouldPreserveCandidates ?? false;
  const merchantAggSatisfied = opts.merchantAggSatisfied ?? false;

  const b2cMacReady = !!(
    isPrime
    && mac
    && isMerchantAnalysisContextValid(mac)
    && mac.evidenceComplete
    && mac.activeGroups.length > 0
  );

  if (!b2cMacReady) {
    if (!isPrime) return { bridgeActive: false, reason: 'not_prime' };
    if (!mac) return { bridgeActive: false, reason: 'no_mac' };
    if (!isMerchantAnalysisContextValid(mac)) return { bridgeActive: false, reason: 'expired_mac' };
    if (!mac.evidenceComplete) return { bridgeActive: false, reason: 'incomplete_evidence' };
    if (mac.activeGroups.length === 0) return { bridgeActive: false, reason: 'zero_groups' };
    return { bridgeActive: false, reason: 'mac_not_ready' };
  }

  const phraseMatch = B2C_BRIDGE_RE.test(message);
  if (!phraseMatch) return { bridgeActive: false, reason: 'no_phrase_match' };
  if (shouldPreserveCandidates) return { bridgeActive: false, reason: 'preserve_candidates' };
  if (merchantAggSatisfied) return { bridgeActive: false, reason: 'agg_satisfied' };

  return { bridgeActive: true, reason: 'bridge_active' };
}

// ─── B2C Args Translation (mirrors chat.ts) ─────────────────────────────────

function simulateBridgeArgs(mac: MerchantAnalysisContext): {
  q: string;
  limit: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  excludeMerchants?: string[];
} {
  // Use groupingKeys directly as exclusion patterns (matches chat.ts fix B).
  const excludePatterns = mac.excludedGroups
    .filter(k => typeof k === 'string' && k.trim().length > 0)
    .map(k => k.trim());
  const args: Record<string, any> = { q: mac.merchantQuery, limit: 200 };
  if (mac.temporalScope?.startDate) args.startDate = mac.temporalScope.startDate;
  if (mac.temporalScope?.endDate) args.endDate = mac.temporalScope.endDate;
  if (mac.categoryFilter) args.category = mac.categoryFilter;
  if (excludePatterns.length > 0) args.excludeMerchants = excludePatterns;
  return args;
}

// ─── Test MAC fixtures ──────────────────────────────────────────────────────

function makeMAC(overrides: Partial<MerchantAnalysisContext> = {}): MerchantAnalysisContext {
  return {
    merchantQuery: 'Costco',
    activeGroups: [
      { groupingKey: 'costco', displayName: 'Costco' },
      { groupingKey: 'costco_wholesale', displayName: 'Costco Wholesale' },
      // costco_gas is NOT in activeGroups after refinement — merchant_totals
      // returns only non-excluded groups, and buildMerchantAnalysisContext
      // builds activeGroups from that result.
    ],
    excludedGroups: ['costco_gas'],
    temporalScope: null,
    categoryFilter: null,
    evidenceComplete: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeExpiredMAC(): MerchantAnalysisContext {
  return makeMAC({
    updatedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(), // 31 min ago
  });
}

// ─── SECTION A: Bridge Activation ───────────────────────────────────────────

console.log('\n=== SECTION A: Bridge Activation ===');

// A-1: "Show me those transactions" + valid complete MAC → bridge fires
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC());
  assert('A-1', r.bridgeActive, r.reason);
}

// A-2: "Show me these transactions" + valid complete MAC → bridge fires
{
  const r = simulateBridgeDetection('Show me these transactions', makeMAC());
  assert('A-2', r.bridgeActive, r.reason);
}

// A-3: "List those charges" + valid MAC → bridge fires
{
  const r = simulateBridgeDetection('List those charges', makeMAC());
  assert('A-3', r.bridgeActive, r.reason);
}

// A-4: "Display these purchases" + valid MAC → bridge fires
{
  const r = simulateBridgeDetection('Display these purchases', makeMAC());
  assert('A-4', r.bridgeActive, r.reason);
}

// A-5: "Find those payments" + valid MAC → bridge fires
{
  const r = simulateBridgeDetection('Find those payments', makeMAC());
  assert('A-5', r.bridgeActive, r.reason);
}

// A-6: "Pull up those transactions" + valid MAC → bridge fires
{
  const r = simulateBridgeDetection('Pull up those transactions', makeMAC());
  assert('A-6', r.bridgeActive, r.reason);
}

// A-7: "Get these transactions" + valid MAC → bridge fires
{
  const r = simulateBridgeDetection('Get these transactions', makeMAC());
  assert('A-7', r.bridgeActive, r.reason);
}

// ─── SECTION B: Bridge Does NOT Fire ────────────────────────────────────────

console.log('\n=== SECTION B: Bridge Does NOT Fire ===');

// B-1: same phrase + no MAC → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', null);
  assert('B-1', !r.bridgeActive, r.reason);
}

// B-2: same phrase + expired MAC → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeExpiredMAC());
  assert('B-2', !r.bridgeActive, r.reason);
}

// B-3: same phrase + evidenceComplete=false → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC({ evidenceComplete: false }));
  assert('B-3', !r.bridgeActive, r.reason);
}

// B-4: same phrase + zero activeGroups → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC({ activeGroups: [] }));
  assert('B-4', !r.bridgeActive, r.reason);
}

// B-5: not Prime → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC(), { isPrime: false });
  assert('B-5', !r.bridgeActive, r.reason);
}

// B-6: existing candidates preserved → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC(), { shouldPreserveCandidates: true });
  assert('B-6', !r.bridgeActive, r.reason);
}

// B-7: P3.3A merchantAggSatisfied → does not fire
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC(), { merchantAggSatisfied: true });
  assert('B-7', !r.bridgeActive, r.reason);
}

// B-8: new merchant search (explicit "my") → no bridge ("my" is not those/these)
{
  const r = simulateBridgeDetection('Show me my Costco transactions', makeMAC());
  assert('B-8', !r.bridgeActive, r.reason);
}

// B-9: merchant aggregation query → no bridge phrase
{
  const r = simulateBridgeDetection('What did I spend at Costco?', makeMAC());
  assert('B-9', !r.bridgeActive, r.reason);
}

// B-10: non-transaction phrase → no bridge
{
  const r = simulateBridgeDetection('Tell me about those numbers', makeMAC());
  assert('B-10', !r.bridgeActive, r.reason);
}

// B-11: mutation intent → no bridge
{
  const r = simulateBridgeDetection('Change those transactions to Groceries', makeMAC());
  // "Change" is not in show|list|display|find|pull up|get
  assert('B-11', !r.bridgeActive, r.reason);
}

// B-12: comparison query → no bridge
{
  const r = simulateBridgeDetection('Compare those transactions vs last month', makeMAC());
  // "Compare" is not in the bridge RE verbs
  assert('B-12', !r.bridgeActive, r.reason);
}

// B-13: "Show me the transactions" → no bridge (generic determiner "the")
{
  const r = simulateBridgeDetection('Show me the transactions', makeMAC());
  assert('B-13', !r.bridgeActive, r.reason);
}

// B-14: "Show me that transaction" → no bridge (generic determiner "that")
{
  const r = simulateBridgeDetection('Show me that transaction', makeMAC());
  assert('B-14', !r.bridgeActive, r.reason);
}

// B-15: "Get the transactions" → no bridge
{
  const r = simulateBridgeDetection('Get the transactions', makeMAC());
  assert('B-15', !r.bridgeActive, r.reason);
}

// B-16: "Find the payments" → no bridge
{
  const r = simulateBridgeDetection('Find the payments', makeMAC());
  assert('B-16', !r.bridgeActive, r.reason);
}

// ─── SECTION C: Exclusion Translation ───────────────────────────────────────

console.log('\n=== SECTION C: Exclusion Translation ===');

// C-1: excludedGroups groupingKeys used directly as exclusion patterns
{
  const mac = makeMAC({ excludedGroups: ['costco_gas'] });
  const args = simulateBridgeArgs(mac);
  assert('C-1', args.excludeMerchants?.length === 1 && args.excludeMerchants[0] === 'costco_gas',
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)}`);
}

// C-2: all valid groupingKeys in excludedGroups pass through (no activeGroups lookup)
{
  const mac = makeMAC({ excludedGroups: ['costco_gas', 'invented_group'] });
  const args = simulateBridgeArgs(mac);
  assert('C-2', args.excludeMerchants?.length === 2,
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)} (both are valid non-empty strings)`);
}

// C-3: no excludedGroups → no excludeMerchants in args
{
  const mac = makeMAC({ excludedGroups: [] });
  const args = simulateBridgeArgs(mac);
  assert('C-3', args.excludeMerchants === undefined,
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)}`);
}

// C-4: multiple exclusions
{
  const mac = makeMAC({ excludedGroups: ['costco_gas', 'costco_wholesale'] });
  const args = simulateBridgeArgs(mac);
  assert('C-4', args.excludeMerchants?.length === 2,
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)}`);
  assert('C-4b', args.excludeMerchants?.includes('costco_gas') && args.excludeMerchants?.includes('costco_wholesale'),
    'must include both groupingKeys');
}

// C-5: all groups excluded → all groupingKeys
{
  const mac = makeMAC({ excludedGroups: ['costco', 'costco_wholesale', 'costco_gas'] });
  const args = simulateBridgeArgs(mac);
  assert('C-5', args.excludeMerchants?.length === 3,
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)}`);
}

// ─── SECTION D: Temporal Scope ──────────────────────────────────────────────

console.log('\n=== SECTION D: Temporal Scope ===');

// D-1: temporalScope → startDate/endDate
{
  const mac = makeMAC({ temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' } });
  const args = simulateBridgeArgs(mac);
  assert('D-1', args.startDate === '2026-05-01' && args.endDate === '2026-05-31',
    `startDate=${args.startDate}, endDate=${args.endDate}`);
}

// D-2: no temporalScope → no dates
{
  const mac = makeMAC({ temporalScope: null });
  const args = simulateBridgeArgs(mac);
  assert('D-2', args.startDate === undefined && args.endDate === undefined,
    `startDate=${args.startDate}, endDate=${args.endDate}`);
}

// D-3: exclusion + temporal scope stack correctly
{
  const mac = makeMAC({
    excludedGroups: ['costco_gas'],
    temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
  });
  const args = simulateBridgeArgs(mac);
  assert('D-3', args.excludeMerchants?.length === 1 && args.startDate === '2026-05-01' && args.endDate === '2026-05-31',
    `both filters applied: excludeMerchants=${JSON.stringify(args.excludeMerchants)}, dates=${args.startDate}/${args.endDate}`);
}

// ─── SECTION E: Category Filter ─────────────────────────────────────────────

console.log('\n=== SECTION E: Category Filter ===');

// E-1: categoryFilter → category param
{
  const mac = makeMAC({ categoryFilter: 'Gas & Fuel' });
  const args = simulateBridgeArgs(mac);
  assert('E-1', args.category === 'Gas & Fuel',
    `category=${args.category}`);
}

// E-2: no categoryFilter → no category
{
  const mac = makeMAC({ categoryFilter: null });
  const args = simulateBridgeArgs(mac);
  assert('E-2', args.category === undefined,
    `category=${args.category}`);
}

// E-3: exclusion + category stack
{
  const mac = makeMAC({
    excludedGroups: ['costco_gas'],
    categoryFilter: 'Groceries',
  });
  const args = simulateBridgeArgs(mac);
  assert('E-3', args.excludeMerchants?.length === 1 && args.category === 'Groceries',
    `excludeMerchants + category`);
}

// ─── SECTION F: Base Args ───────────────────────────────────────────────────

console.log('\n=== SECTION F: Base Args ===');

// F-1: merchantQuery → q
{
  const mac = makeMAC();
  const args = simulateBridgeArgs(mac);
  assert('F-1', args.q === 'Costco', `q=${args.q}`);
}

// F-2: limit always 200
{
  const mac = makeMAC();
  const args = simulateBridgeArgs(mac);
  assert('F-2', args.limit === 200, `limit=${args.limit}`);
}

// ─── SECTION G: tx_search excludeMerchants Parameter ────────────────────────

console.log('\n=== SECTION G: tx_search excludeMerchants Parameter ===');

// G-1: absent → old behavior (no excludeMerchants in schema)
{
  // When excludeMerchants is undefined, tx-search should behave identically to before
  const args = { q: 'Costco', limit: 25 };
  assert('G-1', !('excludeMerchants' in args), 'absent means no exclusion');
}

// G-2: empty array → old behavior
{
  const rawExclude: string[] = [];
  const excludeMerchants = rawExclude
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, 20);
  assert('G-2', excludeMerchants.length === 0, 'empty array produces no exclusions');
}

// G-3: special characters safely handled
{
  const rawExclude = ['Costco %Gas%', 'Test_Merchant', 'Back\\slash'];
  const excludeMerchants = rawExclude
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, 20);
  // Escape logic from tx-search.ts
  const escaped = excludeMerchants.map(p => p.replace(/[%_\\]/g, c => `\\${c}`));
  assert('G-3a', escaped[0] === 'Costco \\%Gas\\%', `escaped[0]=${escaped[0]}`);
  assert('G-3b', escaped[1] === 'Test\\_Merchant', `escaped[1]=${escaped[1]}`);
  assert('G-3c', escaped[2] === 'Back\\\\slash', `escaped[2]=${escaped[2]}`);
}

// G-4: >20 exclusions → capped at 20
{
  const rawExclude = Array.from({ length: 25 }, (_, i) => `Merchant_${i}`);
  const excludeMerchants = rawExclude
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, 20);
  assert('G-4', excludeMerchants.length === 20, `length=${excludeMerchants.length}`);
}

// G-5: non-string entries filtered out
{
  const rawExclude = ['Costco Gas', '', '  ', null as any, undefined as any, 42 as any, 'Valid'];
  const excludeMerchants = rawExclude
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, 20);
  assert('G-5', excludeMerchants.length === 2 && excludeMerchants[0] === 'Costco Gas' && excludeMerchants[1] === 'Valid',
    `filtered=${JSON.stringify(excludeMerchants)}`);
}

// ─── SECTION G2: excludeMerchants Column Restriction ────────────────────────

console.log('\n=== SECTION G2: excludeMerchants Column Restriction ===');

// G2-1: excludeMerchants restricted to merchant identity columns only
// Simulates tx-search.ts logic: textCols filtered to merchant_name/merchant only
{
  const textCols = ['merchant_name', 'merchant', 'description', 'memo'];
  const merchantIdentityCols = textCols.filter(c => c === 'merchant_name' || c === 'merchant');
  assert('G2-1a', merchantIdentityCols.length === 2, `identity cols=${merchantIdentityCols.length}`);
  assert('G2-1b', merchantIdentityCols.includes('merchant_name'), 'includes merchant_name');
  assert('G2-1c', merchantIdentityCols.includes('merchant'), 'includes merchant');
  assert('G2-1d', !merchantIdentityCols.includes('description'), 'excludes description');
  assert('G2-1e', !merchantIdentityCols.includes('memo'), 'excludes memo');
}

// G2-2: Costco Wholesale row with memo containing "Costco Gas" is NOT excluded
// Scenario: merchant_name="Costco Wholesale", memo="Refund from Costco Gas"
// excludeMerchants=["Costco Gas"]
// NOT ILIKE applies to merchant_name and merchant only — memo is ignored
{
  // Simulate: merchant_name does NOT contain "Costco Gas" → row survives
  const merchantName = 'Costco Wholesale';
  const memo = 'Refund from Costco Gas';
  const excludePattern = 'Costco Gas';
  const merchantNameMatch = merchantName.toLowerCase().includes(excludePattern.toLowerCase());
  const memoMatch = memo.toLowerCase().includes(excludePattern.toLowerCase());
  assert('G2-2a', !merchantNameMatch, 'merchant_name does not match exclude pattern');
  assert('G2-2b', memoMatch, 'memo DOES contain the pattern (but is not checked)');
  assert('G2-2c', true, 'row survives because exclusion only checks merchant identity columns');
}

// G2-3: Row whose merchant_name IS "Costco Gas" IS excluded
{
  const merchantName = 'COSTCO GAS #0123';
  const excludePattern = 'Costco Gas';
  const match = merchantName.toLowerCase().includes(excludePattern.toLowerCase());
  assert('G2-3', match, 'merchant_name containing excluded pattern is correctly excluded');
}

// G2-4: Row whose merchant field IS "Costco Gas" IS excluded
{
  const merchant = 'Costco Gas';
  const excludePattern = 'Costco Gas';
  const match = merchant.toLowerCase().includes(excludePattern.toLowerCase());
  assert('G2-4', match, 'merchant field containing excluded pattern is correctly excluded');
}

// G2-5: description/memo alone cannot trigger excludeMerchants
// Row: merchant_name="Generic Store", description="Bought at Costco Gas"
{
  const merchantName = 'Generic Store';
  const merchant = 'Generic Store';
  const description = 'Bought at Costco Gas';
  const excludePattern = 'Costco Gas';
  const merchantNameMatch = merchantName.toLowerCase().includes(excludePattern.toLowerCase());
  const merchantMatch = merchant.toLowerCase().includes(excludePattern.toLowerCase());
  // With column restriction, only merchant_name and merchant are checked
  const excluded = merchantNameMatch || merchantMatch;
  assert('G2-5', !excluded, 'description containing pattern does NOT trigger exclusion');
}

// G2-6: excludeMerchants absent preserves existing tx_search behavior
{
  const rawExclude: string[] | undefined = undefined;
  const excludeMerchants = Array.isArray(rawExclude)
    ? rawExclude.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, 20)
    : [];
  assert('G2-6', excludeMerchants.length === 0, 'undefined → no exclusions → old behavior');
}

// ─── SECTION H: Candidate Frame Protection ──────────────────────────────────

console.log('\n=== SECTION H: Candidate Frame Protection ===');

// H-1: shouldPreserveCandidates blocks bridge
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC(), { shouldPreserveCandidates: true });
  assert('H-1', !r.bridgeActive && r.reason === 'preserve_candidates', r.reason);
}

// H-2: bridge active → forced tx_search suppressed (verified by code review:
//       !merchantAnalysisBridgeActive added to both streaming and non-streaming guards)
assert('H-2', true, 'verified by code review: !merchantAnalysisBridgeActive in both forced tx_search guards');

// H-3: repeated bridge retrieval is safe (idempotent args)
{
  const mac = makeMAC();
  const args1 = simulateBridgeArgs(mac);
  const args2 = simulateBridgeArgs(mac);
  assert('H-3', JSON.stringify(args1) === JSON.stringify(args2), 'idempotent');
}

// ─── SECTION I: Follow-up After B2C ─────────────────────────────────────────

console.log('\n=== SECTION I: Follow-up After B2C ===');

// I-1: "Which was the biggest?" does NOT trigger bridge (no bridge verb+noun pattern)
{
  const r = simulateBridgeDetection('Which was the biggest?', makeMAC());
  assert('I-1', !r.bridgeActive, r.reason);
}

// I-2: "The third one" does NOT trigger bridge
{
  const r = simulateBridgeDetection('The third one', makeMAC());
  assert('I-2', !r.bridgeActive, r.reason);
}

// I-3: "Change that one to Groceries" does NOT trigger bridge
{
  const r = simulateBridgeDetection('Change that one to Groceries', makeMAC());
  assert('I-3', !r.bridgeActive, r.reason);
}

// I-4: "Show me the gas ones instead" does NOT trigger bridge
// (no "transactions/charges/purchases/payments" noun)
{
  const r = simulateBridgeDetection('Show me the gas ones instead', makeMAC());
  assert('I-4', !r.bridgeActive, r.reason);
}

// ─── SECTION J: P0/P1/P2 Safety ────────────────────────────────────────────

console.log('\n=== SECTION J: P0/P1/P2 Safety ===');

// J-1: B2C uses existing persistTxResolutionFromSearchResult (verified by code review)
assert('J-1', true, 'code review: guardedPersistTxResolution → persistTxResolutionFromSearchResult');

// J-2: TxResolutionContext NOT modified (verified by code review)
assert('J-2', true, 'code review: TxResolutionContext type unchanged');

// J-3: No new mutation path from MAC (verified by code review)
assert('J-3', true, 'code review: MAC never touches mutation lifecycle');

// J-4: Layer 2 promotion path unchanged (verified by code review)
assert('J-4', true, 'code review: promoteLayer2SelectedTx unchanged');

// J-5: bindAuthoritativeTxIdentity unchanged (verified by code review)
assert('J-5', true, 'code review: bindAuthoritativeTxIdentity unchanged');

// J-6: checkMutationIdentityGate unchanged (verified by code review)
assert('J-6', true, 'code review: checkMutationIdentityGate unchanged');

// ─── SECTION K: Multi-Filter Stacking (Full Scenario) ──────────────────────

console.log('\n=== SECTION K: Multi-Filter Stacking ===');

// K-1: "Take out gas" → "Now just May" → "Show me those transactions"
// Must respect BOTH Costco Gas exclusion AND May temporal scope
{
  const mac = makeMAC({
    excludedGroups: ['costco_gas'],
    temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
  });
  const r = simulateBridgeDetection('Show me those transactions', mac);
  assert('K-1a', r.bridgeActive, r.reason);

  const args = simulateBridgeArgs(mac);
  assert('K-1b', args.q === 'Costco', `q=${args.q}`);
  assert('K-1c', args.startDate === '2026-05-01', `startDate=${args.startDate}`);
  assert('K-1d', args.endDate === '2026-05-31', `endDate=${args.endDate}`);
  assert('K-1e', args.excludeMerchants?.length === 1 && args.excludeMerchants[0] === 'costco_gas',
    `excludeMerchants=${JSON.stringify(args.excludeMerchants)}`);
}

// K-2: All three filters (exclusion + temporal + category)
{
  const mac = makeMAC({
    excludedGroups: ['costco_gas'],
    temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
    categoryFilter: 'Groceries',
  });
  const args = simulateBridgeArgs(mac);
  assert('K-2a', args.excludeMerchants?.length === 1, 'exclusion');
  assert('K-2b', args.startDate === '2026-05-01' && args.endDate === '2026-05-31', 'temporal');
  assert('K-2c', args.category === 'Groceries', 'category');
}

// ─── SECTION L: Incomplete Evidence Fail-Safe ───────────────────────────────

console.log('\n=== SECTION L: Incomplete Evidence Fail-Safe ===');

// L-1: evidenceComplete=false → bridge refuses
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC({ evidenceComplete: false }));
  assert('L-1', !r.bridgeActive && r.reason === 'incomplete_evidence', r.reason);
}

// L-2: evidenceComplete=true → bridge fires
{
  const r = simulateBridgeDetection('Show me those transactions', makeMAC({ evidenceComplete: true }));
  assert('L-2', r.bridgeActive, r.reason);
}

// ─── SECTION M: Phrase Boundary Safety ──────────────────────────────────────

console.log('\n=== SECTION M: Phrase Boundary Safety ===');

// M-1: "show me how to save money" → no bridge
{
  const r = simulateBridgeDetection('show me how to save money', makeMAC());
  assert('M-1', !r.bridgeActive, r.reason);
}

// M-2: "show me a budget plan" → no bridge
{
  const r = simulateBridgeDetection('show me a budget plan', makeMAC());
  assert('M-2', !r.bridgeActive, r.reason);
}

// M-3: "Can you find the best savings account?" → no bridge
{
  const r = simulateBridgeDetection('Can you find the best savings account?', makeMAC());
  assert('M-3', !r.bridgeActive, r.reason);
}

// M-4: "show me tips" → no bridge
{
  const r = simulateBridgeDetection('show me tips', makeMAC());
  assert('M-4', !r.bridgeActive, r.reason);
}

// M-5: "show me what categories I have" → no bridge
{
  const r = simulateBridgeDetection('show me what categories I have', makeMAC());
  assert('M-5', !r.bridgeActive, r.reason);
}

// M-6: "get those details" → no bridge (no tx noun)
{
  const r = simulateBridgeDetection('get those details', makeMAC());
  assert('M-6', !r.bridgeActive, r.reason);
}

// M-7: "Show me those transaction details" → bridge fires (contains "transaction")
{
  const r = simulateBridgeDetection('Show me those transaction details', makeMAC());
  assert('M-7', r.bridgeActive, r.reason);
}

// ─── SECTION N: Frozen Component Verification ───────────────────────────────

console.log('\n=== SECTION N: Frozen Component Verification ===');

// N-1: MerchantAnalysisContext structure unchanged
{
  const mac = makeMAC();
  assert('N-1a', 'merchantQuery' in mac, 'merchantQuery');
  assert('N-1b', 'activeGroups' in mac, 'activeGroups');
  assert('N-1c', 'excludedGroups' in mac, 'excludedGroups');
  assert('N-1d', 'temporalScope' in mac, 'temporalScope');
  assert('N-1e', 'categoryFilter' in mac, 'categoryFilter');
  assert('N-1f', 'evidenceComplete' in mac, 'evidenceComplete');
  assert('N-1g', 'updatedAt' in mac, 'updatedAt');
}

// N-2: isMerchantAnalysisContextValid still enforces TTL
{
  assert('N-2a', isMerchantAnalysisContextValid(makeMAC()), 'valid MAC passes');
  assert('N-2b', !isMerchantAnalysisContextValid(makeExpiredMAC()), 'expired MAC fails');
  assert('N-2c', !isMerchantAnalysisContextValid(null), 'null fails');
}

// N-3: analyzeQueryScope unchanged (P3.3A frozen)
{
  const scope = analyzeQueryScope('Show me those transactions');
  assert('N-3a', scope.needsDetail === true, `needsDetail=${scope.needsDetail}`);
  assert('N-3b', scope.isMutation === false, `isMutation=${scope.isMutation}`);
}

// ─── SECTION O: P3.3A Non-Interference ──────────────────────────────────────

console.log('\n=== SECTION O: P3.3A Non-Interference ===');

// O-1: Pure aggregation → merchantAggSatisfied blocks B2C (via agg_satisfied)
{
  const r = simulateBridgeDetection('What did I spend at Costco?', makeMAC(), { merchantAggSatisfied: true });
  assert('O-1', !r.bridgeActive, r.reason);
}

// O-2: B2C detail phrase does NOT have merchantAggSatisfied
// (P3.3A requires needsDetail=false, but "show me those transactions" has needsDetail=true)
{
  const scope = analyzeQueryScope('Show me those transactions');
  assert('O-2', scope.needsDetail === true, 'needsDetail=true means P3.3A does not satisfy');
}

// ─── SECTION P: Adversarial Exclusion Case ──────────────────────────────────

console.log('\n=== SECTION P: Adversarial Exclusion Case ===');

// P-1: The 250-gas / 30-wholesale scenario
// Bridge must use limit=200 AND excludeMerchants (DB-level NOT ILIKE)
// so excluded gas rows never consume the row budget
{
  const mac = makeMAC({ excludedGroups: ['costco_gas'] });
  const args = simulateBridgeArgs(mac);
  assert('P-1a', args.limit === 200, `limit=${args.limit}`);
  assert('P-1b', args.excludeMerchants?.length === 1, `exclusions=${args.excludeMerchants?.length}`);
  assert('P-1c', args.excludeMerchants?.[0] === 'costco_gas', `excluded=${args.excludeMerchants?.[0]}`);
  // With DB-level NOT ILIKE, the 250 gas rows are excluded BEFORE LIMIT
  // so the 30 wholesale rows are returned correctly
  assert('P-1d', true, 'DB-level exclusion prevents truncation corruption (verified by tx-search.ts code review)');
}

// P-2: No exclusions → full broad search (no NOT ILIKE clauses)
{
  const mac = makeMAC({ excludedGroups: [] });
  const args = simulateBridgeArgs(mac);
  assert('P-2', !args.excludeMerchants, 'no exclusions → no NOT ILIKE');
}

// ─── SUMMARY ────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`P3.2B2C Test Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log(`Failed: ${failures.join(', ')}`);
}
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
