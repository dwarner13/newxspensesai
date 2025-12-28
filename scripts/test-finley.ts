#!/usr/bin/env tsx
/**
 * Finley AI Test Script
 * 
 * Tests Finley's Phase 1 forecasting capabilities:
 * - Debt payoff forecast
 * - Savings forecast
 * - Routing to Finley
 * 
 * Usage:
 *   tsx scripts/test-finley.ts
 *   OR
 *   npm run test:finley
 */

import { config } from 'dotenv';

// Load .env if available
config();

const CHAT_ENDPOINT = process.env.NETLIFY_DEV_URL || 'http://localhost:8888/.netlify/functions/chat';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

interface ChatResponse {
  headers?: {
    'x-employee'?: string;
    'X-Employee'?: string;
  };
  body?: string;
  status?: number;
}

async function testFinley(message: string, employeeSlug?: string) {
  console.log(`\n📤 Testing: "${message}"`);
  if (employeeSlug) {
    console.log(`   Employee: ${employeeSlug}`);
  }
  console.log('-'.repeat(60));

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message,
        employeeSlug,
        stream: false,
      }),
    });

    const status = response.status;
    const employeeHeader = response.headers.get('X-Employee') || response.headers.get('x-employee') || 'not found';
    const body = await response.text();
    
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = { raw: body.substring(0, 200) };
    }

    console.log(`✅ Status: ${status}`);
    console.log(`👤 X-Employee: ${employeeHeader}`);
    
    if (parsedBody.response) {
      const responseText = parsedBody.response.substring(0, 300);
      console.log(`💬 Response preview: ${responseText}...`);
    } else if (parsedBody.message) {
      const messageText = parsedBody.message.substring(0, 300);
      console.log(`💬 Message preview: ${messageText}...`);
    } else {
      console.log(`💬 Response: ${JSON.stringify(parsedBody).substring(0, 300)}...`);
    }

    return {
      status,
      employeeHeader,
      success: status === 200 && employeeHeader === 'finley-ai',
    };
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return {
      status: 0,
      employeeHeader: 'error',
      success: false,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Finley AI Phase 1 Forecasting');
  console.log('='.repeat(60));
  console.log(`📍 Endpoint: ${CHAT_ENDPOINT}`);
  console.log(`👤 Test User: ${TEST_USER_ID}`);

  const results: Array<{ test: string; success: boolean }> = [];

  // Test 1: Direct Finley - Debt Payoff
  console.log('\n📋 Test 1: Direct Finley - Debt Payoff Forecast');
  const test1 = await testFinley(
    'I have a $2,000 credit card at 20% interest and I can pay $200/month. How long until it\'s paid off?',
    'finley-ai'
  );
  results.push({ test: 'Direct Finley - Debt Payoff', success: test1.success });

  // Test 2: Direct Finley - Savings Forecast
  console.log('\n📋 Test 2: Direct Finley - Savings Forecast');
  const test2 = await testFinley(
    'If I save $300/month starting now, how much will I have by December? (Assume 4% interest)',
    'finley-ai'
  );
  results.push({ test: 'Direct Finley - Savings', success: test2.success });

  // Test 3: Auto-route to Finley (via Prime)
  console.log('\n📋 Test 3: Auto-route to Finley (via Prime)');
  const test3 = await testFinley(
    'How long will it take to pay off my $5,000 credit card if I pay $300/month?',
    undefined // No employeeSlug - should auto-route
  );
  results.push({ test: 'Auto-route to Finley', success: test3.success });

  // Test 4: Savings projection via Prime
  console.log('\n📋 Test 4: Savings Projection via Prime');
  const test4 = await testFinley(
    'If I save $500/month for 2 years, how much will I have?',
    undefined // No employeeSlug - should auto-route
  );
  results.push({ test: 'Savings Projection via Prime', success: test4.success });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  results.forEach(({ test, success }) => {
    console.log(`${success ? '✅' : '❌'} ${test}`);
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n✅ Passed: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});





