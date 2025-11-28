# Day 9 OCR Normalize → Categorize → Store - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day9-ocr-normalize-categorize`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day9-ocr-normalize-categorize

# Install dependencies (if needed)
npm install

# Run SQL migration in Supabase SQL editor
# See: netlify/functions/_shared/sql/day9_transactions.sql

# Start dev server
npx netlify dev
```

### 2. Run Tests

```bash
# Run all tests
npm run test:unit

# Run normalizer tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_normalize.test.ts

# Run store tests only
npm run test:unit netlify/functions/_shared/__tests__/transactions_store.test.ts

# Run integration tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_integration_tx.test.ts
```

**Expected**: All tests pass

### 3. Manual Test Flow

#### Test 1: OCR Endpoint with Transaction Storage

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/ocr \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -H "X-Convo-Id: test-session" \
  -d '{
    "url": "https://example.com/receipt.pdf",
    "mime": "application/pdf"
  }'
```

**Expected**:
- Status: 200
- Headers: `X-OCR-Provider`, `X-OCR-Parse`, `X-Transactions-Saved: 1`, `X-Categorizer: rules|tag`
- Body: JSON with `meta.saved_count > 0`
- Database: Row in `transactions` table, rows in `transaction_items` (if items present)

#### Test 2: Deduplication

**Request**: Send same receipt twice

**Expected**:
- First request: `X-Transactions-Saved: 1`
- Second request: `X-Transactions-Saved: 0` (deduplicated)
- Database: Only 1 row in `transactions` table

#### Test 3: Categorization Rules

**Request**: OCR receipt from "Save-On-Foods"

**Expected**:
- `X-Categorizer: rules`
- Transaction category: "Groceries"
- Confidence: ≥ 0.9

#### Test 4: Tag LLM Fallback

**Request**: OCR receipt from unknown merchant

**Expected**:
- `X-Categorizer: tag` (if rules don't match)
- Transaction category: Determined by Tag LLM
- Confidence: < 0.6 (triggers Tag)

#### Test 5: Byte Routing with Summary

**Message**: "OCR this receipt and categorize it"

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "sessionId": "test-session",
    "message": "OCR this receipt and categorize it",
    "ocrUrl": "https://example.com/receipt.pdf"
  }'
```

**Expected**:
- Routing: `X-Employee: byte`
- Tool response includes:
  - Merchant name
  - Date
  - Total
  - Category
  - Items count
  - "Saved X transaction(s)" message

---

## VERIFICATION CHECKLIST

### OCR Endpoint

- [ ] Processes receipt/invoice and saves transactions
- [ ] Headers include `X-Transactions-Saved` and `X-Categorizer`
- [ ] Transactions saved to database (no dupes)
- [ ] Transaction items saved if present
- [ ] Failures non-blocking (warnings included)

### Normalization

- [ ] Receipt normalized to transaction correctly
- [ ] Invoice normalized to transaction correctly
- [ ] Date formats parsed correctly (YYYY-MM-DD output)
- [ ] Currency extracted correctly
- [ ] Amount derived correctly (total || subtotal + tax)

### Categorization

- [ ] Rules categorize groceries correctly
- [ ] Rules categorize fuel correctly
- [ ] Rules categorize restaurants correctly
- [ ] Tag LLM fallback works when rules don't match
- [ ] PII masked before Tag LLM call

### Storage

- [ ] Transactions deduplicated correctly
- [ ] Items inserted correctly
- [ ] Transactions linked to documents
- [ ] No duplicate rows on re-run

### Byte Tool Integration

- [ ] Summary includes merchant, date, total, category
- [ ] Summary shows items count
- [ ] Summary shows "Saved X transaction(s)"
- [ ] Headers propagate correctly

---

## EXPECTED BEHAVIOR

### OCR Response (with transactions)

```json
{
  "ok": true,
  "source": "upload",
  "mime": "image/png",
  "bytes": 12345,
  "text": "Store: Walmart\nDate: 01/15/2024\nTotal: $45.67",
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
  "meta": {
    "ocr": "ocrspace",
    "duration_ms": 1234,
    "saved_count": 1,
    "doc_id": "doc-123"
  }
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
X-Transactions-Saved: 1
X-Categorizer: rules
Content-Type: application/json
```

### Database Rows

**transactions**:
```
id | user_id | doc_id | kind | date | merchant | amount | currency | category | subcategory
1  | test-user | doc-123 | receipt | 2024-01-15 | Walmart | 45.67 | USD | Groceries | NULL
```

**transaction_items**:
```
id | transaction_id | name | qty | unit | price
1  | 1 | Coffee | NULL | NULL | 5.99
```

### Byte Tool Response

```
OCR completed for https://example.com/receipt.pdf.

Parsed as: receipt
Merchant: Walmart
Date: 01/15/2024
Total: $45.67
Items: 2

✅ Saved 1 transaction(s) to your account. Categorized using rules.
```

---

## TROUBLESHOOTING

### Issue: Transactions not saved
- **Check**: Are tables created? (Run SQL migration)
- **Check**: Is deduplication too strict? (Check unique constraint)
- **Check**: Are errors logged? (Check console warnings)

### Issue: Categorization always uses Tag
- **Check**: Do merchant names match rule keywords?
- **Check**: Is confidence threshold correct? (< 0.6 triggers Tag)
- **Expected**: Rules should match common merchants

### Issue: Deduplication not working
- **Check**: Unique constraint created?
- **Check**: Are date/merchant/amount/currency values identical?
- **Expected**: Same transaction should dedupe

### Issue: Date parsing fails
- **Check**: Date format in parsed data?
- **Check**: Normalize function handles format?
- **Expected**: May return undefined if format unrecognized

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] `/ocr` now produces normalized transactions and saves them
- [x] Auto-categorization picks rules first, Tag fallback second
- [x] Headers include `X-Transactions-Saved` + `X-Categorizer`
- [x] Chat (Byte) surfaces a clean post-OCR summary
- [x] Tests created
- [ ] Manual test: Transactions saved (requires dev server + database)
- [ ] Manual test: Deduplication works (requires dev server + database)
- [ ] Manual test: Categorization works (requires dev server)
- [ ] Manual test: Byte summary works (requires dev server)

---

## NEXT STEPS

1. ✅ Implementation complete
2. ⚠️ Run SQL migration in Supabase
3. ⚠️ Run tests locally
4. ⚠️ Manual testing with dev server
5. ⚠️ Verify database rows
6. ⚠️ Commit and push



















