# Day 11: Transactions Page (Frontend) - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day10-ocr-memory-xp` (or `feature/day11-ui-transactions`)

---

## OBJECTIVE

Create a transactions page that:
- Lists saved transactions from OCR
- Shows category confidence
- Allows users to correct categories and teach memory

---

## IMPLEMENTATION PLAN

### 1. Backend: Transactions API (`netlify/functions/transactions.ts`)

**GET endpoint**:
- Returns user's transactions with items
- Query params: `limit` (default 50), `offset` (default 0), `category` (optional filter)
- User-scoped via `X-User-Id` header
- Returns: `{ ok: true, data: TransactionWithItems[], count, limit, offset }`

### 2. Backend: Teach Category API (`netlify/functions/teach-category.ts`)

**POST endpoint**:
- Body: `{ merchant, category, subcategory? }`
- Headers: `X-User-Id`, `X-Convo-Id` (optional)
- Calls `rememberCategory()` to store correction
- Awards `ocr.categorize.corrected` XP (+8)
- Returns: `{ ok: true, xpAwarded: number, remembered: boolean }`

### 3. Frontend: Transactions Page (`src/pages/transactions.tsx`)

**Features**:
- Table: date, merchant, amount, currency, category, subcategory, confidence
- "Correct Category" button → opens inline edit form
- Save → POST to `/teach-category`
- Shows XP awarded message
- Updates local state after save

**UI Components**:
- Loading state
- Error state
- Empty state
- Table with inline editing
- Category/subcategory inputs
- Save/Cancel buttons

---

## FILES TO CREATE

1. `netlify/functions/transactions.ts` (GET endpoint)
2. `netlify/functions/teach-category.ts` (POST endpoint)
3. `src/pages/transactions.tsx` (Frontend page)
4. `reports/DAY11_PLAN.md` (this file)
5. `reports/DAY11_CHANGELOG.md`
6. `reports/DAY11_VALIDATION.md`
7. `reports/DAY11_RESULTS.md`

---

## ACCEPTANCE CRITERIA

- ✅ Transactions API returns user-scoped transactions with items
- ✅ Teach Category API saves corrections and awards XP
- ✅ Frontend displays transactions in a table
- ✅ Users can correct categories inline
- ✅ Corrections are saved to memory and XP is awarded
- ✅ UI shows success messages

---

## VALIDATION STEPS

1. Run `netlify dev`
2. Navigate to `/transactions`
3. Verify transactions load (if any exist)
4. Click "Correct Category" on a transaction
5. Update category/subcategory
6. Click Save
7. Verify success message shows XP awarded
8. Verify transaction updates in UI
9. Check database: `user_memory_facts` has new fact, `user_xp_ledger` has XP entry

---

## NEXT STEPS

1. ✅ Create backend endpoints
2. ✅ Create frontend page
3. ⚠️ Test locally
4. ⚠️ Verify memory and XP integration
5. ✅ Commit and push

