# Prime Smoke Test Guide
**One Brain, One Boss - Prime Delegation Testing**

---

## Overview

This guide provides step-by-step manual testing to verify that:
1. **One Brain**: All employees share the same memory (facts + RAG + summaries)
2. **One Boss**: Users interact with Prime, who delegates to specialists
3. **One Chat Pipe**: All interactions go through `/.netlify/functions/chat`
4. **One Memory Pipe**: All documents feed the brain via `/.netlify/functions/embed`

---

## Prerequisites

### 1. Database Setup
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'employee_profiles',
  'chat_sessions',
  'chat_messages',
  'user_memory_facts',
  'memory_embeddings',
  'chat_session_summaries'
);

-- Expected: 6 rows
```

### 2. Start Dev Server
```bash
netlify dev
# Server should start at http://localhost:8888
```

### 3. Test User
- Use a test account or anonymous user
- Note your `userId` (check localStorage → `anonymous_user_id`)

---

## Test 1: Memory (Shared Brain)

**Objective**: Verify Prime remembers facts across sessions

### Steps

1. **Navigate to Prime**
   - Open: `http://localhost:8888/chat/prime`
   - Verify: Prime greeting appears with "Welcome! I'm Prime"

2. **Store a Fact**
   - Send: `"Remember my export preference is CSV."`
   - Wait for response
   - Expected: Prime acknowledges (e.g., "Got it, I'll remember that...")

3. **Verify in Database**
   ```sql
   SELECT id, content, scope, created_at
   FROM user_memory_facts
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Expected: 1 row with `content` containing "export preference" and "CSV"
   - Expected: `scope` is either `'global'` or `'prime-boss'`

4. **Recall the Fact**
   - Send: `"What's my export preference?"`
   - Wait for response
   - Expected: Prime responds with "CSV" or "Your export preference is CSV"

5. **Test Persistence (New Session)**
   - Refresh the page (new session)
   - Send: `"What's my export preference?"`
   - Expected: Prime still remembers "CSV"

### ✅ Success Criteria
- [ ] Fact stored in `user_memory_facts` table
- [ ] Prime recalls fact in same session
- [ ] Prime recalls fact in new session
- [ ] No errors in browser console

---

## Test 2: Delegation Chain (Prime → Byte → Tag)

**Objective**: Verify Prime can delegate to multiple specialists and merge results

### Steps

1. **Send Delegation Request**
   - Send: `"Prime, ask Byte to extract my October transactions and Tag to categorize them. Then summarize top categories."`
   - Wait for response (may take 10-20 seconds)

2. **Observe Tool Calls** (if visible in UI)
   - Expected: Message shows "Coordinating with: delegate" or similar

3. **Verify Response**
   - Expected: Prime provides a **single, cohesive summary** like:
     ```
     I've coordinated with Byte and Tag. Here are your top October categories:
     1. Groceries: $450 (15 transactions)
     2. Dining: $320 (12 transactions)
     3. Transportation: $180 (8 transactions)
     ...
     ```
   - Expected: Response does **not** show raw tool outputs or internal handoffs

4. **Check Logs** (optional, in terminal)
   ```
   [TOOL] Calling delegate with target: byte-doc
   [AGENT_BRIDGE] Calling employee byte-doc
   [AGENT_BRIDGE] Received response from byte-doc
   [TOOL] Calling delegate with target: tag-ai
   [AGENT_BRIDGE] Calling employee tag-ai
   [AGENT_BRIDGE] Received response from tag-ai
   [TOOL] Delegate completed successfully
   ```

5. **Verify in Database**
   ```sql
   SELECT role, content, metadata
   FROM chat_messages
   WHERE session_id = 'YOUR_SESSION_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Expected: User message, assistant message (with tool_calls in metadata), tool results, final assistant message

### ✅ Success Criteria
- [ ] Prime delegates to Byte and Tag
- [ ] Prime merges results into one summary
- [ ] User sees only the final, polished response
- [ ] No timeout errors (< 30 seconds total)

---

## Test 3: Tax Review (Prime → Ledger)

**Objective**: Verify Prime delegates to Ledger with safe summarization

### Steps

1. **Send Tax Request**
   - Send: `"Prime, ask Ledger which October items might be tax-deductible and summarize."`
   - Wait for response

2. **Verify Response**
   - Expected: Prime provides a **conservative summary** like:
     ```
     Ledger identified these potential tax-deductible items from October:
     - Office supplies: $120
     - Professional development: $200
     - Business meals (50%): $225
     
     Note: These are estimates. Please consult a tax professional for accurate advice.
     ```
   - Expected: Response includes a **safety disclaimer** about consulting professionals

