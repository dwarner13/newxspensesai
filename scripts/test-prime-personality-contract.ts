/**
 * Prime Personality Contract — Phase 2A Regression Tests
 *
 * Validates:
 * A. New personality contract reaches Prime
 * B. Duplicate personality instructions removed/gated
 * C. FACT INTEGRITY remains
 * D. Unavailable account balance protection remains
 * E. Dead Prime AI Fluency reference is gone
 * F. $0.00 net-worth greeting fabrication is gone
 * G. Prime reasoning/delegation contract remains
 * H. No specialist mutation permissions changed
 * I. No tool configuration changed
 * J. No database configuration changed
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');
const policySrc = readFileSync('netlify/functions/_shared/primePolicy.ts', 'utf8');
const personalitySrc = readFileSync('netlify/functions/_shared/primePersonality.ts', 'utf8');
const brainSrc = readFileSync('src/lib/ai/brains/prime.ts', 'utf8');
const registrySrc = readFileSync('src/lib/ai/brains/registry.ts', 'utf8');
const systemPromptsSrc = readFileSync('src/lib/ai/systemPrompts.ts', 'utf8');
const userContextSrc = readFileSync('src/lib/ai/userContext.ts', 'utf8');
const greetingSrc = readFileSync('src/components/chat/greetings/primeGreeting.ts', 'utf8');
const toolIndexSrc = readFileSync('src/agent/tools/index.ts', 'utf8');
const abqSrc = readFileSync('src/agent/tools/impl/account_balances_query.ts', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// A. New personality contract reaches Prime
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== A: Personality contract reaches Prime ===\n');

assert('A1. primePersonality.ts exports buildPrimePersonalityMessage',
  personalitySrc.includes('export function buildPrimePersonalityMessage'));
assert('A2. chat.ts imports buildPrimePersonalityMessage',
  chatSrc.includes("import { buildPrimePersonalityMessage } from './_shared/primePersonality.js'"));
assert('A3. chat.ts builds primePersonalityHint',
  chatSrc.includes('const primePersonalityHint'));
assert('A4. chat.ts injects primePersonalityHint into messages array',
  chatSrc.includes('...(primePersonalityHint ? [primePersonalityHint] : [])'));
assert('A5. personality contract defines VOICE',
  personalitySrc.includes('VOICE:'));
assert('A6. personality contract defines RELATIONSHIP',
  personalitySrc.includes('RELATIONSHIP:'));
assert('A7. personality contract defines RESPONSE STYLE',
  personalitySrc.includes('RESPONSE STYLE:'));
assert('A8. personality contract defines UNKNOWN INFORMATION',
  personalitySrc.includes('UNKNOWN INFORMATION:'));
assert('A9. personality contract defines ENDINGS',
  personalitySrc.includes('ENDINGS:'));
assert('A10. personality contract defines SPECIALISTS',
  personalitySrc.includes('SPECIALISTS:'));
assert('A11. personality uses preferredName for name rule',
  personalitySrc.includes('preferredName'));
assert('A12. personality says boss not manager',
  personalitySrc.includes('boss of the XspensesAI financial team'));

// ═══════════════════════════════════════════════════════════════════════════
// B. Duplicate personality instructions removed/gated
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== B: Duplicates removed/gated ===\n');

// primePolicy.ts — personality sections removed
assert('B1. primePolicy no longer has STYLE section',
  !policySrc.includes("'STYLE:'"));
assert('B2. primePolicy no longer has RESPONSE LENGTH section',
  !policySrc.includes("'RESPONSE LENGTH:'"));
assert('B3. primePolicy no longer has MISSING INFORMATION section',
  !policySrc.includes("'MISSING INFORMATION:'"));
assert('B4. primePolicy no longer has ENDINGS section',
  !policySrc.includes("'ENDINGS:'"));
assert('B5. primePolicy no longer has CONVERSATION section',
  !policySrc.includes("'CONVERSATION:'"));
assert('B6. primePolicy no longer says "financial manager"',
  !policySrc.includes('financial manager'));
assert('B7. primePolicy header is fact integrity focused',
  policySrc.includes('PRIME FACT INTEGRITY & REASONING CONTRACT'));

// prime.ts brain pack — personality/conversation sections removed
assert('B8. brain pack no longer has PERSONALITY section',
  !brainSrc.includes('`PERSONALITY:`'));
assert('B9. brain pack no longer has standalone CONVERSATION section',
  !brainSrc.includes('`CONVERSATION:`'));
assert('B10. brain pack no canned ending prohibition (moved to personality)',
  !brainSrc.includes('Would you like to explore'));

// GLOBAL_BRAIN_RULES gated for Prime
assert('B11. registry uses PRIME_SAFETY_RULES for Prime',
  registrySrc.includes('isPrime ? PRIME_SAFETY_RULES : GLOBAL_BRAIN_RULES'));
assert('B12. PRIME_SAFETY_RULES exported from systemPrompts',
  systemPromptsSrc.includes('export const PRIME_SAFETY_RULES'));
assert('B13. PRIME_SAFETY_RULES has FINANCIAL BOUNDARY',
  systemPromptsSrc.includes('RULE 2 - FINANCIAL BOUNDARY'));
assert('B14. PRIME_SAFETY_RULES has META BEHAVIOR',
  /PRIME_SAFETY_RULES[\s\S]*META BEHAVIOR/.test(systemPromptsSrc));
assert('B15. PRIME_SAFETY_RULES does NOT have QUESTION DETECTION',
  !/PRIME_SAFETY_RULES[\s\S]*QUESTION DETECTION/.test(systemPromptsSrc));
assert('B16. PRIME_SAFETY_RULES does NOT have CAPABILITY SAFETY',
  !/PRIME_SAFETY_RULES[\s\S]*CAPABILITY SAFETY/.test(systemPromptsSrc));
assert('B17. PRIME_SAFETY_RULES does NOT have UPLOAD GUIDANCE',
  !/PRIME_SAFETY_RULES[\s\S]*UPLOAD GUIDANCE/.test(systemPromptsSrc));

// ═══════════════════════════════════════════════════════════════════════════
// C. FACT INTEGRITY remains
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== C: FACT INTEGRITY remains ===\n');

assert('C1. FACT INTEGRITY header in primePolicy',
  policySrc.includes("'FACT INTEGRITY:'"));
assert('C2. never state unknown fact as known',
  policySrc.includes('NEVER state a material user fact as known'));
assert('C3. do not invent plausible value',
  policySrc.includes('Do not invent a plausible value'));
assert('C4. historical spending not future target',
  policySrc.includes('Historical spending is NOT automatically'));
assert('C5. hypothetical labeling rule',
  policySrc.includes('Hypothetical assumptions for illustration'));
assert('C6. provenance unavailable rule',
  policySrc.includes('provenance: "unavailable"'));
assert('C7. hasVerifiedBalances false rule',
  policySrc.includes('hasVerifiedBalances: false'));
assert('C8. debt priority rule',
  policySrc.includes('cost of debt determines'));
assert('C9. SAFETY section remains',
  policySrc.includes("'SAFETY:'"));
assert('C10. server-verified evidence authoritative',
  policySrc.includes('Server-verified financial evidence'));

// ═══════════════════════════════════════════════════════════════════════════
// D. Unavailable account balance protection remains
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== D: Account balance provenance remains ===\n');

assert('D1. account_balances_query has provenance enum',
  abqSrc.includes("provenance: z.enum(['verified_db', 'unavailable'])"));
assert('D2. account_balances_query has hasVerifiedBalances',
  abqSrc.includes('hasVerifiedBalances: z.boolean()'));
assert('D3. no synthetic Estimated Balance',
  !abqSrc.includes('Estimated Balance'));
assert('D4. tool description mentions verified',
  toolIndexSrc.includes("'Query verified account balances"));

// ═══════════════════════════════════════════════════════════════════════════
// E. Dead AI Fluency reference is gone for Prime
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== E: Dead AI Fluency reference fixed ===\n');

assert('E1. buildAiContextSystemMessage accepts options param',
  userContextSrc.includes('options?: { skipFluencyReference?: boolean }'));
assert('E2. skipFluencyReference gates fluency line',
  userContextSrc.includes('if (options?.skipFluencyReference) return base'));
assert('E3. chat.ts passes skipFluencyReference for Prime',
  chatSrc.includes('skipFluencyReference: isPrime'));
assert('E4. fluency reference still present for non-Prime employees',
  userContextSrc.includes('You MUST follow the AI FLUENCY ADAPTATION RULES'));

// ═══════════════════════════════════════════════════════════════════════════
// F. $0.00 net-worth greeting fabrication is gone
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== F: Greeting fabrication removed ===\n');

assert('F1. no $0.00 in greeting',
  !greetingSrc.includes('$0.00'));
assert('F2. no "net worth" claim in greeting',
  !greetingSrc.includes('net worth'));
assert('F3. returning user greeting is safe',
  greetingSrc.includes('What would you like to work on?'));

// ═══════════════════════════════════════════════════════════════════════════
// G. Prime reasoning/delegation contract remains
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== G: Reasoning/delegation contract remains ===\n');

assert('G1. PRIME BOSS CONTRACT header',
  brainSrc.includes('PRIME BOSS CONTRACT'));
assert('G2. PRIME OWNS section',
  brainSrc.includes('PRIME OWNS:'));
assert('G3. REASONING APPROACH section',
  brainSrc.includes('REASONING APPROACH:'));
assert('G4. TOOL RESULT SYNTHESIS section',
  brainSrc.includes('TOOL RESULT SYNTHESIS:'));
assert('G5. SPECIALISTS OWN section',
  brainSrc.includes('SPECIALISTS OWN'));
assert('G6. DELEGATION RULES section',
  brainSrc.includes('DELEGATION RULES:'));
assert('G7. PRIME REASONING CONTRACT section',
  brainSrc.includes('PRIME REASONING CONTRACT:'));
assert('G8. SYNTHESIZE DON\'T PARROT section',
  brainSrc.includes("SYNTHESIZE, DON'T PARROT:"));
assert('G9. CHALLENGE ASSUMPTIONS section',
  brainSrc.includes('CHALLENGE ASSUMPTIONS:'));
assert('G10. INTERVIEW MODE section',
  brainSrc.includes('INTERVIEW MODE:'));
assert('G11. MISSING INFORMATION section in brain',
  brainSrc.includes('MISSING INFORMATION:'));
assert('G12. FINANCIAL TRUTH OVERRIDES',
  brainSrc.includes('FINANCIAL TRUTH OVERRIDES'));
assert('G13. Tag category mutation ownership',
  brainSrc.includes('Category mutation remains Tag-owned'));
assert('G14. request_employee_handoff reference',
  brainSrc.includes('request_employee_handoff'));

// ═══════════════════════════════════════════════════════════════════════════
// H. No specialist mutation permissions changed
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== H: Specialist mutation permissions unchanged ===\n');

assert('H1. Tag owns category mutations in brain',
  brainSrc.includes('Tag: transaction category MUTATIONS'));
assert('H2. Byte owns document parsing in brain',
  brainSrc.includes('Byte: document parsing'));
assert('H3. Goalie owns goal creation in brain',
  brainSrc.includes('Goalie: goal creation'));
assert('H4. Ledger owns tax workspace in brain',
  brainSrc.includes('Ledger: tax workspace'));

// ═══════════════════════════════════════════════════════════════════════════
// I. No tool configuration changed
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== I: Tool configuration unchanged ===\n');

assert('I1. account_balances_query exists in tool registry',
  toolIndexSrc.includes("'account_balances_query'"));
assert('I2. goalie_list_goals exists in tool registry',
  toolIndexSrc.includes("'goalie_list_goals'"));
assert('I3. tx_search exists in tool registry',
  toolIndexSrc.includes("'tx_search'"));

// ═══════════════════════════════════════════════════════════════════════════
// J. No database configuration changed (structural check)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== J: No DB config changes ===\n');

assert('J1. getEmployeeProfileCached queries tools_allowed and system_prompt',
  chatSrc.includes(".select('tools_allowed, system_prompt')"));
assert('J2. Prime DB system_prompt still skipped',
  chatSrc.includes('!isPrime') && chatSrc.includes('employeeSystemPrompt'));

// ═══════════════════════════════════════════════════════════════════════════
// K. Personality contract content quality
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== K: Personality contract quality ===\n');

assert('K1. no corporate filler in personality (used unironically)',
  !personalitySrc.includes('It appears that'));
assert('K2. no scripted responses',
  !personalitySrc.includes('if user asks'));
assert('K3. mentions natural language for memory',
  personalitySrc.includes('You mentioned'));
assert('K4. prohibits internal field names',
  personalitySrc.includes('Never expose internal field names'));
assert('K5. mentions not a bank chatbot',
  personalitySrc.includes('bank chatbot'));
assert('K6. personality has authority hierarchy comment',
  personalitySrc.includes('Authority hierarchy'));
assert('K7. personality does NOT duplicate FACT INTEGRITY',
  !personalitySrc.includes('FACT INTEGRITY'));
assert('K8. personality does NOT duplicate grounding rules',
  !personalitySrc.includes('queryStatus'));
assert('K9. personality does NOT duplicate tool confirmation',
  !personalitySrc.includes('confirmation gate'));

// ═══════════════════════════════════════════════════════════════════════════
// L. Prompt ordering
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== L: Prompt ordering ===\n');

const authorityIdx = chatSrc.indexOf('...(primeAuthorityHint ? [primeAuthorityHint]');
const personalityIdx = chatSrc.indexOf('...(primePersonalityHint ? [primePersonalityHint]');
const systemIdx = chatSrc.indexOf('...systemMessages,');
const historyIdx = chatSrc.indexOf('...recentMessages.map');

assert('L1. authority before personality in messages',
  authorityIdx > 0 && personalityIdx > 0 && authorityIdx < personalityIdx);
assert('L2. personality before systemMessages in messages',
  personalityIdx > 0 && systemIdx > 0 && personalityIdx < systemIdx);
assert('L3. systemMessages before history in messages',
  systemIdx > 0 && historyIdx > 0 && systemIdx < historyIdx);

// ═══════════════════════════════════════════════════════════════════════════
// M. GLOBAL_BRAIN_RULES still works for non-Prime employees
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== M: Non-Prime employees unaffected ===\n');

assert('M1. GLOBAL_BRAIN_RULES still exported',
  systemPromptsSrc.includes('export const GLOBAL_BRAIN_RULES'));
assert('M2. GLOBAL_BRAIN_RULES still has QUESTION DETECTION',
  systemPromptsSrc.includes('RULE 1 - QUESTION DETECTION'));
assert('M3. AI_FLUENCY_GLOBAL_SYSTEM_RULE still exported',
  systemPromptsSrc.includes('export const AI_FLUENCY_GLOBAL_SYSTEM_RULE'));
assert('M4. AI_FLUENCY still injected for non-Prime in chat.ts',
  chatSrc.includes('if (!isPrime)') && chatSrc.includes('AI_FLUENCY_GLOBAL_SYSTEM_RULE'));
assert('M5. PRIME_WATCHER still Prime-only',
  registrySrc.includes('isPrime ? PRIME_WATCHER_INTELLIGENCE_MODE : null'));

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`PRIME PERSONALITY CONTRACT: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
