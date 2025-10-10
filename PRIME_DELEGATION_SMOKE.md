# Prime Delegation Smoke Test
**One Boss, Tool-Calling Loop Enabled**

---

## Prerequisites

1. **Database**: Run `supabase/migrations/002_prime_delegation_setup.sql`
2. **Env Variable**: Set `ENABLE_DELEGATION=true` in `.env`
3. **Server**: `netlify dev` running on http://localhost:8888
4. **User**: Have a test userId (check `localStorage.anonymous_user_id`)

---

## Test A: Memory (No Delegation)

**Objective**: Verify Prime stores and recalls facts

### Steps
1. Open http://localhost:8888/chat/prime
2. Send: `"Remember my export preference is CSV."`
3. Wait for response
4. Send: `"What's my export preference?"`

### Expected
- First response: "Got it, I'll remember CSV is your preference."
- Second response: "Your export preference is CSV."

### Verify in DB
```sql
SELECT content, scope
FROM user_memory_facts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```
Expected: Row with "export preference" and "CSV"

---

## Test B: Single Delegation (Prime → Byte)

**Objective**: Verify Prime delegates to one specialist

### Steps
1. Send: `"Prime, ask Byte (byte-doc) to say 'ready' and return it."`
2. Watch for tool call indicator in UI (if visible)
3. Wait for response (10-15 seconds)

### Expected
- Response like: "Byte reports: ready"
- Or: "I coordinated with Byte. They confirm: ready."
- **No errors** in browser console or terminal

### Verify in DB
```sql
SELECT origin_employee, target_employee, success, duration_ms
FROM delegation_audit_log
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```
Expected: 
- `origin_employee = 'prime-boss'`
- `target_employee = 'byte-doc'`
- `success = true`

---

## Test C: Chain Delegation (Prime → Byte → Tag)

**Objective**: Verify Prime can delegate to multiple specialists sequentially

### Steps
1. Send: `"Prime, ask Byte to extract my October transactions and Tag to categorize them. Then summarize top categories."`
2. Wait for response (20-30 seconds)

### Expected
- Response includes categories like:
  - "Top categories: Groceries ($450), Dining ($320), Transportation ($180)"
- Response is **one cohesive summary**, not raw tool outputs

### Verify in DB
```sql
SELECT origin_employee, target_employee, objective, created_at
FROM delegation_audit_log
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```
Expected: 2 rows (one for Byte, one for Tag), both from `'prime-boss'`

---

## Test D: Tax Delegation (Prime → Ledger)

**Objective**: Verify Prime delegates tax questions appropriately

### Steps
1. Send: `"Prime, ask Ledger which October items might be tax-deductible and summarize."`
2. Wait for response

### Expected
- Response includes:
  - List of potential deductions (e.g., "Office supplies: $120")
  - **Safety disclaimer** (e.g., "Consult a tax professional")
- Tone is **conservative** (no definitive advice)

### Verify Response Contains
- [ ] Potential deduction amounts
- [ ] Disclaimer or "estimate" language
- [ ] No breaking errors

---

## Test E: RAG (Document Retrieval)

**Objective**: Verify Prime can retrieve embedded documents

### Setup
First, embed test receipts:
```bash
curl -X POST "http://localhost:8888/.netlify/functions/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "text": "Receipt from Starbucks on Oct 5. Total: $12.50.",
    "owner_scope": "receipt",
    "source_type": "document"
  }'

curl -X POST "http://localhost:8888/.netlify/functions/embed" \
  -H "Content-Type": application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "text": "Receipt from Amazon on Oct 10. Total: $45.99. Item: Office chair.",
    "owner_scope": "receipt",
    "source_type": "document"
  }'
```

### Steps
1. Send: `"Prime, summarize my October spending from uploaded receipts."`
2. Wait for response

### Expected
- Response mentions **specific amounts**: "$12.50", "$45.99"
- Response mentions **merchants**: "Starbucks", "Amazon"
- Total calculated: "$58.49"

### Verify in DB
```sql
SELECT COUNT(*)
FROM memory_embeddings
WHERE user_id = 'YOUR_USER_ID'
AND owner_scope = 'receipt';
```
Expected: 2 rows

---

## Test F: Depth Limit (Safety)

**Objective**: Verify depth guard prevents infinite loops

### Steps
1. Manually trigger a depth-2 request (requires debug access or curl):
```bash
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -H "x-agent-depth: 3" \
  -d '{
    "userId": "YOUR_USER_ID",
    "employeeSlug": "prime-boss",
    "message": "Test delegation"
  }'
```

### Expected
- Response: "I cannot delegate further. Maximum delegation depth reached."
- **No crash** or unhandled errors

---

## Test G: Dashboard Navigation

**Objective**: Verify dashboard buttons route to Prime with prefill

### Steps
1. Open http://localhost:8888/dashboard
2. Click "Smart Import AI" tile
3. Verify: Redirects to `/chat/prime?m=Prime%2C%20ask%20Byte...`
4. Verify: Prime auto-sends the prefilled message

### Expected
- URL contains `?m=` query param
- Prime page auto-sends the message (no manual send needed)
- Prime delegates to appropriate employee

---

## Quick Checklist

| Test | Status | Notes |
|------|--------|-------|
| A. Memory (no delegation) | [ ] | Facts stored and recalled |
| B. Single delegation (→ Byte) | [ ] | Tool call executed |
| C. Chain delegation (→ Byte → Tag) | [ ] | Multiple specialists coordinated |
| D. Tax delegation (→ Ledger) | [ ] | Safe summary with disclaimer |
| E. RAG (document retrieval) | [ ] | Embedded receipts retrieved |
| F. Depth limit (safety) | [ ] | Max depth enforced |
| G. Dashboard navigation | [ ] | Prefill works |

---

## Troubleshooting

### Issue: "I don't have a delegate tool"
**Fix**: Check `employee_profiles`:
```sql
SELECT tools_allowed FROM employee_profiles WHERE slug = 'prime-boss';
```
Expected: `['delegate']`

If missing, run `supabase/migrations/002_prime_delegation_setup.sql`

### Issue: "callEmployee is not a function"
**Fix**: Check imports in `chat.ts`:
```typescript
import { delegateTool, delegateToolDefinition } from '../../chat_runtime/tools/delegate';
```

### Issue: Delegation times out
**Check**:
1. `agentBridge.ts` CHAT_ENDPOINT is correct
2. Timeout set to 15000ms (15 seconds)
3. Target employee exists in `employee_profiles`

### Issue: No tool calls detected
**Check**:
1. Prime's `tools_allowed` includes `'delegate'`
2. `delegateToolDefinition` passed to OpenAI in `tools` array
3. OpenAI model supports function calling (`gpt-4o-mini` or better)

---

**Status**: Ready for testing!  
**Time**: ~15 minutes to run all tests  
**Next**: If all pass → Deploy to staging

