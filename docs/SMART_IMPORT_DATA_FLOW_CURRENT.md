# Smart Import / Byte Data Flow - Current State

**Date**: 2025-02-05  
**Status**: ✅ Complete Pipeline Documented

---

## Executive Summary

The Smart Import / Byte data flow is **fully implemented and working**. This document summarizes the complete pipeline from file upload to normalized transactions appearing in the Transactions page.

---

## 1. Complete Data Flow Pipeline

### Step-by-Step Flow

```
1. FILE UPLOAD
   ↓
   User uploads file (PDF/image/CSV) via:
   - Smart Import workspace UI (ByteWorkspacePanel)
   - Byte chat paperclip button (EmployeeChatWorkspace)
   ↓
   Both use: useSmartImport hook → uploadFile(userId, file, source)

2. INITIALIZATION (smart-import-init.ts)
   ↓
   - Creates row in user_documents table
   - Creates row in imports table (linked to document)
   - Generates signed upload URL for Supabase Storage
   - Returns: { docId, importId, path, url, token }
   ↓
   File stored in: Supabase Storage bucket "docs"
   Path pattern: u/{docId[0:2]}/{docId}/{docId}.{ext}

3. FILE UPLOAD TO STORAGE
   ↓
   Client uploads file directly to signed URL (PUT request)
   ↓
   File now in Supabase Storage

4. FINALIZATION (smart-import-finalize.ts)
   ↓
   Routes by file type:
   - Images/PDFs → smart-import-ocr
   - CSV/OFX/QIF → smart-import-parse-csv
   ↓
   Applies guardrails (PII redaction) before processing

5. OCR PROCESSING (smart-import-ocr.ts)
   ↓
   - Downloads file from Storage
   - Runs OCR:
     * Google Vision (preferred for images)
     * OCR.space (fallback for PDFs/images)
   - Applies STRICT guardrails to OCR output
   - Stores REDACTED text in user_documents.ocr_text
   - Stores OCR JSON in Storage: {storage_path}.ocr.json
   - Marks document status as 'ready'
   ↓
   Calls: normalize-transactions function

6. CSV PARSING (smart-import-parse-csv.ts)
   ↓
   - Downloads CSV from Storage
   - Applies guardrails (PII redaction)
   - Parses CSV using papaparse
   - Stores redacted text
   ↓
   Calls: normalize-transactions function

7. NORMALIZATION (normalize-transactions.ts)
   ↓
   - Loads document with OCR/parsed text
   - Parses transactions from text
   - Normalizes: date, merchant, amount, currency
   - Creates staging rows with hash for deduplication
   ↓
   Writes to: transactions_staging table
   Updates: imports.status = 'parsed'

8. COMMIT (commit-import.ts)
   ↓
   - Reads from transactions_staging WHERE import_id = :importId
   - Categorizes uncategorized transactions (Tag AI)
   - Detects recurring obligations
   - Queues payment notifications
   ↓
   Writes to: transactions table (final destination)
   Updates: imports.status = 'committed'

9. TRANSACTIONS PAGE
   ↓
   - useTransactions hook calls: /.netlify/functions/tx-list-latest
   - tx-list-latest queries: transactions table
   - Returns paginated, filtered transactions
   ↓
   Transactions appear in UI
```

---

## 2. Database Tables

### Primary Tables

#### `user_documents`
**Purpose**: Stores document metadata and OCR results  
**Key Fields**:
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `source_type` ('upload' | 'chat' | 'gmail')
- `original_name`, `mime_type`, `storage_path`
- `status` ('pending' | 'ready' | 'rejected')
- `ocr_text` (REDACTED text)
- `ocr_completed_at`, `pii_types`, `content_hash`

**Location**: Created in migrations (check `supabase/migrations/`)

#### `imports`
**Purpose**: Tracks import jobs  
**Key Fields**:
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `document_id` (uuid, FK → user_documents.id)
- `file_url`, `file_type`
- `status` ('pending' | 'parsed' | 'committed' | 'failed')
- `committed_count`, `committed_at`

**Location**: Created in migrations

