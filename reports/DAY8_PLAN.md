# Day 8 OCR & Ingestion (Phase 1) - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day8-ocr-ingestion`  
**Base**: `feature/day7-streaming-polish`

---

## OBJECTIVE

Add an OCR pipeline (bytes → text → structured JSON), wire it to Byte routing, return results consistently (SSE/JSON), and add tests + reports. Idempotent & safe to re-run.

---

## IMPLEMENTATION PLAN

### 1. OCR Handler (`netlify/functions/ocr.ts`)

**Accepts**:
- `multipart/form-data` (field `file`)
- `application/json` with `{ url }`

**Returns**: `OCRResult` with:
- `source`: 'upload' | 'url'
- `mime`: MIME type
- `bytes`: File size
- `text`: Raw extracted text (masked for PII)
- `pages`: Array of page texts
- `meta`: OCR provider, duration, dimensions
- `parsed`: Normalized JSON (ParsedDoc)
- `warnings`: Optional warnings array

**Features**:
- Always apply `maskPII()` before returning/storing
- Reuse `buildResponseHeaders()` for consistency
- Support SSE when `Accept: text/event-stream`; otherwise JSON
- Store to Supabase storage (optional, non-blocking)

### 2. OCR Parsers (`netlify/functions/_shared/ocr_parsers.ts`)

**Functions**:
- `parseInvoiceLike(text)`: Extract invoice fields (vendor, invoice_no, date, line_items, totals, currency)
- `parseReceiptLike(text)`: Extract receipt fields (merchant, date, items, total, payment, taxes)
- `parseBankStatementLike(text)`: Stub for future
- `normalizeParsed(parsed)`: Tag parsed document with kind (invoice/receipt/bank)

**Heuristics**: Regex-based, no LLM required for Phase 1

### 3. OCR Providers (`netlify/functions/_shared/ocr_providers.ts`)

**Functions**:
- `ocrLocal(imageOrPdfBytes)`: Stub for pdf.js / tesseract (future)
- `ocrOCRSpace({ bytes|url })`: OCR.Space API (requires `OCRSPACE_API_KEY`)
- `ocrVision({ bytes|gcsUri })`: Google Cloud Vision API (requires `GOOGLE_APPLICATION_CREDENTIALS`)
- `bestEffortOCR(input)`: Try all providers, return first good result

**Fallback**: Return warnings if no providers configured; don't crash

### 4. Wire Byte Routing (`netlify/functions/chat.ts`)

**Tool Support**:
- Add `ocr_file` tool for Byte employee
- When user says "OCR this PDF/image", Byte can call tool
- Tool calls OCR endpoint internally
- Returns formatted OCR result

**Headers**: Ensure `X-Employee`, `X-OCR-Provider`, `X-OCR-Parse` propagate

### 5. Storage (Optional v1)

**If configured**:
- Store original file to Supabase storage bucket `ocr/` with `convoId/userId` prefix
- Log row in `documents` table (idempotent insert, non-blocking)

**Skip if not configured**: No errors, just warnings

### 6. Tests

**Server Tests**:
- `ocr_parsers.test.ts`: Sample texts → expect vendor/total/date extracted, normalization tags correctly
- `ocr_providers.test.ts`: Mocks return shapes, `bestEffortOCR` falls back correctly, respects missing API keys
- `ocr_handler.test.ts`: Multipart upload → JSON response contains masked text and parsed with kind

### 7. Headers

**Reuse `buildResponseHeaders()`**:
- All standard headers (X-Guardrails, X-PII-Mask, etc.)
- Add `X-OCR-Provider`: local|ocrspace|vision|none
- Add `X-OCR-Parse`: invoice|receipt|bank|none

### 8. Reports

- `reports/DAY8_PLAN.md` (this file)
- `reports/DAY8_CHANGELOG.md`
- `reports/DAY8_VALIDATION.md`
- `reports/DAY8_RESULTS.md`

---

## CONSTRAINTS

- ✅ Idempotent & safe to re-run
- ✅ No hard failures if providers missing (return warnings)
- ✅ PII masking always applied before returning/storing
- ✅ Headers consistent across endpoints
- ✅ Heuristics-based parsing (no LLM for Phase 1)

---

## ACCEPTANCE CRITERIA

- ✅ `/ocr` endpoint works without configured APIs (returns warnings, not crash)
- ✅ With any provider configured, returns extracted text + parsed JSON
- ✅ Headers include `X-OCR-Provider` and `X-OCR-Parse`
- ✅ Byte routing can invoke OCR flow from chat
- ✅ Tests pass
- ✅ Reports updated

---

## VALIDATION STEPS

1. Run tests: `npm run test:unit`
2. Start dev: `npx netlify dev`
3. Test OCR endpoint:
   - POST `/ocr` with image/PDF (or dummy text file)
   - Confirm headers: `X-OCR-Provider`, `X-OCR-Parse`
   - Confirm text is masked; `parsed.kind` resolves
4. Test Byte routing:
   - Send: "OCR this PDF then parse it"
   - Byte selected; see tool response rendered

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/ocr.ts`
- `netlify/functions/_shared/ocr_parsers.ts`
- `netlify/functions/_shared/ocr_providers.ts`
- `netlify/functions/_shared/__tests__/ocr_parsers.test.ts`
- `netlify/functions/_shared/__tests__/ocr_providers.test.ts`
- `netlify/functions/_shared/__tests__/ocr_handler.test.ts`
- `reports/DAY8_PLAN.md`
- `reports/DAY8_CHANGELOG.md`
- `reports/DAY8_VALIDATION.md`
- `reports/DAY8_RESULTS.md`

**Modify**:
- `netlify/functions/chat.ts` (wire Byte OCR tool)

---

## NEXT STEPS

1. ✅ Create OCR handler
2. ✅ Create parsers
3. ✅ Create providers
4. ✅ Wire Byte routing
5. ✅ Add tests
6. ⚠️ Create reports
7. ⚠️ Test locally
8. ⚠️ Commit and push









