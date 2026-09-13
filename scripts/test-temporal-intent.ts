/**
 * Temporal Intent Classifier — Tests
 *
 * Verifies deterministic classification of future_spending vs
 * withdrawal_capacity vs null (historical/unrelated).
 */
import { classifyTemporalIntent } from '../src/shared/financial-query-classifier';
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Future spending positives
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1: Future spending positives ===\n');
{
  assert('FS1. retirement spending', classifyTemporalIntent('How much will I spend in retirement?') === 'future_spending');
  assert('FS2. expenses when retire', classifyTemporalIntent('What will my expenses be when I retire?') === 'future_spending');
  assert('FS3. need each month after stop working', classifyTemporalIntent('How much money will I need each month after I stop working?') === 'future_spending');
  assert('FS4. retirement budget', classifyTemporalIntent('What will my retirement budget be?') === 'future_spending');
  assert('FS5. spend after retirement', classifyTemporalIntent('How much will I need to spend after retirement?') === 'future_spending');
  assert('FS6. retirement expenses', classifyTemporalIntent('What are my expected retirement expenses?') === 'future_spending');
  assert('FS7. cost in retirement', classifyTemporalIntent('How much will it cost me to live in retirement?') === 'future_spending');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Historical spending negatives (must NOT match future_spending)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: Historical spending negatives ===\n');
{
  assert('HS1. spent last month', classifyTemporalIntent('How much did I spend last month?') === null);
  assert('HS2. spent on fuel', classifyTemporalIntent('How much did I spend on fuel?') === null);
  assert('HS3. spent this year', classifyTemporalIntent('What have I spent this year?') === null);
  assert('HS4. spent at Costco', classifyTemporalIntent('How much did I spend at Costco?') === null);
  assert('HS5. spending last week', classifyTemporalIntent('What was my spending last week?') === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Withdrawal capacity positives
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3: Withdrawal capacity positives ===\n');
{
  assert('WC1. withdraw from savings', classifyTemporalIntent('How much can I withdraw from $250,000?') === 'withdrawal_capacity');
  assert('WC2. sustainable withdrawal rate', classifyTemporalIntent('What is a sustainable withdrawal rate?') === 'withdrawal_capacity');
  assert('WC3. how long will savings last', classifyTemporalIntent('How long will $250,000 last?') === 'withdrawal_capacity');
  assert('WC4. investments pay annually', classifyTemporalIntent('How much can my investments pay me each year?') === 'withdrawal_capacity');
  assert('WC5. portfolio support', classifyTemporalIntent('What can my portfolio support annually?') === 'withdrawal_capacity');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Separation: future_spending vs withdrawal_capacity
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4: Separation ===\n');
{
  // The key test case from Test C
  assert('SEP1. retirement spending != withdrawal',
    classifyTemporalIntent('I have $250,000 saved. If I retire in three years how much will I spend every year in retirement?') === 'future_spending');
  assert('SEP2. withdrawal is withdrawal',
    classifyTemporalIntent('I have $250,000 saved. How much can I safely withdraw each year?') === 'withdrawal_capacity');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Neutral / unrelated questions
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5: Neutral ===\n');
{
  assert('N1. greeting', classifyTemporalIntent('Hello Prime') === null);
  assert('N2. what is retirement', classifyTemporalIntent('What is a retirement account?') === null);
  assert('N3. category question', classifyTemporalIntent('What category is this transaction?') === null);
  assert('N4. upload help', classifyTemporalIntent('How do I upload a statement?') === null);
  assert('N5. debt question', classifyTemporalIntent('How much debt do I have?') === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Runtime injection — verify chat.ts integration
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6: Runtime integration ===\n');
{
  const chatSrc = readFileSync('netlify/functions/chat.ts', 'utf8');

  assert('RI1. classifyTemporalIntent imported', chatSrc.includes("classifyTemporalIntent"));
  assert('RI2. future_spending directive present', chatSrc.includes('QUERY INTENT: future_spending'));
  assert('RI3. withdrawal_capacity directive present', chatSrc.includes('QUERY INTENT: withdrawal_capacity'));
  assert('RI4. directive injected into messages array', chatSrc.includes("messages.push") && chatSrc.includes('QUERY INTENT:'));
  assert('RI5. only runs when grounding=none', chatSrc.includes('!financialClassification.requiresGrounding'));
  assert('RI6. future spending says no withdrawal substitution', chatSrc.includes('Do not substitute withdrawal-rate'));
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TEMPORAL INTENT: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