3. **Test Edge Case (No Data)**
   - Send: `"Prime, ask Ledger to flag November tax items."`
   - Expected: Prime responds gracefully (e.g., "Ledger didn't find any transactions for November yet")

### ✅ Success Criteria
- [ ] Prime delegates to Ledger
- [ ] Response includes tax item estimates
- [ ] Response includes safety disclaimer
- [ ] Graceful handling when no data exists

---

## Test 4: RAG (Retrieval-Augmented Generation)

**Objective**: Verify Prime can retrieve and cite embedded documents

### Prerequisites

**Embed Test Documents**:
```bash
# Upload 2 test receipts via embed endpoint
curl -X POST "http://localhost:8888/.netlify/functions/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "text": "Receipt from Starbucks on Oct 5, 2024. Total: $12.50. Category: Food & Dining.",
    "owner_scope": "receipt",
    "source_type": "document",
    "source_id": "receipt-001"
  }'

curl -X POST "http://localhost:8888/.netlify/functions/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "text": "Receipt from Amazon on Oct 10, 2024. Total: $45.99. Category: Shopping. Item: Office chair.",
    "owner_scope": "receipt",
    "source_type": "document",
    "source_id": "receipt-002"
  }'
```

### Steps

1. **Verify Embeddings Stored**
   ```sql
   SELECT id, owner_scope, source_type, content
   FROM memory_embeddings
   WHERE user_id = 'YOUR_USER_ID'
   AND owner_scope = 'receipt'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Expected: 2 rows with receipt content

2. **Ask Prime to Summarize**
   - Send: `"Prime, summarize my October spending from uploaded receipts."`
   - Wait for response

3. **Verify Response**
   - Expected: Prime cites **specific amounts and categories** from embedded receipts:
     ```
     Based on your uploaded receipts, here's your October spending:
     - Starbucks (Food & Dining): $12.50 on Oct 5
     - Amazon (Shopping): $45.99 on Oct 10
     
     Total: $58.49 across 2 receipts.
     ```
   - Expected: Response mentions specific merchants, dates, amounts

4. **Test Semantic Search**
   - Send: `"What did I buy at Amazon in October?"`
   - Expected: Prime responds with "Office chair for $45.99"

### ✅ Success Criteria
- [ ] Embeddings successfully stored
- [ ] Prime retrieves relevant documents
- [ ] Prime cites specific amounts/categories
- [ ] Semantic search works (finds "Amazon" when asked)

---

## Test 5: Dashboard Navigation → Prime

**Objective**: Verify dashboard buttons route to Prime with prefilled messages

### Steps

1. **Navigate to Dashboard**
   - Open: `http://localhost:8888/dashboard`

2. **Click "Smart Import AI" Tile** (or similar)
   - Expected: Redirects to `/chat/prime?m=Prime%2C%20ask%20Byte...`
   - Expected: Prime page auto-sends the message
   - Expected: Prime coordinates with Byte and responds

3. **Click "Smart Categories" Tile**
   - Expected: Redirects to Prime with categorization message
   - Expected: Prime delegates to Tag

4. **Click "Tax & Accounting" Tile**
   - Expected: Redirects to Prime with tax review message
   - Expected: Prime delegates to Ledger

### ✅ Success Criteria
- [ ] Dashboard tiles route to Prime (not direct to specialists)
- [ ] Query param `?m=...` is decoded correctly
- [ ] Prime auto-sends the prefilled message
- [ ] Prime delegates appropriately

---

## Test 6: Shared Memory (One Brain)

**Objective**: Verify all employees access the same memory

### Steps

1. **Store Fact via Prime**
   - Send to Prime: `"Remember my preferred currency is CAD."`
   - Expected: Fact stored in `user_memory_facts`

2. **Ask Byte (via Prime)**
   - Send: `"Prime, ask Byte what currency I prefer."`
   - Expected: Byte (via Prime) responds "CAD"
   - Reasoning: Byte should access the same `user_memory_facts` table

3. **Ask Ledger (via Prime)**
   - Send: `"Prime, ask Ledger what currency I use for tax reporting."`
   - Expected: Ledger responds "CAD"

4. **Verify RAG is Shared**
   - Embed a document with `owner_scope: "receipt"`
   - Ask Prime: `"Summarize my receipts"`
   - Ask Byte (via Prime): `"Prime, ask Byte to list my uploaded receipts"`
   - Expected: Both can access the same `memory_embeddings`

### ✅ Success Criteria
- [ ] Facts stored by Prime are accessible to all employees
- [ ] RAG documents are shared across all employees
- [ ] No duplicate memory storage per employee

---

## Test 7: PII Redaction (Security)

**Objective**: Verify sensitive data is redacted before storage

### Steps

1. **Send Sensitive Data**
   - Send to Prime: `"My VISA card is 4111 1111 1111 1111 and my SIN is 123-456-789."`
   - Wait for response

