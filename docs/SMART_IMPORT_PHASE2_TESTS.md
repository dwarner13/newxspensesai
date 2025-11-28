> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](../XSPENSESAI_SYSTEM.md).**

# Smart Import Phase 2 – Testing Plan

**Status:** ✅ Implementation Complete  
**Date:** 2025-02-03  
**Purpose:** Test commit-import functionality end-to-end

---

## Overview

Smart Import Phase 2 completes the import flow by committing staged transactions from `transactions_staging` into the main `transactions` table. This document provides a comprehensive testing plan to verify the implementation.

---

## Prerequisites

1. **Services Running:**
   ```bash
   # Terminal 1: Netlify dev
   cd C:\Users\admin\Desktop\project-bolt-fixed
   netlify dev

   # Terminal 2: Worker
   cd C:\Users\admin\Desktop\project-bolt-fixed\worker
   npm run dev
   ```

2. **Database Migrations Applied:**
   ```sql
   -- Run in Supabase SQL Editor:
   -- 1. 20250203_smart_import_phase1_schema.sql (imports, transactions_staging tables)
   -- 2. 20250203_add_committed_fields_to_imports.sql (committed_at, committed_count columns)
   ```

3. **Test Data:**
   - A real bank statement PDF (BMO Everyday Banking, Capital One, etc.)
   - Or use a sample PDF with transaction data

---

## Test 1: Happy Path – BMO PDF Upload & Commit

### Step 1: Upload PDF via Byte Chat

1. **Open Byte Chat:**
   - Navigate to: `http://localhost:8888/dashboard/chat/byte`
   - Or open Smart Import AI page and click Byte tab

2. **Upload Test PDF:**
   - Drag-and-drop or click the + button → Upload Documents
   - Select your BMO statement PDF

3. **Watch Worker Processing:**
   - Worker logs should show:
     ```
     [processDocument] Step 10: Preparing Smart Import persistence
     [SmartImportSupabase] Starting persist
     [SmartImportSupabase] user_documents insert OK { id: '...', storage_path: '...' }
     [SmartImportSupabase] imports insert OK { id: '...', document_id: '...' }
     [SmartImportSupabase] staging upsert OK { rowsInserted: N, import_id: '...' }
     [processDocument] Smart Import persistence completed successfully: { importId: '...' }
     ```

4. **Verify UI Shows Transactions:**
   - Byte chat should display: "📊 Found N transactions:"
   - Transaction list should show date, description, amount, category
   - **Import All** button should be visible and enabled (green)

### Step 2: Verify Phase 1 Persistence (Supabase SQL)

Run these queries in Supabase SQL Editor:

```sql
-- Check 1: user_documents has OCR text
SELECT 
  id, 
  user_id, 
  storage_path,
  ocr_text IS NOT NULL AS has_ocr_text,
  LENGTH(ocr_text) AS ocr_text_length,
  ocr_completed_at,
  pii_types,
  source
FROM public.user_documents
ORDER BY created_at DESC
LIMIT 5;

-- Expected: At least one row with:
--   has_ocr_text = true
--   ocr_completed_at IS NOT NULL
--   ocr_text_length > 0
```

```sql
-- Check 2: imports table has rows with status='parsed'
SELECT 
  i.id AS import_id, 
  i.user_id, 
  i.document_id, 
  i.status, 
  i.file_type,
  i.created_at,
  i.committed_at,
  i.committed_count,
  ud.storage_path,
  ud.ocr_text IS NOT NULL AS doc_has_ocr
FROM public.imports i
LEFT JOIN public.user_documents ud ON ud.id = i.document_id
ORDER BY i.created_at DESC
LIMIT 5;

-- Expected: Rows with:
--   status = 'parsed' (before commit)
--   document_id IS NOT NULL
--   doc_has_ocr = true
--   committed_at IS NULL (before commit)
--   committed_count IS NULL or 0 (before commit)
```

```sql
-- Check 3: transactions_staging has data_json rows
SELECT 
  import_id, 
  user_id,
  hash,
  data_json->>'merchant' AS merchant,
  data_json->>'amount' AS amount,
  data_json->>'date' AS date,
  data_json->>'category' AS category,
  parsed_at
FROM public.transactions_staging
ORDER BY parsed_at DESC
LIMIT 10;

-- Expected: Rows with:
--   data_json containing merchant, amount, date, category fields
--   import_id matching an imports.id
```

### Step 3: Click Import All Button

1. **In Byte Chat UI:**
   - Find the message showing "📊 Found N transactions:"
   - Click the **✅ Import All** button (green button)

