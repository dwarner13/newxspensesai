# Chat Tools: Document Reference Integration

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Wire chat tools so AI employees can reference OCR imports and transactions

---

## 📋 Summary

Added three new server-side tool functions that allow AI employees (Prime, Byte, Tag) to reference OCR imports and transactions:

1. **`get_recent_documents`** - Get recent documents uploaded by the user
2. **`get_document_by_id`** - Get a specific document with OCR text
3. **`get_transactions_by_document`** - Get transactions linked to a specific document

---

## 🔧 Implementation Details

### Tool Functions Created

#### 1. `get_recent_documents`
**File:** `src/agent/tools/impl/get_recent_documents.ts`

**Purpose:** Get recent documents uploaded by the user (metadata only, no raw OCR text)

**Input:**
- `limit` (optional, default: 5, max: 20)

**Output:**
- `documents`: Array of document metadata (id, name, status, dates, PII types)
- `total`: Number of documents returned

**Security:**
- RLS-safe: Filters by `user_id`
- Does NOT expose raw OCR text (only metadata)
- Logs document IDs only (no sensitive data)

**Assigned To:**
- Prime (`prime-boss`) - For showing latest uploads
- Byte (`byte-doc`, `byte-docs`, `byte`) - For listing documents

---

#### 2. `get_document_by_id`
**File:** `src/agent/tools/impl/get_document_by_id.ts`

**Purpose:** Get a specific document by ID, including redacted OCR text

**Input:**
- `documentId` (required, UUID)

**Output:**
- `document`: Full document object including OCR text (already redacted by guardrails)

**Security:**
- RLS-safe: Filters by `user_id`
- OCR text is already redacted (PII masked) by guardrails
- Dev mode: Logs only first 100 chars of OCR text
- Production: Logs only OCR text length

**Assigned To:**
- Byte (`byte-doc`, `byte-docs`, `byte`) - For summarizing parsed text
- Prime (`prime-boss`) - For accessing specific documents

---

#### 3. `get_transactions_by_document`
**File:** `src/agent/tools/impl/get_transactions_by_document.ts`

**Purpose:** Get transactions linked to a specific document

**Input:**
- `documentId` (required, UUID)
- `limit` (optional, default: 100, max: 500)

**Output:**
- `transactions`: Array of transactions
- `total`: Number of transactions
- `summary`: Totals (amount, expenses, income, uncategorized count)

**Security:**
- RLS-safe: Filters by `user_id`
- Verifies document exists and belongs to user before querying transactions
- Checks both `document_id` and `import_id` paths

**Assigned To:**
- Tag (`tag-ai`, `tag`) - For categorization suggestions

---

## 🔄 Database Schema

### Tables Used

**`user_documents`**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `original_name` (text)
- `mime_type` (text)
- `status` (text: 'pending', 'ready', 'rejected')
- `ocr_text` (text, REDACTED)
- `ocr_completed_at` (timestamptz)
- `pii_types` (text[])
- `created_at` (timestamptz)

**`imports`**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `document_id` (uuid, FK → user_documents.id)
- `file_url` (text)
- `file_type` (text)
- `status` (text)
- `created_at` (timestamptz)

**`transactions`**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `document_id` (uuid, FK → user_documents.id, nullable)
- `import_id` (uuid, FK → imports.id, nullable)
- `date` (date)
- `description` (text)
- `merchant` (text)
- `amount` (decimal)
- `category` (text, nullable)
- `type` (text: 'expense', 'income', nullable)

---

## 🛡️ Security Features

### RLS-Safe Queries

All tools filter by `user_id` to ensure users can only access their own data:

```typescript
.eq('user_id', userId) // RLS-safe: filter by user_id
```

### Sensitive Data Protection

1. **`get_recent_documents`**: Does NOT return OCR text (only metadata)
2. **`get_document_by_id`**: Returns OCR text (already redacted by guardrails)
3. **Logging**: 
   - Dev mode: Logs document IDs and previews (first 100 chars)
   - Production: Logs only lengths and IDs (no sensitive content)

---

## 📝 Tool Registration

**File:** `src/agent/tools/index.ts`

All three tools are registered in the `toolModules` Map:

```typescript
['get_recent_documents', { ... }],
['get_document_by_id', { ... }],
['get_transactions_by_document', { ... }],
```

---

## 🗄️ Database Migration

**File:** `supabase/migrations/20250120_add_document_tools_to_employees.sql`

