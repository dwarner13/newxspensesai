/**
 * PRIME REASONING V1 — R1 live MODEL EVALUATION (manual; NOT part of CI).
 *
 * Runs the R1 shadow interpreter against acceptance specimens and paraphrases using a
 * real model, validates with the R0 schema, and checks STRUCTURAL expectations on the
 * validated FinancialRequest (e.g. "no merchant subject", "rolling 3 months"). It sends
 * synthetic sentences only — no user data. Output is the privacy-safe summary.
 *
 * Usage:  npx tsx scripts/eval-prime-shadow-semantics.ts   (needs OPENAI_API_KEY)
 *         PRIME_SHADOW_SEMANTICS_MODEL=gpt-4o-mini to override the model.
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import {
  interpretShadowSemantics,
  summarizeShadowOutcome,
  SHADOW_RESPONSE_FORMAT,
  type ShadowModelCall,
} from '../src/shared/prime-shadow-semantics';
import type { FinancialRequestV2 } from '../src/shared/prime-financial-request';

// Load .env manually (repo convention — no dotenv dependency; see serve-functions-local.ts)
function loadEnv(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8').split(String.fromCharCode(0)).join('');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(path.resolve(process.cwd(), '.env'));

type Check = (r: FinancialRequestV2) => string | null; // null = pass, string = failure reason
type Case = { family: string; message: string; prior?: string[]; checks: Check[] };

const has = (r: FinancialRequestV2, kind: string) => r.subjects.some(s => s.kind === kind && !s.exclude);
const noMerchant: Check = r => (has(r, 'merchant') ? 'unexpected merchant subject' : null);
const merchant: Check = r => (has(r, 'merchant') ? null : 'missing merchant subject');
const categoryLike: Check = r => (has(r, 'category') || has(r, 'subcategory') || has(r, 'concept') ? null : 'missing category/concept subject');
const rolling = (count: number, unit: string): Check => r =>
  r.period?.kind === 'rolling' && r.period.count === count && r.period.unit === unit ? null : `expected rolling ${count} ${unit}, got ${JSON.stringify(r.period ?? null)}`;
const op = (...ops: string[]): Check => r => (ops.includes(r.operation) ? null : `operation ${r.operation} not in ${ops.join('|')}`);
const measure = (...ms: string[]): Check => r => (r.measures && r.measures.some(m => ms.includes(m)) ? null : `measures ${JSON.stringify(r.measures ?? null)} lack any of ${ms.join('|')}`);
const ordered = (by: string, direction: string, limit?: number): Check => r =>
  r.order?.by === by && r.order.direction === direction && (limit === undefined || r.limit === limit)
    ? null : `expected order ${by} ${direction}${limit !== undefined ? ` limit ${limit}` : ''}, got ${JSON.stringify({ order: r.order ?? null, limit: r.limit ?? null })}`;
const domain = (...ds: string[]): Check => r => (ds.includes(r.domain) ? null : `domain ${r.domain} not in ${ds.join('|')}`);
const periodKind = (...ks: string[]): Check => r => (r.period && ks.includes(r.period.kind) ? null : `period ${r.period?.kind ?? 'none'} not in ${ks.join('|')}`);
const noPeriodFromCount: Check = r => (r.period?.kind === 'rolling' && r.period.count === 5 ? 'a count became a period' : null);
const comparison: Check = r => (r.comparison ? null : 'missing comparison');
const refPrev: Check = r => (r.mode === 'refine_previous' && r.reference.kind === 'previous_request' ? null : 'expected refine_previous/previous_request');
const mutationThird: Check = r => (r.action?.kind === 'mutation_proposal' && r.action.target.kind === 'candidate_frame' && r.action.target.ordinal === 3 ? null : 'expected mutation proposal on ordinal 3');
const notFinancialEvidence: Check = r => (r.domain === 'transactions' ? 'became a transactions request' : null);

const RESTAURANT_3M = [noMerchant, categoryLike, rolling(3, 'month'), op('count', 'count_distinct')];

const CASES: Case[] = [
  // 1 — the acceptance specimen and paraphrases
  { family: 'restaurants-3m', message: 'How many restaurants have I eaten at in the last three months?', checks: RESTAURANT_3M },
  { family: 'restaurants-3m', message: 'How many restaurants have I eaten at in the last 3 months?', checks: RESTAURANT_3M },
  { family: 'restaurants-3m', message: 'In the past three months, how many different places did I eat out at?', checks: [noMerchant, categoryLike, rolling(3, 'month')] },
  { family: 'restaurants-3m', message: 'how often have i eaten out over the last 3 months', checks: [noMerchant, categoryLike, rolling(3, 'month'), op('count', 'count_distinct')] },
  // 2
  { family: 'costco-last-year', message: 'How much did I spend at Costco last year?', checks: [merchant, op('total'), measure('spending'), periodKind('previous', 'calendar_year')] },
  { family: 'costco-last-year', message: 'What did Costco cost me in the previous year?', checks: [merchant, op('total'), periodKind('previous', 'calendar_year')] },
  // 3
  { family: 'last-five-costco', message: 'Show me my last five Costco transactions.', checks: [merchant, op('list'), ordered('date', 'desc', 5), noPeriodFromCount] },
  { family: 'last-five-costco', message: 'List my 5 most recent Costco purchases', checks: [merchant, op('list'), ordered('date', 'desc', 5), noPeriodFromCount] },
  // 4
  { family: 'gas-3m', message: 'How much did I spend on gas in the last three months?', checks: [noMerchant, categoryLike, rolling(3, 'month'), op('total'), measure('spending')] },
  { family: 'gas-3m', message: 'What has fuel cost me over the past 3 months?', checks: [noMerchant, categoryLike, rolling(3, 'month'), op('total')] },
  // 5
  { family: 'fuel-benchmark', message: 'On average, do I spend a lot on fuel for a Sales Rep?', checks: [categoryLike] },
  // 6
  { family: 'september', message: 'How much did I spend in September?', checks: [op('total'), measure('spending'), periodKind('calendar_month'), noMerchant] },
  { family: 'september', message: "What's my September spending?", checks: [op('total'), measure('spending'), periodKind('calendar_month')] },
  // 7
  { family: 'in-and-out', message: 'What came in and went out last month?', checks: [periodKind('previous'), measure('inflow', 'outflow', 'net')] },
  // 8
  { family: 'month-compare', message: 'How does this month compare with last month?', checks: [comparison] },
  { family: 'month-compare', message: 'Am I spending more this month than the previous one?', checks: [comparison] },
  // 9
  { family: 'why-higher', message: 'Why is my restaurant spending higher?', checks: [op('explain', 'trend'), categoryLike, noMerchant] },
  // 10
  { family: 'follow-up', message: 'What about last year?', prior: ['How much did I spend at Costco this year?'], checks: [refPrev, periodKind('previous', 'calendar_year')] },
  { family: 'follow-up', message: 'and the year before?', prior: ['How much did I spend on groceries in 2025?'], checks: [refPrev] },
  // 11
  { family: 'mutation', message: 'Change the third one to Groceries.', prior: ['Show me my Costco transactions'], checks: [mutationThird] },
  { family: 'mutation', message: 'Recategorize #3 as Groceries', prior: ['List my recent purchases'], checks: [mutationThird] },
  // 12
  { family: 'personal-general', message: 'Where do I live?', checks: [notFinancialEvidence] },
  // 13
  { family: 'product', message: 'How secure are my transactions through the app?', checks: [domain('product')] },
  // extra families
  { family: 'biggest', message: 'What was my largest restaurant purchase?', checks: [op('list'), ordered('amount', 'desc', 1), categoryLike, noMerchant] },
  { family: 'refunds', message: 'How much did I get back in refunds?', checks: [r => (r.capability.status === 'unsupported' ? null : 'refunds should be unsupported')] },
];

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set — evaluation skipped.');
    process.exit(2);
  }
  const model = process.env.PRIME_SHADOW_SEMANTICS_MODEL || 'gpt-4o';
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const callModel: ShadowModelCall = async (messages, signal) => {
    const c = await client.chat.completions.create(
      { model, response_format: SHADOW_RESPONSE_FORMAT, temperature: 0, max_tokens: 700, messages },
      { signal },
    );
    return c.choices[0]?.message?.content || '';
  };

  let valid = 0;
  let passed = 0;
  const durations: number[] = [];
  for (const c of CASES) {
    const outcome = await interpretShadowSemantics({ callModel, message: c.message, priorUserMessages: c.prior, timeoutMs: 15000 });
    durations.push(outcome.durationMs);
    const summary = summarizeShadowOutcome(outcome);
    let failures: string[] = [];
    if (outcome.status === 'valid') {
      valid++;
      failures = c.checks.map(ch => ch(outcome.request)).filter((x): x is string => !!x);
      if (failures.length === 0) passed++;
    } else {
      failures = [`invalid:${outcome.failureCode}`];
    }
    console.log(`${failures.length === 0 ? 'PASS' : 'FAIL'} [${c.family}] ${JSON.stringify(c.message)}`);
    console.log(`     ${JSON.stringify(summary)}`);
    if (failures.length) console.log(`     ↳ ${failures.join('; ')}`);
  }
  durations.sort((a, b) => a - b);
  console.log(`\nmodel=${model} cases=${CASES.length} valid=${valid} structuralPass=${passed} ` +
    `p50=${durations[Math.floor(durations.length / 2)]}ms max=${durations[durations.length - 1]}ms`);
}

main().catch(e => { console.error('eval failed:', e?.message || e); process.exit(1); });
