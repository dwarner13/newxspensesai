# 🔍 SMART IMPORT PHASE 1 - COMPLETE AUDIT REPORT

**Date:** 2025-02-03  
**Status:** ⚠️ **INCOMPLETE - Critical Gaps Identified**  
**Priority:** 🔴 **BLOCKER** - Must be fixed before Transaction AI integration

---

## 📊 EXECUTIVE SUMMARY

**Working:** ~60%  
**Broken/Missing:** ~40%  
**Critical Blockers:** 8  
**High Priority:** 12  
**Medium Priority:** 5

---

## ✅ PART 1: WHAT IS WORKING

### 1. Frontend Upload Infrastructure ✅
- **`src/hooks/useSmartImport.ts`** - Complete hook with `uploadFile`, `uploadFiles`, `uploadBase64`
- **Upload UI in EmployeeChatPage** - Paperclip button + drag-drop working
- **Upload UI in SmartCategoriesPage** - Inline chat upload working
- **File validation** - Type checking, size limits
- **Progress tracking** - Upload progress states

### 2. Backend Init Function ✅
- **`netlify/functions/smart-import-init.ts`** - Working, creates `user_documents` record
- **Duplicate detection** - Content hash checking implemented
- **Signed URL generation** - Supabase Storage integration working
- **Error handling** - Proper error responses

### 3. Database Schema (Partial) ✅
- **`user_documents` table** - Exists with `content_hash` column
- **Migration:** `20250129_add_content_hash_to_user_documents.sql` - Applied
- **Duplicate detection index** - Created

### 4. Worker Backend (Partial) ✅
- **`worker/src/workflow/processDocument.ts`** - Complete OCR/parsing workflow
- **OCR processing** - OCR.space integration working
- **PDF parsing** - PDF text extraction + OCR fallback
- **Image processing** - PNG/JPG OCR working
- **Redaction** - PII redaction implemented
- **Transaction parsing** - Bank statement parsing logic exists

### 5. Commit Function ✅
- **`netlify/functions/commit-import.ts`** - Moves `transactions_staging` → `transactions`
- **Tag categorization** - Uses `categorizeTransactionWithLearning`
- **Document linking** - Links transactions to `user_documents`
- **Idempotency** - Handles duplicates correctly

### 6. Byte OCR Parse ✅
- **`netlify/functions/byte-ocr-parse.ts`** - Parses OCR text to transactions
- **Normalization** - Uses `normalizeOcrResult` from shared code
- **Preview format** - Returns preview rows for UI

---

## ❌ PART 2: CRITICAL GAPS & BROKEN FLOWS

### 🔴 CRITICAL BLOCKER #1: Missing Functions Referenced by `smart-import-finalize.ts`

**Problem:** `smart-import-finalize.ts` calls functions that don't exist:
```typescript
// Line 31: Calls non-existent function
await sb.functions.invoke('smart-import-ocr', { body: { userId, docId } });

// Line 52: Calls non-existent function  
await sb.functions.invoke('smart-import-parse-csv', { body: { userId, docId, key: safeKey } });
```

**Status:** Functions exist in `netlify/functions-disabled/` but NOT in `netlify/functions/`

**Impact:** ⚠️ **CRITICAL** - Uploads fail after file storage, no OCR/parsing happens

**Fix Required:**
1. Copy `smart-import-ocr.ts` from `functions-disabled/` to `functions/`
2. Copy `smart-import-parse-csv.ts` from `functions-disabled/` to `functions/`
3. OR: Update `smart-import-finalize.ts` to use existing `byte-ocr-parse.ts` instead

---

### 🔴 CRITICAL BLOCKER #2: Missing Database Tables

**Problem:** Code references tables that may not exist:
- `imports` table - Referenced by `commit-import.ts` and `byte-ocr-parse.ts`
- `transactions_staging` table - Referenced by `commit-import.ts`

**Status:** ❓ **UNKNOWN** - No migration found in `supabase/migrations/` for these tables

**Impact:** ⚠️ **CRITICAL** - Database queries fail, no transaction staging possible

