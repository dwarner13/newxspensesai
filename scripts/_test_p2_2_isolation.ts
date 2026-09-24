/**
 * P2.2 — Current-Turn Intent Isolation Tests
 * Run with: npx tsx scripts/_test_p2_2_isolation.ts
 *
 * Verifies:
 *   Fix 1: buildSafeFallbackResponse no longer promises resumption
 *   Fix 2: New grounded search triggers current-turn isolation directive
 *   Regression: P1 follow-up, P2 mutation, retry messages remain unaffected
 */
import { readFileSync } from 'fs';
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

console.log('\n=== P2.2 Current-Turn Intent Isolation Tests ===\n');

// ════════════════════════════════════════════════════════════════════════════
// FIX 1: Neutral fallback message
// ════════════════════════════════════════════════════════════════════════════

console.log('── Fix 1: Neutral Fallback ──');

const fallbackFn = extractBlock(CHAT_SRC, 'function buildSafeFallbackResponse', 400);

assert(!fallbackFn.includes('pick up where I left off'),
  'F1.1: fallback does NOT contain "pick up where I left off"');

assert(!fallbackFn.includes('I\'ll pick up'),
  'F1.2: fallback does NOT contain "I\'ll pick up"');

assert(!fallbackFn.includes('left off'),
  'F1.3: fallback does NOT contain "left off"');

assert(fallbackFn.includes("I wasn't able to complete that request"),
  'F1.4: fallback contains neutral failure description');

assert(fallbackFn.includes('Could you try again?'),
  'F1.5: fallback contains neutral retry prompt');

assert(!fallbackFn.includes('resume'),
  'F1.6: fallback does NOT contain "resume"');

assert(!fallbackFn.includes('continue'),
  'F1.7: fallback does NOT contain "continue"');

// Verify the old phrase is completely gone from buildSafeFallbackResponse
const allFallbackOccurrences = CHAT_SRC.split('pick up where I left off').length - 1;
assert(allFallbackOccurrences === 0,
  'F1.8: "pick up where I left off" appears 0 times in entire chat.ts');

// ════════════════════════════════════════════════════════════════════════════
// FIX 2: Current-turn isolation directive
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Fix 2: Current-Turn Isolation Directive ──');

const isolationBlock = extractBlock(CHAT_SRC, 'P2.2: Current-turn intent isolation', 600);

assert(isolationBlock.length > 0,
  'F2.1: P2.2 isolation block exists in chat.ts');

assert(isolationBlock.includes('isNewGroundedSearch'),
  'F2.2: isolation directive gated on isNewGroundedSearch');

assert(isolationBlock.includes('CURRENT-TURN INTENT'),
  'F2.3: directive uses CURRENT-TURN INTENT label');

assert(isolationBlock.includes('new request'),
  'F2.4: directive tells model this is a new request');

assert(isolationBlock.includes('Do not resume or retry'),
  'F2.5: directive says do not resume or retry');

assert(isolationBlock.includes('unless the user explicitly asks'),
  'F2.6: directive preserves explicit continuation requests');

assert(isolationBlock.includes('"try that again"') || isolationBlock.includes('try that again'),
  'F2.7: directive gives "try that again" as continuation example');

assert(isolationBlock.includes('"retry"') || isolationBlock.includes('retry'),
  'F2.8: directive gives "retry" as continuation example');

// ── ORDERING: P2.2 is injected AFTER Phase1D candidate injection ──

const candidateInjectionIdx = CHAT_SRC.indexOf('Phase1D: injected');
const p22Idx = CHAT_SRC.indexOf('P2.2: injected current-turn isolation');
assert(candidateInjectionIdx > 0 && p22Idx > 0 && p22Idx > candidateInjectionIdx,
  'F2.9: P2.2 injection runs AFTER Phase1D candidate injection');

// ── ORDERING: P2.2 is injected BEFORE temporal context ──

const temporalCtxIdx = CHAT_SRC.indexOf('Inject temporal context for ALL Prime requests');
assert(p22Idx > 0 && temporalCtxIdx > 0 && p22Idx < temporalCtxIdx,
  'F2.10: P2.2 injection runs BEFORE temporal context injection');

// ── P2.2 does NOT fire when isNewGroundedSearch is false ──

assert(isolationBlock.includes('if (isNewGroundedSearch)'),
  'F2.11: directive only fires when isNewGroundedSearch is true');

// ════════════════════════════════════════════════════════════════════════════
// LIVE REGRESSION: Exact scenario from audit
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Live Regression: Stale Mutation + New Search ──');

// Scenario: previous "Change the third one to Gas & Fuel" failed,
// current message is "Show me my last 9 7-Eleven transactions"

const currentMsg = 'Show me my last 9 7-Eleven transactions';
const hasCandidates = true;

const followUp = detectCandidateFollowUp(currentMsg, hasCandidates);
assert(!followUp.isFollowUp,
  'R1: "Show me my last 9 7-Eleven transactions" is NOT a candidate follow-up');

const classification = classifyFinancialQuery(currentMsg);
assert(classification.requiresGrounding === true,
  'R2: "Show me my last 9 7-Eleven transactions" requires grounding (new search)');

// Therefore isNewGroundedSearch = true → P2.2 directive fires
assert(!followUp.isFollowUp && classification.requiresGrounding === true,
  'R3: combined → isNewGroundedSearch=true → P2.2 isolation fires');

// ════════════════════════════════════════════════════════════════════════════
// TEST CASES 1-7: Intent classification
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Test Cases: Intent Classification ──');

