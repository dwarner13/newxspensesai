# Day 4 Memory Unification - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day4-memory-unification`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day4-memory-unification

# Install dependencies (if needed)
pnpm install

# Start dev server
npx netlify dev
```

### 2. Verify Memory Functions Exist

```bash
# Check exports
rg -n "export.*function.*(upsertFact|recall|extractFactsFromMessages|capTokens)" netlify/functions/_shared/memory.ts

# Expected output: 5 function exports
```

### 3. Verify Chat Integration

```bash
# Check memory recall in chat.ts
rg -n "Context-Memory|recall\(|memoryHit" netlify/functions/chat.ts

# Check memory extraction
rg -n "extractFactsFromMessages|upsertFact|embedAndStore" netlify/functions/chat.ts

# Check headers
rg -n "X-Memory-Hit|X-Memory-Count" netlify/functions/chat.ts

# Expected: Multiple matches in chat.ts
```

### 4. Run Tests

```bash
# Run memory tests
pnpm test netlify/functions/_shared/__tests__/memory.test.ts

# Expected: All tests pass (or show expected failures for mocked functions)
```

### 5. Manual Test Flow

#### Test 1: Memory Recall (Before Model)

1. **Setup**: Ensure you have at least one fact in `user_memory_facts`:
   ```sql
   INSERT INTO user_memory_facts (user_id, fact, fact_hash, source)
   VALUES ('test-user-id', 'My weekly GFS is $1600', encode(digest('my weekly gfs is $1600', 'sha256'), 'hex'), 'chat');
   ```

2. **Send first message** (teach fact):
   ```json
   {
     "userId": "test-user-id",
     "message": "Remember: My weekly GFS is $1600. Save-On-Foods receipts are groceries.",
     "sessionId": "test-session"
   }
   ```

3. **Send second message** (recall):
   ```json
   {
     "userId": "test-user-id",
     "message": "What is my weekly deposit?",
     "sessionId": "test-session"
   }
   ```

4. **Check response headers**:
   - `X-Memory-Hit`: Should be > 0.00 if fact matches (e.g., "0.85")
   - `X-Memory-Count`: Should be ≥ 1 if fact matches (e.g., "1")

5. **Check logs**: Should see `[Chat] Memory recall: N facts, top score: X.XX`

6. **Verify Supabase**: Check `user_memory_facts` and `memory_embeddings` tables (no duplicates)

#### Test 2: Memory Extraction (After Model)

1. **Send message with extractable facts**:
   ```json
   {
     "userId": "test-user-id",
     "message": "I spent $50 at Tim Hortons on 2025-01-20. My email is test@example.com.",
     "sessionId": "test-session"
   }
   ```

2. **Check database**:
   ```sql
   SELECT id, fact, fact_hash, source, created_at 
   FROM user_memory_facts 
   WHERE user_id = 'test-user-id' 
   ORDER BY created_at DESC LIMIT 5;
   ```

3. **Verify**:
   - Facts extracted (vendor: Tim Hortons, amount: 50, date: 2025-01-20)
   - Email masked (should contain `[email` not `test@example.com`)
   - No duplicates (same fact_hash should appear once per user_id)

4. **Check embeddings**:
   ```sql
   SELECT COUNT(*) as embedding_count
   FROM memory_embeddings 
   WHERE user_id = 'test-user-id';
   ```
   Should match number of facts stored.

#### Test 3: Token Capping

1. **Test capTokens function**:
   ```typescript
   import { capTokens } from './_shared/memory';
   const long = 'x'.repeat(10000);
   const capped = capTokens(long, 100);
   console.log(capped.length); // Should be ≤ 403 (100 * 4 + 3)
   ```

#### Test 4: SSE Unchanged

1. **Send SSE request** (no `nostream=1`):
   ```json
   {
     "userId": "test-user-id",
     "message": "Hello",
     "sessionId": "test-session"
   }
   ```

2. **Verify**:
   - SSE stream works
   - Headers include `X-Memory-Hit` and `X-Memory-Count`
   - PII masking still works in stream
   - Guardrails still active

#### Test 5: Deduplication

1. **Send same fact twice**:
   ```json
   {
     "userId": "test-user-id",
     "message": "I spent $50 at Starbucks",
     "sessionId": "test-session"
   }
   ```
   Wait for response, then send again:
   ```json
   {
     "userId": "test-user-id",
     "message": "I spent $50 at Starbucks",
     "sessionId": "test-session"
   }
   ```

2. **Check database**:
   ```sql
   SELECT COUNT(*) FROM user_memory_facts 
   WHERE user_id = 'test-user-id' 
   AND fact LIKE '%Starbucks%';
   ```
   Should be 1 (deduplicated).

---

## VERIFICATION COMMANDS

```bash
# Check memory functions exist
rg -n "export.*function.*(upsertFact|recall|extractFactsFromMessages|capTokens)" netlify/functions/_shared/memory.ts

# Check chat.ts integration
rg -n "Context-Memory|X-Memory-Hit|X-Memory-Count|recall\(|extractFactsFromMessages\(" netlify/functions/chat.ts

# Check no SSE/guardrails/PII changes
rg -n "createSSEMaskTransform|runGuardrailsCompat|maskPII" netlify/functions/chat.ts | head -5

# Run tests
pnpm test netlify/functions/_shared/__tests__/memory.test.ts
```

---

## EXPECTED RESULTS

### Headers
- ✅ `X-Memory-Hit`: "0.00" (no matches) or "0.XX" (matches found)
- ✅ `X-Memory-Count`: "0" (no matches) or "N" (matches found)
- ✅ `X-Guardrails`: "active" (unchanged)
- ✅ `X-PII-Mask`: "enabled" (unchanged)

### Logs
- ✅ `[Chat] Memory recall: N facts, top score: X.XX` (if matches)
- ✅ `[Chat] Extracted and stored N facts` (if facts extracted)
- ✅ No errors (memory failures are non-blocking)

### Database
- ✅ Facts stored in `user_memory_facts` with `fact_hash`
- ✅ Embeddings stored in `memory_embeddings`
- ✅ No duplicate facts (same hash)

### Functionality
- ✅ SSE streaming works
- ✅ Guardrails still active
- ✅ PII masking still works
- ✅ No crashes

---

## TROUBLESHOOTING

### Issue: No memory recall
- **Check**: OpenAI API key configured?
- **Check**: `match_memory_embeddings` RPC function exists?
- **Check**: Facts exist in database?

### Issue: Embeddings not stored
- **Check**: OpenAI API key configured?
- **Check**: `memory_embeddings` table exists?
- **Check**: Logs for embedding errors?

### Issue: Headers missing
- **Check**: Response path (SSE vs JSON)?
- **Check**: Headers added to all return paths?

### Issue: Tests failing
- **Check**: Mock functions correct?
- **Check**: Vitest configured?

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] `_shared/memory.ts` exports all five functions
- [x] `chat.ts` injects "Context-Memory (auto-recalled)" block (token-capped)
- [x] Response includes `X-Memory-Hit` and `X-Memory-Count` (all 4 paths)
- [x] Tests file exists (memory.test.ts, pii-patterns.test.ts, guardrails.test.ts)
- [x] URL query masking added (Day 2 gap closure)
- [x] Memory adapter deprecated (no remaining imports)
- [ ] Manual test: memory recall works (requires dev server)
- [ ] Manual test: memory extraction works (requires dev server)
- [ ] Manual test: deduplication works (requires dev server)
- [x] No crash; SSE and guardrails unaffected (verified by code review)

