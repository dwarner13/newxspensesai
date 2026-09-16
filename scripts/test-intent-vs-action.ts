/**
 * Intent vs Action — Phase 2B Regression Tests
 *
 * Validates:
 * A. Prime delegation contract has INFORMATION vs ACTION principle
 * B. request_employee_handoff tool descriptions clarify action-only usage
 * C. Merchant extraction does not produce false positives on conversational words
 * D. Financial query classifier handles informational questions correctly
 * E. Existing legitimate merchant extraction still works
 * F. Existing delegation/ownership language preserved
 * G. No weakening of confirmation gates or write permissions
 */
import { readFileSync } from 'fs';
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';
import { analyzeQueryScope } from '../src/shared/tool-gate';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const primeBrainSrc = readFileSync('src/lib/ai/brains/prime.ts', 'utf8');
const handoffImplSrc = readFileSync('src/agent/tools/impl/request_employee_handoff.ts', 'utf8');
const toolIndexSrc = readFileSync('src/agent/tools/index.ts', 'utf8');
const classifierSrc = readFileSync('src/shared/financial-query-classifier.ts', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// A. Prime delegation contract has INFORMATION vs ACTION principle
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== A: INFORMATION vs ACTION principle in brain ===\n');

assert('A1. brain has INFORMATION vs ACTION header',
  primeBrainSrc.includes('INFORMATION vs ACTION'));
assert('A2. brain says answer questions about employees yourself',
  primeBrainSrc.includes('answer the question yourself'));
assert('A3. brain says mentioning domain is not action request',
  primeBrainSrc.includes('not an action request'));
assert('A4. brain says hypothetical is informational',
  primeBrainSrc.includes('Hypothetical or conditional phrasing'));
assert('A5. brain says do not treat ambiguous as mutation',
  primeBrainSrc.includes('Do not treat ambiguous language as a mutation request'));
assert('A6. Do NOT delegate section exists',
  primeBrainSrc.includes('Do NOT delegate WHEN'));
assert('A7. Do NOT delegate covers who-handles questions',
  primeBrainSrc.includes('who handles something'));
assert('A8. Do NOT delegate covers hypothetical',
  primeBrainSrc.includes('question is hypothetical or conditional'));
assert('A9. Delegate WHEN section preserved',
  primeBrainSrc.includes('Delegate WHEN:'));
assert('A10. Category mutation still Tag-owned',
  primeBrainSrc.includes('Category mutation remains Tag-owned'));
assert('A11. Actual category change still triggers handoff',
  primeBrainSrc.includes('requests an actual category change'));

// ═══════════════════════════════════════════════════════════════════════════
// B. request_employee_handoff tool descriptions clarify action-only
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== B: Handoff tool descriptions ===\n');

assert('B1. impl metadata says PERFORM specialist work',
  handoffImplSrc.includes('PERFORM specialist work'));
assert('B2. impl metadata says action executed',
  handoffImplSrc.includes('user wants an action executed'));
assert('B3. impl metadata says not for capability questions',
  handoffImplSrc.includes('not when they ask about who handles something'));
assert('B4. impl metadata preserves tag-ai routing',
  handoffImplSrc.includes('tag-ai'));
assert('B5. impl metadata preserves byte-docs routing',
  handoffImplSrc.includes('byte-docs'));
assert('B6. impl metadata preserves goalie-goals routing',
  handoffImplSrc.includes('goalie-goals'));
assert('B7. impl metadata preserves custodian routing',
  handoffImplSrc.includes('custodian'));
assert('B8. impl metadata preserves prime-boss routing',
  handoffImplSrc.includes('prime-boss'));

assert('B9. index description says PERFORM specialist work',
  toolIndexSrc.includes("PERFORM specialist work"));
assert('B10. index description says action executed',
  toolIndexSrc.includes("user wants an action executed"));
assert('B11. index description says not for capability questions',
  toolIndexSrc.includes("not when they ask about who handles something"));
assert('B12. index description consistent with impl on tag-ai',
  toolIndexSrc.includes('tag-ai'));

// ═══════════════════════════════════════════════════════════════════════════
// C. Merchant extraction — no false positives on conversational words
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== C: Merchant extraction — no false positives ===\n');

function getMerchant(msg: string): string | undefined {
  return classifyFinancialQuery(msg).merchantHint;
}

// The core bug: "talk to if" extracted "if" as merchant
assert('C1. "Who should I talk to if I want to change a category?" → no merchant',
  getMerchant('Who should I talk to if I want to change one of my transaction categories?') === undefined);

assert('C2. "What should I do if my spending gets too high?" → no merchant',
  getMerchant('What should I do if my spending gets too high?') === undefined);

assert('C3. "Who do I go to for my goals?" → no merchant',
  getMerchant('Who do I go to for my goals?') === undefined);

assert('C4. "Can Tag help with my categories?" → no merchant',
  getMerchant('Can Tag help with my categories?') === undefined);

assert('C5. "Who should I talk to about this?" → no merchant',
  getMerchant('Who should I talk to about this?') === undefined);

assert('C6. "I want to change something" → no merchant',
  getMerchant('I want to change something') === undefined);

assert('C7. "What do I need to know about budgets?" → no merchant',
  getMerchant('What do I need to know about budgets?') === undefined);

// ═══════════════════════════════════════════════════════════════════════════
// D. Financial query classifier — informational questions
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== D: Classifier handles informational questions ===\n');

// These should NOT require grounding (they are informational, not data queries)
// OR should at least not produce a merchant queryType

function noMerchantQuery(msg: string): boolean {
  const c = classifyFinancialQuery(msg);
  return c.queryType !== 'merchant';
}

assert('D1. "Who handles transaction categories?" → not merchant query',
  noMerchantQuery('Who handles transaction categories?'));

assert('D2. "What does Byte do?" → not merchant query',
  noMerchantQuery('What does Byte do?'));

assert('D3. "Who should I talk to about goals?" → not merchant query',
  noMerchantQuery('Who should I talk to about goals?'));

assert('D4. "Can Tag change categories?" → not merchant query',
  noMerchantQuery('Can Tag change categories?'));

assert('D5. "Can Byte read my bank statement?" → not merchant query',
  noMerchantQuery('Can Byte read my bank statement?'));

assert('D6. "Can Goalie help with debt goals?" → not merchant query',
  noMerchantQuery('Can Goalie help with debt goals?'));

assert('D7. "If I wanted to change a category, who would do it?" → not merchant query',
  noMerchantQuery('If I wanted to change a category, who would do it?'));

assert('D8. "If I wanted to upload a statement, how would that work?" → not merchant query',
  noMerchantQuery('If I wanted to upload a statement, how would that work?'));

assert('D9. "Don\'t change anything — who normally handles categories?" → not merchant query',
  noMerchantQuery("Don't change anything — who normally handles categories?"));

// ═══════════════════════════════════════════════════════════════════════════
// E. Legitimate merchant extraction still works
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== E: Legitimate merchants still extracted ===\n');

assert('E1. "I spent $50 at Costco yesterday" → Costco',
  getMerchant('I spent $50 at Costco yesterday') === 'Costco');

assert('E2. "How much did I spend at Walmart?" → Walmart',
  getMerchant('How much did I spend at Walmart?') === 'Walmart');

assert('E3. "Show me charges from Amazon" → Amazon',
  getMerchant('Show me charges from Amazon') === 'Amazon');

assert('E4. "I bought stuff at Petro-Canada" → Petro-Canada',
  getMerchant('I bought stuff at Petro-Canada') === 'Petro-Canada');

assert('E5. "paid to Bell Canada" → Bell',
  getMerchant('paid to Bell Canada') !== undefined);

assert('E6. "spent at Skip The Dishes" → Skip',
  getMerchant('I spent at Skip The Dishes') !== undefined);

// ═══════════════════════════════════════════════════════════════════════════
// F. Delegation/ownership language preserved
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== F: Delegation/ownership preserved ===\n');

assert('F1. PRIME BOSS CONTRACT header',
  primeBrainSrc.includes('PRIME BOSS CONTRACT'));
assert('F2. PRIME OWNS section',
  primeBrainSrc.includes('PRIME OWNS:'));
assert('F3. SPECIALISTS OWN section',
  primeBrainSrc.includes('SPECIALISTS OWN'));
assert('F4. Tag owns category mutations',
  primeBrainSrc.includes('Tag: transaction category MUTATIONS'));
assert('F5. Byte owns document parsing',
  primeBrainSrc.includes('Byte: document parsing'));
assert('F6. Goalie owns goal creation',
  primeBrainSrc.includes('Goalie: goal creation'));
assert('F7. Delegate when specialist write required',
  primeBrainSrc.includes('Specialist write/mutation is required'));
assert('F8. Delegate when user explicitly asks',
  primeBrainSrc.includes('user explicitly asks to work with that specialist'));
assert('F9. request_employee_handoff reference preserved',
  primeBrainSrc.includes('request_employee_handoff'));

// ═══════════════════════════════════════════════════════════════════════════
// G. Confirmation gates and write permissions unchanged
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== G: Security unchanged ===\n');

assert('G1. tag_update_transaction_category requires confirmation',
  toolIndexSrc.includes("['tag_update_transaction_category'") &&
  toolIndexSrc.includes('requiresConfirm: true'));
assert('G2. tag_update_transaction_category mutates',
  toolIndexSrc.includes("['tag_update_transaction_category'") &&
  /tag_update_transaction_category[\s\S]*?mutates:\s*true/.test(toolIndexSrc));
assert('G3. request_employee_handoff does NOT require confirmation',
  handoffImplSrc.includes('requiresConfirmation: false'));
assert('G4. bulk_categorize requires confirmation',
  /bulk_categorize[\s\S]*?requiresConfirm:\s*true/.test(toolIndexSrc));
assert('G5. delete_my_data requires confirmation',
  /delete_my_data[\s\S]*?requiresConfirm:\s*true/.test(toolIndexSrc));

// ═══════════════════════════════════════════════════════════════════════════
// H. Scope/mutation analysis for ambiguous messages
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== H: Scope analysis — ambiguous messages ===\n');

// These have mutation words but are not genuine action requests
// The scope.isMutation is lexical — it WILL fire on "change", "fix", etc.
// The point is that the classifier should NOT produce a merchant query from them.

assert('H1. "I need help with categories" → no merchant',
  getMerchant('I need help with categories.') === undefined);

assert('H2. "Something is wrong with this category" → no merchant',
  getMerchant('Something is wrong with this category.') === undefined);

// Genuine action requests should still work normally
assert('H3. "Change this Starbucks transaction to Business Meals" → Starbucks merchant detected',
  getMerchant('Change this Starbucks transaction to Business Meals') === 'Starbucks');

// ═══════════════════════════════════════════════════════════════════════════
// I. Bare "to" removed from merchant extraction regex
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== I: Regex change verified ===\n');

assert('I1. extractMerchantHint no longer uses bare "to" preposition',
  !classifierSrc.includes('at|from|to|paid to'));
assert('I2. "paid to" retained as compound preposition',
  classifierSrc.includes('paid to'));
assert('I3. "sent to" added as compound preposition',
  classifierSrc.includes('sent to'));
assert('I4. "at" retained',
  classifierSrc.includes('at|from|'));
assert('I5. "from" retained',
  classifierSrc.includes('|from|'));
assert('I6. "spent at" retained',
  classifierSrc.includes('spent at'));
assert('I7. "bought at" retained',
  classifierSrc.includes('bought at'));
assert('I8. "purchased at" retained',
  classifierSrc.includes('purchased at'));

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`INTENT VS ACTION: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
