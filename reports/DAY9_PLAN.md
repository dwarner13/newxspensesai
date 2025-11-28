# Day 9 OCR Normalize → Categorize → Store - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day9-ocr-normalize-categorize`  
**Base**: `feature/day8-ocr-ingestion`

---

## OBJECTIVE

Turn OCR ParsedDoc → normalized Transaction(s) rows with auto-categorization (Tag), link to document, and expose headers. Idempotent & safe to re-run.

---

## IMPLEMENTATION PLAN

### 1. Storage Schema (`netlify/functions/_shared/sql/day9_transactions.sql`)

**Tables**:
- `transactions`: id, user_id, doc_id, kind, date, merchant, amount, currency, category, subcategory, source, created_at
- `transaction_items`: id, transaction_id, name, qty, unit, price

**Indexes**:
- `(user_id, date DESC)` for date lookups
- `(user_id, category)` for category filtering
- Unique constraint: `(user_id, date, merchant, amount, currency)` for deduplication

### 2. OCR Normalizer (`netlify/functions/_shared/ocr_normalize.ts`)

**Functions**:
- `toTransactions(userId, parsed)`: Map invoice/receipt/bank to NormalizedTransaction[]
  - Heuristics: prefer total || subtotal + tax
  - Date formats: YYYY-MM-DD, DD/MM/YYYY, MMM DD, YYYY
  - Currency hints from symbols or text
- `categorize(tx)`: Auto-categorize transactions
  - Deterministic rules first (groceries, fuel, restaurants, etc.)
  - Fallback to Tag LLM if confidence < 0.6 (PII masked before send)
- `linkToDocument(txId, docId)`: Link transaction to document (non-blocking)

**Types**:
- `NormalizedTransaction`: userId, kind, date, merchant, amount, currency, items, docId
- `CategorizationResult`: category, subcategory, confidence, method

### 3. Transactions Store (`netlify/functions/_shared/transactions_store.ts`)

**Functions**:
- `insertTransaction(tx)`: Upsert transaction (dedupe by user_id, date, merchant, amount, currency)
- `insertItems(transactionId, items)`: Bulk insert transaction items
- `linkToDocument(txId, docId)`: Link transaction to document

### 4. Wire into OCR Handler (`netlify/functions/ocr.ts`)

**After OCR+parse**:
- Call `toTransactions(userId, result.parsed)`
- For each normalized transaction:
  - Call `categorize(n)`
  - Call `insertTransaction()` with category/subcategory
  - Call `insertItems()` if items present
  - Call `linkToDocument()` if doc_id available
- Track `saved_count` and `categorizer` method
- Add headers: `X-Transactions-Saved`, `X-Categorizer`

### 5. Byte Tool Integration (`netlify/functions/chat.ts`)

**For Byte OCR tool path**:
- Surface friendly summary: vendor/merchant, date, total, category, items count
- Show `X-Transactions-Saved` header in tool response

### 6. Tests

**Files**:
- `ocr_normalize.test.ts`: Invoice/receipt texts → expected normalized structure, currency/date parsing, amount derivation
- `transactions_store.test.ts`: Dedupe upsert + items insert
- `ocr_integration_tx.test.ts`: End-to-end: sample receipt → OCR parse (mock) → normalize → store → headers

### 7. Reports

- `reports/DAY9_PLAN.md` (this file)
- `reports/DAY9_CHANGELOG.md`
- `reports/DAY9_VALIDATION.md`
- `reports/DAY9_RESULTS.md`

---

## CONSTRAINTS

- ✅ Idempotent & safe to re-run
- ✅ Failures non-blocking (include warnings)
- ✅ PII masked before Tag LLM call
- ✅ Deduplication by (user_id, date, merchant, amount, currency)

---

## ACCEPTANCE CRITERIA

- ✅ `/ocr` now produces normalized transactions and saves them
- ✅ Auto-categorization picks rules first, Tag fallback second
- ✅ Headers include `X-Transactions-Saved` + `X-Categorizer`
- ✅ Chat (Byte) surfaces a clean post-OCR summary
- ✅ Tests pass
- ✅ Reports updated

---

## VALIDATION STEPS

1. Run tests: `npm run test:unit`
2. Start dev: `npx netlify dev`
3. Test OCR endpoint:
   - POST `/ocr` with sample receipt/invoice
   - Expect headers: `X-OCR-Provider`, `X-OCR-Parse`, `X-Transactions-Saved`, `X-Categorizer`
   - Verify rows in `transactions` + `transaction_items` (no dupes)
4. Test Byte routing:
   - "OCR this receipt and categorize it"
   - Returns summary + category

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/sql/day9_transactions.sql`
- `netlify/functions/_shared/ocr_normalize.ts`
- `netlify/functions/_shared/transactions_store.ts`
- `netlify/functions/_shared/__tests__/ocr_normalize.test.ts`
- `netlify/functions/_shared/__tests__/transactions_store.test.ts`
- `netlify/functions/_shared/__tests__/ocr_integration_tx.test.ts`
- `reports/DAY9_PLAN.md`
- `reports/DAY9_CHANGELOG.md`
- `reports/DAY9_VALIDATION.md`
- `reports/DAY9_RESULTS.md`

**Modify**:
- `netlify/functions/ocr.ts` (wire normalization + storage)
- `netlify/functions/chat.ts` (update Byte tool summary)

---

## NEXT STEPS

1. ✅ Create storage schema
2. ✅ Create normalizer
3. ✅ Create transactions store
4. ✅ Wire into OCR handler
5. ✅ Update Byte tool integration
6. ✅ Add tests
7. ⚠️ Create reports
8. ⚠️ Test locally
9. ⚠️ Commit and push



















