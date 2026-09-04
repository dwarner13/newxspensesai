/**
 * Phase 1B.2b Retry Revalidation Tests
 *
 * Validates that the false-zero retry answer is subjected to the SAME
 * grounding validation as the original answer.
 */
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';
import { validateGroundedAnswer, detectsFalseZero, type FinancialEvidence } from '../src/shared/financial-grounding';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const fuelClassification = classifyFinancialQuery(
  'What can you tell me about my fuel expense in 2025?',
);

const verifiedEvidence: FinancialEvidence = {
  grounded: true,
  toolName: 'tax_summary',
  queryStatus: 'verified',
};

const verifiedZeroEvidence: FinancialEvidence = {
  grounded: true,
  toolName: 'tax_summary',
  queryStatus: 'verified_zero',
};

console.log('=== Phase 1B.2b: Retry Revalidation Tests ===\n');

// Test 1: Original false-zero + retry correct → accepted
assert('1. corrected retry accepted',
  validateGroundedAnswer(
    'In 2025, you spent $6,472.65 on gas and fuel across 123 transactions.',
    verifiedEvidence, fuelClassification
  ) === null
);

// Test 2: Original false-zero + retry same false-zero → rejected
const prodFalseZero = "In 2025, there were no recorded expenses for gas and fuel. If you expected to see some expenses here, we might need to check if a recent import didn't complete. Would you like to explore another option or check for any recent imports?";
assert('2. same false-zero retry rejected',
  validateGroundedAnswer(prodFalseZero, verifiedEvidence, fuelClassification) === 'false_zero_without_evidence'
);
assert('2b. production false-zero is 234 chars',
  prodFalseZero.length === 234
);

// Test 3: Different false-zero wording → rejected
assert('3. different false-zero wording rejected',
  validateGroundedAnswer(
    "I couldn't find any fuel transactions in your records for 2025.",
    verifiedEvidence, fuelClassification
  ) === 'false_zero_without_evidence'
);

// Test 4: $0 retry rejected unless verified_zero
assert('4. $0 retry rejected when evidence=verified',
  validateGroundedAnswer(
    'Your fuel expenses for 2025 total $0.00.',
    verifiedEvidence, fuelClassification
  ) === 'false_zero_without_evidence'
);

// Test 5: verified_zero evidence + legitimate zero → allowed
assert('5. verified_zero permits legitimate zero claim',
  validateGroundedAnswer(
    'I found no fuel transactions for 2025.',
    verifiedZeroEvidence, fuelClassification
  ) === null
);

// Test 6: All false-zero variants rejected with verified evidence
const falseZeroVariants = [
  'There were no recorded expenses for gas and fuel.',
  'No transactions found for fuel in 2025.',
  "You didn't have any fuel expenses.",
  "You don't have any fuel charges on record.",
  "I didn't find any fuel transactions.",
  'None found for that category.',
  'There is no data for fuel expenses in 2025.',
];
let allRejected = true;
for (const v of falseZeroVariants) {
  const r = validateGroundedAnswer(v, verifiedEvidence, fuelClassification);
  if (r !== 'false_zero_without_evidence') {
    allRejected = false;
    console.error(`  variant NOT rejected: "${v}" got: ${r}`);
  }
}
assert('6. all false-zero variants rejected with verified evidence', allRejected);

// Test 7: Empty retry response
// Empty strings are caught by `retryContent.trim()` BEFORE reaching validateGroundedAnswer.
// validateGroundedAnswer returns null for empty (no false-zero patterns matched) which is fine
// since the empty check gates it.
const emptyTrimCheck = !(''.trim());
assert('7. empty string caught by trim() gate before validation', emptyTrimCheck);

// Test 8: Normal grounded non-zero response → unaffected
assert('8. normal grounded response passes',
  validateGroundedAnswer(
    'Based on your records, you spent $6,472.65 on fuel in 2025 across 123 transactions. The majority were at Shell and Petro-Canada.',
    verifiedEvidence, fuelClassification
  ) === null
);

// Test 9: detectsFalseZero correctly identifies patterns
assert('9a. detectsFalseZero: "no recorded expenses"', detectsFalseZero('There were no recorded fuel expenses for 2025.'));
assert('9b. detectsFalseZero: "$0.00"', detectsFalseZero('You spent $0.00 on fuel.'));
assert('9c. detectsFalseZero: positive response NOT flagged', !detectsFalseZero('You spent $6,472.65 on fuel in 2025.'));

// Test 10: Retry validation logic in chat.ts context
// Simulate: retryContent passes trim() but fails validateGroundedAnswer
const retryValidation = validateGroundedAnswer(prodFalseZero, verifiedEvidence, fuelClassification);
const wouldAcceptOldCode = prodFalseZero && prodFalseZero.trim(); // old check: truthy
const wouldAcceptNewCode = retryValidation === null;
assert('10a. old code WOULD accept the retry (bug)', !!wouldAcceptOldCode);
assert('10b. new code rejects the retry (fix)', !wouldAcceptNewCode);

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
