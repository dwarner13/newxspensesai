# XspensesAI OCR System - Comprehensive Overview

## 1. Byte Smart Import AI - Complete Workflow

### Document Upload Flow

```
User Uploads Document
    ↓
smart-import-init.ts
    ├─ Creates user_documents record (status='pending')
    ├─ Creates imports record (status='pending')
    ├─ Generates signed upload URL (5 min expiry)
    └─ Returns { docId, importId, url, token }
    ↓
User uploads file to signed URL (Supabase Storage)
    ↓
smart-import-finalize.ts
    ├─ Downloads file from storage
    ├─ Routes based on MIME type:
    │   ├─ Images/PDFs → smart-import-ocr.ts
    │   └─ CSV/OFX/QIF → smart-import-parse-csv.ts
    └─ Returns { queued: true, via: 'ocr' | 'statement-parse' }
    ↓
[For Images/PDFs]
smart-import-ocr.ts
    ├─ Creates signed URL for OCR service
    ├─ Runs OCR (Google Vision or OCR.space)
    ├─ Applies STRICT guardrails (PII redaction)
    ├─ Stores redacted OCR text
    ├─ Updates user_documents.ocr_text
    └─ Queues normalize-transactions.ts
    ↓
normalize-transactions.ts
    ├─ Reads OCR text from user_documents
    ├─ Parses OCR text → NormalizedTransaction[]
    ├─ Saves to transactions_staging table
    └─ Updates imports.status = 'ready'
```

### Storage Locations

**Supabase Storage Bucket: `docs`**
- Original files: `{docId}.{ext}` (e.g., `abc123.pdf`)
- OCR results: `{docId}.ocr.json` (contains redacted text + metadata)
- Redacted text: `{docId}.txt` (for CSV/OFX files)

**Database Tables:**
- `user_documents` - Document metadata and OCR text
- `imports` - Import tracking and status
- `transactions_staging` - Parsed transactions before commit
- `transactions` - Final committed transactions

---

## 2. OCR Technology & Processing

### OCR Providers (Priority Order)

1. **Google Cloud Vision API** (Primary for images)
   - Used when `GOOGLE_VISION_API_KEY` is configured
   - Feature: `DOCUMENT_TEXT_DETECTION`
   - Best for: High-quality image receipts/invoices

2. **OCR.space API** (Fallback for PDFs/images)
   - Used when `OCR_SPACE_API_KEY` is configured
   - Language: English (`eng`)
   - Best for: PDF documents and image fallback

3. **Placeholder** (No provider configured)
   - Returns: `"OCR output placeholder - configure GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY"`

### OCR Processing Code

```typescript
// netlify/functions/smart-import-ocr.ts
async function runOCR(signedUrl: string, mimeType: string): Promise<string> {
  const hasVision = !!process.env.GOOGLE_VISION_API_KEY;
  const hasOcrSpace = !!process.env.OCR_SPACE_API_KEY;
  const isImage = mimeType.startsWith('image/') && !mimeType.includes('pdf');

  // 1) Prefer Google Vision for images
  if (isImage && hasVision) {
    const result = await callGoogleVisionOnImage({
      imageUrl: signedUrl,
      apiKey: process.env.GOOGLE_VISION_API_KEY,
      feature: 'DOCUMENT_TEXT_DETECTION',
    });
    if (result.fullText?.trim()) return result.fullText;
  }

  // 2) Fallback to OCR.space
  if (hasOcrSpace) {
    const formData = new FormData();
    formData.append('url', signedUrl);
    formData.append('apikey', process.env.OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    if (result.ParsedResults?.[0]?.ParsedText) {
      return result.ParsedResults[0].ParsedText;
    }
  }

  // 3) Placeholder if no provider configured
  return 'OCR output placeholder...';
}
```

### Security: Guardrails Integration

**All OCR output runs through STRICT guardrails before storage:**

```typescript
// netlify/functions/smart-import-ocr.ts
const guardrailResult = await runGuardrailsForText(
  ocrText, 
  userId, 
  'ingestion_ocr'  // OCR stage
);

if (!guardrailResult.ok) {
  // Document blocked - mark as rejected
  await markDocStatus(docId, 'rejected', `Blocked: ${guardrailResult.reasons.join(', ')}`);
  return { rejected: true, reasons: guardrailResult.reasons };
}

// Store REDACTED text only
const ocrData = {
  text: guardrailResult.text,  // ← Redacted
  pii_found: guardrailResult.signals?.pii || false,
  pii_types: guardrailResult.signals?.piiTypes || [],
  processed_at: new Date().toISOString()
};
```

