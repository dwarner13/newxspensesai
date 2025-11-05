# Day 11: Transactions UI - Changelog

**Date**: 2025-01-XX  
**Branch**: `feature/day11-ui-transactions`

---

## FILES CREATED

1. **`netlify/functions/transactions.ts`** (GET endpoint)
   - Auth-scoped by userId (X-User-Id header or query param)
   - Joins `transactions` with `transaction_items`
   - Orders by date DESC, limit 200
   - Optional category filter
   - Transforms response with items count

2. **`netlify/functions/teach-category.ts`** (POST endpoint)
   - Accepts: `{ transactionId?, merchant, category, subcategory }`
   - Calls `rememberCategory()` (Day 10, with stub fallback)
   - Calls `awardXP('ocr.categorize.corrected', +8)` (Day 10, with stub fallback)
   - Updates transaction row if `transactionId` provided
   - Returns XP awarded amount

3. **`src/pages/transactions.tsx`** (Frontend page)
   - Table: date, merchant, amount, currency, category/subcategory, confidence
   - "Correct" button → modal form
   - Optimistic updates
   - Toast notifications with XP awards
   - Loading and error states

4. **`netlify/functions/_shared/__tests__/transactions_api.test.ts`** (API tests)
   - Tests for userId extraction
   - Tests for query limits
   - Tests for category filtering

5. **`src/__tests__/transactions_ui.test.tsx`** (UI tests)
   - Tests for loading state
   - Tests for transaction display
   - Tests for modal interaction
   - Tests for save flow

---

## FILES MODIFIED

None (new feature)

---

## FEATURES

- ✅ Transaction listing with items count
- ✅ Category correction via modal
- ✅ Optimistic UI updates
- ✅ XP award notifications
- ✅ Error handling and loading states

---

## HEADERS

All endpoints use `buildResponseHeaders()`:
- `X-Guardrails: active`
- `X-PII-Mask: enabled`
- `X-Employee: byte|tag`
- `X-Route-Confidence: 0.5-0.8`
- `X-XP-Awarded: 0-8` (for teach-category)

---

## DEPENDENCIES

- Day 10: `rememberCategory()`, `awardXP()` (gracefully handles missing modules)
- Supabase: `transactions`, `transaction_items` tables
- Frontend: React, react-hot-toast, date-fns, lucide-react

---

## NOTES

- Uses `X-User-Id` header pattern (matches existing endpoints)
- Falls back to query param for flexibility
- Gracefully handles missing Day 10 modules (stubs)
- Transaction update is non-blocking
