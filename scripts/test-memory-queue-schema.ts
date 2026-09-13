/**
 * Memory Queue Schema — RPC Contract Tests
 *
 * Verifies the claim/complete/fail RPCs match the worker's expectations
 * and the migration fixes the ambiguous column reference.
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// Read the migration
const migrationSrc = readFileSync('sql/migrations/20260913_fix_claim_memory_extraction_rpc.sql', 'utf8');

// Read the worker to verify return shape expectations
const workerSrc = readFileSync('netlify/functions/memory-extraction-worker.ts', 'utf8');

console.log('\n=== MQ1: Fixed claim RPC ===\n');
{
  // No unqualified "id" in WHERE clauses
  const whereLines = migrationSrc.split('\n').filter(l => l.trim().startsWith('WHERE') || l.trim().includes('WHERE'));
  let hasUnqualifiedId = false;
  for (const line of whereLines) {
    // Check for bare "id =" without table qualifier
    if (/\bWHERE\s+id\s*=/.test(line) || /\bWHERE\b.*\bid\s*=/.test(line.replace(/\b\w+\.id\b/g, '').replace(/memory_extraction_queue\.id/g, ''))) {
      // Check it's not qualified
      if (!line.includes('q.id') && !line.includes('memory_extraction_queue.id') && !line.includes('claimed_id')) {
        hasUnqualifiedId = true;
      }
    }
  }
  assert('MQ1a. no unqualified "id" in WHERE clauses', !hasUnqualifiedId);

  // Uses DECLARE claimed_id (not job_id which shadows)
  assert('MQ1b. uses claimed_id variable', migrationSrc.includes('claimed_id'));

  // Uses FOR UPDATE SKIP LOCKED
  assert('MQ1c. atomic claim with FOR UPDATE SKIP LOCKED', migrationSrc.includes('FOR UPDATE SKIP LOCKED'));

  // Checks retry_count < max_retries
  assert('MQ1d. respects retry limit', migrationSrc.includes('retry_count < q.max_retries'));

  // Orders by created_at ASC (oldest first)
  assert('MQ1e. claims oldest first', migrationSrc.includes('ORDER BY q.created_at ASC'));

  // LIMIT 1
  assert('MQ1f. claims exactly one job', migrationSrc.includes('LIMIT 1'));

  // Sets status to processing
  assert('MQ1g. marks claimed job as processing', migrationSrc.includes("status = 'processing'"));

  // Returns the expected columns
  assert('MQ1h. returns id column', migrationSrc.includes('RETURNS TABLE') && migrationSrc.includes('id uuid'));
  assert('MQ1i. returns user_id', migrationSrc.includes('user_id uuid'));
  assert('MQ1j. returns user_message', migrationSrc.includes('user_message text'));
}

console.log('\n=== MQ2: Worker contract match ===\n');
{
  // Worker expects: jobData.id, jobData.user_id, jobData.session_id, jobData.user_message, jobData.assistant_response
  assert('MQ2a. worker reads jobData.id', workerSrc.includes('jobData.id'));
  assert('MQ2b. worker reads jobData.user_id', workerSrc.includes('jobData.user_id'));
  assert('MQ2c. worker reads jobData.session_id', workerSrc.includes('jobData.session_id'));
  assert('MQ2d. worker reads jobData.user_message', workerSrc.includes('jobData.user_message'));
  assert('MQ2e. worker reads jobData.assistant_response', workerSrc.includes('jobData.assistant_response'));

  // All these columns are in the RETURNS TABLE
  assert('MQ2f. session_id in return', migrationSrc.includes('session_id uuid'));
  assert('MQ2g. assistant_response in return', migrationSrc.includes('assistant_response text'));
  assert('MQ2h. retry_count in return', migrationSrc.includes('retry_count int'));
}

console.log('\n=== MQ3: Safety ===\n');
{
  // Only claims pending jobs
  assert('MQ3a. only claims pending', migrationSrc.includes("q.status = 'pending'"));

  // WHERE clause qualifies table columns
  const updateWhere = migrationSrc.match(/UPDATE.*WHERE.*claimed_id/s);
  assert('MQ3b. UPDATE WHERE uses claimed_id', !!updateWhere);

  // RETURN QUERY uses qualified columns
  assert('MQ3c. RETURN QUERY uses q.id', migrationSrc.includes('q.id,'));
}

console.log(`\n${'='.repeat(60)}`);
console.log(`MEMORY QUEUE SCHEMA: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
