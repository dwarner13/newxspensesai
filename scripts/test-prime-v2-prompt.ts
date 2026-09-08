/**
 * Prime Reasoning & Conversation V2.1 — Prompt Surgery Tests
 *
 * Verifies that prompt surgery removed rigid formatting mandates,
 * gated the document template, and preserved financial grounding.
 */
import { GLOBAL_BRAIN_RULES, PRIME_ORCHESTRATION_RULE, PRIME_WATCHER_INTELLIGENCE_MODE } from '../src/lib/ai/systemPrompts';
import { buildEmployeeBrainSystemPrompt } from '../src/lib/ai/brains/registry';
import { classifyFinancialQuery } from '../src/shared/financial-query-classifier';
import { buildPreExecutionPlan, buildEvidenceSystemMessage } from '../src/shared/financial-grounding';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. GLOBAL_BRAIN_RULES — no unconditional bullet/next-step mandate
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1: GLOBAL_BRAIN_RULES formatting ===\n');
{
  // Old mandates should be gone
  assert('1a. no "End with ONE clear Next Step"',
    !GLOBAL_BRAIN_RULES.includes('End with ONE clear Next Step'));
  assert('1b. no "Short sections" mandate',
    !GLOBAL_BRAIN_RULES.includes('- Short sections'));
  assert('1c. no "Bullet points" mandate',
    !GLOBAL_BRAIN_RULES.includes('- Bullet points'));

  // Adaptive guidance should be present
  assert('1d. has adaptive response guidance',
    GLOBAL_BRAIN_RULES.includes('Match the structure and length'));
  assert('1e. allows answers to simply end',
    GLOBAL_BRAIN_RULES.includes('answer may simply end'));

  // Financial boundary must remain
  assert('1f. financial boundary intact',
    GLOBAL_BRAIN_RULES.includes('FINANCIAL BOUNDARY'));
  assert('1g. no invented data rule intact',
    GLOBAL_BRAIN_RULES.includes('NO INVENTED DATA'));
  assert('1h. question detection intact',
    GLOBAL_BRAIN_RULES.includes('QUESTION DETECTION'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PRIME_ORCHESTRATION_RULE — still exists but should be gated
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: PRIME_ORCHESTRATION_RULE content ===\n');
{
  // Document template still exists as a module export
  assert('2a. orchestration rule still defined',
    PRIME_ORCHESTRATION_RULE.includes('DOCUMENT SUMMARY TEMPLATE'));
  assert('2b. orchestration rule has bullets-only directive',
    PRIME_ORCHESTRATION_RULE.includes('Use bullets only'));
  // (Gating is tested via chat.ts logic — see manual acceptance tests)
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Prime Brain Pack — reasoning contract present
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3: Prime brain pack reasoning contract ===\n');
{
  const prompt = buildEmployeeBrainSystemPrompt({
    employee_key: 'prime-boss',
    preferredName: 'Darrell',
    currency: 'CAD',
  });

  assert('3a. contains PRIME REASONING CONTRACT',
    prompt.includes('PRIME REASONING CONTRACT'));
  assert('3b. contains SYNTHESIZE instruction',
    prompt.includes("SYNTHESIZE, DON'T PARROT"));
  assert('3c. contains CHALLENGE ASSUMPTIONS',
    prompt.includes('CHALLENGE ASSUMPTIONS'));
  assert('3d. contains INTERVIEW MODE',
    prompt.includes('INTERVIEW MODE'));
  assert('3e. contains canned-ending avoidance',
    prompt.includes('canned endings'));
  assert('3f. contains financial truth override',
    prompt.includes('FINANCIAL TRUTH OVERRIDES'));
  assert('3g. preserves PRIME BOSS CONTRACT',
    prompt.includes('PRIME BOSS CONTRACT'));
  assert('3h. preserves delegation rules',
    prompt.includes('DELEGATION RULES'));
  assert('3i. preserves tool result synthesis',
    prompt.includes('TOOL RESULT SYNTHESIS'));
  assert('3j. contains PRIORITIZE behavior (via "matters most")',
    prompt.includes('matters most'));

  // Must still include GLOBAL_BRAIN_RULES (via registry)
  assert('3k. includes global brain rules',
    prompt.includes('GLOBAL BRAIN RULES'));
  assert('3l. includes financial boundary',
    prompt.includes('FINANCIAL BOUNDARY'));

  // Must include PRIME_WATCHER_INTELLIGENCE_MODE
  assert('3m. includes team awareness',
    prompt.includes('PRIME TEAM AWARENESS'));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Financial grounding unchanged
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4: Financial grounding regression ===\n');
{
  const c = classifyFinancialQuery('How much did I spend on fuel in 2025?');
  assert('4a. fuel aggregate grounded', c.requiresGrounding === true);
  assert('4b. queryType = aggregate', c.queryType === 'aggregate');
  assert('4c. resolvedCategory = Gas & Fuel', c.resolvedCategory?.subcategory === 'Gas & Fuel');

  const plan = buildPreExecutionPlan(c, 2026);
  assert('4d. tax_summary tool', plan.toolName === 'tax_summary');
  assert('4e. year = 2025', plan.toolArgs?.year === 2025);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Exact transaction lookup unchanged
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5: Transaction lookup regression ===\n');
{
  const c = classifyFinancialQuery('find my $76.72 transaction from August 21, 2025');
  assert('5a. grounded', c.requiresGrounding === true);
  assert('5b. exactDate = 2025-08-21', c.exactDate === '2025-08-21');
  assert('5c. exactAmount = 76.72', c.exactAmount === 76.72);
  assert('5d. merchant NOT August', c.merchantHint !== 'August');

  const plan = buildPreExecutionPlan(c, 2026);
  assert('5e. tx_search', plan.toolName === 'tx_search');
  assert('5f. startDate', plan.toolArgs?.startDate === '2025-08-21');
  assert('5g. minAmount', plan.toolArgs?.minAmount === 76.72);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. tx_search evidence rows still serialized
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6: Evidence serialization unchanged ===\n');
{
  const c = classifyFinancialQuery('find my $76.72 transaction from August 21, 2025');
  const txResult = {
    rows: [{ id: 'test-1', date: '2025-08-21', merchant: 'PETRO-CANADA', amount: -76.72, category: 'Transportation', subcategory: 'Medical', type: 'Purchase' }],
    totals: { count: 1, sum: -76.72, income: 0, spending: 76.72 },
    queryStatus: 'verified',
  };
  const msg = buildEvidenceSystemMessage('tx_search', txResult, c);
  assert('6a. contains date', msg.includes('2025-08-21'));
  assert('6b. contains merchant', msg.includes('PETRO-CANADA'));
  assert('6c. contains amount', msg.includes('76.72'));
  assert('6d. contains category', msg.includes('Transportation'));

  // tax_summary evidence also unchanged
  const taxResult = {
    sections: [{ title: 'Vehicle Expenses', total: 22825.72, count: 189, buckets: [{ label: 'Gas / Fuel', total: 6472.65, count: 123 }] }],
  };
  const taxMsg = buildEvidenceSystemMessage('tax_summary', taxResult, classifyFinancialQuery('fuel in 2025'));
  assert('6e. tax_summary contains 6472.65', taxMsg.includes('6472.65'));
}

console.log(`\n${'='.repeat(60)}`);
console.log(`PRIME V2.1 PROMPT SURGERY: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
