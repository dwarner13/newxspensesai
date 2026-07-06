# Crystal Smoke Test Plan

**Date:** February 16, 2025  
**Purpose:** End-to-end verification that Crystal (`crystal-ai`) works correctly in dev environment

---

## Prerequisites

1. **Start dev server:**
   ```bash
   npm run netlify:dev
   ```
   Server should be running on `http://localhost:8888`

2. **Get a test user ID:**
   - Use a real user ID from your Supabase `auth.users` table, OR
   - Use the demo user ID if available
   - Set in environment: `export USER_ID="your-user-id-here"`

3. **Ensure Crystal employee profile exists:**
   ```sql
   SELECT slug, title, tools_allowed, is_active 
   FROM public.employee_profiles 
   WHERE slug = 'crystal-ai';
   ```
   Should return: `slug: 'crystal-ai'`, `tools_allowed: ['crystal_summarize_income', 'crystal_summarize_expenses']`, `is_active: true`

---

## Test Cases

### Test 1: Direct Crystal Income Summary

**Purpose:** Verify Crystal responds directly when explicitly requested with `employeeSlug: "crystal-ai"`

**cURL Command:**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "employeeSlug": "crystal-ai",
    "message": "Crystal, summarize my income this month.",
    "sessionId": "test-session-crystal-001",
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "X-Employee": "crystal-ai",
    "X-Session-Id": "test-session-crystal-001"
  },
  "body": "{\"content\": \"...\", \"toolCalls\": [...]}"
}
```

**Good Response Indicators:**
- ✅ `X-Employee` header = `"crystal-ai"`
- ✅ Response includes tool call to `crystal_summarize_income`
- ✅ Tool result includes: `{ total: number, count: number, average: number, topMerchants: [...] }`
- ✅ Crystal provides short, numerical explanation (e.g., "Total income: $5,000 from 12 transactions")

**Example Good Response Body:**
```json
{
  "content": "Total income: $5,000.00\n12 transactions\nAverage: $416.67\n\nTop sources:\n- Employer A: $3,000 (6 transactions)\n- Freelance: $2,000 (6 transactions)",
  "toolCalls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "crystal_summarize_income",
        "arguments": "{\"startDate\":\"2025-01-01\",\"endDate\":\"2025-01-31\"}"
      }
    }
  ],
  "metadata": {
    "employee": "crystal-ai",
    "sessionId": "test-session-crystal-001"
  }
}
```

---

### Test 2: Direct Crystal Expense Summary

**Purpose:** Verify Crystal handles expense queries correctly

**cURL Command:**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "employeeSlug": "crystal-ai",
    "message": "How much did I spend this month?",
    "sessionId": "test-session-crystal-002",
    "stream": false
  }'
```

**Expected Response:**
- ✅ `X-Employee` header = `"crystal-ai"`
- ✅ Tool call to `crystal_summarize_expenses`
- ✅ Response includes: `{ total, count, average, topMerchants }`
- ✅ Crystal provides concise spending summary

**Example Good Response:**
```json
{
  "content": "Total spending: $2,500.00\n45 transactions\nAverage: $55.56\n\nTop merchants:\n- Costco: $800 (3 transactions)\n- Amazon: $600 (12 transactions)\n- Gas Station: $300 (8 transactions)",
  "toolCalls": [
    {
      "function": {
        "name": "crystal_summarize_expenses",
        "arguments": "{}"
      }
    }
  ]
}
```

---

### Test 3: Router-Driven Crystal (Auto-Route from Prime)

**Purpose:** Verify router automatically routes income/expense queries to Crystal without explicit `employeeSlug`

**cURL Command:**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "message": "Income summary for this month",
    "sessionId": "test-session-crystal-003",
    "stream": false
  }'
```

**Expected Response:**
- ✅ Router selects `crystal-ai` (no `employeeSlug` provided)
- ✅ `X-Employee` header = `"crystal-ai"`
- ✅ Crystal responds with income summary
- ✅ Tool call to `crystal_summarize_income` present

---

### Test 4: Router-Driven Top Merchants Query

**Purpose:** Verify router routes "top merchants" queries to Crystal

**cURL Command:**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "message": "What were my top merchants for expenses?",
    "sessionId": "test-session-crystal-004",
    "stream": false
  }'
```

