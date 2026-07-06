# 🧠 Brains + Memory Audit Report

**Date**: 2025-01-XX  
**Status**: Audit Complete

---

## EXECUTIVE SUMMARY

The memory system is **partially implemented** with core write/recall mechanisms in place, but **gaps exist** in:
1. **Session summaries** - Code exists but may not be actively called
2. **Memory extraction worker** - Queue exists but worker may not be scheduled
3. **Routing memory usage** - Router does NOT use memory/context for routing decisions
4. **Debug visibility** - No dev tools to inspect memory state

**Overall Status**: 🟡 **Functional but incomplete**

---

## A) MEMORY MECHANISMS THAT EXIST

### 1. **Database Tables**

| Table | Purpose | Status |
|-------|---------|--------|
| `user_memory_facts` | Key-value facts (preferences, facts, corrections) | ✅ Exists |
| `memory_embeddings` | Vector embeddings for RAG (pgvector) | ✅ Exists |
| `memory_extraction_queue` | Async job queue for background extraction | ✅ Exists |
| `chat_messages` | Conversation history | ✅ Exists |
| `chat_convo_summaries` | Conversation summaries (Custodian) | ⚠️ Code references exist, table may not exist |
| `chat_session_summaries` | Session summaries (alternative) | ⚠️ Code references exist, table may not exist |

**Migration Files**:
- `supabase/migrations/20251012_memory_tables.sql` - Core memory tables
- `supabase/migrations/20251120_add_memory_extraction_queue.sql` - Queue table
- `supabase/migrations/20250112_match_memory_function.sql` - RPC function for vector search

### 2. **Code Paths**

#### **Memory Write Paths**

**Location**: `netlify/functions/chat.ts:3113`
```typescript
queueMemoryExtraction({
  userId,
  sessionId: normalizedSessionIdForExtraction2,
  userMessage: masked,
  assistantResponse: assistantContent
})
```

**Flow**:
1. Chat response completes → `queueMemoryExtraction()` called (non-blocking)
2. Job inserted into `memory_extraction_queue` table
3. Worker (`memory-extraction-worker.ts`) processes queue
4. `extractAndSaveMemories()` extracts facts using LLM
5. Facts upserted to `user_memory_facts` (hash-based deduplication)
6. Embeddings generated and stored in `memory_embeddings`

**Status**: ✅ **Called during chat** (line 3113)

#### **Memory Recall Paths**

**Location**: `netlify/functions/chat.ts:1169`
```typescript
const memory = await getMemory({
  userId,
  sessionId: normalizedSessionId || '',
  query: masked,
  options: {
    maxFacts: isSmartImportAI ? 8 : 5,
    topK: 6,
    minScore: 0.2,
    includeTasks: true,
    includeSummaries: false
  }
});
```

**Flow**:
1. Before model call → `getMemory()` called
2. `getMemory()` calls `retrieveContext()` + `recall()`
3. `retrieveContext()` fetches facts from `user_memory_facts`
4. `recall()` does vector search in `memory_embeddings` (session-scoped first, then global)
5. Context formatted and injected into system prompt

**Status**: ✅ **Called during chat** (line 1169)

**Fast Path Skip**: Short messages (< 50 chars) skip memory retrieval (line 1165)

#### **Session Summary Paths**

**Location**: `netlify/functions/chat.ts:3125-3172`
```typescript
await updateConversationSummaryForCustodian(
  sb,
  userId,
  finalSessionId,
  allMessages.map(m => ({ role: m.role, content: m.content })),
  Array.from(employeesInvolved)
);
```

**Flow**:
1. After chat response → `updateConversationSummaryForCustodian()` called (async, non-blocking)
2. Fetches all messages for conversation
3. Generates summary using OpenAI
4. Upserts to `chat_convo_summaries` table

**Status**: ⚠️ **Called but table may not exist** (code references `chat_convo_summaries` but no migration found)

**Alternative**: `netlify/functions/_shared/session_summaries.ts` exists but may not be called

---

## B) WHETHER THEY ARE ACTUALLY CALLED DURING CHAT

### ✅ **Memory Write** - CALLED
- **Location**: `chat.ts:3113`
- **Trigger**: After every assistant response
- **Evidence**: Code path exists, queue insertion happens
- **Worker Status**: ⚠️ **Unknown if scheduled** - `memory-extraction-worker.ts` exists but needs cron/scheduler

### ✅ **Memory Recall** - CALLED
- **Location**: `chat.ts:1169`
- **Trigger**: Before every model call (unless fast path)
- **Evidence**: Code path exists, `getMemory()` called
- **Injection**: Context injected into system prompt (line 1183)

### ⚠️ **Session Summaries** - CALLED BUT TABLE MAY NOT EXIST
- **Location**: `chat.ts:3162`
- **Trigger**: After every assistant response (async)
- **Evidence**: Code calls `updateConversationSummaryForCustodian()`
- **Issue**: Table `chat_convo_summaries` may not exist (no migration found)

### ❌ **Routing Memory Usage** - NOT CALLED
- **Location**: `netlify/functions/_shared/router.ts:125`
- **Issue**: `routeToEmployee()` does NOT use memory/context
- **Current**: Keyword-based routing only
- **Missing**: No memory-aware routing logic