#### `transactions_staging`
**Purpose**: Temporary storage before commit  
**Key Fields**:
- `id` (uuid, PK)
- `import_id` (uuid, FK → imports.id)
- `user_id` (uuid, FK)
- `data_json` (JSONB with normalized transaction data)
- `hash` (SHA-256 for deduplication)

**Location**: Created in migrations

#### `transactions` ⭐ **SINGLE SOURCE OF TRUTH**
**Purpose**: Final normalized transactions table  
**Key Fields**:
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `merchant_name`, `merchant_norm`
- `amount`, `posted_at`, `memo`
- `category`, `category_confidence`
- `document_id` (links to user_documents)

**Location**: Created in migrations  
**Used By**: Transactions page (`tx-list-latest` endpoint)

---

## 3. Netlify Functions

### Core Pipeline Functions

1. **`smart-import-init.ts`**
   - Creates document and import records
   - Generates signed upload URL
   - Returns upload credentials

2. **`smart-import-finalize.ts`**
   - Routes files by type (OCR vs CSV parser)
   - Applies guardrails before processing
   - Triggers appropriate processor

3. **`smart-import-ocr.ts`**
   - Runs OCR (Google Vision / OCR.space)
   - Applies guardrails to OCR output
   - Stores redacted text
   - Calls normalize-transactions

4. **`smart-import-parse-csv.ts`**
   - Parses CSV/OFX/QIF files
   - Applies guardrails
   - Calls normalize-transactions

5. **`normalize-transactions.ts`**
   - Parses transactions from OCR/CSV text
   - Normalizes data (date, merchant, amount)
   - Writes to `transactions_staging`

6. **`commit-import.ts`**
   - Moves from `transactions_staging` → `transactions`
   - Categorizes transactions (Tag AI)
   - Detects recurring obligations
   - Updates import status

### Supporting Functions

7. **`smart_import_stats.ts`**
   - Returns queue stats (pending/processing/completed)
   - Monthly statistics
   - Health status

8. **`tx-list-latest.ts`** ⭐ **READS FROM transactions TABLE**
   - Paginated transaction fetching
   - Filters: days, confidence, uncategorized, search
   - Used by Transactions page

---

## 4. Frontend Components & Hooks

### Hooks

1. **`useSmartImport`** (`src/hooks/useSmartImport.ts`)
   - `uploadFile(userId, file, source)` - Single file upload
   - `uploadFiles(userId, files[], source)` - Multiple files
   - `uploadBase64(userId, filename, mime, base64, source)` - Base64 upload
   - Used by: ByteWorkspacePanel, EmployeeChatWorkspace

2. **`useByteQueueStats`** (`src/hooks/useByteQueueStats.ts`)
   - Fetches stats from `smart_import_stats` endpoint
   - Auto-refreshes every 20 seconds
   - Used by: ByteWorkspacePanel

3. **`useTransactions`** (`src/hooks/useTransactions.ts`)
   - Fetches transactions from `tx-list-latest` endpoint
   - Cursor-based pagination
   - Filters: days, confidence, uncategorized, search
   - Used by: Transactions page

### Components

1. **`ByteWorkspacePanel`** (`src/components/smart-import/ByteWorkspacePanel.tsx`)
   - Left column of Smart Import dashboard
   - Upload button (uses `useSmartImport`)
   - Queue stats (uses `useByteQueueStats`)

2. **`EmployeeChatWorkspace`** (`src/components/chat/EmployeeChatWorkspace.tsx`)
   - Universal chat component
   - Paperclip upload button (uses `useSmartImport`)
   - Sends chat message after upload

3. **`TransactionsPage`** (`src/pages/dashboard/TransactionsPage.tsx`)
   - Main transactions page
   - Uses `useTransactions` hook
   - Reads from `transactions` table via `tx-list-latest`

---

## 5. Storage Locations

### Supabase Storage
- **Bucket**: `docs`
- **Path Pattern**: `u/{docId[0:2]}/{docId}/{docId}.{ext}`
- **Additional Files**: `{storage_path}.ocr.json` (OCR results)

