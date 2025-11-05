# Day 7 Streaming Polish + Frontend Validation - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day7-streaming-polish`  
**Base**: `feature/day6-employee-routing`

---

## OBJECTIVE

Harden streaming across all four response paths (SSE / JSON / tool / synthesis). Ensure headers always present and correct. Add backpressure-safe PII masking transform and newline-safe SSE framing. Make frontend stream handlers resilient.

---

## IMPLEMENTATION PLAN

### 1. Server Changes

#### 1.1 Centralize Headers (`netlify/functions/chat.ts`)

- Create `buildResponseHeaders()` helper function
- Include all 8 headers:
  - `X-Guardrails`
  - `X-PII-Mask`
  - `X-Memory-Hit`
  - `X-Memory-Count`
  - `X-Session-Summary`
  - `X-Session-Summarized`
  - `X-Employee`
  - `X-Route-Confidence`
- Add `X-Stream-Chunk-Count` for SSE responses (debug)
- Apply to all 4 response paths (SSE, JSON, tool calls, synthesis)

#### 1.2 Enhance SSE Mask Transform (`netlify/functions/_shared/sse_mask_transform.ts`)

- Unicode-safe chunk handling (preserves multi-byte UTF-8 characters)
- Backpressure-safe (respects stream backpressure)
- Newline-safe SSE framing (guarantees \n\n boundaries)
- Chunk counting for debugging
- Return `{ transform, getChunkCount }` interface

#### 1.3 Update SSE Path (`netlify/functions/chat.ts`)

- Use enhanced transform with buffering
- Track `streamChunkCount` for header
- Ensure all events end with \n\n
- Mask PII before SSE framing
- Do not break JSON chunks for tool responses

### 2. Frontend Changes

#### 2.1 Enhanced Stream Handler (`src/hooks/usePrimeChat.ts`)

- Strict SSE parsing: buffer until \n\n
- Handle partial chunks correctly
- Surface headers in hook state (`ChatHeaders` interface)
- Add timeout & abort support (AbortController)
- Add retry logic (one retry on network error; no duplicate messages)

#### 2.2 Header Extraction

- Extract all 8 headers from response
- Store in hook state: `headers: ChatHeaders`
- Expose in hook return value

### 3. Tests

#### 3.1 Server Tests (`netlify/functions/_shared/__tests__/sse_stream.test.ts`)

- Masks PII mid-stream without breaking event boundaries
- Preserves Unicode boundaries and ends with \n\n
- Emits all headers; counts X-Stream-Chunk-Count > 0

#### 3.2 Frontend Tests (`src/__tests__/usePrimeChat.stream.test.tsx`)

- Simulate streaming source; verify message order, no dupes
- Verify header exposure in hook state
- Abort + retry behavior

### 4. Reports

- `reports/DAY7_PLAN.md` (this file)
- `reports/DAY7_CHANGELOG.md`
- `reports/DAY7_VALIDATION.md`
- `reports/DAY7_RESULTS.md`

---

## CONSTRAINTS

- ✅ SSE never breaks boundaries
- ✅ PII masked before framing
- ✅ Unicode safe (preserves multi-byte characters)
- ✅ All 8 headers always present
- ✅ Frontend stream is robust (buffering, abort, retry)
- ✅ No duplicate messages

---

## ACCEPTANCE CRITERIA

- ✅ `buildResponseHeaders()` centralizes all headers
- ✅ SSE transform preserves \n\n boundaries
- ✅ PII masked before SSE framing
- ✅ Unicode characters preserved
- ✅ `X-Stream-Chunk-Count` header added for SSE
- ✅ Frontend hook exposes headers in state
- ✅ Frontend handles partial chunks
- ✅ Frontend retries on network error (once)
- ✅ Frontend handles abort correctly
- ✅ Tests created and passing
- ✅ All 4 response paths have consistent headers

---

## VALIDATION STEPS

1. Run tests: `npm run test:unit`
2. Start dev: `npx netlify dev`
3. Send test messages:
   - "My email is test@example.com — mask this while streaming."
   - "Categorize these receipts…" (Tag)
   - "Why did July spike?" (Crystal)
   - "OCR this PDF" (Byte dummy)
4. Confirm on each response:
   - SSE: `X-Stream-Chunk-Count > 0`
   - All 8 headers present & non-empty where applicable
   - No leaked PII in streamed tokens
   - Frontend: tokens append smoothly; no flicker/duplication

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/__tests__/sse_stream.test.ts`
- `src/__tests__/usePrimeChat.stream.test.tsx`
- `reports/DAY7_PLAN.md`
- `reports/DAY7_CHANGELOG.md`
- `reports/DAY7_VALIDATION.md`
- `reports/DAY7_RESULTS.md`

**Modify**:
- `netlify/functions/chat.ts` (centralize headers, enhance SSE)
- `netlify/functions/_shared/sse_mask_transform.ts` (enhance transform)
- `src/hooks/usePrimeChat.ts` (enhance stream handler)

---

## NEXT STEPS

1. ✅ Implement centralized header builder
2. ✅ Enhance SSE transform
3. ✅ Update SSE path with chunk counting
4. ✅ Enhance frontend stream handler
5. ✅ Create tests
6. ⚠️ Create reports
7. ⚠️ Test locally
8. ⚠️ Commit and push

