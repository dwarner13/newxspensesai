# 🧪 Parity Test Harness - Usage Guide

## Overview

The parity test harness compares the **OLD** (legacy) chat endpoint with the **NEW** (centralized runtime) endpoint to ensure feature parity before migration.

## 🚀 Quick Start

### 1. Start Both Endpoints

```bash
# Terminal 1: Start legacy endpoint (if applicable)
npm run dev  # or your legacy server

# Terminal 2: Start Netlify Dev
netlify dev
```

### 2. Run Parity Test

```bash
# Use default endpoints
npm run parity

# Or specify custom endpoints
npm run parity:custom -- \
  --old=http://localhost:3000/api/chat \
  --new=http://localhost:8888/.netlify/functions/chat \
  --userId=TEST_USER
```

### 3. Review Results

Check the output table and CSV file:
```bash
cat /tmp/parity_results.csv
```

---

## 📊 What It Tests

### 10 Test Scenarios

1. **Greeting** - "Hello! Who are you?"
2. **Capability** - "Give me a 2-sentence overview of how you work."
3. **Factual** - "What is compound interest?"
4. **Analysis** - "How can I reduce my monthly expenses?"
5. **Specific** - "What are the top 3 tax deductions for small businesses?"
6. **Calculation** - "If I save $500/month at 5% annual interest, how much will I have in 2 years?"
7. **Advice** - "Should I pay off debt or invest first?"
8. **Troubleshooting** - "Why are my transactions not categorizing automatically?"
9. **Feature** - "Can you export my data to Google Sheets?"
10. **Edge Case** - "My credit card ending in 1234 was charged $999.99 yesterday"

### Metrics Tracked

For each prompt, both endpoints are tested and measured:

- ⏱️ **Latency**: Time to complete response (ms)
- 🎯 **Token Usage**: Prompt, completion, and total tokens
- 📝 **Response Length**: Character count
- ✅ **Success Rate**: % of successful responses
- ❌ **Errors**: Any failures or exceptions

---

## 📈 Output Format

### Console Output

```
🚀 Starting Parity Test...

   OLD: http://localhost:3000/old-chat
   NEW: http://localhost:8888/.netlify/functions/chat
   User: TEST_USER
   Prompts: 10

Testing 1/10: greeting - "Hello! Who are you?..."
  OLD: ✅ 1234ms, 256tok
  NEW: ✅ 1189ms, 245tok

... (9 more tests)

💾 Results saved to: /tmp/parity_results.csv

================================================================================
📊 PARITY TEST RESULTS
================================================================================

┌─────────────────────────┬──────────────┬──────────────┬──────────────┐
│ Metric                  │ OLD Endpoint │ NEW Endpoint │ Difference   │
├─────────────────────────┼──────────────┼──────────────┼──────────────┤
│ Avg Latency (ms)        │         1245 │         1189 │ ✅ -56ms (-4.5%) │
│ Avg Prompt Tokens       │          523 │          498 │ ✅ -25tok (-4.8%) │
│ Avg Completion Tokens   │          234 │          241 │ +7tok (+3.0%)│
│ Avg Total Tokens        │          757 │          739 │ ✅ -18tok (-2.4%) │
│ Avg Response Length     │          945 │          963 │ ~same        │
│ Success Rate            │          100 │          100 │ ~same        │
└─────────────────────────┴──────────────┴──────────────┴──────────────┘

🎯 PARITY ASSESSMENT:

   ✅ Latency: PASS (within 20%)
   ✅ Token Usage: PASS (within 15%)
   ✅ Success Rate: PASS (equal or better)

📈 OVERALL PARITY SCORE: 96/100 ✅ EXCELLENT - Full parity achieved
```

### CSV Output (`/tmp/parity_results.csv`)

```csv
prompt_id,endpoint,category,prompt,response_text,latency_ms,tokens_prompt,tokens_completion,tokens_total,error,timestamp
1,OLD,greeting,"Hello! Who are you?","I'm your AI financial assistant...",1234,45,211,256,,2025-10-09T17:30:00Z
1,NEW,greeting,"Hello! Who are you?","I'm your AI financial assistant...",1189,43,202,245,,2025-10-09T17:30:05Z
...
```

---

## 🎯 Interpreting Results

### Parity Score Interpretation

| Score | Verdict | Meaning |
|-------|---------|---------|
| 90-100 | ✅ EXCELLENT | Full parity, ready to migrate |
| 75-89 | ✅ GOOD | Minor differences, investigate but acceptable |
| 60-74 | ⚠️ FAIR | Noticeable differences, review before migration |
| < 60 | ❌ POOR | Significant issues, fix before proceeding |

### Acceptable Differences

- **Latency**: ±20% is acceptable (caching, network variance)
- **Token Usage**: ±15% is acceptable (slight prompt differences)
- **Response Length**: ±30% is acceptable (phrasing variations)
- **Success Rate**: NEW must be ≥ OLD

### Red Flags

- ❌ NEW endpoint has lower success rate
- ❌ NEW endpoint > 50% slower
- ❌ NEW endpoint uses > 30% more tokens
- ❌ Consistent errors in NEW endpoint

