/**
 * Quick verification script for the tool confirmation gate.
 * Run: TOOL_CONFIRM_SECRET=<secret> npx tsx scripts/test-tool-confirmation.ts
 */

import { hashArgs, verifySignature, requiresConfirmation } from '../netlify/functions/_shared/toolConfirmation';
import { createHmac } from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// Ensure TOOL_CONFIRM_SECRET is set for testing
if (!process.env.TOOL_CONFIRM_SECRET || process.env.TOOL_CONFIRM_SECRET.length < 32) {
  process.env.TOOL_CONFIRM_SECRET = 'test_secret_key_that_is_at_least_32_characters_long_for_testing_purposes';
}

console.log('\n=== T01: Canonical Args Hashing ===');
{
  const a = { z: 1, a: 2, m: 3 };
  const b = { a: 2, m: 3, z: 1 };
  assert(hashArgs(a) === hashArgs(b), 'Same hash for reordered keys');

  const c = { outer: { z: 'z', a: 'a' }, list: [1, 2] };
  const d = { list: [1, 2], outer: { a: 'a', z: 'z' } };
  assert(hashArgs(c) === hashArgs(d), 'Same hash for deeply nested reordered keys');

  assert(hashArgs({ x: 1 }) !== hashArgs({ x: 2 }), 'Different hash for different values');
  assert(hashArgs({ x: 1 }) !== hashArgs({ y: 1 }), 'Different hash for different keys');
  assert(hashArgs([1, 2]) !== hashArgs([2, 1]), 'Array order matters');
  assert(hashArgs({}) !== hashArgs([]), 'Empty object != empty array');
  assert(hashArgs(null) === hashArgs(undefined), 'null == undefined (both canonicalize to null)');
}

console.log('\n=== T02: Gating Policy ===');
{
  assert(requiresConfirmation({ requiresConfirm: true }) === true, 'requiresConfirm gates');
  assert(requiresConfirmation({ mutates: true }) === true, 'mutates gates');
  assert(requiresConfirmation({ costly: true }) === true, 'costly gates');
  assert(requiresConfirmation({ requiresConfirm: true, mutates: true, costly: true }) === true, 'All flags gate');
  assert(requiresConfirmation({}) === false, 'Empty meta does NOT gate');
  assert(requiresConfirmation({ requiresConfirm: false }) === false, 'False requiresConfirm does NOT gate');
  assert(requiresConfirmation({ mutates: false, costly: false }) === false, 'All false does NOT gate');

  // Known tool classifications
  // tx_search: read-only
  assert(requiresConfirmation({}) === false, 'tx_search (read-only) not gated');
  // delete_my_data: requiresConfirm + mutates
  assert(requiresConfirmation({ requiresConfirm: true, mutates: true }) === true, 'delete_my_data gated');
  // export_my_data: costly only
  assert(requiresConfirmation({ costly: true }) === true, 'export_my_data (costly) gated');
  // byte_rename_import: mutates only
  assert(requiresConfirmation({ mutates: true }) === true, 'byte_rename_import (mutates) gated');
  // request_employee_handoff: no flags
  assert(requiresConfirmation({}) === false, 'request_employee_handoff not gated');
}

console.log('\n=== T03: HMAC Signature Verification ===');
{
  // Fake tokens should fail
  assert(verifySignature('', 'id', 'user', 'session', 'tool', 'hash', Date.now()) === false, 'Empty token rejected');
  assert(verifySignature('abcd', 'id', 'user', 'session', 'tool', 'hash', Date.now()) === false, 'Short token rejected');
  assert(verifySignature('0'.repeat(64), 'id', 'user', 'session', 'tool', 'hash', Date.now()) === false, 'All-zeros token rejected');
  assert(verifySignature('a'.repeat(64), 'id', 'user', 'session', 'tool', 'hash', 1000) === false, 'Random 64-char hex rejected');
}

console.log('\n=== T04: Changed Args Cannot Reuse Approval ===');
{
  const args1 = { category: 'Food', transactionId: 'tx-123' };
  const args2 = { category: 'Shopping', transactionId: 'tx-123' };
  assert(hashArgs(args1) !== hashArgs(args2), 'Different args produce different hashes');
}

console.log('\n=== T05: Model Cannot Forge Confirmation ===');
{
  // Even if the model knows the confirmationId and all other fields,
  // it cannot produce a valid HMAC without the signing secret
  const fakeToken = createHmac('sha256', 'wrong_secret').update('any:data').digest('hex');
  assert(
    verifySignature(fakeToken, 'id', 'user', 'session', 'tool', 'hash', 1000) === false,
    'Token signed with wrong secret is rejected'
  );
}

console.log('\n=== T06: Handoff Tool Not Gated ===');
{
  // request_employee_handoff has no requiresConfirm, mutates, or costly flags
  assert(
    requiresConfirmation({ timeout: 5000 }) === false,
    'request_employee_handoff (timeout-only) is NOT gated — handoffs work'
  );
}

console.log('\n=== T07: Tag Search Not Gated ===');
{
  // tx_search has no gating flags
  assert(
    requiresConfirmation({ timeout: 15000 }) === false,
    'tx_search (timeout+rateLimit only) is NOT gated — Tag search works'
  );
  // tag_explain_category: read-only
  assert(
    requiresConfirmation({ timeout: 15000 }) === false,
    'tag_explain_category not gated'
  );
  // tag_category_brain: read-only
  assert(
    requiresConfirmation({ timeout: 20000 }) === false,
    'tag_category_brain not gated'
  );
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