2. **Expected Behavior:**
   - Button shows loading state: "⏳ Importing..." with spinner
   - Success toast appears: "Imported N transactions into your XspensesAI Transactions."
   - After 1.5 seconds, navigates to `/dashboard/transactions`
   - Button becomes disabled (gray) if clicked again

3. **Backend Logs Should Show:**
   ```
   [CommitImport] Reading staged transactions for import: <importId>
   [CommitImport] Found N staging rows
   [CommitImport] Inserting N transactions into transactions table
   [CommitImport] Successfully committed N transactions
   ```

### Step 4: Verify Commit Success (Supabase SQL)

```sql
-- Check 1: imports.status changed to 'committed'
SELECT 
  id AS import_id,
  user_id,
  status,
  committed_at,
  committed_count,
  updated_at,
  created_at
FROM public.imports
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Latest import has:
--   status = 'committed'
--   committed_at IS NOT NULL (timestamp when committed)
--   committed_count = N (number of transactions committed)
--   updated_at > created_at
```

```sql
-- Check 2: transactions table has new rows
SELECT 
  id,
  user_id,
  import_id,
  document_id,
  date,
  merchant,
  description,
  amount,
  type,
  category,
  category_source,
  source_type,
  created_at
FROM public.transactions
WHERE import_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Rows with:
--   import_id matching the committed import
--   document_id matching user_documents.id
--   category populated (from Tag learning or staging)
--   source_type = 'smart_import'
--   category_source = 'learned' or 'ai' (if categorized)
```

```sql
-- Check 3: Verify transaction count matches
SELECT 
  i.id AS import_id,
  i.committed_count AS import_committed_count,
  COUNT(t.id) AS actual_transaction_count
FROM public.imports i
LEFT JOIN public.transactions t ON t.import_id = i.id
WHERE i.status = 'committed'
GROUP BY i.id, i.committed_count
ORDER BY i.created_at DESC
LIMIT 5;

-- Expected: import_committed_count = actual_transaction_count
```

```sql
-- Check 4: transactions_staging rows still exist (history preserved)
SELECT 
  COUNT(*) AS staging_count,
  import_id
FROM public.transactions_staging
GROUP BY import_id
ORDER BY import_id DESC
LIMIT 5;

-- Expected: Staging rows remain for audit trail
```

### Step 5: Verify Transactions Page

1. **Navigate to Transactions Page:**
   - Should auto-navigate after Import All (or manually go to `/dashboard/transactions`)

2. **Check Transaction List:**
   - New transactions should appear at the top
   - Date, merchant, amount, category should match the PDF
   - Source should indicate "Smart Import" or similar

3. **Check Transaction Details:**
   - Click a transaction
   - Verify `import_id` is populated (if shown in detail panel)
   - Verify `document_id` links to the uploaded PDF (if shown)
   - Verify category was assigned (from Tag learning or staging)

---

## Test 2: Double-Click Protection

### Scenario: User clicks Import All twice

1. **Setup:** Upload PDF and wait for "Found N transactions" message

2. **Action 1:** Click Import All (first time)
   - Expected: Success toast, transactions committed, navigates to Transactions page

3. **Action 2:** Navigate back to Byte chat, click Import All again (same importId)
   - Expected: 
     - Backend returns `409 Conflict` with `error: 'already_committed'`
     - Frontend shows toast: "These transactions have already been imported."
     - No duplicate transactions inserted

4. **Verify in Supabase:**
   ```sql
   -- Check import status
   SELECT status, committed_at, committed_count 
   FROM public.imports 
   WHERE id = '<importId>';
   
   -- Expected: status = 'committed', committed_at IS NOT NULL
   
   -- Check for duplicate transactions
   SELECT COUNT(*) 
   FROM public.transactions 
   WHERE import_id = '<importId>';
   
   -- Expected: Count matches committed_count (no duplicates)
   ```

---

## Test 3: Security – Cross-User Protection

### Scenario: User A tries to import User B's staging data

1. **Setup:**
   - User A uploads PDF → gets `importId_A`
   - User B uploads PDF → gets `importId_B`

2. **Attack Attempt:**
   - User A tries to call commit-import with `importId_B` but `x-user-id` header = User A's ID
   
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/commit-import \
     -H "Content-Type: application/json" \
     -H "x-user-id: <userA_id>" \
     -d '{"importId": "<importId_B>"}'
   ```

3. **Expected Result:**
   - Backend returns `404 Not Found` with `error: 'no_import_found'`
   - Message: "Import not found for this user"
   - No transactions inserted for User B's import

4. **Verify:**
   ```sql
   -- User B's import should still be 'parsed' (not committed)
   SELECT status FROM public.imports WHERE id = '<importId_B>';
   -- Expected: status = 'parsed'
   
   -- No transactions should exist for User A with User B's import_id
   SELECT COUNT(*) FROM public.transactions 
   WHERE user_id = '<userA_id>' AND import_id = '<importId_B>';
   -- Expected: 0
   ```

---

## Test 4: Error Cases

### Test 4.1: Missing Import ID

1. **Action:** Call commit-import without `importId` in body
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/commit-import \
     -H "Content-Type: application/json" \
     -H "x-user-id: <userId>" \
     -d '{}'
   ```

