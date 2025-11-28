> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](../XSPENSESAI_SYSTEM.md).**

# Smart Import Phase 2 – Testing Guide

**Status:** ✅ Implementation Complete  
**Date:** 2025-02-03  
**Purpose:** Test commit-import functionality and Import All button

---

## Overview

Smart Import Phase 2 completes the import flow by allowing users to commit staged transactions into the main `transactions` table. This guide covers end-to-end testing from upload to commit.

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
   - `20250203_smart_import_phase1_schema.sql` (imports, transactions_staging tables)
   - Ensure `transactions` table has `import_id` column (or add it if missing)

3. **Environment Variables:**
   - Worker: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Frontend: User authenticated (or demo mode)

---

## Test Flow 1: Upload → Parse → Commit

### Step 1: Upload a PDF via Byte Chat

1. **Open Byte Chat:**
   - Navigate to: `http://localhost:8888/dashboard/chat/byte`
   - Or open Smart Import AI page and click Byte tab

2. **Upload a Test PDF:**
   - Use a real bank statement PDF (BMO Everyday Banking, Capital One, etc.)
   - Drag-and-drop or click the + button → Upload Documents
   - Select your PDF file

3. **Watch Worker Processing:**
   - Worker logs should show:
     ```
     [processDocument] Step 10: Preparing Smart Import persistence
     [SmartImportSupabase] Starting persist
     [SmartImportSupabase] Step 1: Upserting user_documents
     [SmartImportSupabase] user_documents insert OK { id: '...', storage_path: '...' }
     [SmartImportSupabase] Step 2: Upserting imports
     [SmartImportSupabase] imports insert OK { id: '...', document_id: '...' }
     [SmartImportSupabase] Step 3: Upserting transactions_staging
     [SmartImportSupabase] staging upsert OK { rowsInserted: N, import_id: '...' }
     [processDocument] Smart Import persistence completed successfully: { importId: '...' }
     ```

4. **Verify UI Shows Transactions:**
   - Byte chat should display: "📊 Found N transactions:"
   - Transaction list should show date, description, amount, category
   - **Import All** button should be visible and enabled (green)

---

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
  ud.storage_path,
  ud.ocr_text IS NOT NULL AS doc_has_ocr
FROM public.imports i
LEFT JOIN public.user_documents ud ON ud.id = i.document_id
ORDER BY i.created_at DESC
LIMIT 5;

-- Expected: Rows with:
--   status = 'parsed'
--   document_id IS NOT NULL
--   doc_has_ocr = true
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

---

### Step 3: Click Import All Button

1. **In Byte Chat UI:**
   - Find the message showing "📊 Found N transactions:"
   - Click the **✅ Import All** button (green button)

2. **Expected Behavior:**
   - Button shows loading state: "⏳ Importing..." with spinner
   - Success toast appears: "Imported N transactions into your XspensesAI Transactions."
   - After 1.5 seconds, navigates to `/dashboard/transactions`
   - Button becomes disabled (gray) if clicked again

3. **If Error Occurs:**
   - Check browser console for `[ImportAllButton]` logs
   - Check Netlify function logs for `[commit-import]` errors
   - Error toast shows user-friendly message

---

### Step 4: Verify Commit Success (Supabase SQL)

```sql
-- Check 1: imports.status changed to 'committed'
SELECT 
  id AS import_id,
  user_id,
  status,
  updated_at,
  created_at
FROM public.imports
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Latest import has:
--   status = 'committed'
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
--   source_type = 'ocr_bank_statement'
```

```sql
-- Check 3: transactions_staging rows still exist (history)
SELECT 
  COUNT(*) AS staging_count,
  import_id
FROM public.transactions_staging
GROUP BY import_id
ORDER BY import_id DESC
LIMIT 5;

-- Expected: Staging rows remain for audit trail
```

---

## Test Flow 2: Error Cases

### Test 2.1: Already Committed Import

1. **Setup:** Click Import All once (success)
2. **Action:** Click Import All again on the same message
3. **Expected:** Toast: "These transactions have already been imported."
4. **Backend Log:** `[commit-import] Import status is 'committed', expected 'parsed'`

---

### Test 2.2: Missing Import ID

1. **Setup:** Upload a document, but worker persistence fails
2. **Action:** Try to click Import All
3. **Expected:** Button is disabled (gray) with tooltip "Import ID not available"
4. **UI:** Toast: "Import ID not available. Please try uploading the document again."

---

### Test 2.3: No Transactions in Staging

1. **Setup:** Manually delete staging rows for an import:
   ```sql
   DELETE FROM public.transactions_staging WHERE import_id = '<import_id>';
   ```