### Database Tables
- **Documents**: `user_documents` table
- **Imports**: `imports` table
- **Staging**: `transactions_staging` table
- **Final**: `transactions` table ⭐

---

## 6. How Transactions Page Gets Data

### Flow

```
TransactionsPage component
  ↓
useTransactions hook
  ↓
POST /.netlify/functions/tx-list-latest
  Headers: { "x-user-id": userId }
  Body: { days, pageSize, cursor, minConfidence, onlyUncategorized, q }
  ↓
tx-list-latest function
  ↓
Queries: transactions table
  SELECT * FROM transactions
  WHERE user_id = :userId
  AND posted_at >= :sinceDate
  ORDER BY posted_at DESC, id DESC
  ↓
Returns: Paginated transactions
  ↓
TransactionsPage displays transactions
```

### Confirmation

✅ **Transactions page reads from `transactions` table**  
✅ **Same table that Smart Import pipeline writes to**  
✅ **Single source of truth confirmed**

---

## 7. Byte Chat Upload Integration

### Flow

```
User clicks paperclip in Byte chat
  ↓
EmployeeChatWorkspace.handleFileUpload()
  ↓
Validates file (type, size)
  ↓
uploadFile(userId, file, 'chat') via useSmartImport
  ↓
Same pipeline as workspace upload:
  smart-import-init → upload → smart-import-finalize → OCR → normalize → commit
  ↓
File appears in user_documents table
  ↓
Transactions appear in transactions table
  ↓
Same final destination as workspace uploads
```

### Confirmation

✅ **Byte chat upload uses same pipeline** (`useSmartImport` hook)  
✅ **Same functions called** (`smart-import-init`, `smart-import-finalize`, etc.)  
✅ **Same tables written to** (`user_documents`, `imports`, `transactions_staging`, `transactions`)  
✅ **Same final destination** (`transactions` table)

---

## 8. Summary

### Data Flow Summary

1. **Upload** → `smart-import-init` → Supabase Storage + `user_documents` table
2. **Process** → `smart-import-finalize` → `smart-import-ocr` / `smart-import-parse-csv`
3. **Normalize** → `normalize-transactions` → `transactions_staging` table
4. **Commit** → `commit-import` → `transactions` table ⭐
5. **Display** → `tx-list-latest` → Transactions page

### Single Source of Truth

**`transactions` table** is the single source of truth for:
- Transactions page (`tx-list-latest` reads from it)
- Smart Import pipeline (`commit-import` writes to it)
- Tag AI categorization (reads/writes to it)
- All transaction queries

### Upload Sources

Both upload paths end up in the same place:
- ✅ Smart Import workspace UI → `transactions` table
- ✅ Byte chat paperclip button → `transactions` table

**No duplicate pipelines. Everything flows through the same system.**

---

## 9. Files Modified / Verified

### Backend Functions
- ✅ `netlify/functions/smart-import-init.ts`
- ✅ `netlify/functions/smart-import-finalize.ts`
- ✅ `netlify/functions/smart-import-ocr.ts`
- ✅ `netlify/functions/smart-import-parse-csv.ts`
- ✅ `netlify/functions/normalize-transactions.ts`
- ✅ `netlify/functions/commit-import.ts`
- ✅ `netlify/functions/tx-list-latest.ts` (reads from `transactions`)

### Frontend Hooks
- ✅ `src/hooks/useSmartImport.ts`
- ✅ `src/hooks/useByteQueueStats.ts`
- ✅ `src/hooks/useTransactions.ts`

### Frontend Components
- ✅ `src/components/smart-import/ByteWorkspacePanel.tsx`
- ✅ `src/components/chat/EmployeeChatWorkspace.tsx`
- ✅ `src/pages/dashboard/TransactionsPage.tsx`

### Database Tables
- ✅ `user_documents` (document metadata)
- ✅ `imports` (import jobs)
- ✅ `transactions_staging` (temporary)
- ✅ `transactions` ⭐ (final destination)

---

**Status**: ✅ **Pipeline is complete and verified. All uploads flow to the same `transactions` table.**










