#!/usr/bin/env tsx
/**
 * Chat Runtime Parity Test Harness
 * =================================
 * Compares OLD vs NEW chat endpoints for feature parity
 * 
 * Usage:
 *   npm run parity
 *   npm run parity -- --old=http://old-api.com/chat --new=http://localhost:8888/.netlify/functions/chat
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface TestConfig {
  oldEndpoint: string;
  newEndpoint: string;
  userId: string;
  outputPath: string;
}

interface TestPrompt {
  id: number;
  category: string;
  prompt: string;
  expectedKeywords?: string[];
}

interface TestResult {
  prompt_id: number;
  endpoint: 'OLD' | 'NEW';
  category: string;
  prompt: string;
  response_text: string;
  latency_ms: number;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  error?: string;
  timestamp: string;
}

// ============================================================================
// Test Prompts - 10 diverse scenarios
// ============================================================================

const TEST_PROMPTS: TestPrompt[] = [
  {
    id: 1,
    category: 'greeting',
    prompt: 'Hello! Who are you?',
    expectedKeywords: ['assistant', 'help', 'financial'],
  },
  {
    id: 2,
    category: 'capability',
    prompt: 'Give me a 2-sentence overview of how you work.',
    expectedKeywords: ['analyze', 'help', 'data'],
  },
  {
    id: 3,
    category: 'factual',
    prompt: 'What is compound interest?',
    expectedKeywords: ['interest', 'principal', 'time'],
  },
  {
    id: 4,
    category: 'analysis',
    prompt: 'How can I reduce my monthly expenses?',
    expectedKeywords: ['budget', 'spending', 'track', 'reduce'],
  },
  {
    id: 5,
    category: 'specific',
    prompt: 'What are the top 3 tax deductions for small businesses?',
    expectedKeywords: ['deduction', 'business', 'expense'],
  },
  {
    id: 6,
    category: 'calculation',
    prompt: 'If I save $500/month at 5% annual interest, how much will I have in 2 years?',
    expectedKeywords: ['save', 'interest', 'total', 'approximately'],
  },
  {
    id: 7,
    category: 'advice',
    prompt: 'Should I pay off debt or invest first?',
    expectedKeywords: ['debt', 'invest', 'interest', 'depends'],
  },
  {
    id: 8,
    category: 'troubleshooting',
    prompt: 'Why are my transactions not categorizing automatically?',
    expectedKeywords: ['category', 'rule', 'check', 'setting'],
  },
  {
    id: 9,
    category: 'feature',
    prompt: 'Can you export my data to Google Sheets?',
    expectedKeywords: ['export', 'sheet', 'data'],
  },
  {
    id: 10,
    category: 'edge_case',
    prompt: 'My credit card ending in 1234 was charged $999.99 yesterday',
    expectedKeywords: ['charge', 'transaction', 'card'],
  },
];

// ============================================================================
// HTTP Client
// ============================================================================

async function callChatEndpoint(
  endpoint: string,
  userId: string,
  employeeSlug: string,
  message: string,
  stream: boolean = false
): Promise<{
  response: string;
  latency_ms: number;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        employeeSlug,
        message,
        stream,
      }),
    });

    const latency_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        response: '',
        latency_ms,
        tokens_prompt: 0,
        tokens_completion: 0,
        tokens_total: 0,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    if (stream || response.headers.get('content-type')?.includes('text/event-stream')) {
      // Handle SSE stream
      return await handleSSEStream(response, latency_ms);
    } else {
      // Handle JSON response
      const data = await response.json();
      return {
        response: data.content || data.message || JSON.stringify(data),
        latency_ms,
        tokens_prompt: data.tokens?.prompt || estimateTokens(message),
        tokens_completion: data.tokens?.completion || estimateTokens(data.content || ''),
        tokens_total: data.tokens?.total || 0,
      };
    }
  } catch (error) {
    const err = error as Error;
    return {
      response: '',
      latency_ms: Date.now() - startTime,
      tokens_prompt: 0,
      tokens_completion: 0,
      tokens_total: 0,
      error: err.message,
    };
  }
}

// ============================================================================
// SSE Stream Handler
// ============================================================================

async function handleSSEStream(
  response: Response,
  initialLatency: number
): Promise<{
  response: string;
  latency_ms: number;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
}> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let totalTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text') {
            fullResponse += data.content || '';
          } else if (data.type === 'done') {
            totalTokens = data.total_tokens || 0;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  return {
    response: fullResponse,
    latency_ms: initialLatency,
    tokens_prompt: estimateTokens(fullResponse) || 0,
    tokens_completion: estimateTokens(fullResponse),
    tokens_total: totalTokens || estimateTokens(fullResponse),
  };
}

// ============================================================================
// Utilities
// ============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function parseArgs(): Partial<TestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};

  for (const arg of args) {
    if (arg.startsWith('--old=')) {
      config.oldEndpoint = arg.split('=')[1];
    } else if (arg.startsWith('--new=')) {
      config.newEndpoint = arg.split('=')[1];
    } else if (arg.startsWith('--userId=')) {
      config.userId = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      config.outputPath = arg.split('=')[1];
    }
  }

  return config;
}

// ============================================================================
// CSV Writer
// ============================================================================

function writeCSV(results: TestResult[], outputPath: string): void {
  const headers = [
    'prompt_id',
    'endpoint',
    'category',
    'prompt',
    'response_text',
    'latency_ms',
    'tokens_prompt',
    'tokens_completion',
    'tokens_total',
    'error',
    'timestamp',
  ];

  const rows = results.map((r) => [
    r.prompt_id,
    r.endpoint,
    r.category,
    `"${r.prompt.replace(/"/g, '""')}"`,
    `"${r.response_text.substring(0, 500).replace(/"/g, '""')}"`,
    r.latency_ms,
    r.tokens_prompt,
    r.tokens_completion,
    r.tokens_total,
    r.error ? `"${r.error.replace(/"/g, '""')}"` : '',
    r.timestamp,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  fs.writeFileSync(outputPath, csv);
}

// ============================================================================
// Results Analysis
// ============================================================================

function analyzeResults(results: TestResult[]): void {
  const oldResults = results.filter((r) => r.endpoint === 'OLD');
  const newResults = results.filter((r) => r.endpoint === 'NEW');

  console.log('\n' + '='.repeat(80));
  console.log('📊 PARITY TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  // Calculate averages
  const oldAvg = calculateAverages(oldResults);
  const newAvg = calculateAverages(newResults);

  // Print comparison table
  console.log('┌─────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Metric                  │ OLD Endpoint │ NEW Endpoint │ Difference   │');
  console.log('├─────────────────────────┼──────────────┼──────────────┼──────────────┤');

  printRow('Avg Latency (ms)', oldAvg.latency, newAvg.latency, 'ms', true);
  printRow('Avg Prompt Tokens', oldAvg.promptTokens, newAvg.promptTokens, 'tok', true);
  printRow('Avg Completion Tokens', oldAvg.completionTokens, newAvg.completionTokens, 'tok', true);
  printRow('Avg Total Tokens', oldAvg.totalTokens, newAvg.totalTokens, 'tok', true);
  printRow('Avg Response Length', oldAvg.responseLength, newAvg.responseLength, 'ch', false);
  printRow('Success Rate', oldAvg.successRate, newAvg.successRate, '%', false);

  console.log('└─────────────────────────┴──────────────┴──────────────┴──────────────┘\n');

  // Error summary
  const oldErrors = oldResults.filter((r) => r.error);
  const newErrors = newResults.filter((r) => r.error);

  if (oldErrors.length > 0 || newErrors.length > 0) {
    console.log('⚠️  ERRORS DETECTED:\n');
    if (oldErrors.length > 0) {
      console.log(`   OLD: ${oldErrors.length} errors`);
      oldErrors.forEach((e) => console.log(`     - Prompt ${e.prompt_id}: ${e.error}`));
    }
    if (newErrors.length > 0) {
      console.log(`   NEW: ${newErrors.length} errors`);
      newErrors.forEach((e) => console.log(`     - Prompt ${e.prompt_id}: ${e.error}`));
    }
    console.log('');
  }

  // Parity assessment
  console.log('🎯 PARITY ASSESSMENT:\n');

  const latencyDiff = ((newAvg.latency - oldAvg.latency) / oldAvg.latency) * 100;
  const tokenDiff = ((newAvg.totalTokens - oldAvg.totalTokens) / oldAvg.totalTokens) * 100;

  if (Math.abs(latencyDiff) < 20) {
    console.log('   ✅ Latency: PASS (within 20%)');
  } else {
    console.log(`   ⚠️  Latency: ${latencyDiff > 0 ? 'SLOWER' : 'FASTER'} by ${Math.abs(latencyDiff).toFixed(1)}%`);
  }

  if (Math.abs(tokenDiff) < 15) {
    console.log('   ✅ Token Usage: PASS (within 15%)');
  } else {
    console.log(`   ⚠️  Token Usage: ${tokenDiff > 0 ? 'MORE' : 'FEWER'} by ${Math.abs(tokenDiff).toFixed(1)}%`);
  }

  if (newAvg.successRate >= oldAvg.successRate) {
    console.log('   ✅ Success Rate: PASS (equal or better)');
  } else {
    console.log(`   ❌ Success Rate: FAIL (${newAvg.successRate}% vs ${oldAvg.successRate}%)`);
  }

  console.log('');

  // Overall verdict
  const parityScore = calculateParityScore(oldAvg, newAvg);
  console.log('📈 OVERALL PARITY SCORE: ' + getParityVerdict(parityScore));
  console.log('');
}

function calculateAverages(results: TestResult[]) {
  const successful = results.filter((r) => !r.error);
  const count = successful.length;

  if (count === 0) {
    return {
      latency: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      responseLength: 0,
      successRate: 0,
    };
  }

  return {
    latency: successful.reduce((sum, r) => sum + r.latency_ms, 0) / count,
    promptTokens: successful.reduce((sum, r) => sum + r.tokens_prompt, 0) / count,
    completionTokens: successful.reduce((sum, r) => sum + r.tokens_completion, 0) / count,
    totalTokens: successful.reduce((sum, r) => sum + r.tokens_total, 0) / count,
    responseLength: successful.reduce((sum, r) => sum + r.response_text.length, 0) / count,
    successRate: (successful.length / results.length) * 100,
  };
}

function printRow(
  label: string,
  oldValue: number,
  newValue: number,
  unit: string,
  lowerIsBetter: boolean
): void {
  const diff = newValue - oldValue;
  const diffPercent = oldValue !== 0 ? (diff / oldValue) * 100 : 0;
  
  let diffStr = '';
  if (Math.abs(diffPercent) < 1) {
    diffStr = '~same';
  } else {
    const sign = diff > 0 ? '+' : '';
    diffStr = `${sign}${diff.toFixed(0)}${unit} (${sign}${diffPercent.toFixed(1)}%)`;
    
    // Color coding (for terminal)
    if (lowerIsBetter) {
      diffStr = diff < 0 ? `✅ ${diffStr}` : `⚠️  ${diffStr}`;
    }
  }

  console.log(
    `│ ${label.padEnd(23)} │ ${oldValue.toFixed(0).padStart(12)} │ ${newValue.toFixed(0).padStart(12)} │ ${diffStr.padEnd(12)} │`
  );
}

function calculateParityScore(oldAvg: any, newAvg: any): number {
  let score = 100;

  // Latency (±20% acceptable)
  const latencyDiff = Math.abs(((newAvg.latency - oldAvg.latency) / oldAvg.latency) * 100);
  if (latencyDiff > 20) score -= Math.min(20, (latencyDiff - 20) / 2);

  // Token usage (±15% acceptable)
  const tokenDiff = Math.abs(((newAvg.totalTokens - oldAvg.totalTokens) / oldAvg.totalTokens) * 100);
  if (tokenDiff > 15) score -= Math.min(20, (tokenDiff - 15) / 2);

  // Success rate (must be equal or better)
  if (newAvg.successRate < oldAvg.successRate) {
    score -= (oldAvg.successRate - newAvg.successRate) * 2;
  }

  return Math.max(0, Math.min(100, score));
}

function getParityVerdict(score: number): string {
  if (score >= 90) return `${score.toFixed(0)}/100 ✅ EXCELLENT - Full parity achieved`;
  if (score >= 75) return `${score.toFixed(0)}/100 ✅ GOOD - Minor differences acceptable`;
  if (score >= 60) return `${score.toFixed(0)}/100 ⚠️  FAIR - Review differences`;
  return `${score.toFixed(0)}/100 ❌ POOR - Significant issues detected`;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runParityTest(config: TestConfig): Promise<void> {
  console.log('🚀 Starting Parity Test...\n');
  console.log(`   OLD: ${config.oldEndpoint}`);
  console.log(`   NEW: ${config.newEndpoint}`);
  console.log(`   User: ${config.userId}`);
  console.log(`   Prompts: ${TEST_PROMPTS.length}\n`);

  const results: TestResult[] = [];

  // Run tests for each prompt
  for (const testPrompt of TEST_PROMPTS) {
    console.log(`Testing ${testPrompt.id}/${TEST_PROMPTS.length}: ${testPrompt.category} - "${testPrompt.prompt.substring(0, 50)}..."`);

    // Test OLD endpoint
    process.stdout.write('  OLD: ');
    const oldResult = await callChatEndpoint(
      config.oldEndpoint,
      config.userId,
      'finance-analyzer',
      testPrompt.prompt
    );
    console.log(
      oldResult.error
        ? `❌ ${oldResult.error}`
        : `✅ ${oldResult.latency_ms}ms, ${oldResult.tokens_total}tok`
    );

    results.push({
      prompt_id: testPrompt.id,
      endpoint: 'OLD',
      category: testPrompt.category,
      prompt: testPrompt.prompt,
      response_text: oldResult.response,
      latency_ms: oldResult.latency_ms,
      tokens_prompt: oldResult.tokens_prompt,
      tokens_completion: oldResult.tokens_completion,
      tokens_total: oldResult.tokens_total,
      error: oldResult.error,
      timestamp: new Date().toISOString(),
    });

    // Test NEW endpoint
    process.stdout.write('  NEW: ');
    const newResult = await callChatEndpoint(
      config.newEndpoint,
      config.userId,
      'finance-analyzer',
      testPrompt.prompt
    );
    console.log(
      newResult.error
        ? `❌ ${newResult.error}`
        : `✅ ${newResult.latency_ms}ms, ${newResult.tokens_total}tok`
    );

    results.push({
      prompt_id: testPrompt.id,
      endpoint: 'NEW',
      category: testPrompt.category,
      prompt: testPrompt.prompt,
      response_text: newResult.response,
      latency_ms: newResult.latency_ms,
      tokens_prompt: newResult.tokens_prompt,
      tokens_completion: newResult.tokens_completion,
      tokens_total: newResult.tokens_total,
      error: newResult.error,
      timestamp: new Date().toISOString(),
    });

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Write CSV
  writeCSV(results, config.outputPath);
  console.log(`\n💾 Results saved to: ${config.outputPath}`);

  // Analyze and print summary
  analyzeResults(results);
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const args = parseArgs();

  const config: TestConfig = {
    oldEndpoint: args.oldEndpoint || 'http://localhost:3000/api/old-chat',
    newEndpoint: args.newEndpoint || 'http://localhost:8888/.netlify/functions/chat',
    userId: args.userId || 'TEST_USER',
    outputPath: args.outputPath || '/tmp/parity_results.csv',
  };

  // Ensure output directory exists
  const outputDir = path.dirname(config.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await runParityTest(config);
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error('\n❌ Parity test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for testing
export { runParityTest, TEST_PROMPTS, callChatEndpoint };

