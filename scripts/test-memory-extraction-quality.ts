/**
 * Memory Extraction Quality — Tests
 *
 * Verifies the extraction prompt correctly identifies user-stated
 * financial facts and rejects hypotheticals/transactions/questions.
 *
 * Calls the LLM locally — does NOT use the production queue or worker.
 */
import { readFileSync } from 'fs';
import crypto from 'crypto';

const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

// Read the actual production extraction prompt from source
const extractionSrc = readFileSync('netlify/functions/_shared/memory-extraction.ts', 'utf8');

// Extract the system message
const sysMatch = extractionSrc.match(/content:\s*'([^']+)'/);
const systemMessage = sysMatch?.[1] || 'Extract persistent user memories as strict JSON only.';

// Build the prompt template from the source (simplified — uses the same structure)
function buildPrompt(userMessage: string): string {
  // Extract the template between backticks after "const extractionPrompt ="
  // For testing, we reconstruct from the current source rules
  const rulesStart = extractionSrc.indexOf('RULES:');
  const rulesEnd = extractionSrc.indexOf('Return ONLY the JSON object, no commentary.');
  const rules = extractionSrc.substring(rulesStart, rulesEnd).replace(/\$\{redactedUserText\}/g, userMessage).replace(/\$\{assistantResponse.*?\}/g, '');

  return `
You are a memory extraction helper for a financial assistant.
From the user's latest message (already PII-redacted), extract ONLY durable, actionable information.

Return STRICT JSON with this exact structure:
{
  "facts": [{"key": "string", "value": "string", "confidence": 0.0-1.0}],
  "preferences": [{"key": "string", "value": "string", "confidence": 0.0-1.0}],
  "tasks": [{"description": "string", "due": "ISO8601 or empty", "confidence": 0.0-1.0}],
  "corrections": [{"key": "string", "value": "string", "confidence": 0.0-1.0}]
}

${rules}
User message:
"""
${userMessage}
"""

Return ONLY the JSON object, no commentary.
  `.trim();
}

async function extract(userMessage: string): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: buildPrompt(userMessage) }
      ],
      temperature: 0.1,
      max_tokens: 1000
    })
  });
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(text);
}

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// POSITIVE: Financial facts that SHOULD be extracted
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Positive: Financial facts ===\n');

// 1. Savings balance
const r1 = await extract('I have $250,000 saved.');
const f1 = r1.facts || [];
assert('EX1. savings extracted', f1.length > 0);
assert('EX1b. value contains 250000', f1.some((f: any) => String(f.value).includes('250000')));
assert('EX1c. confidence >= 0.6', f1.length > 0 && f1[0].confidence >= 0.6);
console.log('  →', JSON.stringify(f1));

// 2. Debt balance
const r2 = await extract('I owe $31,000 on my car.');
const f2 = r2.facts || [];
assert('EX2. debt extracted', f2.length > 0);
assert('EX2b. value contains 31000', f2.some((f: any) => String(f.value).includes('31000')));
console.log('  →', JSON.stringify(f2));

// 3. Recurring contribution
const r3 = await extract('I contribute $500 a week to my TFSA.');
const f3 = r3.facts || [];
assert('EX3. contribution extracted', f3.length > 0);
assert('EX3b. value contains 500', f3.some((f: any) => String(f.value).includes('500')));
console.log('  →', JSON.stringify(f3));

// 4. Retirement timeline
const r4 = await extract('I want to retire in three years.');
const f4 = r4.facts || [];
assert('EX4. retirement timeline extracted', f4.length > 0);
console.log('  →', JSON.stringify(f4));

// 5. Income
const r5 = await extract('I make $180,000 a year.');
const f5 = r5.facts || [];
assert('EX5. income extracted', f5.length > 0);
assert('EX5b. value contains 180000', f5.some((f: any) => String(f.value).includes('180000')));
console.log('  →', JSON.stringify(f5));

// ═══════════════════════════════════════════════════════════════════════════
// NEGATIVE: Should NOT extract durable facts
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== Negative: Should NOT extract ===\n');

// 6. Hypothetical
const r6 = await extract('If I had $250,000 saved, could I retire?');
const f6 = (r6.facts || []).filter((f: any) => f.confidence >= 0.6 && f.key && f.value);
assert('EX6. hypothetical produces no asserted savings fact',
  !f6.some((f: any) => /savings|balance|saved/i.test(f.key) && String(f.value).includes('250000')));
console.log('  →', JSON.stringify(f6));

// 7. Question
const r7 = await extract('How much should I save?');
const f7 = (r7.facts || []).filter((f: any) => f.confidence >= 0.6);
assert('EX7. question produces no durable fact', f7.length === 0);
console.log('  →', JSON.stringify(f7));

// 8. One-time transaction
const r8 = await extract('I spent $52 at Costco yesterday.');
const f8 = (r8.facts || []).filter((f: any) => f.confidence >= 0.6);
assert('EX8. one-time transaction not stored as durable fact', f8.length === 0);
console.log('  →', JSON.stringify(f8));

console.log(`\n${'='.repeat(60)}`);
console.log(`MEMORY EXTRACTION QUALITY: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
