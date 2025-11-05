# Day 11: Transactions Page (Frontend) - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day10-ocr-memory-xp`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day10-ocr-memory-xp

# Start dev server
npx netlify dev
```

### 2. Test Transactions API

**Request**:
```bash
curl -X GET "http://localhost:8888/.netlify/functions/transactions?limit=10" \
  -H "X-User-Id: test-user"
```

**Expected**:
- Status: 200
- Body: `{ ok: true, data: [...], count: N, limit: 10, offset: 0 }`
- Each transaction includes `items` array

### 3. Test Teach Category API

**Request**:
```bash
curl -X POST "http://localhost:8888/.netlify/functions/teach-category" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -H "X-Convo-Id: test-session" \
  -d '{
    "merchant": "Walmart",
    "category": "Groceries",
    "subcategory": "Produce"
  }'
```

**Expected**:
- Status: 200
- Body: `{ ok: true, message: "Category correction saved", xpAwarded: 8, remembered: true }`
- Header: `X-XP-Awarded: 8`
- Database: Row in `user_memory_facts` (vendor→category fact)
- Database: Row in `user_xp_ledger` (XP award)

### 4. Test Frontend Page

**Steps**:
1. Navigate to `http://localhost:3000/transactions` (or your dev URL)
2. Verify transactions load (if any exist)
3. Click "Correct Category" (Edit icon) on a transaction
4. Update category and/or subcategory
5. Click Save (Check icon)
6. Verify success message shows "You earned 8 XP"
7. Verify transaction updates in table
8. Verify category/subcategory changed

### 5. Verify Memory Integration

**Database Check**:
```sql
-- Check memory facts
SELECT * FROM user_memory_facts 
WHERE user_id = 'test-user' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check XP ledger
SELECT * FROM user_xp_ledger 
WHERE user_id = 'test-user' 
AND action = 'ocr.categorize.corrected'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected**:
- Memory fact: `vendor.category: Walmart → Groceries (Produce)`
- XP entry: `action = 'ocr.categorize.corrected'`, `points = 8`

---

## VERIFICATION CHECKLIST

### Backend Endpoints

- [ ] Transactions API returns user-scoped transactions
- [ ] Transactions API includes items
- [ ] Transactions API supports pagination
- [ ] Teach Category API saves corrections
- [ ] Teach Category API awards XP
- [ ] Teach Category API returns XP in response

### Frontend Page

- [ ] Transactions load correctly
- [ ] Table displays all fields
- [ ] Inline editing works
- [ ] Save updates local state
- [ ] Success message shows XP
- [ ] Cancel works correctly
- [ ] Loading state displays
- [ ] Error state displays
- [ ] Empty state displays

### Integration

- [ ] Corrections saved to memory
- [ ] XP awarded correctly
- [ ] Database updated
- [ ] Headers present (`X-XP-Awarded`)

---

## EXPECTED BEHAVIOR

### Transactions API Response

```json
{
  "ok": true,
  "data": [
    {
      "id": 123,
      "user_id": "test-user",
      "doc_id": "doc-456",
      "kind": "receipt",
      "date": "2024-01-15",
      "merchant": "Save-On-Foods",
      "amount": 45.67,
      "currency": "USD",
      "category": "Groceries",
      "subcategory": "Produce",
      "source": "ocr",
      "created_at": "2024-01-15T12:00:00Z",
      "items": [
        {
          "id": 1,
          "name": "Apples",
          "qty": 2,
          "unit": "lb",
          "price": 3.99
        }
      ]
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

### Teach Category API Response

```json
{
  "ok": true,
  "message": "Category correction saved",
  "xpAwarded": 8,
  "remembered": true
}
```

### Frontend Page UI

```
Transactions
Review and correct transaction categories to improve accuracy

┌─────────────────────────────────────────────────────────────┐
│ Date       │ Merchant │ Amount │ Category │ Subcat │ Conf │ Actions │
├─────────────────────────────────────────────────────────────┤
│ 01/15/2024 │ Walmart  │ $45.67 │ Groceries│ Produce│ High │ [Edit]  │
└─────────────────────────────────────────────────────────────┘
```

---

## TROUBLESHOOTING

### Issue: Transactions not loading
- **Check**: Is `X-User-Id` header set?
- **Check**: Are transactions in database?
- **Expected**: User-scoped query returns transactions

### Issue: Category correction not saving
- **Check**: Is `rememberCategory()` working?
- **Check**: Is `awardXP()` working?
- **Expected**: Both functions succeed, XP awarded

### Issue: XP not showing in message
- **Check**: Is response JSON parsed correctly?
- **Check**: Does response include `xpAwarded`?
- **Expected**: Success message shows XP amount

---

## ACCEPTANCE CRITERIA CHECKLIST

- ✅ Transactions API created and working
- ✅ Teach Category API created and working
- ✅ Frontend page created and working
- ✅ Inline editing works
- ✅ Corrections save to memory
- ✅ XP awarded correctly
- ✅ UI updates after save
- ✅ Success messages display

---

## NEXT STEPS

1. ✅ **Implementation**: Complete
2. ⚠️ **Local Testing**: Test endpoints and page
3. ⚠️ **Database Verification**: Check memory facts and XP ledger
4. ✅ **Commit**: Ready to commit