2. **Check Database**
   ```sql
   SELECT content, redacted_content, metadata
   FROM chat_messages
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Expected `content`: Original text with real card/SIN
   - Expected `redacted_content`: `"My VISA card is {{CARD_1111}} and my SIN is {{SSN}}."`
   - Expected `metadata`: Contains `redaction_tokens` mapping

3. **Verify No PII in Embeddings**
   ```sql
   SELECT content FROM memory_embeddings
   WHERE user_id = 'YOUR_USER_ID'
   AND content ~ '\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}';
   ```
   - Expected: 0 rows (no credit cards found)

### ✅ Success Criteria
- [ ] Raw PII stored in `content` (encrypted/protected)
- [ ] Redacted version stored in `redacted_content`
- [ ] `metadata` contains redaction token map
- [ ] No PII in embeddings or summaries

---

## Test 8: Error Handling

**Objective**: Verify graceful error handling

### Steps

1. **Invalid Employee**
   - Send: `"Prime, ask NonExistent to do something."`
   - Expected: Prime responds "I don't have a specialist named NonExistent..." (graceful)

2. **Timeout Scenario** (optional, requires network throttling)
   - Simulate slow response from delegate
   - Expected: Prime responds "Request timed out..." or retries

3. **No Data Scenario**
   - Send: `"Prime, summarize my transactions from 2099."`
   - Expected: Prime responds "I don't have any data for 2099 yet."

### ✅ Success Criteria
- [ ] No unhandled exceptions
- [ ] User-friendly error messages
- [ ] Logs show detailed errors for debugging

---

## Test 9: Session Management

**Objective**: Verify sessions persist correctly

### Steps

1. **Start New Session**
   - Open Prime chat (new tab or incognito)
   - Note the session ID in footer

2. **Send Multiple Messages**
   - Send: `"Hello Prime"`
   - Send: `"What's 2+2?"`
   - Send: `"Thanks!"`

3. **Check Database**
   ```sql
   SELECT id, user_id, employee_slug, message_count
   FROM chat_sessions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Expected: `message_count` = 6 (3 user + 3 assistant)

4. **Refresh Page**
   - Expected: Session ID remains the same
   - Expected: Message history reloads

5. **Check LocalStorage**
   ```javascript
   localStorage.getItem('chat_session_prime-boss')
   ```
   - Expected: Session ID matches database

### ✅ Success Criteria
- [ ] Sessions persist across page refreshes
- [ ] Session ID stored in localStorage
- [ ] Message count increments correctly

---

## Summary Checklist

| Test | Status | Notes |
|------|--------|-------|
| 1. Memory (Shared Brain) | [ ] | Facts persist across sessions |
| 2. Delegation (Prime → Byte → Tag) | [ ] | Multi-agent coordination works |
| 3. Tax Review (Prime → Ledger) | [ ] | Safe summaries with disclaimers |
| 4. RAG (Document Retrieval) | [ ] | Embeddings retrieved and cited |
| 5. Dashboard → Prime Navigation | [ ] | Prefilled messages work |
| 6. Shared Memory (One Brain) | [ ] | All employees access same facts/RAG |
| 7. PII Redaction (Security) | [ ] | Sensitive data masked |
| 8. Error Handling | [ ] | Graceful failures |
| 9. Session Management | [ ] | Sessions persist correctly |

---

## Troubleshooting

### Issue: Prime doesn't delegate
**Symptoms**: Prime answers directly instead of calling specialists

**Fix**:
1. Check `employee_profiles` table:
   ```sql
   SELECT slug, tools_allowed FROM employee_profiles WHERE slug = 'prime-boss';
   ```
   Expected: `tools_allowed` includes `'delegate'`

2. Check `tools_registry` table:
   ```sql
   SELECT name, handler_path FROM tools_registry WHERE name = 'delegate';
   ```
   Expected: 1 row exists

3. Check chat.ts for tool-calling loop implementation

### Issue: No embeddings returned
**Symptoms**: Prime says "I don't have any receipts"

**Fix**:
1. Verify embeddings exist:
   ```sql
   SELECT COUNT(*) FROM memory_embeddings WHERE user_id = 'YOUR_USER_ID';
   ```
2. Check embedding dimension (should be 1536 for text-embedding-3-small)
3. Verify contextBuilder includes `includeRAG: true`

### Issue: PII not redacted
**Symptoms**: Raw credit cards visible in database

**Fix**:
1. Check `redaction.ts` is imported in `chat.ts`
2. Verify `redact()` function called before `saveMessage()`
3. Check `PII_PATTERNS` regex in `redaction.ts`

---

**Status**: Ready for testing!  
**Next**: Run all 9 tests and check off the summary checklist above.

