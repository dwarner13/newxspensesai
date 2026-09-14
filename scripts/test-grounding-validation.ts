/**
 * Regression tests for memory extraction grounding validation.
 * Prevents prompt example leakage (V1.2C defect).
 *
 * Run: npx tsx scripts/test-grounding-validation.ts
 */

// Import the grounding validator (pure functions, no Supabase dependency)
import { isValueGroundedInSource } from '../netlify/functions/_shared/memory-grounding.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.error(`  FAIL: ${name}`);
  }
}

// ============================================================================
// A. SHOULD ALLOW — value is supported by source text
// ============================================================================
console.log('\n=== GROUNDED VALUES (should PASS) ===');

assert(
  isValueGroundedInSource('250000', 'I have $250,000 saved.'),
  '$250,000 -> 250000'
);

assert(
  isValueGroundedInSource('180000', 'I make $180K a year.'),
  '$180K -> 180000'
);

assert(
  isValueGroundedInSource('180000', 'I make $180,000 a year.'),
  '$180,000 -> 180000'
);

assert(
  isValueGroundedInSource('3 years', 'I want to retire in three years.'),
  '"three years" -> "3 years"'
);

assert(
  isValueGroundedInSource('3 years', 'I want to retire in 3 years.'),
  '"3 years" -> "3 years"'
);

assert(
  isValueGroundedInSource('500 weekly', 'I contribute $500 a week to my TFSA.'),
  '$500 weekly -> 500 weekly'
);

assert(
  isValueGroundedInSource('31000', 'I owe $31,000 on my car.'),
  '$31,000 -> 31000 (when user actually says it)'
);

assert(
  isValueGroundedInSource('170000', '$170,000 left on my mortgage'),
  '$170,000 -> 170000'
);

assert(
  isValueGroundedInSource('20000', 'I have $20,000 available.'),
  '$20,000 -> 20000'
);

assert(
  isValueGroundedInSource('Edmonton', 'I live in edmonton.'),
  'text-only: Edmonton (no numeric component)'
);

assert(
  isValueGroundedInSource('freelance consulting', 'I do freelance consulting.'),
  'text-only: freelance consulting'
);

assert(
  isValueGroundedInSource('CSV', 'I want CSV exports.'),
  'text-only: CSV'
);

assert(
  isValueGroundedInSource('$50k by Dec 2026', 'My goal is $50k by Dec 2026.'),
  '$50k by Dec 2026 (when user actually says it)'
);

assert(
  isValueGroundedInSource('2 years', 'I want to be debt free in two years.'),
  '"two years" -> "2 years"'
);

assert(
  isValueGroundedInSource('2 years', 'I want to be debt free in 2 years.'),
  '"2 years" -> "2 years"'
);

// ============================================================================
// B. SHOULD REJECT — value is NOT in source (fabrication / prompt leakage)
// ============================================================================
console.log('\n=== UNGROUNDED VALUES (should REJECT) ===');

assert(
  !isValueGroundedInSource('31000', 'I currently have $250,000 saved and I still have some debt.'),
  'LEAKAGE: 31000 not in "$250K saved, some debt"'
);

assert(
  !isValueGroundedInSource('$50k by Dec 2026', 'I currently have $250,000 saved and I still have some debt.'),
  'LEAKAGE: "$50k by Dec 2026" not in "$250K saved, some debt"'
);

assert(
  !isValueGroundedInSource('31000', 'I still have some debt.'),
  'fabricated: 31000 not in "some debt"'
);

assert(
  !isValueGroundedInSource('3 years', 'I want to retire soon.'),
  'fabricated: "3 years" not in "retire soon"'
);

assert(
  !isValueGroundedInSource('180000', 'I make good money.'),
  'fabricated: 180000 not in "good money"'
);

assert(
  !isValueGroundedInSource('250000', 'hi there how are you'),
  'fabricated: 250000 not in greeting'
);

assert(
  !isValueGroundedInSource('$50k by Dec 2026', 'I want to save more.'),
  'fabricated: "$50k by Dec 2026" not in "save more"'
);

assert(
  !isValueGroundedInSource('500000', 'I have $250,000 saved.'),
  'wrong amount: 500000 not in "$250,000"'
);

// ============================================================================
// C. V1.2C EXACT REGRESSION — the message that caused the defect
// ============================================================================
console.log('\n=== V1.2C EXACT REGRESSION ===');

const v12cMsg = 'I currently have $250,000 saved and I still have some debt. Based on what I already told you, what would you focus on first over these next three years?';

assert(
  isValueGroundedInSource('250000', v12cMsg),
  'V1.2C: savings_balance=250000 GROUNDED'
);

assert(
  isValueGroundedInSource('3 years', v12cMsg),
  'V1.2C: retirement_timeline="3 years" GROUNDED (word "three" present)'
);

assert(
  !isValueGroundedInSource('31000', v12cMsg),
  'V1.2C: vehicle_debt_balance=31000 REJECTED (prompt leakage)'
);

assert(
  !isValueGroundedInSource('$50k by Dec 2026', v12cMsg),
  'V1.2C: savings_goal="$50k by Dec 2026" REJECTED (prompt leakage)'
);

// ============================================================================
// D. EDGE CASES
// ============================================================================
console.log('\n=== EDGE CASES ===');

assert(
  isValueGroundedInSource('', 'some text'),
  'empty value passes (no numeric component)'
);

assert(
  !isValueGroundedInSource('31000', ''),
  'empty source rejects numeric value'
);

assert(
  !isValueGroundedInSource('25000', 'I have $250,000 saved.'),
  'partial: 25000 not in $250,000 (different number)'
);

// ============================================================================
// E. ADDITIONAL REGRESSION — vague statements should not produce numbers
// ============================================================================
console.log('\n=== VAGUE STATEMENT REGRESSION ===');

assert(
  !isValueGroundedInSource('180000', 'I make a good living.'),
  'vague: no amount in "good living"'
);

assert(
  !isValueGroundedInSource('250000', 'I have some savings.'),
  'vague: no amount in "some savings"'
);

assert(
  !isValueGroundedInSource('5 years', 'I want to retire eventually.'),
  'vague: no timeline in "eventually"'
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