---

## 3. Data Extraction & Format

### Extracted Fields

**From Receipts/Invoices:**
- `merchant` / `vendor` - Merchant name
- `date` - Transaction date
- `amount` / `total` - Total amount
- `items[]` - Line items (name, qty, unit, price)
- `tax` - Tax amount
- `currency` - Currency code (default: 'CAD')
- `paymentMethod` - Payment method if detected

**From Bank Statements:**
- `date` - Posted date
- `merchant` - Merchant/description
- `amount` - Transaction amount (positive = credit, negative = debit)
- `currency` - Currency code

### OCR Result Data Structure

```typescript
// Stored in user_documents.ocr_text (redacted)
interface OCRData {
  text: string;              // Redacted OCR text
  pii_found: boolean;
  pii_types: string[];       // e.g., ['email', 'phone', 'account_number']
  processed_at: string;      // ISO timestamp
}

// Parsed Transaction Structure
interface NormalizedTransaction {
  userId: string;
  kind: 'invoice' | 'receipt' | 'bank';
  date?: string;             // ISO date string
  merchant?: string;
  amount?: number;            // Positive = credit, negative = debit
  currency?: string;          // Default: 'CAD'
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price?: number;
  }>;
  docId?: string;            // Links to user_documents.id
}
```

### Parsing Logic

**Primary Parser (Rules-Based):**
- Detects BMO Everyday Banking statements
- Parses bank statement formats (date, merchant, amount patterns)
- Returns `NormalizedTransaction[]` synchronously

**AI Fallback Parser:**
- Used when primary parser returns 0 transactions
- Uses OpenAI GPT-4 with structured output
- Detects statement type: `'credit_card' | 'bank' | 'unknown'`
- Returns transactions with `source_type: 'ocr_ai_fallback'`

```typescript
// netlify/functions/_shared/ocr_normalize.ts
export async function normalizeOcrResult(
  text: string, 
  userId: string,
  openaiClient?: OpenAI
): Promise<NormalizedTransaction[]> {
  // 1. Try BMO format detection
  if (/Your Everyday Banking statement/i.test(text)) {
    const bmoTransactions = parseBmoEverydayStatement(text);
    if (bmoTransactions.length > 0) return bmoTransactions;
  }

  // 2. Try general bank statement parser
  const bankTransactions = normalizeBankStatement(text);
  if (bankTransactions.length > 0) return bankTransactions;

  // 3. AI fallback if OpenAI client available
  if (openaiClient) {
    const aiTransactions = await aiFallbackParseTransactions({
      ocrText: text,
      statementType: detectStatementType(text),
      openaiClient,
    });
    return aiTransactions;
  }

  return [];
}
```

### Confidence Scoring

**Not currently implemented in OCR stage**, but available in:
- `transaction_categorization.confidence` (0.0-1.0) - For category assignments
- `user_documents.extraction_confidence` - Planned but not yet populated

---

## 4. Database Schema

### user_documents Table

```sql
CREATE TABLE public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  mime_type text,
  status text DEFAULT 'pending',  -- 'pending', 'ready', 'rejected'
  storage_path text,               -- Path in Supabase Storage
  ocr_text text,                   -- REDACTED OCR text
  ocr_completed_at timestamptz,
  pii_types text[],                -- Array of detected PII types
  rejection_reason text,           -- If status='rejected'
  source text DEFAULT 'upload',    -- 'upload', 'chat', 'gmail'
  content_hash text,                -- SHA256 for duplicate detection
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### imports Table

```sql
CREATE TABLE public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text,
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'parsing', 'ready', 'failed'
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### transactions_staging Table

```sql
CREATE TABLE public.transactions_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_json jsonb NOT NULL,        -- NormalizedTransaction data
  hash text,                        -- SHA256 hash for idempotency
  parsed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, hash)
);
```

### transactions Table (Final)

```sql
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  posted_at date NOT NULL,
  merchant_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text,
  subcategory text,
  import_id uuid REFERENCES public.imports(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL,
  hash text,                        -- For idempotency
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, posted_at, amount, hash)
);
```

---

## 5. User Interface Touch Points

### Upload Locations

1. **Smart Import AI Page** (`/dashboard/smart-import-ai`)
   - Main upload interface
   - Drag-and-drop zone
   - File picker
   - Camera capture (mobile)
   - Component: `SmartImportAIPage.tsx`

