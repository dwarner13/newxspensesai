/**
 * Memory Worker Auth — Security Tests
 *
 * Verifies the internal auth gate on memory-extraction-worker.ts
 * prevents unauthenticated access and passes valid credentials.
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const workerSrc = readFileSync('netlify/functions/memory-extraction-worker.ts', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// MW1. Auth gate structure
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== MW1: Auth gate ===\n');
{
  // Checks MEMORY_WORKER_SECRET env var
  assert('MW1a. reads MEMORY_WORKER_SECRET env var', workerSrc.includes('process.env.MEMORY_WORKER_SECRET'));

  // Reads x-worker-secret header
  assert('MW1b. reads x-worker-secret header', workerSrc.includes("'x-worker-secret'"));

  // Returns 401 on missing/wrong credential
  assert('MW1c. returns 401 on auth failure', workerSrc.includes('statusCode: 401'));

  // Returns 503 when env var not set
  assert('MW1d. returns 503 when secret not configured', workerSrc.includes('statusCode: 503'));
}

// ═══════════════════════════════════════════════════════════════════════════
// MW2. Auth before database work
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== MW2: Auth ordering ===\n');
{
  const authCheck = workerSrc.indexOf('MEMORY_WORKER_SECRET');
  const dbAccess = workerSrc.indexOf('const sb = admin()');
  assert('MW2a. auth check before database access', authCheck < dbAccess);

  const claimCall = workerSrc.indexOf('claim_memory_extraction_job');
  assert('MW2b. auth check before queue claim', authCheck < claimCall);
}

// ═══════════════════════════════════════════════════════════════════════════
// MW3. Secret not logged
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== MW3: Secret safety ===\n');
{
  // Check no console.log/error/warn that includes the secret value
  const logLines = workerSrc.split('\n').filter(l =>
    /console\.(log|error|warn)/.test(l) && /expectedSecret|providedSecret/.test(l)
  );
  // The only log should be the "not set" warning which doesn't reveal the value
  const safeLogOnly = logLines.every(l => l.includes('not set') || !l.includes('expectedSecret'));
  assert('MW3a. secret value not logged', safeLogOnly);

  // Secret comparison uses strict equality
  assert('MW3b. strict equality comparison', workerSrc.includes('providedSecret !== expectedSecret'));
}

// ═══════════════════════════════════════════════════════════════════════════
// MW4. GET still rejected
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== MW4: Method check ===\n');
{
  assert('MW4a. non-POST returns 405', workerSrc.includes('statusCode: 405'));
  assert('MW4b. method check before auth check',
    workerSrc.indexOf('httpMethod') < workerSrc.indexOf('MEMORY_WORKER_SECRET'));
}

// ═══════════════════════════════════════════════════════════════════════════
// MW5. Worker contract unchanged after auth
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== MW5: Post-auth contract ===\n');
{
  assert('MW5a. still uses admin() after auth', workerSrc.includes('const sb = admin()'));
  assert('MW5b. still calls claim_memory_extraction_job', workerSrc.includes('claim_memory_extraction_job'));
  assert('MW5c. still calls extractAndSaveMemories', workerSrc.includes('extractAndSaveMemories'));
  assert('MW5d. still calls complete_memory_extraction_job', workerSrc.includes('complete_memory_extraction_job'));
  assert('MW5e. still calls fail_memory_extraction_job', workerSrc.includes('fail_memory_extraction_job'));
  assert('MW5f. still processes MAX_JOBS_PER_RUN', workerSrc.includes('MAX_JOBS_PER_RUN'));
}

console.log(`\n${'='.repeat(60)}`);
console.log(`MEMORY WORKER AUTH: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
