# Day 10 OCR ↔ Memory ↔ XP - Plan

**Date**: 2025-01-XX  
**Branch**: `feature/day10-ocr-memory-xp`  
**Base**: `feature/day9-ocr-normalize-categorize`

---

## OBJECTIVE

Link OCR → Memory → Engagement:
- Match transactions to prior facts (vendor aliases, usual category, tax flags)
- Save new/reinforced facts (vendor→category, merchant aliases)
- Award XP for good scans & corrections

---

## IMPLEMENTATION PLAN

### 1. Storage Schema (`netlify/functions/_shared/sql/day10_memory_xp.sql`)

**Tables**:
- `vendor_aliases`: id, user_id, merchant, alias, confidence, updated_at
- `user_xp_ledger`: id, user_id, action, points, meta, created_at

**Indexes**:
- `(user_id, merchant)` for vendor lookups
- `(user_id, created_at DESC)` for XP history
- `(user_id, action)` for action filtering

### 2. OCR Memory Module (`netlify/functions/_shared/ocr_memory.ts`)

**Functions**:
- `matchVendor({ userId, merchant })`: Match merchant to canonical name
  - Strategy: Exact match → alias table → embedding fallback
  - Returns: `{ canonical, confidence, source }`
- `reinforceVendor({ userId, merchant, canonical })`: Update vendor alias confidence
- `rememberCategory({ userId, merchant, category, subcategory })`: Store vendor→category fact in memory

### 3. XP Engine (`netlify/functions/_shared/xp.ts`)

**Functions**:
- `awardXP({ userId, action, points, meta })`: Insert XP entry (idempotent via meta hash)
- `getTotalXP(userId)`: Get total XP for user
- `getXPByAction(userId, action)`: Get XP by action type

**Default Awards**:
- `ocr.scan.success`: +5
- `ocr.categorize.auto`: +2
- `ocr.categorize.corrected`: +8
- `memory.teach.vendor_category`: +6

### 4. Wire into OCR Flow (`netlify/functions/ocr.ts`)

**After transactions are saved**:
- Match vendor to canonical name
- If matched, reinforce vendor alias
- Remember vendor→category fact
- Award XP: `ocr.scan.success` (+ conditional `ocr.categorize.auto`)

**Headers**:
- `X-Vendor-Matched`: yes|no
- `X-XP-Awarded`: <sum>

### 5. Chat Correction Path (`netlify/functions/chat.ts`)

**For Byte/Tag employees**:
- Detect correction pattern: "No, vendor X should be Category → Subcategory"
- Parse correction → call `rememberCategory()`
- Award `ocr.categorize.corrected` XP
- Respond with confirmation + updated confidence

### 6. Tests

**Files**:
- `ocr_memory.test.ts`: Exact/alias/embedding vendor match + reinforce
- `xp.test.ts`: Ledger insert + sum by action
- `ocr_integration_memory.test.ts`: Receipt → normalize → store → match → remember → XP headers

### 7. Reports

- `reports/DAY10_PLAN.md` (this file)
- `reports/DAY10_CHANGELOG.md`
- `reports/DAY10_VALIDATION.md`
- `reports/DAY10_RESULTS.md`

---

## CONSTRAINTS

- ✅ Idempotent & safe to re-run
- ✅ XP awards idempotent via meta hash
- ✅ Vendor matching non-blocking
- ✅ Memory facts use canonical memory API

---

## ACCEPTANCE CRITERIA

- ✅ OCR saves transactions and matches/normalizes vendor names
- ✅ Memory facts stored for vendor→category; embeddings updated
- ✅ XP ledger records scan/categorization wins and corrections
- ✅ Headers reflect vendor match + total XP awarded
- ✅ Tests pass
- ✅ Reports updated

---

## VALIDATION STEPS

1. Run tests: `npm run test:unit`
2. Start dev: `npx netlify dev`
3. Test OCR endpoint:
   - Upload 2 receipts for "Save-On-Foods" and "Save On Foods"
   - Expect headers: `X-Vendor-Matched: yes`, `X-XP-Awarded: > 0`
4. Test chat correction:
   - Send: "No, vendor Save-On-Foods should be Groceries → Produce"
   - See `ocr.categorize.corrected` XP row
5. Verify database:
   - `vendor_aliases` updated
   - `user_memory_facts` saved
   - `memory_embeddings` upserted
   - `user_xp_ledger` records XP awards

---

## FILES TO CREATE/MODIFY

**Create**:
- `netlify/functions/_shared/sql/day10_memory_xp.sql`
- `netlify/functions/_shared/ocr_memory.ts`
- `netlify/functions/_shared/xp.ts`
- `netlify/functions/_shared/__tests__/ocr_memory.test.ts`
- `netlify/functions/_shared/__tests__/xp.test.ts`
- `netlify/functions/_shared/__tests__/ocr_integration_memory.test.ts`
- `reports/DAY10_PLAN.md`
- `reports/DAY10_CHANGELOG.md`
- `reports/DAY10_VALIDATION.md`
- `reports/DAY10_RESULTS.md`

**Modify**:
- `netlify/functions/ocr.ts` (wire memory matching + XP)
- `netlify/functions/chat.ts` (add correction path)

---

## NEXT STEPS

1. ✅ Create storage schema
2. ✅ Create OCR memory module
3. ✅ Create XP engine
4. ✅ Wire into OCR handler
5. ✅ Add chat correction path
6. ✅ Add tests
7. ⚠️ Create reports
8. ⚠️ Test locally
9. ⚠️ Commit and push
