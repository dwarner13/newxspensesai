# Header Matrix - Routes vs X-* Headers

**Generated**: 2025-01-06  
**Updated**: 2025-01-06 (Day 16: Header Validation)

Matrix showing which headers are present (✓) or missing (✗) in each function/route.

---

## Core Headers

| Function/Route | X-Guardrails | X-PII-Mask | X-Memory-Hit | X-Memory-Count | X-Session-Summary | X-Session-Summarized | X-Employee | X-Route-Confidence |
|----------------|---------------|------------|--------------|----------------|-------------------|----------------------|-------------|-------------------|
| **chat.ts** (non-stream) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **chat.ts** (SSE stream) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ocr.ts** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **bank_ingest.ts** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

**Note**: `bank_ingest.ts` is not currently implemented or has been removed. If reintroduced, should use `buildResponseHeaders()` for consistency.

**File References**:
- `chat.ts`: Headers via `buildResponseHeaders()` imported from `_shared/headers.ts` at lines 2414, 2578, 2694, 2931
- `ocr.ts`: Headers via `buildResponseHeaders()` imported from `_shared/headers.ts` at various response points

**Status**: ✅ `buildResponseHeaders()` is unified in `_shared/headers.ts` (Day 15½).

---

## Streaming Headers

| Function/Route | X-Stream-Chunk-Count |
|----------------|----------------------|
| **chat.ts** (SSE stream) | ✓ (initial: 0, final count sent as SSE comment `: chunk-count: N`) |
| **chat.ts** (non-stream) | N/A |
| **ocr.ts** | N/A |

**Implementation**: 
- `streamChunkCount` is tracked incrementally during SSE transform (`chat.ts:2754`)
- HTTP header `X-Stream-Chunk-Count` is set initially to 0 (headers sent before streaming)
- Final chunk count is sent as SSE comment event `: chunk-count: N` before `[DONE]` (`chat.ts:2832`)
- This follows standard SSE practice (headers sent first, telemetry in events)

**Status**: ✅ Implemented (Day 16)

---

## OCR-Specific Headers

| Function/Route | X-OCR-Provider | X-OCR-Parse | X-Transactions-Saved | X-Categorizer | X-Vendor-Matched | X-XP-Awarded |
|----------------|----------------|-------------|---------------------|---------------|------------------|--------------|
| **ocr.ts** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **chat.ts** (via Byte tool) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**File Reference**: 
- `ocr.ts`: Headers set conditionally based on OCR result
- `chat.ts:2256-2303`: OCR headers captured and merged into `mergedOcrHeaders`
- `chat.ts:2414-2437`: OCR headers merged into final response headers via `buildResponseHeaders()`

**Status**: ✅ Byte→OCR header forwarding implemented (Day 15½)

---

## Header Builder Function

### Current Implementation

**File**: `netlify/functions/_shared/headers.ts` (Day 15½)

**Signature**:
```typescript
export function buildResponseHeaders(params: {
  guardrailsActive?: boolean;
  piiMaskEnabled?: boolean;
  memoryHitTopScore?: number | null;
  memoryHitCount?: number;
  summaryPresent?: boolean;
  summaryWritten?: boolean | 'async';
  employee?: string;
  routeConfidence?: number;
  streamChunkCount?: number;
  ocrProvider?: string;
  ocrParse?: string;
  transactionsSaved?: number;
  categorizer?: string;
  vendorMatched?: boolean;
  xpAwarded?: number;
  rowCount?: number;
  uniqueRows?: number;
  vendorUnique?: number;
  analysis?: string;
  // ... supports both legacy and new format aliases
}): Record<string, string>
```

**Status**: ✅ Unified in `_shared/headers.ts`, used by `chat.ts` and `ocr.ts` (Day 15½)

---

## Status Summary

### ✅ Completed (Day 15½ - Day 16)

1. **✅ Unified `buildResponseHeaders` in `_shared/headers.ts`**
   - Shared between `chat.ts` and `ocr.ts`
   - Supports `streamChunkCount` parameter
   - Consistent header generation across all routes

2. **✅ Forward OCR Headers in Byte Tool Calls**
   - OCR response headers captured and merged (`chat.ts:2256-2303`)
   - Headers forwarded to final chat response via `buildResponseHeaders()` (`chat.ts:2414-2437`)

3. **✅ Streaming Chunk Count Tracking**
   - `streamChunkCount` tracked incrementally during SSE transform
   - Header set initially (may be 0), final count sent as SSE comment event

4. **✅ Header Validation Tests**
   - Created `headers_core.test.ts` for core header verification
   - Created `headers_forwarding.test.ts` for Byte→OCR header forwarding

### Notes

- **SSE Chunk Count**: For SSE streams, HTTP headers are sent before streaming starts, so `X-Stream-Chunk-Count` may show 0 initially. Final count is sent as SSE comment event `: chunk-count: N` before `[DONE]`.

- **OCR Header Forwarding**: OCR headers are forwarded when Byte calls the `ocr_file` tool. Since tool calls are LLM-dependent, headers may not always be present in every Byte response.

- **Bank Ingest**: `bank_ingest.ts` is not currently implemented. If reintroduced, should use `buildResponseHeaders()`.

---

## Header Definitions

| Header | Purpose | Values | Required |
|--------|---------|--------|----------|
| `X-Guardrails` | Guardrails system status | `active`, `inactive`, `blocked` | Yes |
| `X-PII-Mask` | PII masking status | `enabled`, `disabled` | Yes |
| `X-Memory-Hit` | Top memory recall score | `0.00` - `1.00` | Yes |
| `X-Memory-Count` | Number of recalled facts | `0` - `N` | Yes |
| `X-Session-Summary` | Session summary availability | `present`, `absent` | Yes |
| `X-Session-Summarized` | Summary generation status | `yes`, `no`, `async` | Yes |
| `X-Employee` | Selected employee | `prime`, `crystal`, `tag`, `byte`, etc. | Yes |
| `X-Route-Confidence` | Routing confidence score | `0.00` - `1.00` | Yes |
| `X-Stream-Chunk-Count` | SSE chunk count | `0` - `N` (initial), final count in SSE comment event | Optional (SSE only) |
| `X-Memory-Verified` | Memory verification flag | `true`, `false` | Yes (Day 16) |
| `X-Row-Count` | CSV/transaction row count | `0` - `N` | Optional (Prime CSV orchestration) |
| `X-Unique-Rows` | Unique transaction rows | `0` - `N` | Optional (Prime CSV orchestration) |
| `X-Analysis` | Analysis results present | `present`, `absent` | Optional (Prime CSV orchestration) |
| `X-OCR-Provider` | OCR provider used | `ocrspace`, `vision`, `local`, `none` | OCR only |
| `X-OCR-Parse` | Document type parsed | `invoice`, `receipt`, `bank`, `none` | OCR only |
| `X-Transactions-Saved` | Number of transactions saved | `0` - `N` | OCR only |
| `X-Categorizer` | Categorization method | `rules`, `tag` | OCR only |
| `X-Vendor-Matched` | Vendor matching status | `yes`, `no` | OCR only |
| `X-XP-Awarded` | XP points awarded | `0` - `N` | OCR only |

