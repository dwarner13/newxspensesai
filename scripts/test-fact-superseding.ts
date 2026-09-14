/**
 * Fact Superseding V1.1 — Tests
 *
 * Verifies the key-based superseding design in memory-extraction.ts
 * and the statedAt plumbing from the worker.
 *
 * Tests are SOURCE-LEVEL: reads code to verify structural contracts.
 * Does NOT call the live worker or modify the database.
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const extractionSrc = readFileSync('netlify/functions/_shared/memory-extraction.ts', 'utf8');
const workerSrc = readFileSync('netlify/functions/memory-extraction-worker.ts', 'utf8');
const migrationSrc = readFileSync('sql/migrations/20260913_fact_superseding.sql', 'utf8');

// =============================================================================
// FS1. extractAndSaveMemories accepts statedAt parameter
// =============================================================================
console.log('\n=== FS1: statedAt parameter ===\n');
{
  assert('FS1a. statedAt in function signature',
    extractionSrc.includes('statedAt?: string'));
  assert('FS1b. statedAt destructured from params',
    extractionSrc.includes('statedAt } = params'));
  assert('FS1c. effectiveStatedAt fallback to now()',
    extractionSrc.includes("effectiveStatedAt = statedAt || new Date().toISOString()"));
}

// =============================================================================
// FS2. Keyed fact structure (prefix, key, value separated)
// =============================================================================
console.log('\n=== FS2: Keyed fact structure ===\n');
{
  assert('FS2a. KeyedFact type defined with prefix/key/value',
    extractionSrc.includes('prefix: string; key: string; value: string'));
  assert('FS2b. facts mapped with prefix "fact"',
    extractionSrc.includes("prefix: 'fact'"));
  assert('FS2c. prefs mapped with prefix "pref"',
    extractionSrc.includes("prefix: 'pref'"));
  assert('FS2d. corrections mapped with prefix "correct"',
    extractionSrc.includes("prefix: 'correct'"));
  // Legacy factStr still assembled for backward compat
  assert('FS2e. legacy factStr assembled from keyed parts',
    extractionSrc.includes('`${kf.prefix}:${kf.key}=${kf.value}`'));
}

// =============================================================================
// FS3. RPC upsert_memory_fact called with correct params
// =============================================================================
console.log('\n=== FS3: RPC call ===\n');
{
  assert('FS3a. calls upsert_memory_fact RPC',
    extractionSrc.includes("rpc('upsert_memory_fact'"));
  assert('FS3b. passes p_user_id',
    extractionSrc.includes('p_user_id: userId'));
  assert('FS3c. passes p_fact_key',
    extractionSrc.includes('p_fact_key: kf.key'));
  assert('FS3d. passes p_fact_value',
    extractionSrc.includes('p_fact_value: kf.value'));
  assert('FS3e. passes p_stated_at from effectiveStatedAt',
    extractionSrc.includes('p_stated_at: effectiveStatedAt'));
  assert('FS3f. passes p_fact (legacy string)',
    extractionSrc.includes('p_fact: factStr'));
  assert('FS3g. passes p_fact_hash',
    extractionSrc.includes('p_fact_hash: fact_hash'));
}

// =============================================================================
// FS4. Legacy fallback when RPC not deployed
// =============================================================================
console.log('\n=== FS4: Legacy fallback ===\n');
{
  assert('FS4a. catches PGRST202 (function not found)',
    extractionSrc.includes("rpcError.code === 'PGRST202'"));
  assert('FS4b. falls back to .upsert with onConflict user_id,fact_hash',
    extractionSrc.includes("onConflict: 'user_id,fact_hash'"));
  assert('FS4c. fallback logs warning',
    extractionSrc.includes('using legacy upsert'));
}

// =============================================================================
// FS5. Worker passes queue.created_at as statedAt
// =============================================================================
console.log('\n=== FS5: Worker statedAt plumbing ===\n');
{
  // Single-job path
  assert('FS5a. single-job SELECT includes created_at',
    workerSrc.includes('retry_count, max_retries, created_at'));
  assert('FS5b. single-job passes statedAt: claimed.created_at',
    workerSrc.includes('statedAt: claimed.created_at'));

  // Batch path
  assert('FS5c. batch path passes statedAt: jobData.created_at',
    workerSrc.includes('statedAt: jobData.created_at'));
}

// =============================================================================
// FS6. Migration: schema + RPC
// =============================================================================
console.log('\n=== FS6: Migration SQL ===\n');
{
  assert('FS6a. adds fact_key column',
    migrationSrc.includes('ADD COLUMN IF NOT EXISTS fact_key text'));
  assert('FS6b. adds fact_value column',
    migrationSrc.includes('ADD COLUMN IF NOT EXISTS fact_value text'));
  assert('FS6c. adds stated_at column',
    migrationSrc.includes('ADD COLUMN IF NOT EXISTS stated_at timestamptz'));
  assert('FS6d. creates partial unique index on (user_id, fact_key)',
    migrationSrc.includes('CREATE UNIQUE INDEX') &&
    migrationSrc.includes('(user_id, fact_key)') &&
    migrationSrc.includes('WHERE fact_key IS NOT NULL'));
  assert('FS6e. backfills existing rows',
    migrationSrc.includes("split_part(split_part(fact, ':', 2), '=', 1)"));
  assert('FS6f. backfill sets stated_at = COALESCE(stated_at, created_at)',
    migrationSrc.includes('COALESCE(stated_at, created_at)'));
}

// =============================================================================
// FS7. RPC stated_at guard: newer wins, older is no-op
// =============================================================================
console.log('\n=== FS7: stated_at guard in RPC ===\n');
{
  assert('FS7a. ON CONFLICT (user_id, fact_key)',
    migrationSrc.includes('ON CONFLICT (user_id, fact_key)'));
  assert('FS7b. DO UPDATE SET fact_value = EXCLUDED.fact_value',
    migrationSrc.includes('fact_value = EXCLUDED.fact_value'));
  assert('FS7c. WHERE EXCLUDED.stated_at > user_memory_facts.stated_at',
    migrationSrc.includes('EXCLUDED.stated_at > user_memory_facts.stated_at'));
  assert('FS7d. OR user_memory_facts.stated_at IS NULL',
    migrationSrc.includes('user_memory_facts.stated_at IS NULL'));
  // The WHERE clause after DO UPDATE SET is the core safety gate.
  // Verify the DO UPDATE block contains a WHERE guard (not unconditional).
  const doUpdateIdx = migrationSrc.indexOf('DO UPDATE SET');
  const whereGuardIdx = migrationSrc.indexOf('WHERE EXCLUDED.stated_at', doUpdateIdx);
  assert('FS7e. DO UPDATE has WHERE guard (not unconditional)',
    doUpdateIdx > 0 && whereGuardIdx > doUpdateIdx);
}

// =============================================================================
// FS8. Savings balance scenario: $200K then $250K
// =============================================================================
console.log('\n=== FS8: Superseding scenario validation ===\n');
{
  // Both would produce the same fact_key="savings_balance"
  // but different fact_value and fact_hash
  // The RPC should keep the one with newer stated_at

  // Verify the RPC receives the key (not the full fact string) as conflict target
  assert('FS8a. conflict target is fact_key not fact_hash',
    migrationSrc.includes('ON CONFLICT (user_id, fact_key)') &&
    !migrationSrc.includes('ON CONFLICT (user_id, fact_hash)'));

  // Verify different values for same key CAN update (different fact_hash is irrelevant)
  assert('FS8b. fact_hash updated on supersede (not used for conflict)',
    migrationSrc.includes('fact_hash  = EXCLUDED.fact_hash'));

  // Verify the fact string is also updated (for recall compatibility)
  assert('FS8c. legacy fact string updated on supersede',
    migrationSrc.includes('fact       = EXCLUDED.fact'));

  // Verify stated_at is updated to the newer value
  assert('FS8d. stated_at updated to new value on supersede',
    migrationSrc.includes('stated_at  = EXCLUDED.stated_at'));

  // Verify created_at is set to now() (extraction time, not stated time)
  assert('FS8e. created_at set to now() on supersede',
    migrationSrc.includes('created_at = now()'));
}

// =============================================================================
// FS9. Different keys coexist
// =============================================================================
console.log('\n=== FS9: Key coexistence ===\n');
{
  // The partial unique index only activates per (user_id, fact_key) pair
  // Different keys (savings_balance vs annual_income) have different fact_key values
  // so they never conflict — each gets its own row
  assert('FS9a. index is per (user_id, fact_key) not global',
    migrationSrc.includes('ON user_memory_facts (user_id, fact_key)'));
  // Verify the extraction maps each LLM-returned key independently
  assert('FS9b. each fact gets its own key from LLM response',
    extractionSrc.includes("key: String(f.key).trim()"));
}

// =============================================================================
// FS10. Queue created_at available and passed through
// =============================================================================
console.log('\n=== FS10: Queue timestamp provenance ===\n');
{
  // The queue row's created_at is set by Postgres DEFAULT now() at chat-time insert
  // (queueMemoryExtraction does NOT explicitly set created_at)
  // So queue.created_at = original message time, not extraction time

  // Worker single-job path must SELECT created_at from the claimed row
  const singleJobSelect = workerSrc.includes('created_at') &&
    workerSrc.indexOf('created_at') < workerSrc.indexOf('statedAt: claimed.created_at');
  assert('FS10a. single-job SELECT gets created_at before passing it',
    singleJobSelect);

  // extractAndSaveMemories uses statedAt for the RPC p_stated_at
  assert('FS10b. statedAt flows to p_stated_at in RPC call',
    extractionSrc.includes('p_stated_at: effectiveStatedAt'));

  // When statedAt is not provided (e.g. direct call outside worker),
  // effectiveStatedAt defaults to now()
  assert('FS10c. missing statedAt defaults to now()',
    extractionSrc.includes("statedAt || new Date().toISOString()"));
}

// =============================================================================
// FS11. Savings balance $200K replaced by $250K
// =============================================================================
console.log('\n=== FS11: $200K -> $250K replacement logic ===\n');
{
  // Both produce fact_key = "savings_balance"
  // $200K (stated Jan 2026) has stated_at = Jan 2026
  // $250K (stated Sep 2026) has stated_at = Sep 2026
  // RPC: if Sep > Jan -> UPDATE (correct)
  // RPC: if Jan < existing Sep -> NO-OP (backlog safety)

  // The guard clause is: WHERE EXCLUDED.stated_at > user_memory_facts.stated_at
  // This means:
  //   INSERT $200K first  -> row exists with stated_at=Jan
  //   INSERT $250K second -> EXCLUDED.stated_at(Sep) > Jan -> UPDATE to $250K  (correct)
  //
  //   INSERT $250K first  -> row exists with stated_at=Sep
  //   INSERT $200K second -> EXCLUDED.stated_at(Jan) > Sep -> FALSE -> NO-OP  (correct)

  assert('FS11a. guard uses strict > (not >=) for stated_at comparison',
    migrationSrc.includes('EXCLUDED.stated_at > user_memory_facts.stated_at'));

  // Strict > means same-timestamp re-processing is also a no-op (idempotent)
  assert('FS11b. same timestamp is a no-op (strict >)',
    !migrationSrc.includes('EXCLUDED.stated_at >= user_memory_facts.stated_at'));
}

console.log(`\n${'='.repeat(60)}`);
console.log(`FACT SUPERSEDING V1.1: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
