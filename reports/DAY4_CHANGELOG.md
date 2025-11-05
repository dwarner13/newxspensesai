# Day 4 Memory Unification - Changelog

**Date**: 2025-01-XX  
**Branch**: `feature/day4-memory-unification`

---

## FILES CREATED

1. **`netlify/functions/_shared/memory.ts`** (canonical memory module)
   - Added `upsertFact()` function
   - Added `embedAndStore()` function
   - Added `recall()` function
   - Added `extractFactsFromMessages()` function
   - Added `capTokens()` function
   - Preserved legacy exports (`getOrCreateThread`, `loadThread`, `saveTurn`, `summarizeIfNeeded`)

2. **`netlify/functions/_shared/sql/day4_memory.sql`** (SQL migration helper)
   - Idempotent CREATE TABLE IF NOT EXISTS for `user_memory_facts`
   - Idempotent CREATE TABLE IF NOT EXISTS for `memory_embeddings`
   - Unique constraints and indexes
   - RLS policies

3. **`netlify/functions/_shared/__tests__/memory.test.ts`** (test stubs)
   - Tests for `upsertFact` (deduplication)
   - Tests for `recall` (matching facts)
   - Tests for `capTokens` (trimming)
   - Tests for `extractFactsFromMessages` (masking/deduping)

4. **`reports/DAY4_PLAN.md`** (implementation plan)
5. **`reports/DAY4_CHANGELOG.md`** (this file)
6. **`reports/DAY4_VALIDATION.md`** (testing guide)
7. **`reports/DAY4_RESULTS.md`** (test results)

---

## FILES MODIFIED

1. **`netlify/functions/chat.ts`**
   - **Added imports**: `recall`, `extractFactsFromMessages`, `upsertFact`, `embedAndStore`, `capTokens` from `./_shared/memory`
   - **Before model call** (line ~1697-1713):
     - Added memory recall with `recall()`
     - Build "Context-Memory (auto-recalled)" block
     - Apply token capping with `capTokens()`
     - Track `memoryHitTopScore` and `memoryHitCount`
   - **After assistant reply** (lines ~2166-2196, ~2058-2088, ~2210-2240):
     - Extract facts with `extractFactsFromMessages()`
     - Upsert facts with `upsertFact()`
     - Store embeddings with `embedAndStore()`
   - **Response headers** (lines ~2094-2098, ~2034-2038, ~2287-2294):
     - Added `X-Memory-Hit` header (top similarity score)
     - Added `X-Memory-Count` header (number of recalled facts)
     - Added to all response paths (SSE, JSON, tool calls)

---

## FUNCTIONAL CHANGES

### Memory Recall (Before Model)
- User message triggers semantic search across stored memories
- Top-K similar facts injected into system prompt as "Context-Memory (auto-recalled)"
- Token-capped to prevent prompt bloat
- Scores tracked for header reporting

### Memory Extraction (After Model)
- Conversation turn analyzed for extractable facts (vendor, amount, date, email, phone, domain)
- PII masked before storage
- Facts deduplicated by hash
- Embeddings generated and stored for future recall

### Response Headers
- `X-Memory-Hit`: Highest similarity score (0.00-1.00) or "0.00" if no matches
- `X-Memory-Count`: Number of facts recalled (0-N)

---

## BACKWARD COMPATIBILITY

- ✅ Legacy memory functions preserved (`getOrCreateThread`, `loadThread`, `saveTurn`, `summarizeIfNeeded`)
- ✅ SSE streaming unchanged
- ✅ Guardrails unchanged
- ✅ PII masking unchanged
- ✅ All memory operations are non-blocking (fail gracefully)

---

## BREAKING CHANGES

- ❌ None

---

## DEPENDENCIES

- Requires `user_memory_facts` table with `fact_hash` column
- Requires `memory_embeddings` table with `embedding` vector column
- Requires OpenAI API key for embeddings
- Requires `match_memory_embeddings` RPC function (from migration)

---

## MIGRATION NOTES

Run SQL migration in Supabase SQL editor:
```sql
-- See: netlify/functions/_shared/sql/day4_memory.sql
```

Or use existing migrations:
- `supabase/migrations/20251012_memory_tables.sql`
- `supabase/migrations/20251016_memory_extraction.sql`

