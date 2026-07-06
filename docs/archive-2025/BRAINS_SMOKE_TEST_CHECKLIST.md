# 🧠 Brains Smoke Test Checklist

**Purpose**: Verify memory + personalization + recap system is working  
**Environment**: Staging  
**Time**: ~10 minutes

---

## Pre-Test Setup

1. ✅ Get your user ID from Supabase Dashboard → `auth.users` table
2. ✅ Open browser DevTools → Network tab (to see headers)
3. ✅ Have SQL access to Supabase (for verification queries)

---

## Test 1: Session Memory ✅

**Goal**: Verify facts are extracted and recalled

**Steps**:
1. Send message to Prime: `"I prefer CSV exports for all my reports"`
2. Wait for response
3. **Verify extraction** (SQL):
   ```sql
   SELECT fact, source, created_at 
   FROM user_memory_facts 
   WHERE user_id = '<your_user_id>' 
   AND fact LIKE '%CSV%' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected**: Row exists with fact like `"pref:export_format=CSV"` or similar
4. **Wait 1-2 minutes** (for worker to process queue)
5. Send new message: `"What export format do I prefer?"`
6. **Expected**: Assistant mentions CSV preference

**Pass Criteria**: ✅ Assistant remembers CSV preference

**If Failed**: Check `memory_extraction_queue` table - jobs may be stuck in `pending` status

---

## Test 2: Vendor/Category Memory ✅

**Goal**: Verify transaction-related facts are remembered

**Steps**:
1. Send message: `"Categorize all Starbucks transactions as Coffee"`
2. Wait for response
3. **Verify extraction** (SQL):
   ```sql
   SELECT fact, source, created_at 
   FROM user_memory_facts 
   WHERE user_id = '<your_user_id>' 
   AND (fact LIKE '%Starbucks%' OR fact LIKE '%Coffee%')
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
4. **Wait 1-2 minutes** (for worker)
5. Send new message: `"What category should Starbucks be?"`
6. **Expected**: Assistant remembers "Coffee"

**Pass Criteria**: ✅ Assistant remembers category assignment

**If Failed**: Check worker is running (`memory-extraction-worker.ts`)

---

## Test 3: Upload Summary ✅

**Goal**: Verify conversation summaries are generated

**Steps**:
1. Upload a document via Byte (or simulate import)
2. Wait for import completion
3. **Verify summary** (SQL):
   ```sql
   SELECT text, created_at 
   FROM chat_convo_summaries 
   WHERE user_id = '<your_user_id>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Alternative** (if table doesn't exist):
   ```sql
   SELECT summary, created_at 
   FROM chat_session_summaries 
   WHERE user_id = '<your_user_id>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Expected**: Row exists with summary text

**Pass Criteria**: ✅ Summary row exists

**If Failed**: Check if table exists (`chat_convo_summaries` or `chat_session_summaries`)

---

## Test 4: Crystal Insights ✅

**Goal**: Verify memory is used in Crystal responses

**Steps**:
1. Send message: `"Show me my spending trends"`
2. Wait for Crystal response
3. **Check response headers** (DevTools → Network → Response Headers):
   - Look for `X-Memory-Hit-Count` header
   - Look for `X-Memory-Hit-Top-Score` header
4. **Expected**: Headers show memory was retrieved (count > 0)

**Pass Criteria**: ✅ Headers show memory hits

**If Failed**: Check `memory_embeddings` table has embeddings for your user

---

## Test 5: No Duplicate Voice ✅

**Goal**: Verify shared memory across employees

**Steps**:
1. Chat with Prime: `"I'm allergic to peanuts"`
2. Wait for response
3. **Wait 1-2 minutes** (for worker)
4. Switch to Byte (or another employee)
5. Send message: `"What am I allergic to?"`
6. **Expected**: Byte references peanut allergy (same memory)

**Pass Criteria**: ✅ Both employees reference same memory

**If Failed**: Check memory is user-scoped (not employee-scoped)

---

## Test 6: Debug Endpoint ✅

**Goal**: Verify debug endpoint works (dev only)

**Steps**:
1. Open: `GET /.netlify/functions/debug-memory?userId=<your_user_id>`
2. **Expected**: JSON response with:
   - `memory.facts` (last 5 facts)
   - `summaries.lastSummary` (if exists)
   - `extractionQueue` (status counts)
   - `recentMessages` (last 5 messages)

**Pass Criteria**: ✅ Endpoint returns data

**If Failed**: Check endpoint is enabled (dev mode only)

---

## Post-Test Verification

### Check Memory Extraction Queue
```sql
SELECT status, COUNT(*) 
FROM memory_extraction_queue 
WHERE user_id = '<your_user_id>'
GROUP BY status;
```

**Expected**: Most jobs are `completed`, few `pending` or `failed`

### Check Memory Embeddings
```sql
SELECT COUNT(*) as embedding_count
FROM memory_embeddings 
WHERE user_id = '<your_user_id>';
```

**Expected**: Count > 0 (embeddings exist)

### Check Memory Facts
```sql
SELECT COUNT(*) as fact_count
FROM user_memory_facts 
WHERE user_id = '<your_user_id>';
```

**Expected**: Count > 0 (facts exist)

---

## Troubleshooting

### Memory Not Being Extracted
- **Check**: `memory_extraction_queue` table has `pending` jobs
- **Fix**: Ensure `memory-extraction-worker.ts` is scheduled (Netlify cron)

### Memory Not Being Recalled
- **Check**: Response headers show `X-Memory-Hit-Count: 0`
- **Fix**: Check `memory_embeddings` table has embeddings

### Summaries Not Being Created
- **Check**: `chat_convo_summaries` or `chat_session_summaries` table exists
- **Fix**: Run migration if table missing

### Routing Not Using Memory
- **Check**: Router does not use memory (by design - keyword-based only)
- **Fix**: Add memory integration to `router.ts` (future enhancement)

---

## Success Criteria

✅ **All 6 tests pass** = Memory system is working  
⚠️ **4-5 tests pass** = Partial functionality (check failed tests)  
❌ **<4 tests pass** = Critical issues (check worker, tables, migrations)




