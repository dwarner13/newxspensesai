# Days 1-4 Gaps Report

**Date**: 2025-01-XX  
**Audit Type**: Missing Features & Files

---

## DAY 1 GAPS

### Branch/PR Status
- ❌ **PR #1 NOT MERGED**: Branch `feature/day1-chat-merge-adapt` exists but not merged to `main`
  - Current `main` branch still at initial commit (629736b)
  - PR may be draft or not created

### Files
- ✅ All expected files present

### Tests
- ⚠️ Tests exist but not verified (requires test framework)

---

## DAY 2 GAPS

### Missing Features

1. ❌ **URL Query Parameter Masking**
   - **File**: `netlify/functions/_shared/pii-patterns.ts`
   - **Expected**: Function to mask PII in URL query strings (e.g., `?email=test@example.com&phone=780-555-1234`)
   - **Status**: NOT IMPLEMENTED
   - **Impact**: PII in URLs not protected
   - **Reference**: Day 2 report mentions "URL-query masking & idempotency logic"

2. ⚠️ **URL Query Test Failure**
   - **File**: `netlify/functions/_shared/__tests__/pii-patterns.test.ts`
   - **Status**: Test may exist but failing (per Day 2 report)
   - **Action**: Verify test exists and fix if needed

### Files
- ✅ All expected files present

---

## DAY 3 GAPS

### Missing Features
- ❌ None significant

### Tests
- ❌ **No test file**: `netlify/functions/_shared/__tests__/guardrails.test.ts` NOT FOUND
  - Should test `applyGuardrails()`, logging, headers

---

## DAY 4 GAPS (CRITICAL)

### Missing Branch
- ❌ **Branch**: `feature/day4-memory-unification` DOES NOT EXIST
  - **Action**: Create branch from `feature/day3-guardrails-unification`

### Missing Files

1. ❌ **Canonical Memory Module Functions**
   - **File**: `netlify/functions/_shared/memory.ts`
   - **Current**: Only exports thread management functions (`getOrCreateThread`, `loadThread`, `saveTurn`)
   - **Missing Exports**:
     - `upsertFact(userId, scope, key, value, weight?)`
     - `embedAndStore(userId, text, messageId?)`
     - `recall(userId, query, topK?)`
     - `extractFactsFromMessages(userId, messages)`
     - `capTokens(text, maxTokens)`

2. ❌ **SQL Migration**
   - **Expected**: `netlify/functions/_shared/sql/day4_memory.sql`
   - **Found**: `supabase/migrations/20251016_memory_extraction.sql` (different location)
   - **Action**: Verify SQL is idempotent and matches Day 4 schema requirements

3. ❌ **Test File**
   - **Expected**: `netlify/functions/_shared/__tests__/memory.test.ts`
   - **Status**: NOT FOUND
   - **Should Test**: `upsertFact`, `recall`, `extractFactsFromMessages`, `capTokens`

4. ❌ **Day 4 Reports**
   - **Expected**: `/reports/DAY4_*` files
   - **Found**: Only `DAY4_DIFF_SUMMARY.md` (not found in workspace)
   - **Missing**: `DAY4_APPLIED.md`, `DAY4_CHANGED_FILES.txt`, etc.

### Missing Features in chat.ts

1. ❌ **Memory Recall (Before Model)**
   - **Expected**: Call `recall(userId, query)` before building system prompt
   - **Expected**: Inject results as "Context-Memory (auto-recalled): ..." block
   - **Expected**: Apply `capTokens()` to memory context
   - **Current**: Only basic `dbGetMemoryFacts()` exists (line 738), not using canonical `recall()`

2. ❌ **Memory Extraction (After Model)**
   - **Expected**: Call `extractFactsFromMessages(userId, messages)` after assistant reply
   - **Expected**: Call `upsertFact()` for each extracted fact
   - **Expected**: Call `embedAndStore()` for each fact
   - **Current**: `extractAndSaveMemories()` exists in `memory-extraction.ts` but NOT CALLED in `chat.ts`