2. **Document Upload Zone** (Chat interfaces)
   - Component: `DocumentUploadZone.tsx`
   - Used in: Byte chat, Prime chat, unified chat
   - Supports: PDF, CSV, Excel, TXT, JPG, PNG
   - Max: 5 files, 10MB each

3. **Byte Lab Page** (`/byte-lab`)
   - Experimental upload interface
   - Component: `ByteLabPage.tsx`

### User Feedback During Processing

**File Status States:**
- `uploading` - File being uploaded to storage
- `processing` - OCR/parsing in progress
- `completed` - Successfully processed
- `error` - Processing failed

**Processing Steps Displayed:**
1. "Uploading and validating file..."
2. "Extracting text with OCR..."
3. "Parsing document structure..."
4. "Categorizing transactions..."
5. "Applying learning algorithms..."

**UI Components:**
- Progress indicators with step-by-step status
- File list with status badges
- Error messages with troubleshooting
- Transaction count display after completion

### Review/Approval Interfaces

**Currently:**
- No explicit review/approval UI exists
- Transactions go directly to `transactions_staging` → `transactions`
- Users can review on Transactions page after import

**Planned:**
- Review interface for `transactions_staging` before commit
- Ability to edit/approve/reject individual transactions

---

## 6. API Endpoints & Integration Points

### Netlify Functions

#### 1. `smart-import-init`
**Purpose:** Initialize document upload
**Method:** POST
**Request:**
```json
{
  "userId": "uuid",
  "filename": "receipt.pdf",
  "mime": "application/pdf",
  "source": "upload" | "chat"
}
```
**Response:**
```json
{
  "docId": "uuid",
  "importId": "uuid",
  "path": "abc123.pdf",
  "url": "https://signed-upload-url",
  "token": "upload-token"
}
```

#### 2. `smart-import-finalize`
**Purpose:** Route uploaded file to processor
**Method:** POST
**Request:**
```json
{
  "userId": "uuid",
  "docId": "uuid"
}
```
**Response:**
```json
{
  "queued": true,
  "via": "ocr" | "statement-parse",
  "pii_redacted": boolean
}
```

#### 3. `smart-import-ocr`
**Purpose:** Extract text from images/PDFs
**Method:** POST
**Request:**
```json
{
  "userId": "uuid",
  "docId": "uuid"
}
```
**Response:**
```json
{
  "ok": true,
  "pii_redacted": boolean,
  "pii_types": ["email", "phone"],
  "text_length": 1234
}
```

#### 4. `byte-ocr-parse`
**Purpose:** Parse OCR text to transactions
**Method:** POST
**Request:**
```json
{
  "importId": "uuid",
  "userId": "uuid",
  "text": "optional direct OCR text",
  "ocrText": "optional direct OCR text",
  "preview": false
}
```
**Response:**
```json
{
  "ok": true,
  "source": "byte-ocr-parse",
  "importId": "uuid",
  "userId": "uuid",
  "summary": {
    "totalTransactions": 5
  },
  "transactions": [
    {
      "userId": "uuid",
      "kind": "bank",
      "date": "2024-01-15",
      "merchant": "STARBUCKS",
      "amount": -5.50,
      "currency": "CAD"
    }
  ],
  "preview": [...],
  "metadata": {
    "parser": "normalizeOcrResult" | "ai_fallback",
    "detectedFormat": "BMO Everyday Banking",
    "usedAiFallback": false
  }
}
```

#### 5. `normalize-transactions`
**Purpose:** Convert OCR text to transactions_staging
**Method:** POST
**Request:**
```json
{
  "userId": "uuid",
  "documentId": "uuid"
}
```
**Response:**
```json
{
  "ok": true,
  "importId": "uuid",
  "transactionsCreated": 5,
  "status": "ready"
}
```

### Integration with Transactions Page

**Query Pattern:**
```typescript
// Get documents with OCR text
const { data: documents } = await supabase
  .from('user_documents')
  .select('id, original_name, ocr_text, ocr_completed_at, status')
  .eq('user_id', userId)
  .eq('status', 'ready')
  .order('created_at', { ascending: false });

// Get transactions from imports
const { data: transactions } = await supabase
  .from('transactions')
  .select('*, import:imports(*, document:user_documents(*))')
  .eq('user_id', userId)
  .order('posted_at', { ascending: false });

// Get pending transactions in staging
const { data: staging } = await supabase
  .from('transactions_staging')
  .select('*, import:imports(*, document:user_documents(*))')
  .eq('user_id', userId)
  .order('parsed_at', { ascending: false });
```

