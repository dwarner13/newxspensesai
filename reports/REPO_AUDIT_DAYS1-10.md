# Repo Audit: Days 1-10

**Date**: 2025-01-XX  
**Branch**: Current (feature/day10-ocr-memory-xp or docs/qa-polish)

---

## BRANCHES (Remote)

```
feature/day4-memory-unification
feature/day5-session-summaries
feature/day6-employee-routing
feature/day7-streaming-polish
feature/day8-ocr-ingestion
feature/day9-ocr-normalize-categorize
feature/day10-ocr-memory-xp
```

**Note**: Day 1 merged to main (PR #1)

---

## KEY WIRING

### Day 4: Memory Unification

**Context Injection**:
- `Context-Memory (auto-recalled)` - Line ~1380-1390 in chat.ts

**Memory Functions**:
- `memory.recall()` - Called before model (line ~1360)
- `memory.extractFactsFromMessages()` - Called after reply (line ~2380)
- `memory.upsertFact()` - Called for each fact (line ~2390)
- `memory.embedAndStore()` - Called after upsert (line ~2400)

**Headers**:
- `X-Memory-Hit`: Top similarity score (0.00-1.00)
- `X-Memory-Count`: Number of facts recalled (0-N)

### Day 5: Session Summaries

**Context Injection**:
- `Context-Summary (recent)` - Line ~1350 in chat.ts

**Summary Functions**:
- `sums.getLatestSummary()` - Called before model (line ~1340)
- `sums.shouldSummarize()` - Called after reply (line ~1640)
- `sums.writeSummary()` - Called if thresholds met (line ~1680)

**Headers**:
- `X-Session-Summary`: `present` | `absent`
- `X-Session-Summarized`: `yes` | `no` | `async`

### Day 6: Employee Routing

**Routing Functions**:
- `routeTurn()` - Called before model (line ~1250)
- `detectIntent()` - Called internally by routeTurn

**Headers**:
- `X-Employee`: `prime` | `crystal` | `tag` | `byte`
- `X-Route-Confidence`: `0.00` - `1.00`

### Day 7: Streaming Polish

**Header Builder**:
- `buildResponseHeaders()` - Centralized header builder (line ~215)

**SSE Headers**:
- `X-Stream-Chunk-Count`: Chunk count for SSE responses (line ~850)

### Day 8-10: OCR Endpoint

**Endpoint**:
- `netlify/functions/ocr.ts` - Export handler (line ~96)

**Headers**:
- `X-OCR-Provider`: `local` | `ocrspace` | `vision` | `none` (line ~71)
- `X-OCR-Parse`: `invoice` | `receipt` | `bank` | `none` (line ~72)
- `X-Transactions-Saved`: `0` - `N` (line ~73)
- `X-Categorizer`: `rules` | `tag` | `none` (line ~74)
- `X-Vendor-Matched`: `yes` | `no` (line ~75)
- `X-XP-Awarded`: `0` - `N` (line ~76)

---

## HEADERS PRESENT

### Core Headers (8)
- ✅ `X-Guardrails`: Present in chat.ts + ocr.ts
- ✅ `X-PII-Mask`: Present in chat.ts + ocr.ts
- ✅ `X-Memory-Hit`: Present in chat.ts + ocr.ts
- ✅ `X-Memory-Count`: Present in chat.ts + ocr.ts
- ✅ `X-Session-Summary`: Present in chat.ts + ocr.ts
- ✅ `X-Session-Summarized`: Present in chat.ts + ocr.ts
- ✅ `X-Employee`: Present in chat.ts + ocr.ts
- ✅ `X-Route-Confidence`: Present in chat.ts + ocr.ts

### SSE Headers
- ✅ `X-Stream-Chunk-Count`: Present in chat.ts

### OCR Headers (6)
- ✅ `X-OCR-Provider`: Present in ocr.ts
- ✅ `X-OCR-Parse`: Present in ocr.ts
- ✅ `X-Transactions-Saved`: Present in ocr.ts
- ✅ `X-Categorizer`: Present in ocr.ts
- ✅ `X-Vendor-Matched`: Present in ocr.ts
- ✅ `X-XP-Awarded`: Present in ocr.ts

---

## MEMORY ADAPTER

**Status**: ✅ Deprecated  
**Remaining Imports**: 0  
**File**: `netlify/functions/_shared/memory_adapter.ts` exists but is deprecated (re-exports from `memory.ts`)

---

## TEST FILES

### Backend Tests (`netlify/functions/_shared/__tests__/`)
- ✅ `memory.test.ts`
- ✅ `pii-patterns.test.ts`
- ✅ `prime_router.test.ts`
- ✅ `sse_stream.test.ts`
- ✅ `ocr_parsers.test.ts`
- ✅ `ocr_providers.test.ts`
- ✅ `ocr_handler.test.ts`
- ✅ `ocr_normalize.test.ts`
- ✅ `transactions_store.test.ts`
- ✅ `ocr_integration_tx.test.ts`
- ✅ `ocr_guardrails.test.ts`
- ✅ `ocr_memory.test.ts`
- ✅ `xp.test.ts`
- ✅ `ocr_integration_memory.test.ts`

**Total**: 14 test files

### Frontend Tests (`src/__tests__/`)
- ✅ `usePrimeChat.stream.test.tsx`

**Total**: 1 test file

---

## SQL IDEMPOTENCY

**Patterns Found**: 25+ instances

**Files**:
- `day4_memory.sql`: `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- `day5_session_summaries.sql`: `CREATE TABLE IF NOT EXISTS`
- `day6_orchestration_events.sql`: `CREATE TABLE IF NOT EXISTS`
- `day9_transactions.sql`: `CREATE TABLE IF NOT EXISTS`, `UNIQUE` constraints
- `day10_memory_xp.sql`: `CREATE TABLE IF NOT EXISTS`, `UNIQUE` constraints

**Status**: ✅ All migrations use idempotent patterns

---

## MINIMAL TESTABILITY MATRIX

### Chat (no env)
**Status**: ✅ Should run  
**Notes**: Mocked dependencies, no external calls required

### Routing (no env)
**Status**: ✅ Should run  
**Notes**: Deterministic rules tested, LLM fallback mocked

### Streaming (no env)
**Status**: ✅ Should run  
**Notes**: Transform stream logic tested without external deps

### OCR (no env)
**Status**: ✅ Returns warnings but runs  
**Notes**: Providers stubbed, returns warnings if no API keys

### Transactions Save (no env)
**Status**: ⚠️ Will no-op or return 0 saved  
**Notes**: Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for actual saves

---

## DAY-BY-DAY STATUS

### Day 1: Chat Consolidation
**Status**: ✅ OK (merged to main)  
**Files**: `chat.ts`, `sse_mask_transform.ts`, frontend hooks

### Day 2: PII Unification
**Status**: ✅ OK  
**Files**: `pii-patterns.ts`, URL query masking

### Day 3: Guardrails Unification
**Status**: ✅ OK  
**Files**: `guardrails.ts`, `guardrail_events` logging

### Day 4: Memory Unification
**Status**: ✅ OK  
**Files**: `memory.ts`, chat.ts wiring, headers

### Day 5: Session Summaries
**Status**: ✅ OK  
**Files**: `session_summaries.ts`, chat.ts wiring, headers

### Day 6: Employee Routing
**Status**: ✅ OK  
**Files**: `prime_router.ts`, chat.ts wiring, headers

### Day 7: Streaming Polish
**Status**: ✅ OK  
**Files**: `sse_mask_transform.ts`, chat.ts headers, frontend hooks

### Day 8: OCR Ingestion
**Status**: ✅ OK  
**Files**: `ocr.ts`, `ocr_providers.ts`, `ocr_parsers.ts`, headers

### Day 9: OCR Normalize & Categorize
**Status**: ✅ OK  
**Files**: `ocr_normalize.ts`, `transactions_store.ts`, headers

### Day 10: OCR Memory & XP
**Status**: ✅ OK  
**Files**: `ocr_memory.ts`, `xp.ts`, headers, chat correction path

---

## SSE FRAMING

**Status**: ✅ OK  
**Implementation**: `createSSEMaskTransform()` in `sse_mask_transform.ts`  
**Features**: Unicode-safe, backpressure-safe, chunk counting

---

## OCR ENDPOINT

**Status**: ✅ OK  
**File**: `netlify/functions/ocr.ts`  
**Features**: Multipart/form-data + JSON, guardrails, headers, memory integration

---

## TRANSACTIONS SAVE PATH

**Status**: ✅ Ready (requires SUPABASE_* env vars)  
**Implementation**: `insertTransaction()`, `insertItems()` in `transactions_store.ts`  
**Non-blocking**: Failures don't block response

---

## ADAPTER LEFTOVERS

**Status**: ✅ None  
**Remaining Imports**: 0  
**File**: `memory_adapter.ts` exists but deprecated (re-exports from `memory.ts`)

---

## TESTS PRESENT

**Backend**: 14 test files  
**Frontend**: 1 test file  
**Total**: 15 test files

---

## SQL IDEMPOTENT

**Status**: ✅ Yes  
**Patterns**: `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `UNIQUE` constraints  
**Files**: All 5 migration files use idempotent patterns

---

## ZERO-SETUP TESTABLE TODAY

**Status**: ✅ Yes

**Notes**:
- Chat, routing, streaming tests run without env vars
- OCR tests return warnings but run (providers stubbed)
- Transaction save tests require Supabase env vars (no-op without)
- All tests use mocked dependencies where needed

---

## SUMMARY

| Day | Status | Key Files | Headers | Tests |
|-----|--------|-----------|---------|-------|
| 1 | ✅ OK | chat.ts, sse_mask_transform.ts | X-Guardrails, X-PII-Mask | - |
| 2 | ✅ OK | pii-patterns.ts | - | pii-patterns.test.ts |
| 3 | ✅ OK | guardrails.ts | X-Guardrails | - |
| 4 | ✅ OK | memory.ts, chat.ts | X-Memory-Hit, X-Memory-Count | memory.test.ts |
| 5 | ✅ OK | session_summaries.ts, chat.ts | X-Session-Summary, X-Session-Summarized | - |
| 6 | ✅ OK | prime_router.ts, chat.ts | X-Employee, X-Route-Confidence | prime_router.test.ts |
| 7 | ✅ OK | sse_mask_transform.ts, chat.ts | X-Stream-Chunk-Count | sse_stream.test.ts, usePrimeChat.stream.test.tsx |
| 8 | ✅ OK | ocr.ts, ocr_providers.ts, ocr_parsers.ts | X-OCR-Provider, X-OCR-Parse | ocr_parsers.test.ts, ocr_providers.test.ts, ocr_handler.test.ts |
| 9 | ✅ OK | ocr_normalize.ts, transactions_store.ts | X-Transactions-Saved, X-Categorizer | ocr_normalize.test.ts, transactions_store.test.ts, ocr_integration_tx.test.ts, ocr_guardrails.test.ts |
| 10 | ✅ OK | ocr_memory.ts, xp.ts, chat.ts | X-Vendor-Matched, X-XP-Awarded | ocr_memory.test.ts, xp.test.ts, ocr_integration_memory.test.ts |

---

## END