2. **Expected:** `400 Bad Request` with `error: 'Missing importId in request body'`

---

### Test 4.2: Missing User ID Header

1. **Action:** Call commit-import without `x-user-id` header
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/commit-import \
     -H "Content-Type: application/json" \
     -d '{"importId": "<importId>"}'
   ```

2. **Expected:** `403 Forbidden` with `error: 'Unauthorized: Missing x-user-id header'`

---

### Test 4.3: No Transactions in Staging

1. **Setup:** Manually delete staging rows for an import:
   ```sql
   DELETE FROM public.transactions_staging WHERE import_id = '<importId>';
   ```

2. **Action:** Click Import All for that import

3. **Expected:** 
   - Backend returns `200 OK` with `error: 'no_transactions_in_staging'`
   - Frontend shows toast: "No transactions found to import."
   - Import status remains 'parsed' (not changed to 'committed')

---

### Test 4.4: Import Not Found

1. **Action:** Call commit-import with invalid `importId` (UUID that doesn't exist)
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/commit-import \
     -H "Content-Type: application/json" \
     -H "x-user-id: <userId>" \
     -d '{"importId": "00000000-0000-0000-0000-000000000000"}'
   ```

2. **Expected:** `404 Not Found` with `error: 'no_import_found'`

---

## Test 5: Transactions Page Refresh

### Scenario: Import transactions and verify page refreshes

1. **Setup:** 
   - Open Transactions page in one tab
   - Open Byte chat in another tab (or same tab)

2. **Action:** Upload PDF and click Import All

3. **Expected:**
   - If Transactions page is open: Should automatically refresh and show new transactions
   - If navigating to Transactions page: Should show new transactions immediately
   - Console should show: `[DashboardTransactionsPage] Transactions imported, refreshing transactions list...`

4. **Verify:**
   - New transactions appear at the top of the list
   - Transaction count increases
   - Totals (income/expenses) update correctly

---

## SQL Verification Queries (Complete Checklist)

Run these after a successful import to verify end-to-end:

```sql
-- ============================================================================
-- COMPLETE VERIFICATION QUERY
-- Run this after uploading and committing a PDF
-- ============================================================================

WITH latest_import AS (
  SELECT id, user_id, document_id, status, committed_at, committed_count, created_at, updated_at
  FROM public.imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  -- Import status
  li.status AS import_status,
  li.committed_at IS NOT NULL AS is_committed,
  li.committed_count,
  li.created_at AS import_created,
  li.updated_at AS import_updated,
  
  -- Document info
  ud.ocr_text IS NOT NULL AS doc_has_ocr,
  LENGTH(ud.ocr_text) AS doc_ocr_length,
  ud.ocr_completed_at AS doc_ocr_completed,
  
  -- Staging count (history preserved)
  (SELECT COUNT(*) FROM public.transactions_staging WHERE import_id = li.id) AS staging_count,
  
  -- Committed transactions count
  (SELECT COUNT(*) FROM public.transactions WHERE import_id = li.id) AS committed_count_actual,
  
  -- Sample transaction
  (SELECT jsonb_build_object(
    'merchant', merchant,
    'amount', amount,
    'date', date,
    'category', category,
    'source_type', source_type,
    'import_id', import_id
  ) FROM public.transactions WHERE import_id = li.id LIMIT 1) AS sample_transaction

FROM latest_import li
LEFT JOIN public.user_documents ud ON ud.id = li.document_id;
```

**Expected Results:**
- `import_status` = `'committed'`
- `is_committed` = `true`
- `committed_count` = `committed_count_actual` (matches)
- `doc_has_ocr` = `true`
- `doc_ocr_length` > 0
- `staging_count` > 0 (history preserved)
- `committed_count_actual` > 0 (transactions inserted)
- `sample_transaction` shows valid merchant, amount, date, category, `source_type = 'smart_import'`

---

## Frontend UI Checklist

