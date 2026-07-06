# OCR → Byte Wiring Map

**Date:** 2025-12-XX  
**Purpose:** Complete mapping of OCR/document pipeline and Byte employee integration

---

## STEP 2A — DISCOVERY REPORT

### A) Where Uploads Are Saved

**Table:** `user_documents`
- **File:** `netlify/functions/_shared/upload.ts` (lines 45-107)
- **Key Function:** `createUserDocumentRow()`
- **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK → auth.users)
  - `source` ('upload' | 'chat' | 'gmail')
  - `original_name` (text)
  - `mime_type` (text)
  - `status` ('pending' | 'ready' | 'rejected')
  - `storage_path` (text) - Path in bucket
  - `ocr_text` (text) - Redacted OCR output
  - `ocr_completed_at` (timestamp)
  - `pii_types` (text[]) - Detected PII types
  - `content_hash` (text) - SHA-256 for duplicate detection
  - `created_at`, `updated_at` (timestamps)

**Storage Bucket:** `docs`
- **File:** `netlify/functions/_shared/upload.ts` (line 8)
- **Path Format:** `u/{docId[0:2]}/{docId}/{docId}.{ext}` (line 109-112)
- **Function:** `storagePathFor(docId, ext)`

**Upload Flow:**
```typescript
// netlify/functions/smart-import-init.ts (lines 24-140)
1. createUserDocumentRow() → user_documents table
2. storagePathFor() → generates storage path
3. createSignedUploadUrl() → returns signed URL for client upload
4. Creates imports record (linked to user_documents)
```

---

### B) Where OCR/Parse Runs

**Primary OCR Function:** `netlify/functions/smart-import-ocr.ts`
- **Handler:** `handler()` (lines 77-243)
- **Trigger:** Called by `smart-import-finalize.ts` after file upload
- **Flow:**
  1. Loads document from `user_documents` table (lines 92-96)
  2. Creates signed URL for OCR service (lines 103-109)
  3. Runs OCR via `runOCR()` (lines 23-75):
     - Google Vision API (preferred for images) - requires `GOOGLE_VISION_API_KEY`
     - OCR.space (fallback for PDFs/images) - requires `OCR_SPACE_API_KEY`
  4. Applies STRICT guardrails (PII redaction) via `runGuardrailsForText()` (lines 129-147)
  5. Stores redacted OCR text in `user_documents.ocr_text` (lines 167-172)
  6. Stores OCR JSON in storage: `{storage_path}.ocr.json` (lines 149-164)
  7. Queues `normalize-transactions.ts` in background (lines 177-183)
  8. Updates status to 'ready' (line 186)

**Parse Function:** `netlify/functions/normalize-transactions.ts`
- **Handler:** `processNormalizationInBackground()` (lines 21-196)
- **Trigger:** Called by `smart-import-ocr.ts` after OCR completes
- **Flow:**
  1. Loads OCR text from `user_documents.ocr_text` (lines 31-35)
  2. Finds or creates `imports` record (lines 47-75)
  3. Parses OCR text → `NormalizedTransaction[]` via `normalizeOcrResult()` (line 87)
  4. Saves to `transactions_staging` table
  5. Updates `imports.status = 'ready'`

**Upload Init Function:** `netlify/functions/smart-import-init.ts`
- **Purpose:** Creates document record and returns signed upload URL
- **Key Code (lines 24-140):**
```typescript
const result = await createUserDocumentRow(userId, source, filename, mime);
const path = storagePathFor(doc.id, ext);
const { url, token } = await createSignedUploadUrl(path);
// Creates imports record linked to user_documents
```

**Upload Finalize Function:** `netlify/functions/smart-import-finalize.ts`
- **Purpose:** Routes uploaded file to OCR or CSV parser
- **Key Code (lines 36-51):**
```typescript
if (isImageOrPdf(doc.mime_type)) {
  // Fire OCR in background
  fetch(`${netlifyUrl}/.netlify/functions/smart-import-ocr`, {
    method: 'POST',
    body: JSON.stringify({ userId, docId }),
  });
  return { queued: true, via: 'ocr' };
}
```

---

### C) Where Parsed Output Is Stored

**Table 1: `user_documents`**
- **Column:** `ocr_text` (text) - Redacted OCR output (PII masked by guardrails)
- **Column:** `ocr_completed_at` (timestamp)
- **Column:** `pii_types` (text[]) - Array of detected PII types
- **Column:** `status` ('pending' | 'ready' | 'rejected')

**Table 2: `imports`**
- **Purpose:** Import job tracking
- **Columns:**
  - `id` (uuid)
  - `user_id` (uuid)
  - `document_id` (uuid, FK → user_documents.id)
  - `file_url` (text) - Storage path
  - `file_type` (text) - MIME type
  - `status` ('pending' | 'parsing' | 'ready' | 'failed')

**Table 3: `transactions_staging`**
- **Purpose:** Parsed transactions before commit
- **Columns:** Standard transaction fields (date, merchant, amount, etc.)

**Table 4: `transactions`**
- **Purpose:** Final committed transactions
- **Columns:** Standard transaction fields + `document_id` (FK → user_documents.id)

**Storage:**
- **Bucket:** `docs`
- **Path:** `{storage_path}.ocr.json` - Contains redacted OCR text + metadata

---

### D) Existing Tool IDs That Support Documents/OCR

**Tool Registry:** `src/agent/tools/index.ts`

**Existing Document Tools:**

1. **`get_recent_documents`** (lines 631-641)
   - **File:** `src/agent/tools/impl/get_recent_documents.ts`
   - **Purpose:** List last N documents for user (metadata only, no OCR text)
   - **Returns:** `{ documents: [...], total: number }`
   - **Key Code:**
   ```typescript
   // Lines 43-48: Queries user_documents table
   const { data: documents } = await supabase
     .from('user_documents')
     .select('id, original_name, mime_type, status, created_at, ocr_completed_at, pii_types, ocr_text')
     .eq('user_id', userId)
     .order('created_at', { ascending: false })
     .limit(input.limit);
   ```

