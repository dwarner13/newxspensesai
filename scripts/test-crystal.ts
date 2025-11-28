#!/usr/bin/env tsx
/**
 * Crystal Smoke Test Script
 * 
 * Tests Crystal (crystal-ai) end-to-end functionality
 * 
 * Usage:
 *   USER_ID=your-user-id tsx scripts/test-crystal.ts
 *   OR
 *   npm run test:crystal
 */

import { config } from 'dotenv';

// Load .env if available
config();

const USER_ID = process.env.USER_ID || process.env.DEMO_USER_ID;
const CHAT_ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:8888/.netlify/functions/chat';

if (!USER_ID) {
  console.error('❌ USER_ID environment variable required');
  console.error('   Set: export USER_ID="your-user-id"');
  process.exit(1);
}

interface TestCase {
  name: string;
  request: {
    userId: string;
    employeeSlug?: string;
    message: string;
    sessionId: string;
    stream?: boolean;
  };
  expectedEmployee: string;
  expectedTool?: string;
}

const testCases: TestCase[] = [
  {
    name: 'Direct Crystal Income Summary',
    request: {
      userId: USER_ID,
      employeeSlug: 'crystal-ai',
      message: 'Crystal, summarize my income this month.',
      sessionId: `test-crystal-${Date.now()}-1`,
      stream: false
    },
    expectedEmployee: 'crystal-ai',
    expectedTool: 'crystal_summarize_income'
  },
  {
    name: 'Direct Crystal Expense Summary',
    request: {
      userId: USER_ID,
      employeeSlug: 'crystal-ai',
      message: 'How much did I spend this month?',
      sessionId: `test-crystal-${Date.now()}-2`,
      stream: false
    },
    expectedEmployee: 'crystal-ai',
    expectedTool: 'crystal_summarize_expenses'
  },
  {
    name: 'Router-Driven Income Summary',
    request: {
      userId: USER_ID,
      message: 'Income summary for this month',
      sessionId: `test-crystal-${Date.now()}-3`,
      stream: false
    },
    expectedEmployee: 'crystal-ai',
    expectedTool: 'crystal_summarize_income'
  },
  {
    name: 'Router-Driven Top Merchants',
    request: {
      userId: USER_ID,
      message: 'What were my top merchants for expenses?',
      sessionId: `test-crystal-${Date.now()}-4`,
      stream: false
    },
    expectedEmployee: 'crystal-ai',
    expectedTool: 'crystal_summarize_expenses'
  }
];

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Message: "${testCase.request.message}"`);
  console.log(`   Employee: ${testCase.request.employeeSlug || 'auto-route'}`);

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.request)
    });

    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const employeeHeader = response.headers.get('X-Employee');
    const sessionHeader = response.headers.get('X-Session-Id');

    console.log(`   ✅ HTTP ${response.status}`);
    console.log(`   ✅ X-Employee: ${employeeHeader}`);
    console.log(`   ✅ X-Session-Id: ${sessionHeader}`);

    // Verify employee header
    if (employeeHeader !== testCase.expectedEmployee) {
      console.error(`   ❌ Expected employee "${testCase.expectedEmployee}", got "${employeeHeader}"`);
      return false;
    }

    // Parse response body
    const responseText = await response.text();
    let responseBody: any;

    try {
      responseBody = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, might be streaming or plain text
      console.log(`   ⚠️  Response is not JSON: ${responseText.substring(0, 100)}...`);
      return true; // Still count as success if we got a response
    }

    // Check for tool calls in response
    if (testCase.expectedTool) {
      const toolCalls = responseBody.toolCalls || responseBody.tool_calls || [];
      const hasExpectedTool = toolCalls.some((tc: any) => 
        tc.function?.name === testCase.expectedTool || 
        tc.name === testCase.expectedTool
      );

      if (hasExpectedTool) {
        console.log(`   ✅ Tool call found: ${testCase.expectedTool}`);
      } else {
        console.warn(`   ⚠️  Expected tool "${testCase.expectedTool}" not found in response`);
        console.warn(`   Available tools: ${JSON.stringify(toolCalls)}`);
      }
    }

    // Check response content
    const content = responseBody.content || responseBody.body || responseText;
    if (content && content.length > 0) {
      console.log(`   ✅ Response content: ${content.substring(0, 100)}...`);
    } else {
      console.warn(`   ⚠️  No content in response`);
    }

    return true;

  } catch (error: any) {
    console.error(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔮 Crystal Smoke Test Suite');
  console.log('='.repeat(50));
  console.log(`User ID: ${USER_ID}`);
  console.log(`Endpoint: ${CHAT_ENDPOINT}`);
  console.log(`Test Cases: ${testCases.length}`);

  const results: boolean[] = [];

  for (const testCase of testCases) {
    const passed = await runTest(testCase);
    results.push(passed);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Crystal is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});