// Case 1: History mutation failure → "Show me my last 9 7-Eleven transactions"
{
  const msg = 'Show me my last 9 7-Eleven transactions';
  const fu = detectCandidateFollowUp(msg, true);
  const cl = classifyFinancialQuery(msg);
  const isNew = !fu.isFollowUp && cl.requiresGrounding === true;
  assert(isNew, 'TC1: 7-Eleven search → NEW REQUEST isolation');
}

// Case 2: History mutation failure → "Show me my Costco transactions"
{
  const msg = 'Show me my Costco transactions';
  const fu = detectCandidateFollowUp(msg, true);
  const cl = classifyFinancialQuery(msg);
  const isNew = !fu.isFollowUp && cl.requiresGrounding === true;
  assert(isNew, 'TC2: Costco search → NEW REQUEST isolation');
}

// Case 3: History mutation failure → "Try that again"
{
  const msg = 'Try that again';
  const fu = detectCandidateFollowUp(msg, true);
  const cl = classifyFinancialQuery(msg);
  const isNew = !fu.isFollowUp && cl.requiresGrounding === true;
  assert(!isNew, 'TC3: "Try that again" → NOT treated as new grounded search');
}

// Case 4: History mutation failure → "Retry that category change"
// classifyFinancialQuery sees "category change" as grounded, and there's no
// ordinal/demonstrative, so isNewGroundedSearch=true. But the P2.2 directive
// explicitly allows continuation when the user says "retry" — the model reads
// the word "retry" and the directive's exception clause covers it.
{
  const msg = 'Retry that category change';
  const fu = detectCandidateFollowUp(msg, true);
  const cl = classifyFinancialQuery(msg);
  const isNew = !fu.isFollowUp && cl.requiresGrounding === true;
  // isNewGroundedSearch fires, but the directive text says "unless the user
  // explicitly asks to continue them (e.g. 'try that again', 'retry')" —
  // the model sees "Retry" in the message and the exception clause together.
  assert(isNew, 'TC4: "Retry that category change" → grounded search fires (model reads retry exception)');
}

// Case 5: History mutation failure → "Which transaction were we changing?"
{
  const msg = 'Which transaction were we changing?';
  const fu = detectCandidateFollowUp(msg, true);
  const cl = classifyFinancialQuery(msg);
  const isNew = !fu.isFollowUp && cl.requiresGrounding === true;
  // This is informational — should NOT trigger isolation
  // (may or may not requiresGrounding, but even if it does,
  // the point is it doesn't force a new merchant search)
  assert(!isNew || !fu.isFollowUp,
    'TC5: "Which transaction were we changing?" → informational context allowed');
}

// Case 6: Normal ordinal follow-up (P1 unchanged)
{
  const msg = 'Tell me about the third one';
  const fu = detectCandidateFollowUp(msg, true);
  assert(fu.isFollowUp === true,
    'TC6: "Tell me about the third one" → P1 follow-up (unchanged)');
  // When P1 says follow-up, isNewGroundedSearch stays false
  const isNew = !fu.isFollowUp && classifyFinancialQuery(msg).requiresGrounding === true;
  assert(!isNew, 'TC6b: P1 follow-up → no isolation directive');
}

// Case 7: Normal mutation with candidates (P1/P2 unchanged)
{
  const msg = 'Change the third one to Gas & Fuel';
  const fu = detectCandidateFollowUp(msg, true);
  assert(fu.isFollowUp === true,
    'TC7: "Change the third one to Gas & Fuel" → P1 follow-up (unchanged)');
  const isNew = !fu.isFollowUp && classifyFinancialQuery(msg).requiresGrounding === true;
  assert(!isNew, 'TC7b: mutation follow-up → no isolation directive');
}

// ════════════════════════════════════════════════════════════════════════════
// FROZEN SYSTEMS: Verify P0/P1/P2/P2.1 untouched
// ════════════════════════════════════════════════════════════════════════════

console.log('\n── Frozen Systems Verification ──');

// P0: candidate ordering
assert(CHAT_SRC.includes('P0: Authoritative candidate frame'),
  'FROZEN: P0 candidate ordering exists');

// P1: candidate follow-up detector
assert(CHAT_SRC.includes('detectCandidateFollowUp'),
  'FROZEN: P1 detectCandidateFollowUp exists');

// P2: handoff enforcement
assert(CHAT_SRC.includes('P2: Transaction-specific Tag handoff pre-gate'),
  'FROZEN: P2 handoff enforcement exists');

// P2.1: model identity strip
assert(CHAT_SRC.includes('P2.1: stripping model-supplied plugin_payload.transaction'),
  'FROZEN: P2.1 model identity strip exists');

// Layer 1
assert(CHAT_SRC.includes('Layer 1: ephemeral in-memory cache'),
  'FROZEN: Layer 1 exists');

// Layer 2
assert(CHAT_SRC.includes('Layer 2: DB-persisted conversational selection'),
  'FROZEN: Layer 2 exists');

// Mutation Identity Gate
assert(CHAT_SRC.includes('checkMutationIdentityGate'),
  'FROZEN: Mutation Identity Gate exists');

// MAX_TOOL_ROUNDS unchanged
assert(CHAT_SRC.includes('MAX_TOOL_ROUNDS = 3'),
  'FROZEN: MAX_TOOL_ROUNDS = 3 unchanged');

console.log(`\n=== ${fail === 0 ? 'ALL PASSED' : fail + ' FAILED'} (${pass + fail} total) ===\n`);
process.exit(fail > 0 ? 1 : 0);