2. **Action:** Click Import All
3. **Expected:** Toast: "No transactions found to import."
4. **Backend Log:** `[commit-import] No staged transactions found for this import`

---

### Test 2.4: Import Not Found

1. **Setup:** Use an invalid `importId` (UUID that doesn't exist)
2. **Action:** Call commit-import directly:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/commit-import \
     -H "Content-Type: application/json" \
     -d '{"userId":"<your-user-id>","importId":"00000000-0000-0000-0000-000000000000"}'
   ```
3. **Expected:** Response: `{ "ok": false, "error": "no_import_found", "message": "Import not found for this user" }`

---

## Test Flow 3: Transactions Page Verification

### Step 1: Navigate to Transactions

After clicking Import All, you should be redirected to `/dashboard/transactions`

### Step 2: Verify Imported Transactions

1. **Check Transaction List:**
   - New transactions should appear at the top
   - Date, merchant, amount, category should match the PDF
   - Source should indicate "Smart Import" or similar

2. **Check Transaction Details:**
   - Click a transaction
   - Verify `import_id` is populated
   - Verify `document_id` links to the uploaded PDF
   - Verify category was assigned (from Tag learning or staging)

---

## SQL Verification Queries (Complete Checklist)

Run these after a successful import to verify end-to-end:

```sql
-- ============================================================================
-- COMPLETE VERIFICATION QUERY
-- Run this after uploading and committing a PDF
-- ============================================================================

WITH latest_import AS (
  SELECT id, user_id, document_id, status, created_at, updated_at
  FROM public.imports
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  -- Import status
  li.status AS import_status,
  li.created_at AS import_created,
  li.updated_at AS import_updated,
  
  -- Document info
  ud.ocr_text IS NOT NULL AS doc_has_ocr,
  LENGTH(ud.ocr_text) AS doc_ocr_length,
  ud.ocr_completed_at AS doc_ocr_completed,
  
  -- Staging count
  (SELECT COUNT(*) FROM public.transactions_staging WHERE import_id = li.id) AS staging_count,
  
  -- Committed transactions count
  (SELECT COUNT(*) FROM public.transactions WHERE import_id = li.id) AS committed_count,
  
  -- Sample transaction
  (SELECT jsonb_build_object(
    'merchant', merchant,
    'amount', amount,
    'date', date,
    'category', category
  ) FROM public.transactions WHERE import_id = li.id LIMIT 1) AS sample_transaction

FROM latest_import li
LEFT JOIN public.user_documents ud ON ud.id = li.document_id;
```

**Expected Results:**
- `import_status` = `'committed'`
- `doc_has_ocr` = `true`
- `doc_ocr_length` > 0
- `staging_count` > 0 (history preserved)
- `committed_count` = `staging_count` (all committed)
- `sample_transaction` shows valid merchant, amount, date, category

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

---

## Backend Function Checklist

- [ ] **commit-import endpoint** accepts `{ userId, importId }`
- [ ] **Validates import exists** and belongs to user
- [ ] **Checks import status** is 'parsed' (not already committed)
- [ ] **Reads staging rows** from `transactions_staging`
- [ ] **Categorizes transactions** using Tag learning if needed
- [ ] **Inserts into transactions** table with correct fields
- [ ] **Updates import status** to 'committed'
- [ ] **Returns success** with committed count
- [ ] **Error handling** returns specific error codes:
  - `no_import_found`
  - `no_transactions_in_staging`
  - `already_committed`
  - `db_error`

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
**Debug:** Check Netlify function logs for `[commit-import] Error updating import status`

**Fix:** Verify RLS policies allow service role to update `imports` table

---

### Issue: Duplicate transactions inserted

**Cause:** Conflict resolution not working  
**Debug:** Check `onConflict` clause in commit-import upsert

**Fix:** Verify unique constraint on `transactions` table matches upsert conflict key

---

## Success Criteria

✅ **Phase 2 is complete when:**

1. Upload PDF → Worker persists to `user_documents`, `imports`, `transactions_staging`
2. Byte chat shows "Found N transactions" with Import All button
3. Click Import All → Transactions inserted into `transactions` table
4. Import status updated to 'committed'
5. User redirected to Transactions page
6. Transactions visible on Transactions page with correct data
7. All error cases handled gracefully with user-friendly messages

---

## Next Steps (Future Enhancements)

- [ ] Add "Edit before import" functionality
- [ ] Show import progress indicator
- [ ] Allow partial imports (select specific transactions)
- [ ] Add import history page
- [ ] Show import source badge on Transactions page
- [ ] Add rollback functionality for committed imports


