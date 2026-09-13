/**
 * Tool Execution Schema — Contract Tests
 *
 * Verifies that logToolExecution's insert contract matches the
 * tool_executions migration schema, and that logging is non-fatal.
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// Read both source files
const logSrc = readFileSync('src/agent/tools/logToolExecution.ts', 'utf8');
const migrationSrc = readFileSync('sql/migrations/20260912_tool_executions.sql', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// TE1. Insert columns match migration columns
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE1: Column contract ===\n');
{
  // Columns the code inserts
  const insertColumns = [
    'user_id', 'employee_slug', 'tool_id', 'mode', 'autonomy_level',
    'input_summary', 'affected_count', 'status', 'error_message',
  ];
  for (const col of insertColumns) {
    assert(`TE1a. insert column "${col}" in migration`, migrationSrc.includes(col));
    assert(`TE1b. insert column "${col}" in code`, logSrc.includes(col));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TE2. Table name matches
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE2: Table name ===\n');
{
  assert('TE2a. code inserts into tool_executions', logSrc.includes("from('tool_executions')"));
  assert('TE2b. migration creates tool_executions', migrationSrc.includes('CREATE TABLE IF NOT EXISTS public.tool_executions'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TE3. Non-fatal logging
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE3: Non-fatal ===\n');
{
  assert('TE3a. errors are caught', logSrc.includes('if (!result.ok)'));
  assert('TE3b. errors are logged not thrown', logSrc.includes('console.error'));
  assert('TE3c. function returns void', logSrc.includes('Promise<void>'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TE4. Security
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE4: Security ===\n');
{
  assert('TE4a. RLS enabled', migrationSrc.includes('ENABLE ROW LEVEL SECURITY'));
  assert('TE4b. user_id references auth.users', migrationSrc.includes('REFERENCES auth.users'));
  assert('TE4c. user_id has ON DELETE CASCADE', migrationSrc.includes('ON DELETE CASCADE'));
  assert('TE4d. service-role only comment', migrationSrc.includes('service-role'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TE5. Input sanitization
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE5: Input sanitization ===\n');
{
  assert('TE5a. sensitive fields redacted', logSrc.includes('[REDACTED]'));
  assert('TE5b. input truncated to 500 chars', logSrc.includes('500'));
  assert('TE5c. generateInputSummary exists', logSrc.includes('function generateInputSummary'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TE6. Status enum consistency
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE6: Status enum ===\n');
{
  const codeStatuses = ['success', 'error', 'skipped', 'cancelled'];
  for (const s of codeStatuses) {
    assert(`TE6. status "${s}" in both code and migration`,
      logSrc.includes(`'${s}'`) && migrationSrc.includes(`'${s}'`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TE7. Mode enum consistency
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TE7: Mode enum ===\n');
{
  const codeModes = ['explain-only', 'propose-confirm', 'auto-pilot'];
  for (const m of codeModes) {
    assert(`TE7. mode "${m}" in both code and migration`,
      logSrc.includes(`'${m}'`) && migrationSrc.includes(`'${m}'`));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TOOL EXECUTION SCHEMA: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