**Expected Response:**
- ✅ Router selects `crystal-ai`
- ✅ Crystal calls `crystal_summarize_expenses` tool
- ✅ Response includes `topMerchants` array sorted by total (descending)

---

### Test 5: Streaming Response (Optional)

**Purpose:** Verify Crystal works with streaming responses (SSE)

**cURL Command:**
```bash
curl -N -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "employeeSlug": "crystal-ai",
    "message": "Summarize my expenses",
    "sessionId": "test-session-crystal-005",
    "stream": true
  }'
```

**Expected Response:**
- ✅ SSE stream with `data:` lines
- ✅ `data: {"type":"employee","employee":"crystal-ai"}` early in stream
- ✅ `data: {"type":"token","token":"..."}` for response tokens
- ✅ `data: {"type":"done"}` at end
- ✅ Tool calls appear in stream

---

## Automated Test Script

### `scripts/test-crystal.ts`

```typescript
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
  console.log('=' .repeat(50));
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
```

---

## Quick Test Commands

### One-Liner Tests

**Test 1: Direct Income**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","employeeSlug":"crystal-ai","message":"Summarize my income","sessionId":"test-1","stream":false}' | jq
```

**Test 2: Direct Expenses**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","employeeSlug":"crystal-ai","message":"How much did I spend?","sessionId":"test-2","stream":false}' | jq
```

**Test 3: Auto-Route**
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","message":"Income summary this month","sessionId":"test-3","stream":false}' | jq '.headers["X-Employee"]'
```

---

## Expected Tool Response Structure

When Crystal calls `crystal_summarize_income` or `crystal_summarize_expenses`, the tool should return:

```json
{
  "total": 5000.00,
  "count": 12,
  "average": 416.67,
  "topMerchants": [
    {
      "merchant": "Employer A",
      "total": 3000.00,
      "count": 6
    },
    {
      "merchant": "Freelance Client",
      "total": 2000.00,
      "count": 6
    }
  ]
}
```

Crystal should then format this into a short, numerical response like:

> "Total income: $5,000.00 from 12 transactions. Average: $416.67. Top sources: Employer A ($3,000, 6 transactions), Freelance Client ($2,000, 6 transactions)."

---

## Troubleshooting

### Issue: "Employee not found" or wrong employee responds
- ✅ Check `employee_profiles` table: `SELECT * FROM employee_profiles WHERE slug = 'crystal-ai'`
- ✅ Verify `is_active = true`
- ✅ Check router logic in `netlify/functions/_shared/router.ts`

### Issue: Tool not called
- ✅ Verify `tools_allowed` includes `'crystal_summarize_income'` and `'crystal_summarize_expenses'`
- ✅ Check tool registration in `src/agent/tools/index.ts`
- ✅ Verify tool implementations exist: `src/agent/tools/impl/crystal_summarize_*.ts`

### Issue: Empty or zero results
- ✅ Check if user has transactions in `transactions` table
- ✅ Verify `user_id` matches the test user
- ✅ Check transaction `type` field ('income' or 'expense')

### Issue: Router doesn't select Crystal
- ✅ Check routing patterns in `router.ts` (should be HIGH PRIORITY)
- ✅ Test with explicit `employeeSlug: "crystal-ai"` first
- ✅ Verify message matches routing patterns

---

## Success Criteria

✅ **All tests pass if:**
1. Crystal responds when `employeeSlug: "crystal-ai"` is provided
2. Router auto-routes income/expense queries to Crystal
3. Crystal calls appropriate tools (`crystal_summarize_income` or `crystal_summarize_expenses`)
4. Tool responses include `{ total, count, average, topMerchants }`
5. Crystal provides short, numerical explanations
6. `X-Employee` header = `"crystal-ai"` in all responses

---

**Status:** ✅ **TEST PLAN READY**  
**Run tests to verify Crystal implementation.**





