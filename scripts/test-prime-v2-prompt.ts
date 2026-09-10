/**
 * Prime Reasoning & Conversation V2.1 — Prompt Surgery Tests
 *
 * Verifies that prompt surgery removed rigid formatting mandates,
 * gated the document template, fixed authority contract, and preserved
 * financial grounding.
 */
import { GLOBAL_BRAIN_RULES, PRIME_ORCHESTRATION_RULE, PRIME_WATCHER_INTELLIGENCE_MODE } from '../src/lib/ai/systemPrompts';
import { buildEmployeeBrainSystemPrompt } from '../src/lib/ai/brains/registry';
import { buildPrimeAuthoritySystemMessage } from '../netlify/functions/_shared/primePolicy';
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
// 2.5. Prime Authority Contract — no rigid formatting mandates
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2.5: Prime Authority Contract (primePolicy.ts) ===\n');
{
  const deep = buildPrimeAuthoritySystemMessage({ lane: 'deep', intent: 'general', hasSnapshot: true, hasDocs: false });
  const fast = buildPrimeAuthoritySystemMessage({ lane: 'fast', intent: 'general', hasSnapshot: true, hasDocs: false });

  // Removed old mandates
  assert('PA1. no "grade-4 clarity"', !deep.includes('grade-4'));
  assert('PA2. no "(a) Direct answer (b) What I used (c) Next steps"', !deep.includes('(a) Direct answer'));
  assert('PA3. no forced "## headings" mandate', !deep.includes('## headings and plain'));
  assert('PA4. no "Ask at most one question"', !deep.includes('Ask at most one question'));

  // Lane behavior preserved
  assert('PA5. fast lane is brief', fast.includes('brief'));
  assert('PA6. deep lane uses tools', deep.includes('read-only tools'));

  // Document handling preserved
  const withDocs = buildPrimeAuthoritySystemMessage({ lane: 'deep', intent: 'general', hasSnapshot: true, hasDocs: true });
  assert('PA7. document handling preserved', withDocs.includes('STATEMENT FINANCIAL DATA'));

  // Anti-markdown formatting
  assert('PA8. prohibits markdown headings', deep.includes('Do NOT use markdown headings'));
  assert('PA9. prohibits bullet lists', deep.includes('bullet lists'));
  assert('PA10. prohibits nested sub-items', deep.includes('nested sub-items'));
  assert('PA11. permits numbered lists when user asks', deep.includes('simple numbered list is fine'));
  assert('PA12. situation-specific reasoning required', deep.includes('situation-specific reasoning'));
  assert('PA13. conversational prose as default', deep.includes('natural conversational prose'));
  assert('PA14. speak-to-client framing', deep.includes('client across the table'));

  // Safety preserved
  assert('PA15. financial truth override', deep.includes('Server-verified financial evidence'));
  assert('PA16. confirmation gates preserved', deep.includes('confirmation gates'));
  assert('PA17. specialist write ownership preserved', deep.includes('specialist write ownership'));

  // Response contract — material user facts
  assert('PA20. requires using material user facts', deep.includes('USE those facts in your reasoning'));
  assert('PA21. prioritize based on THIS user', deep.includes('THIS person'));
  assert('PA22. no generic definitions', deep.includes('not a generic definition'));
  assert('PA23. missing info explains what and why', deep.includes('what is missing and why it matters'));
  assert('PA24. concise default (100-250 words)', deep.includes('100-250 visible words'));
  assert('PA25. canned endings prohibited', deep.includes('Would you like'));
  assert('PA26. challenge/reframe when useful', deep.includes('not a yes-man'));
  assert('PA27. lead with interpretation', deep.includes('Lead with interpretation'));

  // Conversation & continuity (V2.4c)
  assert('PA28. preferred name can be used naturally', deep.includes('preferred name naturally'));
  assert('PA29. name must NOT be mechanical', deep.includes('Do not use it mechanically'));
  assert('PA30. direct you/your language', deep.includes('"you" and "your"'));
  assert('PA31. conversation history used when relevant', deep.includes('previous fact, decision, or goal'));
  assert('PA32. irrelevant history not forced', deep.includes('Do not force callbacks'));
  assert('PA33. reason toward user goal', deep.includes('user\'s actual goal'));
  assert('PA34. conclusion before explanation', deep.includes('most useful conclusion or interpretation before'));
  assert('PA35. use facts as reasoning inputs', deep.includes('Use known facts as inputs to reasoning'));
  assert('PA36. history never overrides verified data', deep.includes('history never override'));
  assert('PA37. V2.4b concise behavior intact', deep.includes('100-250 visible words'));

  // Fact integrity (V2.4d)
  assert('PA38. unknown facts must not be stated as known', deep.includes('NEVER state a material user fact as known'));
  assert('PA39. must not invent values for calculations', deep.includes('Do not invent a plausible value'));
  assert('PA40. derived numbers identified as estimates', deep.includes('identify it as an estimate'));
  assert('PA41. assumptions must be stated', deep.includes('state the assumption'));
  assert('PA42. multi-period totals not silently annualized', deep.includes('annualizing a multi-period'));
  assert('PA43. hypothetical assumptions allowed when labeled', deep.includes('clearly labeled'));
  assert('PA44. natural communication of unknowns', deep.includes('say so naturally'));
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