**Fix Required:**
1. Create migration: `supabase/migrations/20250203_smart_import_tables.sql`
2. Create `imports` table with columns:
   - `id`, `user_id`, `document_id`, `file_url`, `file_type`, `status`, `created_at`, `updated_at`
3. Create `transactions_staging` table with columns:
   - `id`, `import_id`, `user_id`, `data_json`, `hash`, `parsed_at`
4. Add RLS policies for both tables
5. Add indexes for performance

---

### 🔴 CRITICAL BLOCKER #3: Schema Mismatch Between `user_documents` and `imports`

**Problem:** Two different document tracking systems:
- `user_documents` table - Used by `smart-import-init.ts`
- `imports` table - Used by `commit-import.ts` and `byte-ocr-parse.ts`

**Status:** ⚠️ **CRITICAL** - Data doesn't flow between systems

**Impact:** Documents uploaded via `smart-import-init` never appear in `imports`, so `commit-import` can't find them

**Fix Required:**
1. **Option A:** Create `imports` record in `smart-import-init.ts` after creating `user_documents`
2. **Option B:** Update `commit-import.ts` to work with `user_documents` instead of `imports`
3. **Option C:** Add `import_id` column to `user_documents` and link them

**Recommended:** Option A (create both records, link via `document_id`)

---

### 🔴 CRITICAL BLOCKER #4: `smart-import-finalize.ts` Uses Supabase Edge Functions (Wrong API)

**Problem:** Line 31 and 52 use `sb.functions.invoke()` which is for Supabase Edge Functions, not Netlify Functions

**Status:** ⚠️ **CRITICAL** - Function calls will fail

**Impact:** OCR/parsing never triggers after file upload

**Fix Required:**
1. Replace `sb.functions.invoke()` with HTTP fetch calls to Netlify Functions:
   ```typescript
   // Instead of:
   await sb.functions.invoke('smart-import-ocr', { body: { userId, docId } });
   
   // Use:
   await fetch(`${process.env.NETLIFY_URL || 'http://localhost:8888'}/.netlify/functions/smart-import-ocr`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId, docId })
   });
   ```

---

### 🔴 CRITICAL BLOCKER #5: Missing `normalize-transactions` Function

**Problem:** Both `smart-import-ocr.ts` and `smart-import-parse-csv.ts` call:
```typescript
await sb.functions.invoke('normalize-transactions', { body: { userId, documentId: docId } });
```

**Status:** ❌ **MISSING** - Function doesn't exist in `netlify/functions/`

**Impact:** OCR/parsing completes but transactions never saved to `transactions_staging`

**Fix Required:**
1. Check if `normalize-transactions.ts` exists in `functions-disabled/`
2. Copy to `functions/` if it exists
3. OR: Create new function that:
   - Reads OCR JSON from storage
   - Parses transactions using `ocr_normalize.ts`
   - Saves to `transactions_staging` table
   - Links to `imports` record

---

### 🔴 CRITICAL BLOCKER #6: Worker Backend Not Connected to Netlify Functions

**Problem:** Worker backend (`worker/src/`) exists but is never called by Netlify Functions

**Status:** ⚠️ **DISCONNECTED** - Worker runs independently, no integration

**Impact:** Worker processing never triggers from upload flow

**Fix Required:**
1. **Option A:** Add HTTP endpoint in worker to receive document processing requests
2. **Option B:** Call worker HTTP API from `smart-import-finalize.ts`
3. **Option C:** Use worker as fallback only, keep Netlify Functions as primary

**Recommended:** Option B - Call worker from `smart-import-finalize.ts` for heavy processing

---

### 🔴 CRITICAL BLOCKER #7: Missing RLS Policies

**Problem:** No migrations found for RLS policies on:
- `imports` table
- `transactions_staging` table
- `user_documents` table (may exist but not verified)

**Status:** ⚠️ **SECURITY RISK** - Users may access other users' data

**Impact:** Data leaks, security vulnerabilities

**Fix Required:**
1. Create RLS policies for all Smart Import tables
2. Ensure `user_id` scoping on all SELECT/INSERT/UPDATE operations
3. Test with multiple users

