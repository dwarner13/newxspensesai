# Day 9 OCR Normalize → Categorize → Store - Changelog

**Date**: 2025-01-XX  
**Branch**: `feature/day9-ocr-normalize-categorize`

---

## FILES CREATED

1. **`netlify/functions/_shared/sql/day9_transactions.sql`** (Storage schema)
   - `transactions` table with deduplication constraint
   - `transaction_items` table with foreign key
   - Indexes for efficient lookups

2. **`netlify/functions/_shared/ocr_normalize.ts`** (Normalizer module)
   - `toTransactions()`: Convert ParsedDoc to NormalizedTransaction[]
   - `categorize()`: Auto-categorize transactions (rules + Tag fallback)
   - `linkToDocument()`: Link transaction to document
   - Date normalization (multiple formats)
   - Currency extraction

3. **`netlify/functions/_shared/transactions_store.ts`** (Persistence module)
   - `insertTransaction()`: Upsert with deduplication
   - `insertItems()`: Bulk insert transaction items
   - `linkToDocument()`: Link transaction to document

4. **`netlify/functions/_shared/__tests__/ocr_normalize.test.ts`** (Normalizer tests)
   - Tests for receipt/invoice normalization
   - Tests for date parsing
   - Tests for categorization (rules + Tag fallback)

5. **`netlify/functions/_shared/__tests__/transactions_store.test.ts`** (Store tests)
   - Tests for transaction insertion
   - Tests for deduplication
   - Tests for items insertion

6. **`netlify/functions/_shared/__tests__/ocr_integration_tx.test.ts`** (Integration tests)
   - End-to-end: OCR → parse → normalize → store → headers

7. **`netlify/functions/_shared/__tests__/ocr_guardrails.test.ts`** (Guardrails tests)
   - Oversized file → 413
   - Bad MIME → 400
   - Toxic text → 422 with X-Guardrails: blocked
   - Safe text → 200 with X-Guardrails: active

8. **`src/components/OCRDropzone.tsx`** (React component)
   - Drag-and-drop file upload
   - Progress indicator
   - Response headers display
   - OCR result JSON display

7. **`reports/DAY9_PLAN.md`** (implementation plan)
8. **`reports/DAY9_CHANGELOG.md`** (this file)
9. **`reports/DAY9_VALIDATION.md`** (testing guide)
10. **`reports/DAY9_RESULTS.md`** (test results)

---

## FILES MODIFIED

1. **`netlify/functions/ocr.ts`**
   - **Added imports**: `toTransactions`, `categorize`, `insertTransaction`, `insertItems`, `linkToDocument`
   - **After OCR+parse** (lines ~280-350):
     - Normalize parsed document to transactions
     - Categorize each transaction
     - Insert transactions and items
     - Link transactions to document
     - Track `saved_count` and `categorizer` method
   - **Updated headers**: Added `transactionsSaved` and `categorizer` params to `buildResponseHeaders()`
   - **Updated result**: Added `saved_count` and `doc_id` to `meta`

2. **`netlify/functions/chat.ts`**
   - **Updated Byte OCR tool** (lines ~2192-2235):
     - Enhanced summary with transaction save count
     - Show categorization method
     - Display merchant, date, total, category, items count

---

## FUNCTIONAL CHANGES

### Guardrails (Day 9 Addition)
- **Input Validation**: Max file size 15 MB, MIME type validation (PDF, PNG, JPEG, WebP, TIFF)
- **Magic Bytes Validation**: Validates file signatures (PDF: %PDF, PNG: \x89PNG, JPEG: FF D8 FF)
- **Content Moderation**: Applies `applyGuardrails()` to extracted text with strict preset
- **Blocking**: Returns 422 if moderation flags toxic content
- **Logging**: Logs to `guardrail_events` with stage 'ocr', SHA256 hash, provider, blocked flag
- **Headers**: `X-Guardrails` reflects 'active' or 'blocked' status

### Normalization
- Converts ParsedDoc (invoice/receipt/bank) to NormalizedTransaction[]
- Handles date formats: YYYY-MM-DD, DD/MM/YYYY, MMM DD, YYYY
- Extracts currency from parsed data
- Prefers total || subtotal + tax for amount

### Categorization
- Deterministic rules first (groceries, fuel, restaurants, office, utilities)
- Tag LLM fallback if confidence < 0.6
- PII masked before Tag LLM call
- Returns category, subcategory, confidence, method

### Storage
- Upsert with deduplication (user_id, date, merchant, amount, currency)
- Bulk insert transaction items
- Link transactions to documents
- Non-blocking failures (warnings included)

### Headers
- `X-Transactions-Saved`: Number of transactions saved
- `X-Categorizer`: Method used (rules|tag)

---

## BACKWARD COMPATIBILITY

- ✅ Existing OCR endpoint unchanged (additive)
- ✅ Transactions storage optional (non-blocking)
- ✅ No breaking changes

---

## BREAKING CHANGES

- ❌ None (all changes are additive)

---

## DEPENDENCIES

- Requires `transactions` and `transaction_items` tables (SQL migration)
- Tag LLM requires OpenAI API key (optional, falls back to rules)

---

## SECURITY CONSIDERATIONS

- PII masked before Tag LLM call
- Deduplication prevents duplicate transactions
- User isolation by `user_id`

---

## PERFORMANCE CONSIDERATIONS

- Categorization tries rules first (fast), Tag LLM only if needed
- Bulk insert for transaction items
- Non-blocking failures (warnings, not errors)

---

## TESTING NOTES

- Normalizer tests use sample texts (no actual OCR required)
- Store tests mock Supabase (no external dependencies)
- Integration tests mock all dependencies

---

## MIGRATION NOTES

Run SQL migration in Supabase SQL editor:
```sql
-- See: netlify/functions/_shared/sql/day9_transactions.sql
```

---

## KNOWN LIMITATIONS

- Date parsing may not handle all formats
- Categorization rules are basic (can be extended)
- Bank statement parsing is minimal stub

