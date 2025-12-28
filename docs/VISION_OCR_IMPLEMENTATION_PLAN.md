# Vision OCR Implementation Plan

## Current Smart Import Flow Summary

### Upload Pipeline
1. **`smart-import-init.ts`** → Creates `user_documents` record, returns signed upload URL
2. **Client** → Uploads file to signed URL (stored in Supabase Storage `docs` bucket)
3. **`smart-import-finalize.ts`** → Routes based on mime type:
   - **Images/PDFs** → Calls `smart-import-ocr.ts`
   - **CSV/OFX/QIF** → Calls `smart-import-parse-csv.ts`

### OCR Pipeline (Images/PDFs)
1. **`smart-import-ocr.ts`**:
   - Creates signed URL for OCR service
   - Calls OCR.space API (or placeholder)
   - Applies **STRICT guardrails** (PII redaction)
   - Stores redacted OCR text in `user_documents.ocr_text`
   - Calls `normalize-transactions.ts` (fire-and-forget)

2. **`normalize-transactions.ts`**:
   - Reads `user_documents.ocr_text`
   - Calls `normalizeOcrResult()` from `ocr_normalize.ts`
   - `normalizeOcrResult()` already has AI fallback parser (text-based)
   - Saves to `transactions_staging` table
   - Updates `imports.status = 'parsed'`

### Transaction Storage
- Transactions saved to `transactions_staging` with:
  - `import_id` (links to `imports` table)
  - `user_id` (from auth)
  - `data_json` (normalized transaction data)
  - `hash` (for deduplication)

---

## Implementation Plan

### Step 1: Create Vision OCR Helper
**File:** `netlify/functions/_shared/visionStatementParser.ts`

**Purpose:** Use OpenAI Vision API directly on images to extract structured transactions

**Input:**
- `userId`: string
- `documentId`: string  
- `publicUrl`: string (public or signed URL to image in Supabase storage)
- `mimeType`: string (e.g., 'image/png', 'image/jpeg')

**Output:**
```typescript
{
  parsed: {
    summary: {
      institution?: string
      account_type?: string
      statement_period_start?: string | null
      statement_period_end?: string | null
      previous_balance?: number | null
      new_balance?: number | null
      credit_limit?: number | null
    }
    transactions: Array<{
      transaction_date: string | null      // YYYY-MM-DD
      posting_date: string | null          // YYYY-MM-DD
      description: string
      merchant_guess?: string | null
      amount: number                       // positive for charges, negative for payments
      currency?: string | null
      raw_row_text?: string | null
    }>
  }
  errors?: string[]
}
```

**Key Features:**
- Uses GPT-4o or GPT-4o-mini with vision capabilities
- Strict JSON response format
- Handles RBC ION Visa statement format (transaction table with dates, descriptions, amounts)
- Normalizes dates to YYYY-MM-DD
- Converts amounts: charges = positive, payments = negative
- JSON retry logic if first attempt fails

---

### Step 2: Wire Vision into OCR Pipeline
**File:** `netlify/functions/smart-import-ocr.ts`

**Changes:**
1. After OCR completes and guardrails are applied:
   - Check if `doc.mime_type` starts with `image/`
   - Check if OCR text parsing returns 0 transactions (via `normalize-transactions.ts` response or by checking `user_documents.ocr_text` length)
   
2. If image AND 0 transactions:
   - Get public URL from Supabase storage
   - Call `visionStatementParser()` 
   - Convert Vision output to `NormalizedTransaction[]` format
   - Save directly to `transactions_staging` (reuse logic from `normalize-transactions.ts`)
   - Update `imports.status = 'parsed'`
   - Mark document with `via: 'vision-parse'` metadata

**Alternative Approach:**
- Modify `normalize-transactions.ts` to detect image + 0 transactions → call Vision parser
- This keeps Vision logic separate from OCR function

---

### Step 3: Update Byte's Messages
**Files:**
- `src/utils/byteReview.ts` (if exists)
- Byte chat components
- Byte system prompt/knowledge base

**Changes:**
- Update Byte's response to mention Vision OCR fallback
- Remove "I can't read images" messages
- Add note when Vision parser is used: "I used my Vision OCR fallback to read this image statement"

---

### Step 4: Ensure Transactions Flow to Tag/Prime
**Verification:**
- Transactions saved to `transactions_staging` → automatically visible to Tag (Smart Categories)
- Transactions committed via `commit-import.ts` → visible to Prime (Transactions page)
- No changes needed - existing flow handles it

---

## Integration Points

### Where Vision Parser Will Be Called

**Option A: In `smart-import-ocr.ts` (after OCR fails)**
```
OCR → Guardrails → Store OCR text → Check transaction count
  → If image + 0 transactions → Call Vision parser → Save transactions
```

**Option B: In `normalize-transactions.ts` (when parsing OCR text)**
```
Read OCR text → normalizeOcrResult() → If 0 transactions
  → Check if image → Call Vision parser → Save transactions
```

**Recommendation:** Option B (in `normalize-transactions.ts`)
- Keeps Vision logic separate from OCR
- Reuses existing transaction saving logic
- Easier to test independently

---

## Testing Plan

1. **Upload RBC ION Visa screenshot** (`IMG_5613.png`)
2. **Watch logs:**
   - OCR runs → 0 transactions found
   - Vision parser triggered
   - Transactions extracted
3. **Verify:**
   - Transactions appear in Smart Categories
   - Byte shows "Found N transactions" message
   - Transactions visible to Tag/Prime

---

## Next Steps

1. Create `visionStatementParser.ts` helper
2. Modify `normalize-transactions.ts` to call Vision parser as fallback
3. Update Byte's messages/knowledge base
4. Test with RBC screenshot