3. ❌ **Response Headers**
   - **Expected**: `X-Memory-Hit: [similarity_score]` header
   - **Expected**: `X-Memory-Count: [n]` header (number of facts recalled)
   - **Status**: NOT FOUND in `chat.ts`

4. ❌ **Memory Adapter Removal**
   - **Expected**: `memory_adapter.ts` removed or neutered
   - **Current**: Still exists (159 lines)
   - **Action**: Remove or mark as deprecated, update imports

### Partial Implementation (Needs Wiring)

1. ⚠️ **Memory Extraction Module**
   - **File**: `netlify/functions/_shared/memory-extraction.ts` EXISTS
   - **Function**: `extractAndSaveMemories()` EXISTS
   - **Problem**: NOT CALLED in `chat.ts`
   - **Action**: Wire into chat flow after assistant reply

2. ⚠️ **Memory Orchestrator**
   - **File**: `netlify/functions/_shared/memory-orchestrator.ts` EXISTS
   - **Function**: `runMemoryOrchestration()` EXISTS
   - **Problem**: NOT CALLED in `chat.ts`
   - **Action**: Use orchestrator or wire extraction + retrieval separately

3. ⚠️ **Context Retrieval**
   - **File**: `netlify/functions/_shared/context-retrieval.ts` EXISTS
   - **Function**: `retrieveContext()` EXISTS
   - **Problem**: NOT USED for memory recall in `chat.ts`
   - **Action**: Use for recall before model call

---

## IMPACT ASSESSMENT

### High Priority (Day 4)
- ❌ Memory functions not implemented → No long-term memory system
- ❌ Memory not wired into chat → Facts not saved/recalled
- ❌ Headers missing → Cannot track memory usage

### Medium Priority (Day 2)
- ❌ URL query masking missing → PII leak risk in URLs

### Low Priority (Day 1)
- ⚠️ PR not merged → Feature exists but not in main branch

---

## VERIFICATION COMMANDS

```bash
# Check Day 4 branch
git branch -a | grep day4

# Check memory functions
rg -n "export.*function.*(upsertFact|recall|extractFactsFromMessages|capTokens)" netlify/functions/_shared/memory.ts

# Check chat.ts memory integration
rg -n "Context-Memory|X-Memory-Hit|X-Memory-Count|recall\(|extractFactsFromMessages\(" netlify/functions/chat.ts

# Check URL query masking
rg -n "query.*=|url.*\?|maskUrl" netlify/functions/_shared/pii-patterns.ts

# Check PR status
git log --oneline origin/main | head -5
```

---

## FILES TO CREATE/FIX

### Day 4 (Critical)
1. Create branch: `feature/day4-memory-unification`
2. Implement functions in `netlify/functions/_shared/memory.ts`:
   - `upsertFact()`
   - `embedAndStore()`
   - `recall()`
   - `extractFactsFromMessages()`
   - `capTokens()`
3. Wire memory into `netlify/functions/chat.ts`:
   - Before model: `recall()` → inject context
   - After model: `extractFactsFromMessages()` → `upsertFact()` → `embedAndStore()`
4. Add headers: `X-Memory-Hit`, `X-Memory-Count`
5. Create test file: `netlify/functions/_shared/__tests__/memory.test.ts`
6. Verify SQL: `supabase/migrations/20251016_memory_extraction.sql` matches Day 4 schema
7. Remove/update `memory_adapter.ts` imports

### Day 2 (Medium)
1. Add URL query masking to `pii-patterns.ts`
2. Add test for URL query masking
3. Verify idempotency for URL queries

### Day 1 (Low)
1. Merge PR #1 or create PR to merge `feature/day1-chat-merge-adapt` to `main`

### Day 3 (Low)
1. Add test file: `netlify/functions/_shared/__tests__/guardrails.test.ts`

