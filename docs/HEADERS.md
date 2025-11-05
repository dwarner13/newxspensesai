# Response Headers Contract

**Last Updated**: 2025-01-XX  
**Version**: 1.0

---

## Overview

All API endpoints return standardized response headers that provide transparency into system behavior, security posture, and processing metadata. Headers are split into **Core Headers** (present on all endpoints) and **Feature-Specific Headers** (present when features are active).

---

## Core Headers (8)

These headers are present on **all** API responses:

### `X-Guardrails`
**Values**: `active` | `inactive` | `blocked`  
**Purpose**: Indicates guardrails system status  
**When**: Always present  
**Example**: `X-Guardrails: active`

- `active`: Guardrails are enabled and content passed checks
- `inactive`: Guardrails disabled (should not occur in production)
- `blocked`: Content was blocked by guardrails (422 response)

### `X-PII-Mask`
**Values**: `enabled` | `disabled`  
**Purpose**: Indicates PII masking status  
**When**: Always present  
**Example**: `X-PII-Mask: enabled`

- `enabled`: PII masking is active
- `disabled`: PII masking disabled (should not occur in production)

### `X-Memory-Hit`
**Values**: `0.00` - `1.00` (float, 2 decimals)  
**Purpose**: Highest similarity score from memory recall  
**When**: Always present (0.00 if no memory recalled)  
**Example**: `X-Memory-Hit: 0.85`

- Represents the top similarity score from `memory.recall()`
- Higher values indicate stronger memory matches
- Used for debugging memory recall effectiveness

### `X-Memory-Count`
**Values**: `0` - `N` (integer)  
**Purpose**: Number of memory facts recalled  
**When**: Always present  
**Example**: `X-Memory-Count: 12`

- Count of facts returned by `memory.recall()`
- Used for debugging memory recall effectiveness

### `X-Session-Summary`
**Values**: `present` | `absent`  
**Purpose**: Indicates if a session summary was retrieved  
**When**: Always present  
**Example**: `X-Session-Summary: present`

- `present`: A summary was found and injected into context
- `absent`: No summary available for this session

### `X-Session-Summarized`
**Values**: `yes` | `no` | `async`  
**Purpose**: Indicates if a summary was written in this request  
**When**: Always present  
**Example**: `X-Session-Summarized: yes`

- `yes`: Summary was written synchronously
- `no`: Summary was not written (thresholds not met)
- `async`: Summary writing is in progress (non-blocking)

### `X-Employee`
**Values**: `prime` | `crystal` | `tag` | `byte`  
**Purpose**: AI employee that handled the request  
**When**: Always present  
**Example**: `X-Employee: crystal`

- `prime`: General chat and orchestration
- `crystal`: Analytics, insights, metrics
- `tag`: Categorization, transactions, receipts
- `byte`: Code, tools, OCR, ingestion

### `X-Route-Confidence`
**Values**: `0.00` - `1.00` (float, 2 decimals)  
**Purpose**: Confidence score for employee routing decision  
**When**: Always present  
**Example**: `X-Route-Confidence: 0.85`

- Higher values indicate more confident routing decisions
- < 0.6: Low confidence (may use LLM fallback)
- ≥ 0.6: High confidence (deterministic routing)

---

## OCR-Specific Headers

These headers are present on **OCR endpoint** (`/ocr`) responses:

### `X-OCR-Provider`
**Values**: `local` | `ocrspace` | `vision` | `none`  
**Purpose**: OCR provider used for text extraction  
**When**: OCR endpoint only  
**Example**: `X-OCR-Provider: ocrspace`

- `local`: Local OCR (stubbed for future)
- `ocrspace`: OCR.Space API
- `vision`: Google Cloud Vision API
- `none`: No OCR provider configured or available

### `X-OCR-Parse`
**Values**: `invoice` | `receipt` | `bank` | `none`  
**Purpose**: Document type detected from parsed text  
**When**: OCR endpoint only  
**Example**: `X-OCR-Parse: receipt`

- `invoice`: Invoice-like document
- `receipt`: Receipt-like document
- `bank`: Bank statement-like document
- `none`: Could not determine document type

### `X-Transactions-Saved`
**Values**: `0` - `N` (integer)  
**Purpose**: Number of transactions saved to database  
**When**: OCR endpoint only (when transactions saved)  
**Example**: `X-Transactions-Saved: 3`

- Count of transactions inserted into `transactions` table
- Only present if transactions were saved

### `X-Categorizer`
**Values**: `rules` | `tag` | `none`  
**Purpose**: Categorization method used  
**When**: OCR endpoint only (when transactions categorized)  
**Example**: `X-Categorizer: rules`

- `rules`: Deterministic rule-based categorization
- `tag`: LLM-based categorization (Tag employee)
- `none`: No categorization performed

### `X-Vendor-Matched`
**Values**: `yes` | `no`  
**Purpose**: Indicates if vendor was matched to canonical name  
**When**: OCR endpoint only (when vendor matching enabled)  
**Example**: `X-Vendor-Matched: yes`

- `yes`: Vendor was matched to a canonical alias
- `no`: Vendor was not matched (new vendor)

### `X-XP-Awarded`
**Values**: `0` - `N` (integer)  
**Purpose**: Total XP points awarded in this request  
**When**: OCR endpoint and `/teach-category` endpoint  
**Example**: `X-XP-Awarded: 7`

- Sum of all XP awards for this request
- See `docs/DB.md` for XP action types

---

## Debug Headers

### `X-Stream-Chunk-Count`
**Values**: `0` - `N` (integer)  
**Purpose**: Number of SSE chunks sent (debug)  
**When**: SSE responses only  
**Example**: `X-Stream-Chunk-Count: 42`

- Count of SSE data chunks sent
- Used for debugging streaming performance

### `X-Chat-Backend`
**Values**: `v2` | `v3`  
**Purpose**: Chat backend version (legacy)  
**When**: Chat endpoints  
**Example**: `X-Chat-Backend: v2`

---

## Header Contract

### Guarantees

1. **Core headers** (`X-Guardrails`, `X-PII-Mask`, `X-Memory-Hit`, `X-Memory-Count`, `X-Session-Summary`, `X-Session-Summarized`, `X-Employee`, `X-Route-Confidence`) are **always present** on all responses.

2. **Feature-specific headers** are **conditionally present** based on feature activation:
   - OCR headers: Only on `/ocr` endpoint
   - XP headers: Only when XP is awarded

3. **Header values** are **normalized**:
   - Booleans: `yes`/`no` (not `true`/`false`)
   - Numbers: String representation (not raw numbers)
   - Floats: 2 decimal places

### Client Usage

```typescript
// Extract headers
const guardrails = res.headers.get('X-Guardrails');
const memoryHit = parseFloat(res.headers.get('X-Memory-Hit') || '0');
const employee = res.headers.get('X-Employee');

// Check status
if (guardrails === 'blocked') {
  // Handle blocked content
}

if (memoryHit > 0.5) {
  // Strong memory match
}
```

---

## Migration Notes

- Headers were standardized in **Day 7** (Streaming Polish)
- All endpoints use `buildResponseHeaders()` helper
- Headers are backward-compatible (additive only)

---

## See Also

- `netlify/functions/chat.ts` - Core header builder
- `netlify/functions/ocr.ts` - OCR header builder
- `reports/DAY7_CHANGELOG.md` - Header unification details

