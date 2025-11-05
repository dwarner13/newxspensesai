# Day 4 Memory Unification - Changelog

**Date**: 2025-01-XX  
**Branch**: `feature/day4-memory-unification`

---

## FILES CREATED

1. **`netlify/functions/_shared/memory.ts`** (canonical memory module)
   - Added `upsertFact({userId, convoId, source='chat', fact})` function
   - Added `embedAndStore({userId, factId, text, model='text-embedding-3-large'})` function
   - Added `recall({userId, query, k=12, minScore=0.25, sinceDays=365})` function
   - Added `extractFactsFromMessages(messages)` function
   - Added `capTokens(input, maxTokens=1200)` function
   - Preserved legacy exports (`getOrCreateThread`, `loadThread`, `saveTurn`, `summarizeIfNeeded`)

2. **`netlify/functions/_shared/sql/day4_memory.sql`** (SQL migration helper)
   - Idempotent CREATE TABLE IF NOT EXISTS for `user_memory_facts`
   - Idempotent CREATE TABLE IF NOT EXISTS for `memory_embeddings`
   - Unique constraints and indexes
   - RLS policies

3. **`netlify/functions/_shared/__tests__/memory.test.ts`** (test stubs)
   - Tests for `upsertFact` (deduplication: same fact twice → 1 row)
   - Tests for `embedAndStore` (embedding generation)
   - Tests for `recall` (matching facts: returns ≥1 when matching)
   - Tests for `capTokens` (trimming long input)
   - Tests for `extractFactsFromMessages` (masking/deduping basics)

4. **`netlify/functions/_shared/__tests__/guardrails.test.ts`** (NEW)
   - Basic smoke tests for headers + non-blocking log

5. **`reports/DAY4_PLAN.md`** (implementation plan)
6. **`reports/DAY4_CHANGELOG.md`** (this file)
7. **`reports/DAY4_VALIDATION.md`** (testing guide)
8. **`reports/DAY4_RESULTS.md`** (test results)

---

## FILES MODIFIED

1. **`netlify/functions/chat.ts`**
   - **Changed imports**: 
     - `maskPII` from `./_shared/pii` (wrapper that returns MaskResult)
     - `import * as memory from "./_shared/memory"` (namespace import)
   - **Before model call** (lines ~1699-1740):
     - Build recall query from last ~10 user+assistant turns (capped to ~1.2k tokens)
     - Added memory recall with `memory.recall()`
     - Build "Context-Memory (auto-recalled)" block
     - Apply token capping with `memory.capTokens()` (600 tokens)
     - Track `memoryHitTopScore` (nullable) and `memoryHitCount`
   - **After assistant reply** (lines ~2017-2050, ~2092-2125, ~2258-2291):
     - Extract facts with `memory.extractFactsFromMessages()`
     - Mask PII before storing: `maskPII(factText, 'full').masked`
     - Upsert facts with `memory.upsertFact()`
     - Store embeddings with `memory.embedAndStore()`
     - Added to all 3 response paths (SSE stream, JSON, synthesis)
   - **Response headers** (lines ~2056-2060, ~2131-2135, ~2148-2150, ~2347-2348):
     - Added `X-Memory-Hit` header: `memoryHitTopScore?.toFixed(2) ?? '0'`
     - Added `X-Memory-Count` header: `String(memoryHitCount)`
     - Added to all 4 response paths (SSE, JSON, tool calls, synthesis)

2. **`netlify/functions/_shared/pii-patterns.ts`**
   - **Added function**: `maskPIIInURL(url, strategy)` (Day 2 gap closure)
   - Masks PII in URL query parameters
   - Returns URL with masked query params or original URL if invalid

3. **`netlify/functions/_shared/memory_adapter.ts`**
   - **Added deprecation notice**: `@deprecated Use ./memory instead`
   - File kept for backward compatibility

4. **`netlify/functions/_shared/__tests__/pii-patterns.test.ts`**
   - **Added tests**: URL query parameter masking (3 test cases)

5. **`netlify/functions/_shared/__tests__/guardrails.test.ts`** (NEW)
   - **Created**: Basic smoke tests for headers + non-blocking log

---

## FUNCTIONAL CHANGES

### Memory Recall (Before Model)
- Build recall query from last ~10 user+assistant turns (joined, capped to ~1.2k tokens)
- Triggers semantic search across stored memories using `memory.recall()`
- Top-K similar facts injected into system prompt as "Context-Memory (auto-recalled)"
- Token-capped to 600 tokens to prevent prompt bloat
- Scores tracked for header reporting (`memoryHitTopScore`, `memoryHitCount`)

### Memory Extraction (After Model)
- Conversation turn analyzed for extractable facts (vendor, amount, date, email, phone, domain)
- **PII masked before storage**: `maskPII(factText, 'full').masked`
- Facts deduplicated by SHA256 hash (`fact_hash`)
- Embeddings generated and stored for future recall
- Applied to all 3 response paths (SSE stream flush, JSON response, synthesis response)

### Response Headers
- `X-Memory-Hit`: Highest similarity score (0.00-1.00) or "0" if no matches (null-safe)
- `X-Memory-Count`: Number of facts recalled (0-N) as string
- Added to all 4 response paths (SSE, JSON, tool calls, synthesis)

### Day 2 Gap Closure: URL Query Masking
- Added `maskPIIInURL()` function to `pii-patterns.ts`
- Masks PII in URL query parameters (e.g., `?email=test@example.com`)
- Returns masked URL or original if invalid
- Added tests in `pii-patterns.test.ts`

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

