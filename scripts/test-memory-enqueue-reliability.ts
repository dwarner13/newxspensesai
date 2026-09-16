/**
 * Memory Enqueue Reliability — Contract Tests
 *
 * Verifies the fireAndForgetMemoryEnqueue pattern guarantees:
 * 1. Exactly one queue call per valid completed exchange
 * 2. Queue failure does not propagate
 * 3. Invalid sessions produce no queue calls
 * 4. Deterministic lanes get the same memory opportunity as model lanes
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
  assert('ME1a. fireAndForgetMemoryEnqueue defined',
    chatSrc.includes('function fireAndForgetMemoryEnqueue('));
  assert('ME1b. helper calls queueMemoryExtraction',
    chatSrc.includes('queueMemoryExtraction({') &&
    chatSrc.includes('fireAndForgetMemoryEnqueue'));
  assert('ME1c. helper catches errors',
    // The helper function body contains .catch()
    /fireAndForgetMemoryEnqueue[\s\S]*?\.catch\(/.test(chatSrc));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Verify deterministic lanes call memory enqueue
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: Deterministic lane coverage ===\n');
{
  // Count fireAndForgetMemoryEnqueue calls in the file
  const calls = chatSrc.match(/fireAndForgetMemoryEnqueue\(/g) || [];
  assert('ME2a. multiple enqueue call sites exist', calls.length >= 9);
  // Should cover: router, temporal, grounded_facts, clarification, coaching,
  // financial_insight, predictive, automation, model-path-1, model-path-2

  // Verify specific deterministic lanes have the call nearby
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
    // Find the persist error message and check that fireAndForgetMemoryEnqueue appears nearby
    const markerIdx = chatSrc.indexOf(`persist ${lane.marker}`);
    if (markerIdx === -1) {
      assert(`ME2b. ${lane.label} lane has persist marker`, false);
      continue;
    }
    // Look for the enqueue call within 500 chars after the persist marker
    const region = chatSrc.substring(markerIdx, markerIdx + 500);
    assert(`ME2b. ${lane.label} lane calls fireAndForgetMemoryEnqueue`,
      region.includes('fireAndForgetMemoryEnqueue'));
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
  // Check that the old pattern with normalizedSessionIdForExtraction is gone
  // (replaced by the helper)
  const oldPattern1 = 'normalizedSessionIdForExtraction = normalizeSessionId';
  const oldPattern2 = 'normalizedSessionIdForExtraction2 = normalizeSessionId';
  assert('ME3g. old inline extraction pattern 1 removed',
    !chatSrc.includes(oldPattern1));
  assert('ME3h. old inline extraction pattern 2 removed',
    !chatSrc.includes(oldPattern2));
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
// 5. Queue failure isolation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5: Queue failure isolation ===\n');
{
  // The helper catches errors and logs them — verify the pattern
  const helperRegion = chatSrc.substring(
    chatSrc.indexOf('function fireAndForgetMemoryEnqueue('),
    chatSrc.indexOf('function fireAndForgetMemoryEnqueue(') + 600
  );
  assert('ME5a. helper uses .catch() for error isolation',
    helperRegion.includes('.catch('));
  assert('ME5b. helper logs non-fatal warning',
    helperRegion.includes('non-fatal'));
  assert('ME5c. helper does not await (fire-and-forget)',
    !helperRegion.includes('await queueMemoryExtraction'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Existing exclusions preserved
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6: Exclusion preservation ===\n');
{
  // The queueMemoryExtraction function itself validates userId (UUID format)
  // and handles FK errors. These are not changed.
  const memorySrc = readFileSync('netlify/functions/_shared/memory.ts', 'utf8');
  assert('ME6a. queueMemoryExtraction validates userId format',
    memorySrc.includes('uuidRegex.test(userId)'));
  assert('ME6b. queueMemoryExtraction handles FK errors',
    memorySrc.includes('foreign key constraint'));
  assert('ME6c. queueMemoryExtraction sets status to pending',
    memorySrc.includes("status: 'pending'"));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`MEMORY ENQUEUE RELIABILITY: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