### Webhooks/Callbacks

**Currently:** No webhooks - uses polling or direct function calls

**Polling Pattern:**
```typescript
// Check document status
const checkStatus = async (docId: string) => {
  const { data } = await supabase
    .from('user_documents')
    .select('status, ocr_completed_at, rejection_reason')
    .eq('id', docId)
    .single();
  
  if (data?.status === 'ready') {
    // OCR complete - fetch transactions
    const transactions = await fetchTransactionsForDocument(docId);
  }
};
```

**Real-time Updates:**
- Use Supabase Realtime subscriptions:
```typescript
supabase
  .channel('documents')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'user_documents', filter: `user_id=eq.${userId}` },
    (payload) => {
      if (payload.new.status === 'ready') {
        // Refresh transactions
      }
    }
  )
  .subscribe();
```

---

## 7. Code Examples

### Uploading a Document

```typescript
// 1. Initialize upload
const initResponse = await fetch('/.netlify/functions/smart-import-init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    filename: file.name,
    mime: file.type,
    source: 'upload'
  })
});

const { docId, importId, url, token } = await initResponse.json();

// 2. Upload file to signed URL
await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': file.type
  },
  body: file
});

// 3. Finalize (triggers OCR)
await fetch('/.netlify/functions/smart-import-finalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id, docId })
});

// 4. Poll for completion
const pollStatus = setInterval(async () => {
  const { data } = await supabase
    .from('user_documents')
    .select('status, ocr_completed_at')
    .eq('id', docId)
    .single();
  
  if (data?.status === 'ready') {
    clearInterval(pollStatus);
    // Fetch transactions
    const transactions = await fetchTransactionsForDocument(docId);
  }
}, 2000);
```

### Fetching OCR Results

```typescript
// Get document with OCR text
const { data: doc } = await supabase
  .from('user_documents')
  .select('id, original_name, ocr_text, ocr_completed_at, pii_types')
  .eq('id', docId)
  .single();

// Parse OCR text to transactions
const parseResponse = await fetch('/.netlify/functions/byte-ocr-parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    importId: importId,
    userId: user.id,
    text: doc.ocr_text  // Direct OCR text input
  })
});

const { transactions, summary } = await parseResponse.json();
```

### Querying Transactions from OCR

```typescript
// Get all transactions from OCR imports
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    *,
    import:imports!inner(
      id,
      document:user_documents!inner(
        id,
        original_name,
        ocr_text,
        ocr_completed_at
      )
    )
  `)
  .eq('user_id', userId)
  .not('import.document_id', 'is', null)
  .order('posted_at', { ascending: false });
```

---

## 8. Key Files Reference

### Core Functions
- `netlify/functions/smart-import-init.ts` - Upload initialization
- `netlify/functions/smart-import-finalize.ts` - File routing
- `netlify/functions/smart-import-ocr.ts` - OCR processing
- `netlify/functions/byte-ocr-parse.ts` - OCR text parsing
- `netlify/functions/normalize-transactions.ts` - Transaction normalization

### Shared Utilities
- `netlify/functions/_shared/ocr_normalize.ts` - OCR normalization logic
- `netlify/functions/_shared/ocr_parsers.ts` - Statement parsers
- `netlify/functions/_shared/vision/googleVisionClient.ts` - Google Vision API
- `netlify/functions/_shared/guardrails-unified.ts` - PII redaction

### UI Components
- `src/pages/dashboard/SmartImportAIPage.tsx` - Main upload page
- `src/components/chat/DocumentUploadZone.tsx` - Upload component
- `src/components/smartImport/DocList.tsx` - Document list display

### Database Migrations
- `supabase/migrations/20250203_smart_import_phase1_schema.sql` - Core schema

---

## Summary

The OCR system in XspensesAI is a **secure, multi-stage pipeline** that:

1. **Uploads** documents to Supabase Storage via signed URLs
2. **Routes** files based on type (images/PDFs → OCR, CSV/OFX → parser)
3. **Extracts** text using Google Vision API or OCR.space
4. **Redacts** PII using guardrails before storage
5. **Parses** OCR text to normalized transactions (rules + AI fallback)
6. **Stores** transactions in staging table, then commits to main table
7. **Integrates** with Transactions page via standard Supabase queries

**Security:** All OCR output is redacted before storage. Raw PII never touches the database.

**Scalability:** Async processing with status tracking. No blocking operations.

**Flexibility:** Supports multiple document types, OCR providers, and parsing strategies.







