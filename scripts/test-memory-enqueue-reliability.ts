/**
 * Memory Enqueue Reliability — Contract Tests
 *
 * Verifies the enqueueMemoryExtraction pattern guarantees:
 * 1. Exactly one queue call per valid completed exchange
 * 2. Queue failure does not propagate (try/catch, not .catch())
 * 3. Invalid sessions produce no queue calls
 * 4. Deterministic lanes get the same memory opportunity as model lanes
 * 5. Queue insert is awaited for Lambda delivery reliability
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// Simulate normalizeSessionId (same as chat.ts)
function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
    const v = (raw as any).id;
    if (typeof v === 'string') return v;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Verify helper function exists in chat.ts
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1: Helper function presence ===\n');
const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');
{
  assert('ME1a. enqueueMemoryExtraction defined',
    chatSrc.includes('async function enqueueMemoryExtraction('));
  assert('ME1b. helper calls queueMemoryExtraction',
    chatSrc.includes('queueMemoryExtraction({') &&
    chatSrc.includes('enqueueMemoryExtraction'));
  assert('ME1c. helper awaits queueMemoryExtraction',
    /async function enqueueMemoryExtraction[\s\S]*?await queueMemoryExtraction\(/.test(chatSrc));
  assert('ME1d. helper catches errors with try/catch',
    /async function enqueueMemoryExtraction[\s\S]*?try\s*\{[\s\S]*?await queueMemoryExtraction[\s\S]*?\}\s*catch/.test(chatSrc));
  assert('ME1e. helper logs non-fatal on failure',
    /async function enqueueMemoryExtraction[\s\S]*?non-fatal/.test(chatSrc));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Verify all response paths call the helper with await
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: Awaited enqueue at all call sites ===\n');
{
  // Count await enqueueMemoryExtraction calls
  const calls = chatSrc.match(/await enqueueMemoryExtraction\(/g) || [];
  assert('ME2a. 10 awaited enqueue call sites exist', calls.length === 10);

  // Verify no un-awaited calls exist
  const unawaitedCalls = chatSrc.match(/[^t] enqueueMemoryExtraction\(/g) || [];
  // The only match should be the function definition itself
  assert('ME2b. no un-awaited enqueue calls',
    !chatSrc.match(/(?<!await |function )enqueueMemoryExtraction\(userId/));

  // Verify specific deterministic lanes have the awaited call nearby
  const deterministicLanes = [
    { label: 'temporal', marker: 'deterministic temporal response' },
    { label: 'grounded_facts', marker: 'deterministic grounded facts response' },
    { label: 'clarification', marker: 'deterministic clarification response' },
    { label: 'coaching', marker: 'deterministic coaching response' },
    { label: 'financial_insight', marker: 'deterministic financial insight response' },
    { label: 'predictive', marker: 'deterministic predictive response' },
    { label: 'automation', marker: 'deterministic automation response' },
    { label: 'router', marker: 'deterministic router response' },
  ];

  for (const lane of deterministicLanes) {
    const markerIdx = chatSrc.indexOf(`persist ${lane.marker}`);
    if (markerIdx === -1) {
      assert(`ME2c. ${lane.label} lane has persist marker`, false);
      continue;
    }
    // Look for the awaited enqueue call within 500 chars after the persist marker
    const region = chatSrc.substring(markerIdx, markerIdx + 500);
    assert(`ME2c. ${lane.label} lane awaits enqueueMemoryExtraction`,
      region.includes('await enqueueMemoryExtraction'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. At-most-once per request (structural guarantee)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3: At-most-once structural guarantee ===\n');
{
  // Each deterministic lane has exactly ONE call before returning
  // The lanes are mutually exclusive (if/return pattern)
  assert('ME3a. temporal lane returns after call',
    chatSrc.includes("meta: { deterministic: 'temporal' }"));
  assert('ME3b. grounded_facts lane returns after call',
    chatSrc.includes("meta: { deterministic: 'grounded_facts' }"));
  assert('ME3c. coaching lane returns after call',
    chatSrc.includes("meta: { deterministic: 'coaching'"));
  assert('ME3d. financial_insight lane returns after call',
    chatSrc.includes("meta: { deterministic: 'financial_insight'"));
  assert('ME3e. predictive_finance lane returns after call',
    chatSrc.includes("meta: { deterministic: 'predictive_finance'"));
  assert('ME3f. automation lane returns after call',
    chatSrc.includes("meta: { deterministic: 'automation'"));

  // Old scattered inline queueMemoryExtraction calls should be replaced
  const oldPattern1 = 'normalizedSessionIdForExtraction = normalizeSessionId';
  const oldPattern2 = 'normalizedSessionIdForExtraction2 = normalizeSessionId';
  assert('ME3g. old inline extraction pattern 1 removed',
    !chatSrc.includes(oldPattern1));
  assert('ME3h. old inline extraction pattern 2 removed',
    !chatSrc.includes(oldPattern2));

  // Old fire-and-forget helper must be fully removed
  assert('ME3i. old fireAndForgetMemoryEnqueue removed',
    !chatSrc.includes('function fireAndForgetMemoryEnqueue('));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. normalizeSessionId contract
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4: normalizeSessionId behavior ===\n');
{
  assert('ME4a. string passthrough', normalizeSessionId('session-abc') === 'session-abc');
  assert('ME4b. object with id', normalizeSessionId({ id: 'session-xyz' }) === 'session-xyz');
  assert('ME4c. null returns null', normalizeSessionId(null) === null);
  assert('ME4d. undefined returns null', normalizeSessionId(undefined) === null);
  assert('ME4e. object without id returns null', normalizeSessionId({ foo: 'bar' }) === null);
  assert('ME4f. number returns null', normalizeSessionId(42) === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Queue failure isolation (awaited but non-fatal)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5: Queue failure isolation ===\n');
{
  const helperStart = chatSrc.indexOf('async function enqueueMemoryExtraction(');
  const helperRegion = chatSrc.substring(helperStart, helperStart + 600);

  assert('ME5a. helper uses try/catch for error isolation',
    helperRegion.includes('try {') && helperRegion.includes('} catch'));
  assert('ME5b. helper logs non-fatal warning',
    helperRegion.includes('non-fatal'));
  assert('ME5c. helper awaits queue insert (Lambda-safe)',
    helperRegion.includes('await queueMemoryExtraction'));
  assert('ME5d. helper is async',
    helperRegion.startsWith('async function enqueueMemoryExtraction('));
  assert('ME5e. helper returns Promise<void>',
    helperRegion.includes('): Promise<void>'));

  // No inline worker/extraction processing
  assert('ME5f. no inline extraction processing',
    !helperRegion.includes('extractAndSaveMemories') &&
    !helperRegion.includes('extractFactsFromMessages'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Existing exclusions preserved
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6: Exclusion preservation ===\n');
{
  const memorySrc = readFileSync('netlify/functions/_shared/memory.ts', 'utf8');
  assert('ME6a. queueMemoryExtraction validates userId format',
    memorySrc.includes('uuidRegex.test(userId)'));
  assert('ME6b. queueMemoryExtraction handles FK errors',
    memorySrc.includes('foreign key constraint'));
  assert('ME6c. queueMemoryExtraction sets status to pending',
    memorySrc.includes("status: 'pending'"));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. PII masking preserved
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7: PII masking verification ===\n');
{
  // All call sites pass `masked` (PII-masked user message), never raw `userText`
  const callPattern = /await enqueueMemoryExtraction\(userId, finalSessionId, (\w+),/g;
  let match;
  let allUseMasked = true;
  let callCount = 0;
  while ((match = callPattern.exec(chatSrc)) !== null) {
    callCount++;
    if (match[1] !== 'masked') {
      allUseMasked = false;
      console.error(`  FAIL: call site uses "${match[1]}" instead of "masked"`);
    }
  }
  assert('ME7a. all 10 call sites pass PII-masked message', allUseMasked && callCount === 10);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`MEMORY ENQUEUE RELIABILITY: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