2. **`get_document_by_id`** (lines 642-652)
   - **File:** `src/agent/tools/impl/get_document_by_id.ts`
   - **Purpose:** Get specific document with OCR text (redacted)
   - **Returns:** `{ document: { id, original_name, ocr_text, ... } }`
   - **Key Code:**
   ```typescript
   // Lines 40-45: Queries user_documents table
   const { data: document } = await supabase
     .from('user_documents')
     .select('id, original_name, mime_type, status, created_at, ocr_completed_at, pii_types, ocr_text')
     .eq('id', input.documentId)
     .eq('user_id', userId)
     .maybeSingle();
   ```

3. **`get_transactions_by_document`** (lines 653-663)
   - **File:** `src/agent/tools/impl/get_transactions_by_document.ts`
   - **Purpose:** Get transactions linked to a document
   - **Returns:** `{ transactions: [...], total: number }`

**Other OCR-Related Tools:**

4. **`vision_ocr_light`** (already registered)
   - **Purpose:** Quick OCR for screenshots/images
   - **Status:** ✅ Exists in tool registry

5. **`ingest_statement_enhanced`** (already registered)
   - **Purpose:** Process financial statements with OCR and categorization
   - **Status:** ✅ Exists in tool registry

---

## STEP 2B — BYTE TOOL ACCESS

### Byte Employee Profile

**Slug:** `byte-docs` (canonical, used in latest migrations)
- **Note:** Older migrations use `byte-doc` (singular), but `byte-docs` is canonical

**Current Tools (from migrations):**

**Migration `004_add_all_employees.sql` (line 47):**
- `tools_allowed: ['ocr', 'sheet_export']`

**Migration `20250120_add_document_tools_to_employees.sql` (lines 11-27):**
- Adds `get_document_by_id` to Byte
- Adds `get_recent_documents` to Byte

**Migration `20250204_update_byte_system_prompt_and_tools.sql` (lines 17-29):**
- Sets `tools_allowed: ['ingest_statement_enhanced', 'vision_ocr_light']`

**Migration `20251201_ensure_byte_employee_profile.sql` (lines 66-74):**
- Sets `tools_allowed: ['ocr', 'sheet_export', 'transactions_query', 'transaction_category_totals', 'get_recent_import_summary', 'get_recent_imports', 'request_employee_handoff', 'vision_ocr_light']`
- **⚠️ MISSING:** `get_recent_documents`, `get_document_by_id`

**Status:** ⚠️ **INCONSISTENT** - Latest migration (`20251201`) does NOT include document tools, but earlier migration (`20250120`) adds them.

**Action Required:** Verify Byte has `get_recent_documents` and `get_document_by_id` in `tools_allowed` array.

---

## STEP 2C — MISSING TOOLS ANALYSIS

### Tools Byte Needs

**Required Tools:**
1. ✅ `get_recent_documents` - EXISTS, needs to be in Byte's `tools_allowed`
2. ✅ `get_document_by_id` - EXISTS, needs to be in Byte's `tools_allowed`
3. ⚠️ `document_parse_or_status` - DOES NOT EXIST, needs to be created

**Tool 3: `document_parse_or_status`**
- **Purpose:** Check if document needs OCR/parse, trigger if needed, return status
- **Logic:**
  - If `status='pending'` → Trigger OCR via `smart-import-ocr.ts`
  - If `status='ready'` → Return parsed status
  - If `status='rejected'` → Return rejection reason
- **Returns:** `{ status: string, needs_parse: boolean, ocr_triggered: boolean, message: string }`

**Note:** OCR is typically triggered automatically by `smart-import-finalize.ts` after upload. This tool would allow Byte to manually trigger OCR if needed or check status.

---

## STEP 2D — BYTE SYSTEM PROMPT UPDATE

**Current Prompt Location:** `employee_profiles.system_prompt` (database)

**Current Prompt (from `20251201_ensure_byte_employee_profile.sql`):**
- Mentions tools but doesn't explicitly instruct Byte to use tools for document counts/totals
- Doesn't specify: "Never guess document counts, always use tools"

**Update Needed:**
- Add explicit instructions to use `get_recent_documents` to list documents
- Add explicit instructions to use `get_document_by_id` to get OCR text
- Add instruction: "Never guess document counts or totals - always use tools to get accurate data"
- Add instruction: "If user doesn't specify a document, use the most recent one"
- Add instruction: "If document status is 'pending', trigger parse and explain status"
- Add instruction: "After summarizing parsed results, offer handoff to Tag for categorization"

---

## SUMMARY

### Files Edited/Added

**Backend Tool Files:**
- ⚠️ `src/agent/tools/impl/document_parse_or_status.ts` - NEW (if needed)
- ⚠️ `src/agent/tools/index.ts` - Register new tool (if created)

**Migrations:**
- ⚠️ `supabase/migrations/YYYYMMDD_add_document_tools_to_byte.sql` - Ensure Byte has document tools

**System Prompt:**
- ⚠️ `supabase/migrations/YYYYMMDD_update_byte_system_prompt_document_tools.sql` - Update Byte prompt

**UI Components:**
- ✅ **NONE** - No UI changes required

---

## NEXT STEPS

1. ✅ Verify Byte's `tools_allowed` includes `get_recent_documents` and `get_document_by_id`
2. ⚠️ Create `document_parse_or_status` tool (if needed, or reuse existing OCR trigger)
3. ⚠️ Update Byte's system prompt with tool usage instructions
4. ✅ Confirm: NO UI components edited





