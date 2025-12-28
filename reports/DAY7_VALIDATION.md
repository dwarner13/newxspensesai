# Day 7 Streaming Polish + Frontend Validation - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day7-streaming-polish`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day7-streaming-polish

# Install dependencies (if needed)
npm install

# Start dev server
npx netlify dev
```

### 2. Run Tests

```bash
# Run all tests
npm run test:unit

# Run server SSE tests only
npm run test:unit netlify/functions/_shared/__tests__/sse_stream.test.ts

# Run frontend stream tests only
npm run test:unit src/__tests__/usePrimeChat.stream.test.tsx
```

**Expected**: All tests pass

### 3. Manual Test Flow

#### Test 1: PII Masking During Streaming

**Message**: "My email is test@example.com — mask this while streaming."

**Expected**:
- SSE response streams tokens
- Email masked in streamed tokens (e.g., `[email]` or `te***@example.com`)
- No leaked PII in streamed content
- `X-PII-Mask: enabled` header present
- `X-Stream-Chunk-Count > 0` header present

**Check logs**: Should see masked content in stream, not raw email

#### Test 2: Tag Routing (Categorization)

**Message**: "Categorize these receipts…"

**Expected**:
- `X-Employee: tag` header
- `X-Route-Confidence: ≥ 0.70` header
- All 8 headers present
- Stream tokens append smoothly
- No flicker/duplication

#### Test 3: Crystal Routing (Analytics)

**Message**: "Why did July spike?"

**Expected**:
- `X-Employee: crystal` header
- `X-Route-Confidence: ≥ 0.70` header
- All 8 headers present
- Stream tokens append smoothly

#### Test 4: Byte Routing (Code/Tools)

**Message**: "OCR this PDF"

**Expected**:
- `X-Employee: byte` header
- `X-Route-Confidence: ≥ 0.70` header
- All 8 headers present
- Stream tokens append smoothly

---

## VERIFICATION CHECKLIST

### Headers Verification

- [ ] `X-Guardrails: active` present on all responses
- [ ] `X-PII-Mask: enabled` present on all responses
- [ ] `X-Memory-Hit: 0.XX` present (numeric)
- [ ] `X-Memory-Count: N` present (numeric)
- [ ] `X-Session-Summary: present|absent` present
- [ ] `X-Session-Summarized: yes|no|async` present
- [ ] `X-Employee: prime|crystal|tag|byte` present
- [ ] `X-Route-Confidence: 0.XX` present (0.00-1.00)
- [ ] `X-Stream-Chunk-Count: N` present on SSE responses (numeric, > 0)

### SSE Verification

- [ ] All SSE events end with exactly `\n\n`
- [ ] No leaked PII in streamed tokens
- [ ] Unicode characters preserved (emoji, multi-byte)
- [ ] Partial chunks handled correctly
- [ ] No duplicate messages

### Frontend Verification

- [ ] Headers exposed in `hook.headers` state
- [ ] Stream tokens append smoothly (no flicker)
- [ ] No duplicate messages
- [ ] Abort works correctly (stop button)
- [ ] Retry works on network error (once)

---

## EXPECTED BEHAVIOR

### SSE Response Headers

```
X-Guardrails: active
X-PII-Mask: enabled
X-Memory-Hit: 0.75
X-Memory-Count: 5
X-Session-Summary: present
X-Session-Summarized: async
X-Employee: prime
X-Route-Confidence: 0.80
X-Stream-Chunk-Count: 42
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

### JSON Response Headers

```
X-Guardrails: active
X-PII-Mask: enabled
X-Memory-Hit: 0.75
X-Memory-Count: 5
X-Session-Summary: present
X-Session-Summarized: yes
X-Employee: crystal
X-Route-Confidence: 0.80
Content-Type: application/json
```

### Frontend Hook State

```typescript
const { headers } = usePrimeChat(userId, sessionId);

// headers should contain:
{
  guardrails: 'active',
  piiMask: 'enabled',
  memoryHit: '0.75',
  memoryCount: '5',
  sessionSummary: 'present',
  sessionSummarized: 'yes',
  employee: 'crystal',
  routeConfidence: '0.80',
  streamChunkCount: '42' // Only for SSE responses
}
```

---

## TROUBLESHOOTING

### Issue: Headers missing
- **Check**: Response path (SSE vs JSON)?
- **Check**: `buildResponseHeaders()` called in all paths?
- **Check**: Headers added to response object?

### Issue: PII leaked in stream
- **Check**: Masking applied before SSE framing?
- **Check**: Transform processes all chunks?
- **Check**: Buffer handling correct?

### Issue: Duplicate messages
- **Check**: Frontend buffering logic?
- **Check**: Message ID generation?
- **Check**: State updates correct?

### Issue: Abort not working
- **Check**: AbortController signal passed to fetch?
- **Check**: Reader cancellation handled?
- **Check**: State cleanup on abort?

### Issue: Retry not working
- **Check**: Network error detection?
- **Check**: Retry count limit?
- **Check**: Error type checking?

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] `buildResponseHeaders()` centralizes all headers
- [x] SSE transform preserves \n\n boundaries
- [x] PII masked before SSE framing
- [x] Unicode characters preserved
- [x] `X-Stream-Chunk-Count` header added for SSE
- [x] Frontend hook exposes headers in state
- [x] Frontend handles partial chunks
- [x] Frontend retries on network error (once)
- [x] Frontend handles abort correctly
- [x] Tests created
- [ ] Manual test: PII masking works (requires dev server)
- [ ] Manual test: Headers present (requires dev server)
- [ ] Manual test: Stream smooth (requires dev server)
- [ ] Manual test: Abort works (requires dev server)
- [ ] Manual test: Retry works (requires dev server)

---

## NEXT STEPS

1. ✅ Implementation complete
2. ⚠️ Run tests locally
3. ⚠️ Manual testing with dev server
4. ⚠️ Verify headers in browser dev tools
5. ⚠️ Commit and push



