- [ ] **Import All button appears** when transactions are found
- [ ] **Button is enabled** (green) when `importId` is available
- [ ] **Button is disabled** (gray) when `importId` is missing
- [ ] **Loading state** shows spinner and "Importing..." text
- [ ] **Success toast** appears with correct transaction count
- [ ] **Navigation** redirects to `/dashboard/transactions` after 1.5s
- [ ] **Error toast** shows user-friendly message on failure
- [ ] **Console logs** show `[ImportAllButton]` debug info
- [ ] **Transactions page refreshes** automatically after import (via `transactionsImported` event)

---

## Backend Function Checklist

- [ ] **commit-import endpoint** accepts `{ importId }` in body (not userId)
- [ ] **Gets userId from x-user-id header** (secure auth)
- [ ] **Validates import exists** and belongs to user
- [ ] **Checks import status** is 'parsed' (not already committed)
- [ ] **Reads staging rows** from `transactions_staging WHERE import_id = :importId AND user_id = :userId`
- [ ] **Maps data_json** to transactions table format correctly
- [ ] **Categorizes transactions** using Tag learning if needed
- [ ] **Inserts into transactions** table with correct fields
- [ ] **Updates import status** to 'committed' with `committed_at` and `committed_count`
- [ ] **Returns success** with `success: true, importId, insertedCount, transactions[]`
- [ ] **Error handling** returns specific error codes:
  - `no_import_found` (404)
  - `no_transactions_in_staging` (200)
  - `already_committed` (409)
  - `db_error` (500)
  - `internal_error` (500)

---

## Common Issues & Debugging

### Issue: Import All button is disabled

**Cause:** `importId` not available in chat message  
**Debug:**
1. Check browser console for `[ByteDocumentChat]` logs
2. Verify worker result includes `importId`:
   ```javascript
   console.log('Worker result:', result);
   console.log('importId:', result.importId);
   ```
3. Check worker logs for persistence success

**Fix:** Ensure `persistSmartImportResults()` succeeds and returns `importId`

---

### Issue: Commit fails with "no_transactions_in_staging"

**Cause:** Staging rows not created or deleted  
**Debug:**
```sql
SELECT COUNT(*) FROM public.transactions_staging WHERE import_id = '<import_id>';
```

**Fix:** Re-upload the document or check worker persistence logs

---

### Issue: Transactions inserted but import status not updated

**Cause:** Update query failed silently  
**Debug:** Check Netlify function logs for `[CommitImport] Error updating import status`

**Fix:** Verify RLS policies allow service role to update `imports` table

---

### Issue: Duplicate transactions inserted

**Cause:** Unique constraint not working or double-click before status update  
**Debug:** Check `transactions` table unique constraint

**Fix:** Verify unique constraint on `transactions` table matches expected fields

---

### Issue: 403 Forbidden error

**Cause:** Missing `x-user-id` header  
**Debug:** Check browser Network tab → Headers → `x-user-id` header present

**Fix:** Ensure frontend sends `x-user-id` header in fetch request

---

## Success Criteria

✅ **Phase 2 is complete when:**

1. Upload PDF → Worker persists to `user_documents`, `imports`, `transactions_staging` ✅
2. Byte chat shows "Found N transactions" with Import All button ✅
3. Click Import All → Transactions inserted into `transactions` table ✅
4. Import status updated to 'committed' with `committed_at` and `committed_count` ✅
5. User redirected to Transactions page ✅
6. Transactions visible on Transactions page with correct data ✅
7. Double-click protection works (409 Conflict for already committed) ✅
8. Security: Cross-user access prevented (404 for other user's imports) ✅
9. All error cases handled gracefully with user-friendly messages ✅
10. Transactions page refreshes automatically after import ✅

---

## Running the Tests

1. **Start Services:**
   ```bash
   # Terminal 1
   netlify dev

   # Terminal 2
   cd worker && npm run dev
   ```

2. **Run Test 1 (Happy Path):**
   - Upload PDF → Click Import All → Verify SQL → Check Transactions page

3. **Run Test 2 (Double-Click):**
   - Click Import All twice → Verify 409 error → Check no duplicates

4. **Run Test 3 (Security):**
   - Use curl with wrong user ID → Verify 404 error

5. **Run Test 4 (Error Cases):**
   - Test each error scenario → Verify correct error codes

6. **Run Test 5 (Refresh):**
   - Open Transactions page → Import → Verify auto-refresh

---

## Next Steps (Future Enhancements)

- [ ] Add "Edit before import" functionality
- [ ] Show import progress indicator with transaction-by-transaction updates
- [ ] Allow partial imports (select specific transactions)
- [ ] Add import history page showing all imports with status
- [ ] Show import source badge on Transactions page ("Imported from BMO Statement")
- [ ] Add rollback functionality for committed imports
- [ ] Add import analytics (success rate, average transactions per import, etc.)


