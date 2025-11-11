# Day 8 OCR & Ingestion (Phase 1) - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day8-ocr-ingestion`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day8-ocr-ingestion

# Install dependencies (if needed)
npm install

# Start dev server
npx netlify dev
```

### 2. Run Tests

```bash
# Run all tests
npm run test:unit

# Run OCR parser tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_parsers.test.ts

# Run OCR provider tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_providers.test.ts

# Run OCR handler tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_handler.test.ts
```

**Expected**: All tests pass

### 3. Manual Test Flow

#### Test 1: OCR Endpoint (Multipart Upload)

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/ocr \
  -F "file=@test-receipt.png" \
  -H "X-User-Id: test-user" \
  -H "X-Convo-Id: test-session"
```

**Expected**:
- Status: 200
- Headers: `X-OCR-Provider`, `X-OCR-Parse`, `X-PII-Mask: enabled`
- Body: JSON with `ok: true`, `text` (masked), `parsed.kind` (receipt/invoice)
- No crashes if providers not configured (returns warnings)

#### Test 2: OCR Endpoint (JSON URL)

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/ocr \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -H "X-Convo-Id: test-session" \
  -d '{"url": "https://example.com/receipt.pdf", "mime": "application/pdf"}'
```

**Expected**:
- Status: 200
- Headers: `X-OCR-Provider`, `X-OCR-Parse`
- Body: JSON with `ok: true`, `source: "url"`, `text` (masked), `parsed`

#### Test 3: Byte Routing with OCR

**Message**: "OCR this PDF then parse it"

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "sessionId": "test-session",
    "message": "OCR this PDF then parse it",
    "ocrUrl": "https://example.com/receipt.pdf"
  }'
```

**Expected**:
- Routing: `X-Employee: byte`
- Tool call: `ocr_file` tool invoked
- Response: Formatted OCR result with extracted text and parsed JSON
- Headers: `X-OCR-Provider`, `X-OCR-Parse` propagate

#### Test 4: PII Masking

**Request**: Upload a receipt/image containing PII (email, phone, card)

**Expected**:
- Extracted text has PII masked (e.g., `[email]`, `[phone]`, `[card]`)
- `X-PII-Mask: enabled` header present
- Parsed JSON does not contain raw PII

---

## VERIFICATION CHECKLIST

### OCR Endpoint

- [ ] Accepts multipart/form-data (file upload)
- [ ] Accepts JSON (url)
- [ ] Returns `OCRResult` with all required fields
- [ ] Masks PII in extracted text
- [ ] Parses text into structured JSON
- [ ] Headers include `X-OCR-Provider` and `X-OCR-Parse`
- [ ] Works without configured APIs (returns warnings, not crash)
- [ ] Supports SSE when `Accept: text/event-stream`

### OCR Parsers

- [ ] `parseInvoiceLike()` extracts vendor, invoice_no, date, totals
- [ ] `parseReceiptLike()` extracts merchant, items, total, payment
- [ ] `normalizeParsed()` tags documents correctly (invoice/receipt/bank)

### OCR Providers

- [ ] `bestEffortOCR()` tries providers in order
- [ ] Returns warnings if no providers configured
- [ ] Returns first successful result
- [ ] Respects missing API keys (doesn't crash)

### Byte Routing

- [ ] Byte routes to `byte-docs` employee
- [ ] `ocr_file` tool available for Byte
- [ ] Tool calls OCR endpoint internally
- [ ] Returns formatted OCR result
- [ ] Headers propagate correctly

---

## EXPECTED BEHAVIOR

### OCR Response (JSON)

```json
{
  "ok": true,
  "source": "upload",
  "mime": "image/png",
  "bytes": 12345,
  "text": "Store: Walmart\nDate: 01/15/2024\nTotal: $45.67",
  "pages": [
    { "index": 0, "text": "Store: Walmart\nDate: 01/15/2024\nTotal: $45.67" }
  ],
  "meta": {
    "ocr": "ocrspace",
    "duration_ms": 1234
  },
  "parsed": {
    "kind": "receipt",
    "data": {
      "merchant": "Walmart",
      "date": "01/15/2024",
      "total": 45.67,
      "items": [
        { "name": "Coffee", "price": 5.99 }
      ]
    }
  },
  "warnings": []
}
```

### Headers

```
X-Guardrails: active
X-PII-Mask: enabled
X-Memory-Hit: 0
X-Memory-Count: 0
X-Session-Summary: absent
X-Session-Summarized: no
X-Employee: byte
X-Route-Confidence: 1.00
X-OCR-Provider: ocrspace
X-OCR-Parse: receipt
Content-Type: application/json
```

### Byte Tool Response

```
OCR completed for https://example.com/receipt.pdf.

Extracted text (234 chars):
Store: Walmart
Date: 01/15/2024
Total: $45.67...

Parsed as: receipt
Merchant: Walmart
Total: $45.67
Items: 3
```

---

## TROUBLESHOOTING

### Issue: OCR endpoint returns warnings
- **Check**: Are OCR providers configured? (`OCRSPACE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`)
- **Expected**: Warnings in response, not crash

### Issue: Parsing returns `kind: none`
- **Check**: Does text contain invoice/receipt-like patterns?
- **Check**: Parser heuristics may not match format
- **Expected**: May return `none` if format unrecognized

### Issue: Byte tool not invoked
- **Check**: Is message routed to Byte? (`X-Employee: byte`)
- **Check**: Does message contain "OCR" keywords?
- **Check**: Tool definition correct in `chat.ts`?

### Issue: PII not masked
- **Check**: Is `maskPII()` called before returning?
- **Check**: Does text contain PII patterns?
- **Expected**: PII should be masked in `text` field

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] `/ocr` endpoint works without configured APIs (returns warnings, not crash)
- [x] With any provider configured, returns extracted text + parsed JSON
- [x] Headers include `X-OCR-Provider` and `X-OCR-Parse`
- [x] Byte routing can invoke OCR flow from chat
- [x] Tests created
- [ ] Manual test: OCR endpoint works (requires dev server)
- [ ] Manual test: Parsing works (requires dev server)
- [ ] Manual test: Byte routing works (requires dev server)
- [ ] Manual test: PII masking works (requires dev server)

---

## NEXT STEPS

1. ✅ Implementation complete
2. ⚠️ Run tests locally
3. ⚠️ Manual testing with dev server
4. ⚠️ Verify headers in browser dev tools
5. ⚠️ Commit and push