---

## C) WHAT IS MISSING TO MAKE MEMORY REAL

### 1. **Worker Scheduling** 🔴 CRITICAL
- **Issue**: `memory-extraction-worker.ts` exists but may not be scheduled
- **Impact**: Memory extraction jobs queue up but never process
- **Fix**: Set up Netlify cron job or external scheduler
- **File**: `netlify/functions/memory-extraction-worker.ts`

### 2. **Session Summary Table** 🟡 HIGH
- **Issue**: `chat_convo_summaries` table may not exist
- **Impact**: Summary generation fails silently
- **Fix**: Create migration or verify table exists
- **Check**: Run `SELECT * FROM chat_convo_summaries LIMIT 1;`

### 3. **Routing Memory Integration** 🟡 HIGH
- **Issue**: Router does not use memory for routing decisions
- **Impact**: Routing ignores user preferences/history
- **Fix**: Add memory context to `routeToEmployee()` function
- **File**: `netlify/functions/_shared/router.ts`

### 4. **Debug Visibility** 🟢 LOW
- **Issue**: No dev tools to inspect memory state
- **Impact**: Hard to debug memory issues
- **Fix**: Add dev-only debug endpoint (see deliverables)

### 5. **Memory Extraction Verification** 🟡 MEDIUM
- **Issue**: No way to verify extraction is working
- **Impact**: Silent failures go unnoticed
- **Fix**: Add logging/metrics for extraction success rate

---

## D) BRAINS SMOKE TEST CHECKLIST

### ✅ **Test 1: Session Memory**
**Steps**:
1. Send message: "I prefer CSV exports"
2. Wait for response
3. Check `user_memory_facts` table: `SELECT * FROM user_memory_facts WHERE fact LIKE '%CSV%' ORDER BY created_at DESC LIMIT 1;`
4. Send new message: "What format do I prefer?"
5. **Expected**: Assistant mentions CSV preference

**Status**: ⚠️ **Depends on worker processing queue**

### ✅ **Test 2: Vendor/Category Memory**
**Steps**:
1. Send message: "Categorize Starbucks as Coffee"
2. Wait for response
3. Check `user_memory_facts`: `SELECT * FROM user_memory_facts WHERE fact LIKE '%Starbucks%' OR fact LIKE '%Coffee%';`
4. Send new message: "What category is Starbucks?"
5. **Expected**: Assistant remembers "Coffee"

**Status**: ⚠️ **Depends on worker processing queue**

### ✅ **Test 3: Upload Summary**
**Steps**:
1. Upload document via Byte
2. Wait for import completion
3. Check `chat_convo_summaries`: `SELECT * FROM chat_convo_summaries WHERE user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 1;`
4. **Expected**: Row exists with summary text

**Status**: ❌ **Table may not exist**

### ✅ **Test 4: Crystal Insights**
**Steps**:
1. Send message: "Show me spending trends"
2. Wait for Crystal response
3. Check if memory was used: Look for `X-Memory-Hit-Count` header in response
4. **Expected**: Header shows memory facts were retrieved

**Status**: ✅ **Should work** (memory recall is called)

### ✅ **Test 5: No Duplicate Voice**
**Steps**:
1. Chat with Prime about preferences
2. Switch to Byte
3. Ask Byte about same preferences
4. **Expected**: Both employees reference same memory (no conflicting info)

**Status**: ✅ **Should work** (shared memory system)

---

## E) VERIFICATION QUERIES

### Check Memory Facts
```sql
SELECT fact, source, created_at 
FROM user_memory_facts 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Memory Embeddings
```sql
SELECT COUNT(*) as embedding_count
FROM memory_embeddings 
WHERE user_id = '<user_id>';
```

### Check Extraction Queue
```sql
SELECT status, COUNT(*) 
FROM memory_extraction_queue 
GROUP BY status;
```

### Check Session Summaries
```sql
SELECT * FROM chat_convo_summaries 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## F) RECOMMENDATIONS

### Immediate Actions
1. ✅ **Verify worker is scheduled** - Check Netlify cron jobs
2. ✅ **Verify summary table exists** - Run migration check
3. ✅ **Add debug endpoint** - See deliverables below
4. ✅ **Add routing memory** - Integrate memory into router

### Future Enhancements
1. Add memory metrics dashboard
2. Add memory extraction success rate monitoring
3. Add user-facing memory management UI
4. Add memory confidence scoring UI

---

## G) FILES REFERENCED

- `netlify/functions/chat.ts` - Main chat handler (memory write/recall)
- `netlify/functions/_shared/memory.ts` - Unified memory API
- `netlify/functions/_shared/memory-extraction.ts` - Extraction logic
- `netlify/functions/_shared/context-retrieval.ts` - Context retrieval
- `netlify/functions/_shared/router.ts` - Employee routing (NO memory usage)
- `netlify/functions/memory-extraction-worker.ts` - Queue worker
- `supabase/migrations/20251012_memory_tables.sql` - Core tables
- `supabase/migrations/20251120_add_memory_extraction_queue.sql` - Queue table