---

### 🔴 CRITICAL BLOCKER #8: Frontend Doesn't Poll for Results

**Problem:** `useSmartImport.ts` uploads file but never checks for:
- OCR completion
- Transaction parsing results
- Import status

**Status:** ⚠️ **INCOMPLETE UX** - Users don't see processing progress

**Impact:** Users don't know when transactions are ready

**Fix Required:**
1. Add polling logic to `useSmartImport.ts` after finalize
2. Check `user_documents.status` or `imports.status`
3. Poll `transactions_staging` for transaction count
4. Return results to UI

---

## ⚠️ HIGH PRIORITY ISSUES

### 1. Missing `user_documents` Columns
- `ocr_text` - Referenced by `smart-import-ocr.ts` line 137
- `ocr_completed_at` - Referenced by `smart-import-ocr.ts` line 138
- `pii_types` - Referenced by `smart-import-ocr.ts` line 139
- `storage_path` - Referenced by `smart-import-finalize.ts` line 26
- `rejection_reason` - Referenced by `markDocStatus` in `upload.ts`

**Fix:** Create migration to add missing columns

---

### 2. `byte-ocr-parse.ts` Looks for Wrong Fields
**Problem:** Lines 67-91 try multiple field names (`ocr_text`, `extracted_text`, `text_content`, `raw_text`) but `user_documents` may only have `ocr_text`

**Fix:** Standardize on `ocr_text` field, ensure it's populated

---

### 3. No Error Handling for Failed OCR
**Problem:** If OCR fails, no user-visible error, document stuck in `pending` status

**Fix:** Add error status updates, return errors to frontend

---

### 4. Missing Transaction Preview UI
**Problem:** No UI component to show parsed transactions before commit

**Fix:** Create `TransactionPreview.tsx` component, integrate with Smart Import page

---

### 5. No Memory Summary Creation
**Problem:** Phase 1 requirement #13 (memory summaries) not implemented

**Fix:** After commit, create memory summary using `memory-extraction.ts`

---

### 6. Anonymous User Support Missing
**Problem:** Phase 1 requirement #12 (anonymous→user migration) not implemented

**Fix:** Add `anonymous_user_id` column, migration logic

---

### 7. Chat Upload Integration Incomplete
**Problem:** Upload works but results don't flow back to chat

**Fix:** After processing, send chat message with transaction summary

---

### 8. Missing Upload Buttons on Other Pages
**Problem:** Phase 1 requirement #15 (upload buttons across all pages) - only implemented in chat

**Fix:** Add upload buttons to:
- Dashboard home
- Transactions page
- Smart Categories page (already done)
- Receipts page

---

### 9. No Document List UI
**Problem:** Users can't see uploaded documents or their status

**Fix:** Create `DocumentsList.tsx` component showing:
- Upload date
- Status (pending/ready/rejected)
- Transaction count
- Actions (view, delete, reprocess)

---

### 10. Missing Supabase Storage Bucket Setup
**Problem:** Code references `docs` bucket but may not exist

**Fix:** Verify bucket exists, create if missing, set public/private policies

---

### 11. No Retry Logic for Failed Processing
**Problem:** If OCR/parsing fails, no way to retry without re-uploading

**Fix:** Add "Retry Processing" button in document list

---

### 12. Worker Queue Not Used
**Problem:** Worker has queue system (`queue.ts`) but Netlify Functions don't use it

**Fix:** Either integrate worker queue OR remove unused code

---

## 📋 MEDIUM PRIORITY ISSUES

### 1. CSV Parser Too Simple
**Problem:** `smart-import-parse-csv.ts` has basic CSV parser, may fail on complex formats

**Fix:** Use robust CSV parser library (e.g., `papaparse`)

---

### 2. No OFX/QIF Parser
**Problem:** Code checks for OFX/QIF but no parser implemented

**Fix:** Add OFX/QIF parsing logic

---

### 3. No Progress Webhooks/SSE
**Problem:** Frontend polls for status, no real-time updates

**Fix:** Add SSE endpoint for processing progress

