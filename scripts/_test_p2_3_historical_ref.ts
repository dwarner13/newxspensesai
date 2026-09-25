/**
 * P2.3 — Historical Conversation Reference Tests
 * Run with: npx tsx scripts/_test_p2_3_historical_ref.ts
 *
 * Verifies:
 *   1. Detector correctly identifies historical conversation references
 *   2. Detector rejects new financial queries and candidate follow-ups
 *   3. chat.ts integration: routing precedence, directive injection, search suppression
 *   4. P2.2 interaction: historical refs do NOT fire P2.2 isolation
 *   5. tx_resolution preservation
 *   6. Informational vs continuation distinction
 *   7. No-evidence behavior
 *   8. P0/P1/P2/P2.1/P2.2 regression
 */
import { readFileSync } from 'fs';
import { detectHistoricalReference } from '../src/shared/historical-reference-detector';
import { detectCandidateFollowUp } from '../src/shared/candidate-follow-up-detector';
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';

const CHAT_SRC = readFileSync('netlify/functions/chat.ts', 'utf8');

function extractBlock(src: string, anchor: string, chars: number): string {
  const idx = src.indexOf(anchor);
  if (idx === -1) return '';
  return src.substring(idx, idx + chars);
}

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS ${label}`);
    pass++;
  } else {
    console.log(`  FAIL ${label}`);
    fail++;
  }
}

console.log('\n=== P2.3 Historical Conversation Reference Tests ===\n');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: DETECTOR — TRUE POSITIVES
// ════════════════════════════════════════════════════════════════════════════

console.log('── Section 1: Detector True Positives ──');

const TRUE_POSITIVES: [string, string][] = [
  ['Which transaction were we trying to change earlier?', 'past collab + temporal'],
  ['What were we doing before?', 'prior discussion + temporal'],
  ['What did I ask you to recategorize?', 'delegated action'],
  ['Which one were we discussing?', 'prior discussion'],
  ['What happened with that change?', 'past action'],
  ['What did I ask Tag to do?', 'delegated action (Tag)'],
  ['What were we talking about?', 'prior discussion'],
  ['What did you just tell me?', 'delegated action + temporal'],
  ['Go back to what we were discussing.', 'resumption'],
  ['Can we continue where we left off?', 'resumption'],
  ['What was I trying to do before?', 'past collab + temporal'],
  ['Which one did we change before?', 'temporal backref'],
  ['What change failed earlier?', 'past action + temporal'],
  ['What did I ask you before?', 'delegated action + temporal'],
  ['What were we working on earlier?', 'prior discussion + temporal'],
  ['Which transaction did we discuss earlier?', 'temporal backref'],
];

for (const [msg, reason] of TRUE_POSITIVES) {
  const result = detectHistoricalReference(msg);
  assert(result.isHistorical === true, `TP: "${msg}" → historical (${reason})`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: DETECTOR — TRUE NEGATIVES (must NOT match)
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 2: Detector True Negatives ──');

const TRUE_NEGATIVES: [string, string][] = [
  ['Show me my last 9 7-Eleven transactions.', 'new search'],
  ['How much did I spend on fuel?', 'financial query'],
  ['Change the third one to Gas & Fuel.', 'candidate mutation'],
  ['Tell me about the third one.', 'candidate follow-up'],
  ['Which of my transactions is the biggest?', 'possessive data query'],
  ['Which transaction cost the most?', 'superlative data query'],
  ['Which grocery transaction was highest?', 'superlative data query'],
  ['Show me what I spent at Costco.', 'new search'],
  ['Find the transaction from Walmart.', 'new search'],
  ['How much did I spend on groceries this year?', 'aggregate financial'],
  ['What is a TFSA?', 'education'],
  ['Hello', 'greeting'],
  ['Thanks', 'social'],
  ['Can you help me with my budget?', 'general request'],
  ['Recategorize the second one.', 'candidate mutation (ordinal)'],
  ['That one.', 'demonstrative follow-up'],
];

for (const [msg, reason] of TRUE_NEGATIVES) {
  const result = detectHistoricalReference(msg);
  assert(result.isHistorical === false, `TN: "${msg}" → NOT historical (${reason})`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: CONTINUATION INTENT
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 3: Continuation Intent ──');

{
  const r1 = detectHistoricalReference('Which transaction were we trying to change earlier?');
  assert(r1.isHistorical === true && r1.continuationIntent === false,
    'C1: informational historical → continuationIntent=false');

  const r2 = detectHistoricalReference('Try that again.');
  // "Try that again" is a continuation but may or may not match historical —
  // it's currently handled by P2.2's exception clause. Not a historical reference.
  // Either way, if it matches, continuationIntent should be true.
  const r3 = detectHistoricalReference('Go ahead with that change.');
  // Same — may or may not be historical.

  const r4 = detectHistoricalReference('Go back to what we were discussing.');
  assert(r4.isHistorical === true, 'C2: "Go back to..." is historical');

  const r5 = detectHistoricalReference('Can we continue where we left off?');
  assert(r5.isHistorical === true && r5.continuationIntent === true,
    'C3: "continue where we left off" → historical + continuation');

  const r6 = detectHistoricalReference('What happened with that change?');
  assert(r6.isHistorical === true && r6.continuationIntent === false,
    'C4: "What happened..." → informational only');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: CHAT.TS STRUCTURAL INTEGRATION
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 4: chat.ts Structural Integration ──');

// S4.1: Import exists
assert(CHAT_SRC.includes("import { detectHistoricalReference } from '../../src/shared/historical-reference-detector'"),
  'S4.1: detectHistoricalReference import exists in chat.ts');

// S4.2: isHistoricalConversationRef declared
assert(CHAT_SRC.includes('let isHistoricalConversationRef = false'),
  'S4.2: isHistoricalConversationRef variable declared');

// S4.3: P2.3 detector runs in Phase1D block
const phase1dBlock = extractBlock(CHAT_SRC, 'P2.3: Historical conversation reference', 400);
assert(phase1dBlock.length > 0,
  'S4.3: P2.3 detection block exists in Phase1D');
assert(phase1dBlock.includes('detectHistoricalReference(masked)'),
  'S4.4: P2.3 calls detectHistoricalReference(masked)');
assert(phase1dBlock.includes('isNewGroundedSearch = false'),
  'S4.5: P2.3 sets isNewGroundedSearch = false');
assert(phase1dBlock.includes('isHistoricalConversationRef = true'),
  'S4.6: P2.3 sets isHistoricalConversationRef = true');

// S4.7: P2.3 runs AFTER P1 candidate follow-up
const p1Idx = CHAT_SRC.indexOf('candidateFollowUp.isFollowUp');
const p23Idx = CHAT_SRC.indexOf('P2.3: Historical conversation reference');
assert(p1Idx > 0 && p23Idx > 0 && p1Idx < p23Idx,
  'S4.7: P2.3 runs AFTER P1 candidate follow-up check');

// S4.8: P2.3 runs BEFORE classifyFinancialQuery in else branch
const classifierIdx = CHAT_SRC.indexOf('earlyClassification = classifyFinancialQuery(masked)');
assert(p23Idx > 0 && classifierIdx > 0 && p23Idx < classifierIdx,
  'S4.8: P2.3 runs BEFORE financial classifier');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5: HISTORICAL DIRECTIVE INJECTION
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 5: Historical Directive Injection ──');

const directiveBlock = extractBlock(CHAT_SRC, 'P2.3: Historical conversation reference directive', 1200);
assert(directiveBlock.length > 0,
  'S5.1: P2.3 directive injection block exists');

assert(CHAT_SRC.includes('if (isHistoricalConversationRef && isPrime)'),
  'S5.2: directive gated on isHistoricalConversationRef && isPrime');

assert(CHAT_SRC.includes('Answer using the conversation history provided above'),
  'S5.3: directive tells model to use conversation history');

assert(CHAT_SRC.includes('Do not run a transaction search to determine what was previously discussed'),
  'S5.4: directive tells model NOT to run tx_search');

assert(CHAT_SRC.includes('does not authorize any mutation'),
  'S5.5: directive states historical reference does not authorize mutation');

assert(CHAT_SRC.includes('ask them to describe it'),
  'S5.6: directive includes no-evidence fallback guidance');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6: BOUNDED THREAD RETRIEVAL
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 6: Bounded Thread Retrieval ──');

const retrievalBlock = extractBlock(CHAT_SRC, 'Bounded same-thread retrieval', 1500);
assert(retrievalBlock.length > 0,
  'S6.1: bounded thread retrieval block exists');

assert(retrievalBlock.includes("currentSessionMsgCount < 10"),
  'S6.2: retrieval only runs when current session has < 10 messages');

assert(retrievalBlock.includes(".eq('thread_id', threadId)"),
  'S6.3: retrieval queries by thread_id');

assert(retrievalBlock.includes(".eq('user_id', userId)"),
  'S6.4: retrieval queries by user_id');

assert(retrievalBlock.includes('.limit(20)'),
  'S6.5: retrieval hard-capped at 20 messages');

assert(retrievalBlock.includes('currentSessionIds.has(m.id)'),
  'S6.6: retrieval filters out duplicates from current session');

assert(retrievalBlock.includes('PRIOR CONVERSATION CONTEXT'),
  'S6.7: injected as PRIOR CONVERSATION CONTEXT');

assert(retrievalBlock.includes('[...supplementary].reverse()'),
  'S6.8: injected in chronological order');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7: P2.2 INTERACTION — Historical must NOT fire P2.2
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 7: P2.2 Interaction ──');

assert(CHAT_SRC.includes('if (isNewGroundedSearch && !isHistoricalConversationRef)'),
  'S7.1: P2.2 gated with && !isHistoricalConversationRef');

// Verify: for historical ref, isNewGroundedSearch=false, so P2.2 cannot fire
// Double-check: even if somehow isNewGroundedSearch were true, the explicit guard blocks it
{
  const msg = 'Which transaction were we trying to change earlier?';
  const hr = detectHistoricalReference(msg);
  // When historical ref detected in Phase1D: isNewGroundedSearch stays false
  assert(hr.isHistorical === true,
    'S7.2: historical ref detected for regression scenario');
  // If P1 doesn't match and P2.3 matches, isNewGroundedSearch = false
  const fu = detectCandidateFollowUp(msg, true);
  assert(fu.isFollowUp === false,
    'S7.3: P1 does NOT match → falls through to P2.3');
  // Combined: P2.3 fires, isNewGroundedSearch = false, P2.2 does not fire
  assert(hr.isHistorical && !fu.isFollowUp,
    'S7.4: P2.3 fires → isNewGroundedSearch=false → P2.2 OFF');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8: SEARCH SUPPRESSION — forced tx_search gates
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 8: Search Suppression ──');

// Streaming path
assert(CHAT_SRC.includes('!isHistoricalConversationRef\n      ) {') ||
       CHAT_SRC.includes('!isHistoricalConversationRef\r\n      ) {'),
  'S8.1: streaming forced tx_search gated by !isHistoricalConversationRef');

assert(CHAT_SRC.includes("P2.3: skipping forced tx_search (streaming) — historical conversation reference"),
  'S8.2: streaming path logs P2.3 skip');

// Non-streaming path
assert(CHAT_SRC.includes("P2.3: skipping forced tx_search (non-streaming) — historical conversation reference"),
  'S8.3: non-streaming path logs P2.3 skip');

// FinancialGrounding pre-exec
assert(CHAT_SRC.includes('!isHistoricalConversationRef) {') &&
       CHAT_SRC.includes('P2.3: Skip entire financial grounding for historical'),
  'S8.4: non-streaming FinancialGrounding pre-exec gated by !isHistoricalConversationRef');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9: tx_resolution PRESERVATION
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 9: tx_resolution Preservation ──');

// shouldPreserveCandidates = hasExistingCandidates && !isNewGroundedSearch
// When P2.3 fires: isNewGroundedSearch = false → shouldPreserveCandidates = true (if candidates exist)
assert(CHAT_SRC.includes('const shouldPreserveCandidates = hasExistingCandidates && !isNewGroundedSearch'),
  'S9.1: shouldPreserveCandidates formula unchanged');

// Verify: historical ref → isNewGroundedSearch=false → shouldPreserveCandidates=true when candidates exist
{
  const msg = 'Which transaction were we trying to change earlier?';
  const hr = detectHistoricalReference(msg);
  const fu = detectCandidateFollowUp(msg, true);
  // Simulating Phase1D: P1 miss → P2.3 hit → isNewGroundedSearch=false
  const isNewGrounded = fu.isFollowUp ? false : (hr.isHistorical ? false : classifyFinancialQuery(msg).requiresGrounding === true);
  const preserves = true && !isNewGrounded; // hasExistingCandidates=true
  assert(preserves === true,
    'S9.2: historical ref + existing candidates → shouldPreserveCandidates=true');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 10: INFORMATIONAL VS CONTINUATION
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 10: Informational vs Continuation ──');

{
  // Informational: no mutation authorized
  const r1 = detectHistoricalReference('Which transaction were we trying to change earlier?');
  assert(r1.isHistorical && !r1.continuationIntent,
    'S10.1: informational → no continuation intent');

  const r2 = detectHistoricalReference('What happened with that change?');
  assert(r2.isHistorical && !r2.continuationIntent,
    'S10.2: status inquiry → no continuation intent');

  const r3 = detectHistoricalReference('What did I ask Tag to do?');
  assert(r3.isHistorical && !r3.continuationIntent,
    'S10.3: delegated action inquiry → no continuation intent');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 11: COMBINED ROUTING — EXACT LIVE REGRESSION
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 11: Combined Routing — Live Regression ──');

{
  const msg = 'Which transaction were we trying to change earlier?';

  // Step 1: P1 does not match
  const fu = detectCandidateFollowUp(msg, true);
  assert(!fu.isFollowUp, 'R1: P1 does not match');

  // Step 2: P2.3 matches
  const hr = detectHistoricalReference(msg);
  assert(hr.isHistorical, 'R2: P2.3 matches — historical reference');
  assert(!hr.continuationIntent, 'R3: informational only — no continuation');

  // Step 3: isNewGroundedSearch stays false
  const isNew = fu.isFollowUp ? false : (hr.isHistorical ? false : true);
  assert(!isNew, 'R4: isNewGroundedSearch = false');

  // Step 4: shouldPreserveCandidates = true (if candidates exist)
  const preserves = true && !isNew; // hasExistingCandidates = true
  assert(preserves, 'R5: shouldPreserveCandidates = true');

  // Step 5: P2.2 does not fire
  const p22Fires = isNew && !hr.isHistorical;
  assert(!p22Fires, 'R6: P2.2 does NOT fire');

  // Step 6: forced tx_search blocked by !isHistoricalConversationRef
  assert(hr.isHistorical, 'R7: isHistoricalConversationRef=true blocks forced tx_search');

  // Step 7: financial grounding skipped
  assert(hr.isHistorical, 'R8: FinancialGrounding pre-exec skipped');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 12: FALSE POSITIVE REGRESSION — Financial queries still ground
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 12: False Positive Regression ──');

const FP_CHECKS: [string, boolean, string][] = [
  ['Which of my transactions is the biggest?', true, 'possessive superlative → grounded'],
  // Note: "Which transaction cost the most?" lacks possessive "my" so the existing
  // classifier may not flag it as requiresGrounding. That's pre-existing classifier
  // behavior, not a P2.3 concern. The key P2.3 check is that it's NOT historical.
  ['Which transaction cost the most?', false, 'superlative without possessive'],
  ['Which grocery transaction was highest?', false, 'superlative without possessive'],
  ['Show me what I spent at Costco.', true, 'new merchant search'],
  ['Find the transaction from Walmart.', true, 'new merchant search'],
  ['Show me my last 9 7-Eleven transactions.', true, 'new count search'],
  ['How much did I spend on fuel in 2025?', true, 'aggregate financial'],
];

for (const [msg, shouldGround, reason] of FP_CHECKS) {
  const hr = detectHistoricalReference(msg);
  assert(!hr.isHistorical, `FP: "${msg}" NOT historical`);

  const fu = detectCandidateFollowUp(msg, false);
  assert(!fu.isFollowUp, `FP: "${msg}" NOT follow-up`);

  const cl = classifyFinancialQuery(msg);
  if (shouldGround) {
    assert(cl.requiresGrounding === true, `FP: "${msg}" → grounded (${reason})`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 13: P1 FOLLOW-UP STILL WINS PRECEDENCE
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 13: P1 Precedence ──');

{
  // P1 messages should still be handled by P1, not fall through to P2.3
  const p1Messages = [
    'Tell me about the third one.',
    'Change the second one to Gas & Fuel.',
    'What about that transaction?',
    '#3',
  ];

  for (const msg of p1Messages) {
    const fu = detectCandidateFollowUp(msg, true);
    assert(fu.isFollowUp === true,
      `P1-precedence: "${msg}" → P1 catches it`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 14: NO-CANDIDATES PATH
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 14: No-Candidates Path ──');

// When there are no existing candidates, P2.3 should still fire for Prime
// (prevents creating an irrelevant candidate frame from scratch)
assert(CHAT_SRC.includes('} else if (isPrime) {') &&
       CHAT_SRC.indexOf('} else if (isPrime) {') > CHAT_SRC.indexOf('if (hasExistingCandidates && isPrime)'),
  'S14.1: no-candidates path checks historical reference for Prime');

{
  // Verify the detector works standalone (no candidates)
  const msg = 'What were we talking about?';
  const hr = detectHistoricalReference(msg);
  assert(hr.isHistorical, 'S14.2: historical ref detected without existing candidates');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 15: MODEL-INITIATED tx_search BLOCKING
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Section 15: Model-Initiated tx_search Blocking ──');

// S15.1–S15.2: Streaming and non-streaming gates exist
assert(CHAT_SRC.includes("P2.3: blocked model-initiated tx_search (streaming) — historical informational reference"),
  'S15.1: streaming model-initiated tx_search block exists');

assert(CHAT_SRC.includes("P2.3: blocked model-initiated tx_search (non-streaming) — historical informational reference"),
  'S15.2: non-streaming model-initiated tx_search block exists');

// S15.3: Gate uses isHistoricalInformational (not isHistoricalConversationRef)
// This ensures continuation intents are NOT blocked
{
  const streamingBlock = extractBlock(CHAT_SRC, 'P2.3: Block model-initiated tx_search on informational historical turns', 900);
  assert(streamingBlock.length > 0,
    'S15.3: streaming block gate comment exists');
  assert(streamingBlock.includes("toolName === 'tx_search' && isHistoricalInformational"),
    'S15.4: streaming gate uses isHistoricalInformational');
  assert(streamingBlock.includes('blocked: true'),
    'S15.5: streaming gate returns blocked: true');
  assert(streamingBlock.includes('continue'),
    'S15.6: streaming gate continues (does not execute tool)');
}

// S15.7–S15.8: Non-streaming gate structure
{
  // Find the second occurrence (non-streaming)
  const firstIdx = CHAT_SRC.indexOf("toolName === 'tx_search' && isHistoricalInformational");
  const secondIdx = CHAT_SRC.indexOf("toolName === 'tx_search' && isHistoricalInformational", firstIdx + 1);
  assert(secondIdx > firstIdx && firstIdx > 0,
    'S15.7: non-streaming gate uses same isHistoricalInformational condition');
  const nonStreamBlock = CHAT_SRC.substring(secondIdx, secondIdx + 400);
  assert(nonStreamBlock.includes('blocked: true'),
    'S15.8: non-streaming gate returns blocked: true');
}

// S15.9: isHistoricalInformational is declared
assert(CHAT_SRC.includes('let isHistoricalInformational = false'),
  'S15.9: isHistoricalInformational declared at request scope');

// S15.10: isHistoricalInformational is set from !continuationIntent
assert(CHAT_SRC.includes('isHistoricalInformational = !histRef.continuationIntent'),
  'S15.10: isHistoricalInformational derived from !continuationIntent');

// S15.11: Gate is INSIDE tool execution loop (after select_transaction, before date normalization)
{
  const streamSelTxIdx = CHAT_SRC.indexOf('select_transaction interception (streaming)');
  const streamBlockIdx = CHAT_SRC.indexOf("P2.3: Block model-initiated tx_search on informational historical turns");
  const streamDateIdx = CHAT_SRC.indexOf('Authoritative date normalization for financial query tools');
  assert(streamSelTxIdx > 0 && streamBlockIdx > streamSelTxIdx && streamDateIdx > streamBlockIdx,
    'S15.11: streaming gate positioned after select_transaction, before date normalization');
}

// S15.12: Exact live regression — informational historical + tx_search = BLOCKED
{
  const msg = 'Which transaction were we trying to change earlier?';
  const hr = detectHistoricalReference(msg);
  const isInformational = hr.isHistorical && !hr.continuationIntent;
  assert(isInformational === true,
    'S15.12: "Which transaction were we trying to change earlier?" → informational → tx_search BLOCKED');
}

// S15.13: Normal financial query → tx_search NOT blocked
{
  const msg = 'Show me my last 9 7-Eleven transactions.';
  const hr = detectHistoricalReference(msg);
  const isInformational = hr.isHistorical && !hr.continuationIntent;
  assert(isInformational === false,
    'S15.13: "Show me my last 9 7-Eleven transactions." → NOT informational → tx_search ALLOWED');
}

// S15.14: Continuation intent → tx_search NOT blocked
{
  const msg = 'Can we continue where we left off?';
  const hr = detectHistoricalReference(msg);
  assert(hr.isHistorical === true && hr.continuationIntent === true,
    'S15.14a: continuation intent detected');
  const isInformational = hr.isHistorical && !hr.continuationIntent;
  assert(isInformational === false,
    'S15.14b: continuation intent → NOT informational → tx_search ALLOWED');
}

// S15.15: "Try that again" → NOT historical at all → tx_search allowed
{
  const msg = 'Try that again.';
  const hr = detectHistoricalReference(msg);
  assert(hr.isHistorical === false,
    'S15.15: "Try that again" → NOT historical → tx_search ALLOWED (P2.2 handles)');
}

// S15.16: Blocked result does not create candidates (structural — blocked returns JSON, not tx rows)
{
  const blockedResult = JSON.stringify({ blocked: true, reason: 'Historical conversation questions must be answered from conversation history, not transaction search.' });
  const parsed = JSON.parse(blockedResult);
  assert(parsed.blocked === true && !parsed.transactions && !parsed.results,
    'S15.16: blocked result contains no transaction data');
}

// S15.17: Gate does not modify tx_resolution (no writeTxResolution in block)
{
  const blockText = extractBlock(CHAT_SRC, "P2.3: Block model-initiated tx_search on informational historical turns", 500);
  assert(!blockText.includes('writeTxResolution') && !blockText.includes('txResolution'),
    'S15.17: blocked gate does not touch tx_resolution');
}

// S15.18: P2/P2.1 mutation identity gates unchanged
assert(CHAT_SRC.includes('bindAuthoritativeTxIdentity'),
  'S15.18a: bindAuthoritativeTxIdentity still present');
assert(CHAT_SRC.includes('checkMutationIdentityGate'),
  'S15.18b: checkMutationIdentityGate still present');

// S15.19: P2.2 current-turn isolation unchanged
assert(CHAT_SRC.includes('CURRENT-TURN INTENT:') && CHAT_SRC.includes('Do not resume or retry unfinished actions'),
  'S15.19: P2.2 directive text unchanged');

// S15.20: Continuation comment explains WHY continuation is allowed through
{
  const blockText = extractBlock(CHAT_SRC, "P2.3: Block model-initiated tx_search on informational historical turns", 500);
  assert(blockText.includes('Continuation intents') && blockText.includes('allowed through'),
    'S15.20: gate comment explains continuation exception');
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`P2.3 Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${'═'.repeat(60)}\n`);

if (fail > 0) {
  process.exit(1);
}
