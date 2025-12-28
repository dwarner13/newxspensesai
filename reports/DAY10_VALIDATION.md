# Day 10 OCR ↔ Memory ↔ XP - Validation Guide

**Date**: 2025-01-XX  
**Branch**: `feature/day10-ocr-memory-xp`

---

## LOCAL TESTING STEPS

### 1. Setup

```bash
# Checkout branch
git checkout feature/day10-ocr-memory-xp

# Install dependencies (if needed)
npm install

# Run SQL migration in Supabase SQL editor
# See: netlify/functions/_shared/sql/day10_memory_xp.sql

# Start dev server
npx netlify dev
```

### 2. Run Tests

```bash
# Run all tests
npm run test:unit

# Run memory tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_memory.test.ts

# Run XP tests only
npm run test:unit netlify/functions/_shared/__tests__/xp.test.ts

# Run integration tests only
npm run test:unit netlify/functions/_shared/__tests__/ocr_integration_memory.test.ts
```

**Expected**: All tests pass

### 3. Manual Test Flow

#### Test 1: OCR with Vendor Matching

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
- Headers: `X-Vendor-Matched: yes|no`, `X-XP-Awarded: > 0`
- Database: Row in `vendor_aliases` (if vendor matched)
- Database: Row in `user_memory_facts` (vendor→category fact)
- Database: Row in `user_xp_ledger` (XP award)

#### Test 2: Vendor Alias Reinforcement

**Request**: Upload 2 receipts for "Save-On-Foods" and "Save On Foods"

**Expected**:
- First receipt: `X-Vendor-Matched: no` (new vendor)
- Second receipt: `X-Vendor-Matched: yes` (matched to alias)
- Database: `vendor_aliases` has entry with confidence > 0.5

#### Test 3: Chat Category Correction

**Message**: "No, vendor Save-On-Foods should be Groceries → Produce"

**Request**:
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "sessionId": "test-session",
    "message": "No, vendor Save-On-Foods should be Groceries → Produce",
    "employeeSlug": "tag-categorizer"
  }'
```

**Expected**:
- Response includes confirmation
- Database: Row in `user_memory_facts` (corrected category)
- Database: Row in `user_xp_ledger` with action `ocr.categorize.corrected` (+8 XP)

#### Test 4: XP Totals

**Request**: Check XP ledger

**Expected**:
- Total XP > 0 (sum of all awards)
- XP by action: `ocr.scan.success` = 5 per scan
- XP by action: `ocr.categorize.auto` = 2 per auto-categorization
- XP by action: `ocr.categorize.corrected` = 8 per correction

---

## VERIFICATION CHECKLIST

### OCR Integration

- [ ] Vendor matching works (exact → alias → none)
- [ ] Vendor reinforcement updates confidence
- [ ] Category facts stored in memory
- [ ] XP awarded for scans and categorizations
- [ ] Headers include `X-Vendor-Matched` and `X-XP-Awarded`

### Memory Integration

- [ ] Vendor→category facts stored in `user_memory_facts`
- [ ] Embeddings created for vendor→category facts
- [ ] PII masked before storage
- [ ] Facts deduplicated correctly

### XP Engine

- [ ] XP awarded for `ocr.scan.success` (+5)
- [ ] XP awarded for `ocr.categorize.auto` (+2)
- [ ] XP awarded for `ocr.categorize.corrected` (+8)
- [ ] XP awards idempotent (no duplicates)
- [ ] XP totals calculated correctly

### Chat Corrections

- [ ] Correction pattern detected correctly
- [ ] Category correction stored in memory
- [ ] Correction XP awarded
- [ ] Response includes confirmation

---

## EXPECTED BEHAVIOR

### OCR Response (with memory + XP)

```json
{
  "ok": true,
  "source": "upload",
  "mime": "image/png",
  "bytes": 12345,
  "text": "Store: Save-On-Foods\nDate: 01/15/2024\nTotal: $45.67",
  "parsed": {
    "kind": "receipt",
    "data": {
      "merchant": "Save-On-Foods",
      "date": "01/15/2024",
      "total": 45.67
    }
  },
  "meta": {
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
X-Vendor-Matched: yes
X-XP-Awarded: 7
Content-Type: application/json
```

### Database Rows

**vendor_aliases**:
```
id | user_id | merchant | alias | confidence | updated_at
1  | test-user | save on foods | save-on-foods | 0.5 | 2024-01-15T12:00:00Z
```

**user_memory_facts**:
```
id | user_id | fact | created_at
1  | test-user | vendor.category: Save-On-Foods → Groceries | 2024-01-15T12:00:00Z
```

**user_xp_ledger**:
```
id | user_id | action | points | meta | created_at
1  | test-user | ocr.scan.success | 5 | {"transaction_id": 123, "merchant": "Save-On-Foods"} | 2024-01-15T12:00:00Z
2  | test-user | ocr.categorize.auto | 2 | {"merchant": "Save-On-Foods", "category": "Groceries"} | 2024-01-15T12:00:00Z
```

### Chat Correction Response

```
Message: "No, vendor Save-On-Foods should be Groceries → Produce"

Response: "Got it! I've updated the category for Save-On-Foods to Groceries → Produce. You earned 8 XP for the correction!"
```

---

## TROUBLESHOOTING

### Issue: Vendor not matching
- **Check**: Are vendor aliases created? (Check `vendor_aliases` table)
- **Check**: Is merchant name normalized? (lowercase, trimmed)
- **Expected**: First scan creates alias, second scan matches

### Issue: XP not awarded
- **Check**: Is XP ledger table created? (Check `user_xp_ledger` table)
- **Check**: Are XP awards idempotent? (Check meta hash)
- **Expected**: Each unique action awards XP once

### Issue: Category correction not detected
- **Check**: Is correction pattern correct? (Regex: `/(?:no|wrong|incorrect|change|update|correct).*?(?:vendor|merchant|store).../`)
- **Check**: Is employee Byte or Tag? (Correction only works for these employees)
- **Expected**: Pattern matches common correction phrases

### Issue: Memory facts not stored
- **Check**: Is memory API working? (Check `user_memory_facts` table)
- **Check**: Is PII masking applied? (Facts should be masked)
- **Expected**: Vendor→category facts stored with masked PII

---

## ACCEPTANCE CRITERIA CHECKLIST

- [x] OCR saves transactions and matches/normalizes vendor names
- [x] Memory facts stored for vendor→category; embeddings updated
- [x] XP ledger records scan/categorization wins and corrections
- [x] Headers reflect vendor match + total XP awarded
- [x] Tests created
- [ ] Manual test: Vendor matching (requires dev server + database)
- [ ] Manual test: XP awards (requires dev server + database)
- [ ] Manual test: Chat corrections (requires dev server)

---

## NEXT STEPS

1. ✅ **Implementation**: Complete
2. ⚠️ **SQL Migration**: Run in Supabase SQL editor
3. ⚠️ **Local Testing**: Run tests per this guide
4. ⚠️ **Manual Testing**: Test OCR endpoint and chat corrections
5. ⚠️ **Database Verification**: Check vendor_aliases, memory_facts, xp_ledger rows
6. ✅ **Commit**: Ready to commit