---

### 4. Missing Unit Tests
**Problem:** No tests for Smart Import functions

**Fix:** Add tests for critical paths

---

### 5. No Rate Limiting
**Problem:** Users can spam uploads

**Fix:** Add rate limiting to `smart-import-init.ts`

---

## 🔧 PART 3: EXACT FIXES REQUIRED

### Fix #1: Create Missing Database Tables

**File:** `supabase/migrations/20250203_smart_import_tables.sql`

```sql
-- Create imports table
CREATE TABLE IF NOT EXISTS public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imports_user_id ON public.imports(user_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON public.imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_document_id ON public.imports(document_id);

-- Enable RLS
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY imports_select_own ON public.imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY imports_insert_own ON public.imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY imports_update_own ON public.imports
  FOR UPDATE USING (auth.uid() = user_id);

-- Create transactions_staging table
CREATE TABLE IF NOT EXISTS public.transactions_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_json jsonb NOT NULL,
  hash text,
  parsed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, hash)
);

CREATE INDEX IF NOT EXISTS idx_transactions_staging_import_id ON public.transactions_staging(import_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staging_user_id ON public.transactions_staging(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staging_hash ON public.transactions_staging(hash);

-- Enable RLS
ALTER TABLE public.transactions_staging ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY transactions_staging_select_own ON public.transactions_staging
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY transactions_staging_insert_own ON public.transactions_staging
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### Fix #2: Add Missing Columns to `user_documents`

**File:** `supabase/migrations/20250203_user_documents_columns.sql`

```sql
-- Add missing columns to user_documents
ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pii_types text[],
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'upload';

-- Add index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_storage_path 
  ON public.user_documents(storage_path) 
  WHERE storage_path IS NOT NULL;
