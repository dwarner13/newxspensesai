# Byte OCR Integration Architecture

**Date**: 2025-02-05  
**Status**: ✅ OCR Pipeline Complete, Upload Button Integration Needed

---

## Current OCR Flow (What Already Exists)

### 1. Upload Initiation
**File**: `netlify/functions/smart-import-init.ts`
- **Purpose**: Creates document record and signed upload URL
- **Flow**:
  1. Validates `userId`, `filename`, `mime`
  2. Creates row in `user_documents` table (with duplicate detection)
  3. Creates row in `imports` table (linked to document)
  4. Generates signed upload URL for Supabase Storage
  5. Returns `{ docId, importId, path, url, token }`

**Database Tables Used**:
- `user_documents` - Main document metadata
- `imports` - Import job tracking
- Supabase Storage bucket: `docs`

---

### 2. File Upload
**File**: `netlify/functions/_shared/upload.ts`
- **Purpose**: Helper functions for document management
- **Key Functions**:
  - `createUserDocumentRow()` - Creates DB record with duplicate detection
  - `createSignedUploadUrl()` - Generates Supabase Storage signed URL
  - `markDocStatus()` - Updates document status (pending/ready/rejected)
  - `computeContentHash()` - SHA-256 hash for duplicate detection

**Storage**: Supabase Storage bucket `docs` with path pattern: `u/{docId[0:2]}/{docId}/{docId}.{ext}`

---

### 3. OCR Processing
**File**: `netlify/functions/smart-import-ocr.ts`
- **Purpose**: Extracts text from images/PDFs using OCR
- **Flow**:
  1. Loads document from `user_documents` table
  2. Creates signed URL for OCR service
  3. Runs OCR:
     - **Google Vision** (preferred for images) - requires `GOOGLE_VISION_API_KEY`
     - **OCR.space** (fallback for PDFs/images) - requires `OCR_SPACE_API_KEY`
  4. Applies **STRICT guardrails** to OCR output (PII redaction)
  5. Stores redacted OCR text in:
     - `user_documents.ocr_text` (redacted text)
     - `user_documents.ocr_completed_at` (timestamp)
     - `user_documents.pii_types` (array of detected PII types)
  6. Stores OCR JSON in Supabase Storage: `{storage_path}.ocr.json`
  7. Queues normalization via `normalize-transactions` function
  8. Marks document status as `ready`

**OCR Providers**:
- Google Vision API (preferred) - `GOOGLE_VISION_API_KEY`
- OCR.space (fallback) - `OCR_SPACE_API_KEY`

---

### 4. Finalization & Routing
**File**: `netlify/functions/smart-import-finalize.ts`
- **Purpose**: Routes documents to appropriate processor
- **Flow**:
  - **Images/PDFs** → Calls `smart-import-ocr` function
  - **CSV/OFX/QIF** → Calls `smart-import-parse-csv` function
  - Applies guardrails to CSV text before parsing
  - Returns `{ queued: true, via: 'ocr' | 'statement-parse' }`

---

### 5. Transaction Normalization
**File**: `netlify/functions/normalize-transactions.ts`
- **Purpose**: Converts OCR text into normalized transactions
- **Flow**:
  1. Loads document with OCR text
  2. Parses transactions from OCR text
  3. Saves to `transactions` table
  4. Links transactions to document via `document_id`

---

## React Hook for Uploads

**File**: `src/hooks/useSmartImport.ts`
- **Purpose**: React hook that wraps the upload flow
- **Functions**:
  - `uploadFile(userId, file, source)` - Single file upload
  - `uploadFiles(userId, files[], source)` - Multiple files
  - `uploadBase64(userId, filename, mime, base64, source)` - Base64 upload
- **State**:
  - `uploading` - Boolean loading state
  - `progress` - Upload progress (0-100)
  - `error` - Error message if upload fails

**Upload Flow** (via hook):
1. Call `smart-import-init` → get signed URL
2. Upload file to signed URL (PUT request)
3. Call `smart-import-finalize` → triggers OCR/parsing
4. Returns `{ docId, queued, via, rejected?, reason? }`

---

## What's Missing for Byte Upload Button

### Current State
- ✅ OCR pipeline fully implemented
- ✅ Upload hook (`useSmartImport`) exists
- ✅ Database tables (`user_documents`, `imports`) exist
- ✅ Guardrails integrated
- ❌ **Byte Upload button not connected** - currently just calls `onExpandClick`

### Required Changes

1. **ByteUnifiedCard.tsx** - Wire Upload button:
   - Add file input (hidden)
   - Add `useSmartImport` hook
   - Add `useAuth` to get `userId`
   - Add `onClick` handler that opens file picker
   - Show progress/toast notifications
   - Refresh queue stats after upload

2. **Toast Notifications** - Already available:
   - `react-hot-toast` is configured in `src/main.tsx`
   - Use `toast.success()`, `toast.error()`, `toast.loading()`

3. **Queue Stats Refresh** - Need to check:
   - Does Byte dashboard read from `user_documents` table?
   - Or does it need a new hook like `useByteQueueStats`?

---

## Integration Plan

