# Day 11: Transactions UI - Validation

**Date**: 2025-01-XX  
**Branch**: `feature/day11-ui-transactions`

---

## TESTING STEPS

### 1. Run Tests

```bash
pnpm test netlify/functions/_shared/__tests__/transactions_api.test.ts
pnpm test src/__tests__/transactions_ui.test.tsx
```

Expected: All tests pass

---

### 2. Start Dev Server

```bash
netlify dev
```

Wait for server to be ready on `http://localhost:8888`

---

### 3. Test Transactions API

```bash
# Get transactions (with userId header)
curl -sS -i http://localhost:8888/.netlify/functions/transactions \
  -H "X-User-Id: test-user" \
  | head -30

# Expected:
# - Status: 200
# - Headers: X-Guardrails, X-PII-Mask, X-Employee, etc.
# - Body: { ok: true, data: [...], count: N }
```

---

### 4. Test Teach Category API

```bash
# Teach a category
curl -sS -i http://localhost:8888/.netlify/functions/teach-category \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{
    "merchant": "Save-On-Foods",
    "category": "Groceries",
    "subcategory": "Produce"
  }' | head -30

# Expected:
# - Status: 200
# - Headers: X-XP-Awarded: 8 (if Day 10 merged)
# - Body: { ok: true, remembered: true, xpAwarded: 8 }
```

---

### 5. Test Frontend

1. Navigate to `/transactions` page
2. Verify table displays transactions (if any exist)
3. Click "Correct" button on a transaction
4. Verify modal opens with merchant name
5. Enter category and subcategory
6. Click "Save"
7. Verify:
   - Modal closes
   - Toast appears with XP award
   - Transaction updates optimistically
   - Category changes in table

---

## EXPECTED HEADERS

### Transactions API (GET)

- `X-Guardrails: active`
- `X-PII-Mask: enabled`
- `X-Employee: byte`
- `X-Route-Confidence: 0.5`

### Teach Category API (POST)

- `X-Guardrails: active`
- `X-PII-Mask: enabled`
- `X-Employee: tag`
- `X-Route-Confidence: 0.8`
- `X-XP-Awarded: 8` (if Day 10 merged)

---

## VALIDATION CHECKLIST

- [ ] `pnpm test` passes
- [ ] Transactions API returns 200 with data
- [ ] Teach Category API returns 200 with XP awarded
- [ ] Frontend page loads and displays transactions
- [ ] Correction modal opens/closes correctly
- [ ] Save updates transaction and shows XP toast
- [ ] Optimistic updates work
- [ ] Error handling works (try invalid userId)

---

## NOTES

- Without Supabase env vars: API returns empty array (no error)
- Without Day 10 merged: teach-category uses stubs (no crash)
- UserId currently hardcoded as 'test-user' (TODO: integrate auth)