```

---

### Fix #3: Copy Missing Functions from `functions-disabled/`

**Commands:**
```bash
cp netlify/functions-disabled/smart-import-ocr.ts netlify/functions/smart-import-ocr.ts
cp netlify/functions-disabled/smart-import-parse-csv.ts netlify/functions/smart-import-parse-csv.ts
```

**Then fix `smart-import-ocr.ts`:**
- Replace `sb.functions.invoke('normalize-transactions')` with HTTP fetch
- Fix OCR API implementation (currently placeholder)

**Then fix `smart-import-parse-csv.ts`:**
- Replace `sb.functions.invoke('normalize-transactions')` with HTTP fetch
- Improve CSV parser or use library

---

### Fix #4: Create `normalize-transactions.ts` Function

**File:** `netlify/functions/normalize-transactions.ts`

```typescript
import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { normalizeOcrResult } from './_shared/ocr_normalize.js';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId, documentId } = JSON.parse(event.body || '{}');
    if (!userId || !documentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId/documentId' }) };
    }

    const sb = admin();

    // 1. Get document and OCR text
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .select('ocr_text, id')
      .eq('id', documentId)
      .single();

    if (docError || !doc || !doc.ocr_text) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Document or OCR text not found' }) };
    }

    // 2. Find or create imports record
    let { data: importRecord } = await sb
      .from('imports')
      .select('id')
      .eq('document_id', documentId)
      .maybeSingle();

    if (!importRecord) {
      const { data: newImport, error: importError } = await sb
        .from('imports')
        .insert({
          user_id: userId,
          document_id: documentId,
          file_url: doc.storage_path || '',
          file_type: doc.mime_type || 'application/pdf',
          status: 'parsing',
        })
        .select('id')
        .single();

      if (importError) throw importError;
      importRecord = newImport;
    }

    // 3. Parse OCR text to transactions
    const transactions = normalizeOcrResult(doc.ocr_text, userId);

    // 4. Save to transactions_staging
    const stagingRows = transactions.map(tx => ({
      import_id: importRecord.id,
      user_id: userId,
      data_json: tx,
      hash: `${tx.date}-${tx.amount}-${tx.merchant}`.substring(0, 64), // Simple hash
    }));

    if (stagingRows.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .upsert(stagingRows, { onConflict: 'import_id,hash' });

      if (stagingError) throw stagingError;
    }

    // 5. Update import status
    await sb
      .from('imports')
      .update({ status: 'parsed', updated_at: new Date().toISOString() })
      .eq('id', importRecord.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, transactionCount: transactions.length, importId: importRecord.id }),
    };

  } catch (error: any) {
    console.error('[normalize-transactions] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

---

### Fix #5: Update `smart-import-finalize.ts` to Use HTTP Fetch

**Replace lines 31-32:**
```typescript
// OLD:
await sb.functions.invoke('smart-import-ocr', { body: { userId, docId } });

// NEW:
const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
const ocrResponse = await fetch(`${netlifyUrl}/.netlify/functions/smart-import-ocr`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, docId }),
});
if (!ocrResponse.ok) {
  throw new Error(`OCR failed: ${ocrResponse.statusText}`);
}
```

**Replace lines 52:**
```typescript
// OLD:
await sb.functions.invoke('smart-import-parse-csv', { body: { userId, docId, key: safeKey } });

// NEW:
const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
const parseResponse = await fetch(`${netlifyUrl}/.netlify/functions/smart-import-parse-csv`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, docId, key: safeKey }),
});
if (!parseResponse.ok) {
  throw new Error(`Parse failed: ${parseResponse.statusText}`);
}
```

---

### Fix #6: Update `smart-import-init.ts` to Create `imports` Record

**Add after line 32 (after creating `user_documents`):**
```typescript
// Create imports record linked to user_documents
const { data: importRecord, error: importError } = await sb
  .from('imports')
  .insert({
    user_id: userId,
    document_id: doc.id,
    file_url: path,
    file_type: mime,
    status: 'pending',
  })
  .select('id')
  .single();

if (importError) {
  console.warn('[smart-import-init] Failed to create imports record:', importError);
  // Don't fail the upload, but log warning
}

return {
  statusCode: 200,
  body: JSON.stringify({
    docId: doc.id,
    importId: importRecord?.id || null,
    path,
    url,
    token,
  }),
};
```

---

### Fix #7: Update `smart-import-ocr.ts` to Use HTTP Fetch

**Replace line 144:**
```typescript
// OLD:
await sb.functions.invoke('normalize-transactions', { body: { userId, documentId: docId } });

// NEW:
const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, documentId: docId }),
});
// Don't await - fire and forget for async processing
```

---

### Fix #8: Update `smart-import-parse-csv.ts` to Use HTTP Fetch

**Replace line 130:**
```typescript
// OLD:
await sb.functions.invoke('normalize-transactions', { body: { userId, documentId: docId } });

// NEW:
const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, documentId: docId }),
});
// Don't await - fire and forget for async processing
```

---

## 🚀 PART 4: RECOMMENDED EXECUTION ORDER

### Phase 1: Database Foundation (Day 1)
1. ✅ Run migration: `20250203_smart_import_tables.sql`
2. ✅ Run migration: `20250203_user_documents_columns.sql`
3. ✅ Verify tables exist: `imports`, `transactions_staging`
4. ✅ Verify columns exist: `ocr_text`, `storage_path`, etc.
5. ✅ Test RLS policies with multiple users

### Phase 2: Function Infrastructure (Day 1-2)
1. ✅ Copy `smart-import-ocr.ts` to `functions/`
2. ✅ Copy `smart-import-parse-csv.ts` to `functions/`
3. ✅ Create `normalize-transactions.ts`
4. ✅ Fix all `sb.functions.invoke()` calls to use HTTP fetch
5. ✅ Test each function individually with `curl` or Postman

### Phase 3: Integration Fixes (Day 2)
1. ✅ Update `smart-import-init.ts` to create `imports` record
2. ✅ Update `smart-import-finalize.ts` to use HTTP fetch
3. ✅ Update `smart-import-ocr.ts` to call `normalize-transactions`
4. ✅ Update `smart-import-parse-csv.ts` to call `normalize-transactions`
5. ✅ Test end-to-end: Upload → OCR → Parse → Stage → Commit

### Phase 4: Frontend Enhancements (Day 3)
1. ✅ Add polling logic to `useSmartImport.ts`
2. ✅ Create `TransactionPreview.tsx` component
3. ✅ Update Smart Import page to show preview
4. ✅ Add document list UI
5. ✅ Add upload buttons to other pages

### Phase 5: Error Handling & Polish (Day 4)
1. ✅ Add error status updates
2. ✅ Add retry logic
3. ✅ Add memory summary creation
4. ✅ Add anonymous user migration support
5. ✅ Add rate limiting

---

## 🧪 PART 5: TESTING CHECKLIST

### Database Tests
- [ ] Tables exist: `imports`, `transactions_staging`
- [ ] Columns exist: `ocr_text`, `storage_path`, `pii_types`
- [ ] RLS policies work: Users can only see their own data
- [ ] Indexes exist: Queries are fast

### Function Tests
- [ ] `smart-import-init` creates `user_documents` + `imports`
- [ ] `smart-import-finalize` routes PDFs to OCR
- [ ] `smart-import-finalize` routes CSV to parser
- [ ] `smart-import-ocr` extracts text and saves to `ocr_text`
- [ ] `smart-import-parse-csv` parses CSV correctly
- [ ] `normalize-transactions` saves to `transactions_staging`
- [ ] `commit-import` moves transactions to `transactions` table

### End-to-End Tests
- [ ] Upload PDF → OCR → Parse → Stage → Commit → Transactions appear
- [ ] Upload CSV → Parse → Stage → Commit → Transactions appear
- [ ] Upload PNG → OCR → Parse → Stage → Commit → Transactions appear
- [ ] Duplicate detection works (same file uploaded twice)
- [ ] Error handling works (bad PDF, unreadable image)
- [ ] Frontend shows progress and results

### Security Tests
- [ ] RLS prevents user A from seeing user B's documents
- [ ] Guardrails mask PII in OCR output
- [ ] Rate limiting prevents spam uploads

---

## 📝 PART 6: DEBUGGING COMMANDS

### Check Database Tables
```sql
-- In Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('imports', 'transactions_staging', 'user_documents');

-- Check columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'user_documents' 
AND column_name IN ('ocr_text', 'storage_path', 'pii_types');
```

### Test Functions Locally
```bash
# Start Netlify dev
netlify dev

# Test smart-import-init
curl -X POST http://localhost:8888/.netlify/functions/smart-import-init \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","filename":"test.pdf","mime":"application/pdf","source":"upload"}'

# Test smart-import-finalize
curl -X POST http://localhost:8888/.netlify/functions/smart-import-finalize \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","docId":"<doc-id>"}'
```

### Check Worker Status
```bash
# Start worker
cd worker
npm run dev

# Check health
curl http://localhost:8080/healthz
```

### Check Supabase Storage
```bash
# List buckets (requires Supabase CLI)
supabase storage list

# Check bucket policies
supabase storage policy list docs
```

---

## 🎯 SUCCESS CRITERIA

Smart Import Phase 1 is **COMPLETE** when:

1. ✅ User can upload PDF/PNG/CSV from chat or Smart Import page
2. ✅ File is stored in Supabase Storage
3. ✅ OCR extracts text from PDFs/images
4. ✅ Parser extracts transactions from CSV/OFX/QIF
5. ✅ Transactions are normalized (vendor, amount, date)
6. ✅ Transactions saved to `transactions_staging`
7. ✅ User can preview transactions before commit
8. ✅ User can commit transactions to `transactions` table
9. ✅ Transactions appear in Transactions page
10. ✅ Documents linked to transactions via `document_id`
11. ✅ Errors are handled gracefully
12. ✅ RLS policies prevent data leaks
13. ✅ Memory summaries created after commit
14. ✅ Upload buttons work on all pages

---

## 📌 NEXT STEPS

1. **Review this audit** with team
2. **Prioritize fixes** based on business needs
3. **Create GitHub issues** for each fix
4. **Assign developers** to each fix
5. **Track progress** in project management tool
6. **Test thoroughly** before marking Phase 1 complete

---

**END OF AUDIT REPORT**