### Step 1: Wire Upload Button
- Import `useSmartImport` and `useAuth` hooks
- Add hidden file input with accept types: `.pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic`
- Replace `onClick={onExpandClick}` with file picker trigger
- Handle file selection → call `uploadFile()`
- Show toast notifications for progress/errors

### Step 2: Progress Feedback
- Use `uploading` state from hook
- Show loading spinner/toast during upload
- Show success toast: "Upload complete. Byte is processing your documents."
- Show error toast if upload fails

### Step 3: Queue Stats (if needed)
- Check if Byte dashboard reads from `user_documents` table
- If not, create `useByteQueueStats` hook that queries:
  ```sql
  SELECT COUNT(*) FROM user_documents 
  WHERE user_id = ? AND status = 'pending'
  ```
- Refresh stats after successful upload

---

## Environment Variables Required

- `GOOGLE_VISION_API_KEY` - Google Vision API key (preferred for images)
- `OCR_SPACE_API_KEY` - OCR.space API key (fallback for PDFs/images)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

---

## Database Schema

### `user_documents` Table
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- source_type ('upload' | 'chat' | 'gmail')
- original_name (text)
- mime_type (text)
- storage_path (text)
- status ('pending' | 'ready' | 'rejected')
- ocr_text (text, REDACTED)
- ocr_completed_at (timestamptz)
- pii_types (text[])
- content_hash (text, SHA-256)
- rejection_reason (text)
- created_at, updated_at
```

### `imports` Table
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- document_id (uuid, FK → user_documents.id)
- file_url (text)
- file_type (text)
- status ('pending' | 'completed' | 'failed')
- created_at, updated_at
```

---

## Testing Checklist

1. **File Upload**:
   - Click Upload button → file picker opens
   - Select PDF → uploads successfully
   - Select image → uploads successfully
   - Select CSV → uploads successfully
   - Verify toast notifications appear

2. **OCR Processing**:
   - Check Supabase Storage → file appears in `docs` bucket
   - Check `user_documents` table → record created with `status='pending'`
   - Wait ~5 seconds → check `ocr_text` populated (redacted)
   - Check `ocr_completed_at` timestamp set

3. **Queue Stats**:
   - Upload file → queue count increases
   - Wait for OCR → queue count decreases
   - Verify stats update in Byte dashboard

4. **Error Handling**:
   - Upload invalid file type → error toast shown
   - Upload file > 10MB → error toast shown
   - Network error → error toast shown

---

## Known Limitations

- **Large PDFs**: Multi-page PDFs may take longer to process
- **File Size**: Max 10MB per file (configurable in `smart-import-init.ts`)
- **Progress UI**: Current hook provides `progress` (0-100) but no detailed step tracking
- **Queue Refresh**: May need polling or WebSocket for real-time updates

---

## Stats Endpoint

**File**: `netlify/functions/smart_import_stats.ts`
- **Purpose**: Returns real-time statistics for Byte workspace
- **Endpoint**: `/.netlify/functions/smart_import_stats` (POST)
- **Returns**:
  ```json
  {
    queue: { pending, processing, completed, failed },
    monthly: { totalThisMonth, totalLastMonth, deltaPercent },
    health: { failedLast24h, status: 'good' | 'warning' | 'error' }
  }
  ```
- **Tables Used**: `user_documents` (status, created_at, updated_at)

## React Hook

**File**: `src/hooks/useByteQueueStats.ts`
- **Purpose**: Fetches stats and auto-refreshes every 20 seconds
- **Returns**: `{ data, isLoading, isError, refetch }`
- **Auto-refresh**: Every 20 seconds to keep stats updated while OCR runs

## Smart Automation Integration

**Status**: ✅ **Already Connected**

Transactions from Smart Import automatically flow into Tag's Smart Automation system:

### Flow:
1. **Upload** → `smart-import-init` → `smart-import-finalize` → `smart-import-ocr`
2. **Normalize** → `normalize-transactions` → saves to `transactions_staging`
3. **Commit** → `commit-import` → moves to `transactions` table
4. **Auto-Categorize** → `commit-import` calls `categorizeTransactionWithLearning()` for uncategorized transactions
5. **Tag Discovery** → Tag queries `transactions` where `category IS NULL` or `category = 'Uncategorized'`

### How Tag Finds New Transactions:
- Tag's `transactions_query` tool filters by `category IS NULL` or `category = 'Uncategorized'`
- Tag's `bulk_categorize` tool processes uncategorized transactions
- User corrections create `category_rules` that auto-categorize future imports

### No Additional Integration Needed:
- Transactions are already categorized during `commit-import`
- Tag automatically discovers uncategorized transactions via existing queries
- Smart Automation rules (`category_rules` table) apply to new imports automatically

## Next Steps

1. ✅ Wire Upload button to `useSmartImport` hook
2. ✅ Add file picker and progress feedback
3. ✅ Add queue stats refresh with real-time data
4. ✅ Connect workspace panel to real stats (BYTE WORKSPACE)
5. ✅ Simplify Byte employee card (remove duplicate stats)
6. ✅ Verify Smart Automation integration (already connected)
7. ⚠️ Test with real files (PDF, image, CSV)

