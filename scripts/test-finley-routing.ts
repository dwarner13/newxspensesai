#!/usr/bin/env tsx
/**
 * Finley Routing Test Script
 * 
 * Tests that forecasting/planning questions route to Finley correctly.
 * 
 * Usage:
 *   tsx scripts/test-finley-routing.ts
 *   OR
 *   npm run test:finley
 */

import { config } from 'dotenv';
import { routeToEmployee } from '../netlify/functions/_shared/router';

// Load .env if available
config();

const CHAT_ENDPOINT = process.env.NETLIFY_DEV_URL || 'http://localhost:8888/.netlify/functions/chat';
const USER_ID = process.env.USER_ID || 'test-user-id';

async function testFinleyRouting() {
  console.log('🧪 Testing Finley Routing');
  console.log('='.repeat(60));
  console.log(`Using endpoint: ${CHAT_ENDPOINT}`);
  console.log(`Using userId: ${USER_ID}`);
  console.log('');

  // Test cases: questions that should route to Finley
  const testCases = [
    {
      name: 'Debt Payoff Question',
      message: 'How long to pay off my $2,000 credit card if I pay $200/month?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Savings Forecast Question',
      message: 'How much can I save by December if I keep spending like this?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Future Projection',
      message: 'What will I have saved in 6 months?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Planning Question',
      message: 'Forecast my savings for next year',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Timeline Question',
      message: 'When will this debt be paid off?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Scenario Analysis',
      message: 'What if I save $500 a month?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Time-based Projection',
      message: 'How much money will I have in 2028?',
      expectedEmployee: 'finley-ai',
    },
    {
      name: 'Retirement Planning',
      message: 'Plan my retirement savings timeline',
      expectedEmployee: 'finley-ai',
    },
  ];

  console.log('📋 Testing Router Logic (No HTTP calls)');
  console.log('-'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await routeToEmployee({
        userText: testCase.message,
        requestedEmployee: null,
      });

      const success = result.employee === testCase.expectedEmployee;
      const status = success ? '✅' : '❌';
      
      console.log(`${status} ${testCase.name}`);
      console.log(`   Message: "${testCase.message}"`);
      console.log(`   Routed to: ${result.employee} (expected: ${testCase.expectedEmployee})`);
      
      if (success) {
        passed++;
      } else {
        failed++;
        console.error(`   ❌ FAILED: Expected ${testCase.expectedEmployee}, got ${result.employee}`);
      }
    } catch (error: any) {
      console.error(`❌ ${testCase.name} → Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`📊 Router Test Results: ${passed} passed, ${failed} failed`);
  console.log('');

  // Test HTTP endpoint (if available)
  if (process.env.SKIP_HTTP_TESTS !== 'true') {
    console.log('🌐 Testing HTTP Endpoint (Optional)');
    console.log('-'.repeat(60));
    console.log('Note: Set SKIP_HTTP_TESTS=true to skip HTTP tests');
    console.log('');

    const httpTestCases = [
      {
        name: 'Debt Payoff via HTTP',
        message: 'How long to pay off my $2,000 credit card if I pay $200/month?',
      },
      {
        name: 'Savings Forecast via HTTP',
        message: 'How much can I save by December if I keep spending like this?',
      },
    ];

    for (const testCase of httpTestCases) {
      try {
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': USER_ID,
          },
          body: JSON.stringify({
            userId: USER_ID,
            message: testCase.message,
            stream: false,
          }),
        });

        const xEmployee = response.headers.get('X-Employee');
        const success = xEmployee === 'finley-ai';
        const status = success ? '✅' : '❌';

        console.log(`${status} ${testCase.name}`);
        console.log(`   X-Employee header: ${xEmployee || 'missing'} (expected: finley-ai)`);
        console.log(`   Status: ${response.status}`);

        if (!success) {
          console.error(`   ❌ FAILED: Expected X-Employee: finley-ai, got ${xEmployee || 'missing'}`);
        }
      } catch (error: any) {
        console.error(`❌ ${testCase.name} → Error: ${error.message}`);
        console.log('   (This is OK if Netlify dev is not running)');
      }
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('🎉 Finley routing tests completed!');
  console.log('');
  console.log('To test with HTTP calls, ensure:');
  console.log('  1. Netlify dev is running: npm run netlify:dev');
  console.log('  2. USER_ID is set in .env or environment');
  console.log('  3. You have transactions in the database');
}

// Run tests
testFinleyRouting().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});





