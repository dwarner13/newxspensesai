# Day 4 Memory Unification - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day4-memory-unification`  
**Base**: `feature/day3-guardrails-unification`

---

## OBJECTIVE

Add canonical memory module and minimally wire recall/store + headers into `chat.ts`. Do not break SSE/guardrails/PII masking.

---

## IMPLEMENTATION PLAN

### 1. Canonical Memory Module (`netlify/functions/_shared/memory.ts`)

**Exports**:
- `upsertFact({ userId, convoId, source='chat', fact })`
  - Normalize fact → SHA256 hash → insert with UNIQUE(user_id, hash_sha256)
  - ON CONFLICT DO NOTHING for deduplication
  - Return fact_id

- `embedAndStore({ userId, factId, text, model='text-embedding-3-large' })`
  - Call OpenAI embedding API
  - Insert into memory_embeddings with UNIQUE(fact_id, model)

- `recall({ userId, query, k=12, minScore=0.25, sinceDays=365 })`
  - pgvector search if available; else SQL cosine fallback
  - Filter by created_at >= now() - interval 'sinceDays days'
  - Return {fact, score, fact_id}[]

- `extractFactsFromMessages(messages)`
  - Simple heuristic v1: vendor/amount/date/domain/email/phone
  - Dedupe
  - Run maskPII on values before persist

- `capTokens(input, maxTokens=1200)`
  - ~4 chars/token estimate

### 2. SQL Migration Helper (`netlify/functions/_shared/sql/day4_memory.sql`)

- CREATE TABLE IF NOT EXISTS for `user_memory_facts` and `memory_embeddings`
- Unique constraints
- Indexes
- RLS policies (idempotent)

### 3. Chat Integration (`netlify/functions/chat.ts`)

**Before Model Call**:
- Compute `recalled = await memory.recall(...)`
- Build "Context-Memory (auto-recalled)" block
- Pass through `capTokens(...)`
- Inject into system/context
- Track `memoryHitTopScore` and `memoryHitCount`

**After Assistant Reply**:
- Run `extractFactsFromMessages([last user msg, assistant reply])`
- For each fact: `upsertFact(...)` then `embedAndStore(...)`

**Headers**:
- Add `X-Memory-Hit` (top score or 0)
- Add `X-Memory-Count` (count of recalled items)
- Include in all response paths (SSE, JSON, tool calls)

### 4. Tests (`netlify/functions/_shared/__tests__/memory.test.ts`)

- upsert dedupes (same fact twice → 1 row)
- recall returns ≥1 when matching fact exists
- capTokens trims long input
- extractor returns masked/deduped basics

---

## CONSTRAINTS

- ✅ Do not touch SSE behavior
- ✅ Do not touch guardrails behavior
- ✅ Do not touch PII masking behavior
- ✅ If value is masked in-stream, persist the masked value v1
- ✅ All memory operations are non-blocking (try/catch wrappers)

---

## ACCEPTANCE CRITERIA

- ✅ `_shared/memory.ts` exports all five functions
- ✅ `chat.ts` injects "Context-Memory (auto-recalled)" block (token-capped)
- ✅ Response includes `X-Memory-Hit` and `X-Memory-Count`
- ✅ Tests file exists and runs (even if partially mocked)
- ✅ No crash; SSE and guardrails unaffected

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/memory.ts` (canonical module)
- `netlify/functions/_shared/sql/day4_memory.sql` (migration helper)
- `netlify/functions/_shared/__tests__/memory.test.ts` (tests)
- `reports/DAY4_PLAN.md` (this file)
- `reports/DAY4_CHANGELOG.md` (files touched)
- `reports/DAY4_VALIDATION.md` (how to test)
- `reports/DAY4_RESULTS.md` (test outputs)

**Modify**:
- `netlify/functions/chat.ts` (wire memory recall + extraction + headers)

---

## RISKS & MITIGATION

1. **Risk**: Memory recall adds latency
   - **Mitigation**: Non-blocking try/catch; fail gracefully

2. **Risk**: Embedding API costs
   - **Mitigation**: Only embed after fact extraction; use efficient model

3. **Risk**: Breaking SSE stream
   - **Mitigation**: Memory operations happen before/after stream, not during

4. **Risk**: Schema mismatch
   - **Mitigation**: Use idempotent SQL migrations; verify tables exist

---

## NEXT STEPS

1. Implement canonical memory module
2. Wire into chat.ts
3. Add tests
4. Test locally
5. Commit and push