---

## 🔧 Troubleshooting

### "Connection refused" errors

**Cause**: Endpoint not running

**Fix**:
```bash
# Start the appropriate server
netlify dev  # For NEW endpoint
# OR
npm run dev  # For OLD endpoint
```

### "Function not found" error

**Cause**: Netlify function not deployed

**Fix**:
```bash
# Build functions
npm run build:functions

# Or ensure function exists
ls netlify/functions/chat.ts
```

### All tests timeout

**Cause**: Endpoints hanging or very slow

**Fix**:
- Check server logs for errors
- Verify database connections
- Test endpoints manually with curl

### Different responses every time

**Expected**: AI responses vary slightly

**If too different**:
- Check if prompts are deterministic (low temperature)
- Verify same model is used (GPT-4o-mini vs GPT-4)
- Check if context is consistent

---

## 🧪 Advanced Usage

### Test Specific Endpoints

```bash
npm run parity:custom -- \
  --old=https://production-api.com/chat \
  --new=http://localhost:8888/.netlify/functions/chat \
  --userId=real-user-id \
  --output=./results/parity-$(date +%Y%m%d).csv
```

### Test Different Employees

Modify `scripts/parityTest.ts`:

```typescript
// Change employee in callChatEndpoint calls
const oldResult = await callChatEndpoint(
  config.oldEndpoint,
  config.userId,
  'prime-boss',  // <-- Change here
  testPrompt.prompt
);
```

### Add Custom Test Prompts

Edit `TEST_PROMPTS` array in `scripts/parityTest.ts`:

```typescript
const TEST_PROMPTS: TestPrompt[] = [
  // ... existing prompts
  {
    id: 11,
    category: 'custom',
    prompt: 'Your custom test prompt here',
    expectedKeywords: ['keyword1', 'keyword2'],
  },
];
```

---

## 📋 Pre-Test Checklist

Before running parity tests:

- [ ] Both endpoints are running and accessible
- [ ] Database migrations applied (for NEW endpoint)
- [ ] Environment variables configured
- [ ] Employee profiles seeded in database
- [ ] OpenAI API key is valid
- [ ] Supabase connection working

---

## 🎯 Testing the NEW Endpoint Standalone

### Test with curl

```bash
# Start Netlify Dev
netlify dev

# Test in another terminal
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TEST_USER",
    "employeeSlug": "prime-boss",
    "message": "Hello, are you working?",
    "stream": true
  }'
```

**Expected Output (SSE stream):**
```
data: {"type":"start","session_id":"uuid-here","employee":{"slug":"prime-boss",...}}

data: {"type":"text","content":"Hello"}

data: {"type":"text","content":"! I"}

data: {"type":"text","content":"'m Prime"}

... (more chunks)

data: {"type":"done","total_tokens":234}
```

### Non-streaming test

```bash
curl -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TEST_USER",
    "employeeSlug": "byte-doc",
    "message": "What can you do?",
    "stream": false
  }'
```

**Expected Output (JSON):**
```json
{
  "session_id": "uuid-here",
  "message_id": "uuid-here",
  "content": "I'm Byte, your document processing specialist! I can...",
  "employee": {
    "slug": "byte-doc",
    "title": "Byte - Document Processing Specialist",
    "emoji": "📄"
  },
  "tokens": {
    "prompt": 123,
    "completion": 456,
    "total": 579
  }
}
```

---

## 📊 Analyzing Results

### Load CSV in Excel/Google Sheets

1. Open the CSV file: `/tmp/parity_results.csv`
2. Create pivot tables for analysis
3. Compare OLD vs NEW side-by-side

### SQL Analysis (if you store results in DB)

```sql
-- Average metrics by endpoint
SELECT 
  endpoint,
  AVG(latency_ms) as avg_latency,
  AVG(tokens_total) as avg_tokens,
  COUNT(*) FILTER (WHERE error IS NULL) as success_count,
  COUNT(*) as total_count
FROM parity_results
GROUP BY endpoint;

-- Variance by category
SELECT 
  category,
  endpoint,
  AVG(latency_ms) as avg_latency,
  STDDEV(latency_ms) as stddev_latency
FROM parity_results
GROUP BY category, endpoint
ORDER BY category, endpoint;
```

---

## ✅ Success Criteria

The NEW endpoint has parity if:

- ✅ **Success rate** ≥ OLD endpoint (100% ideally)
- ✅ **Latency** within ±20% of OLD
- ✅ **Token usage** within ±15% of OLD
- ✅ **Response quality** similar (manual review)
- ✅ **No critical errors**

Once these criteria are met, you can confidently migrate users to the NEW endpoint.

---

## 🚀 Next Steps After Parity

1. ✅ Review parity results
2. ✅ Fix any issues in NEW endpoint
3. ✅ Run parity test again
4. ✅ Deploy NEW endpoint to production
5. ✅ Route 10% of traffic to NEW
6. ✅ Monitor for 24 hours
7. ✅ Gradually increase to 100%
8. ✅ Deprecate OLD endpoint

---

**You're now ready to run parity tests!** 🎉

Just ensure both endpoints are running, then:
```bash
npm run parity
```