Adds tools to employee profiles:

- **Prime**: `get_recent_documents`, `get_document_by_id`
- **Byte**: `get_recent_documents`, `get_document_by_id`
- **Tag**: `get_transactions_by_document`

Migration is idempotent (safe to run multiple times).

---

## ✅ Verification Steps

### Step 1: Upload a Statement

1. Navigate to `/dashboard/smart-import-ai`
2. Upload a PDF/image file
3. Wait for OCR processing to complete
4. **Expected:** Document appears in `user_documents` table with `status='ready'`

### Step 2: Test Prime Chat - Show Latest Upload

1. Open Prime chat (`/dashboard/prime`)
2. Ask: **"Show my latest upload"**
3. **Expected:** Prime calls `get_recent_documents` tool
4. **Expected:** Prime responds with document metadata (name, status, date)
5. **Expected:** Prime offers Byte/Tag actions: "Want me to summarize it (Byte) or categorize it (Tag)?"

### Step 3: Test Byte Chat - Summarize Document

1. In Prime chat, ask: **"Summarize my latest upload"**
2. **Expected:** Prime hands off to Byte
3. **Expected:** Byte calls `get_document_by_id` tool
4. **Expected:** Byte receives redacted OCR text
5. **Expected:** Byte summarizes the document content

### Step 4: Test Tag Chat - Categorize Transactions

1. In Prime chat, ask: **"Categorize transactions from my latest upload"**
2. **Expected:** Prime hands off to Tag
3. **Expected:** Tag calls `get_transactions_by_document` tool
4. **Expected:** Tag receives transactions linked to the document
5. **Expected:** Tag suggests categories for uncategorized transactions

### Step 5: Verify Tool Debug Logging (Dev Mode)

1. Set `NETLIFY_DEV=true`
2. Execute any of the tools via chat
3. **Expected:** Console logs show:
   - Tool name and employee
   - Document IDs (not full OCR text)
   - Transaction counts
   - Summary statistics

---

## 🎯 Use Cases

### Prime Use Cases

- **"Show my latest upload"** → Calls `get_recent_documents`
- **"What documents have I uploaded?"** → Calls `get_recent_documents`
- **"Tell me about document [id]"** → Calls `get_document_by_id`
- **"Summarize my latest upload"** → Hands off to Byte with document ID

### Byte Use Cases

- **"Summarize this document"** → Calls `get_document_by_id` with document ID
- **"What's in my latest upload?"** → Calls `get_recent_documents`, then `get_document_by_id`
- **"Extract key information from [document name]"** → Calls `get_document_by_id`

### Tag Use Cases

- **"Categorize transactions from my latest upload"** → Calls `get_transactions_by_document`
- **"What transactions came from document [id]?"** → Calls `get_transactions_by_document`
- **"Show me uncategorized transactions from [document name]"** → Calls `get_transactions_by_document`, filters uncategorized

---

## 🔍 Tool Execution Flow

```
User: "Show my latest upload"
  ↓
Prime receives message
  ↓
Prime calls get_recent_documents(limit=5)
  ↓
Tool queries user_documents table (filtered by user_id)
  ↓
Returns document metadata (no OCR text)
  ↓
Prime formats response: "I see your latest upload: [document name]. Want me to summarize it (Byte) or categorize it (Tag)?"
  ↓
User: "Summarize it"
  ↓
Prime hands off to Byte with document ID
  ↓
Byte calls get_document_by_id(documentId)
  ↓
Tool queries user_documents table (filtered by user_id)
  ↓
Returns document with redacted OCR text
  ↓
Byte summarizes OCR text
  ↓
Byte responds with summary
```

---

## 📊 Error Handling

All tools return `Result<Ok, Err>` pattern:

- **Success:** Returns `Ok(output)` with validated output schema
- **Error:** Returns `Err(error)` with error message

Common errors:
- Document not found: "Document {id} not found or not accessible"
- Database error: Logs error code and message (no sensitive data)
- Invalid UUID: Zod validation error

---

## 🚀 Next Steps

1. **Run Migration:** Execute `supabase/migrations/20250120_add_document_tools_to_employees.sql`
2. **Test Tools:** Use verification steps above
3. **Monitor Logs:** Check tool execution logs in dev mode
4. **Update System Prompts:** (Optional) Add tool descriptions to employee system prompts

---

**End of Document**




