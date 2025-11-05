# Day 11: Transactions UI - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day11-ui-transactions`  
**Base**: `feature/day10-ocr-memory-xp`

---

## OBJECTIVE

Create a transactions management UI with API endpoints for listing transactions and teaching/correcting categories.

---

## IMPLEMENTATION PLAN

### 1. Server Endpoints

#### 1.1 Transactions API (`netlify/functions/transactions.ts`)

**GET `/transactions`**:
- Auth-scoped by userId (X-User-Id header or query param)
- Query: `transactions` join `transaction_items`
- Order by `date DESC`
- Limit 200
- Optional category filter
- Returns: `{ ok: true, data: Transaction[], count: number }`

**Response Format**:
```typescript
{
  id: number;
  userId: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string;
  source: string;
  createdAt: string;
  itemsCount: number;
  items: TransactionItem[];
  confidence?: number;
}
```

#### 1.2 Teach Category API (`netlify/functions/teach-category.ts`)

**POST `/teach-category`**:
- Body: `{ transactionId?, merchant, category, subcategory }`
- Calls `rememberCategory()` (Day 10)
- Calls `awardXP('ocr.categorize.corrected', +8)` (Day 10)
- If `transactionId` provided, updates `transactions` row
- Returns: `{ ok: true, remembered: true, xpAwarded: number, transactionUpdated: boolean }`

---

### 2. Frontend Page (`src/pages/transactions.tsx`)

**Features**:
- Table displaying:
  - Date (formatted)
  - Merchant
  - Amount + Currency
  - Category / Subcategory
  - Confidence (%)
  - Actions column
- "Correct" button → opens modal
- Modal form:
  - Merchant (read-only)
  - Category input (required)
  - Subcategory input (optional)
  - Save / Cancel buttons
- Optimistic update on save
- Toast notification with XP award
- Loading states
- Error handling

**API Integration**:
- `GET /.netlify/functions/transactions` on mount
- `POST /.netlify/functions/teach-category` on save

---

### 3. Tests

#### 3.1 API Tests (`netlify/functions/_shared/__tests__/transactions_api.test.ts`)

- Extract userId from headers
- Extract userId from query params
- Return 401 if userId missing
- Limit results to 200
- Filter by category
- Transform response format

#### 3.2 UI Tests (`src/__tests__/transactions_ui.test.tsx`)

- Render loading state
- Fetch and display transactions
- Open correction modal on button click
- Save correction and show XP toast
- Optimistic update

---

## ACCEPTANCE CRITERIA

- [ ] `GET /transactions` returns recent transactions with items count
- [ ] `POST /teach-category` updates memory and awards XP
- [ ] Transactions page displays table with all columns
- [ ] Correction modal opens/closes correctly
- [ ] Optimistic updates work
- [ ] XP toast appears on save
- [ ] Tests pass

---

## FILES CREATED

1. `netlify/functions/transactions.ts` - GET endpoint
2. `netlify/functions/teach-category.ts` - POST endpoint
3. `src/pages/transactions.tsx` - Frontend page
4. `netlify/functions/_shared/__tests__/transactions_api.test.ts` - API tests
5. `src/__tests__/transactions_ui.test.tsx` - UI tests

---

## DEPENDENCIES

- Day 10 functions: `rememberCategory()`, `awardXP()` (may use stubs if not merged)
- Supabase: `transactions` and `transaction_items` tables
- Frontend: React, react-hot-toast, date-fns

---

## NOTES

- Uses `X-User-Id` header for auth (matches existing pattern)
- Falls back to query param `userId` for flexibility
- `teach-category` gracefully handles missing Day 10 modules (stubs)
- Transaction update is non-blocking (memory/XP more important)
