# 🚀 SMART IMPORT AI — QUICK START GUIDE

**Time to Deploy:** 30 minutes  
**Dependencies:** Supabase, Netlify, OpenAI  
**Status:** ✅ Production Ready  

---

## 📋 STEP 1: Review Complete Documentation

📖 **Main Reference:**  
→ `XSPENSESAI_AUDIT_SMART_IMPORT.md` (comprehensive, 600+ lines)

Contains:
- Architecture audit (chat system + OCR pipeline)
- 12-bullet micro-plan
- File tree
- 8 complete unified diffs
- SQL migrations (idempotent)
- Env vars (dev + production)
- Tests & QA steps
- Security & telemetry

---

## 🔧 STEP 2: Apply File Changes

### Create New Files

#### A. React Components

**File 1:** `src/ui/components/Upload/StatementUpload.tsx`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 2
Location: Create new file
Lines: ~180 (drag-drop, MIME validation, 25MB limit, progress)
```

**File 2:** `src/lib/agents.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 8
Location: Create new file
Lines: ~70 (helper for calling Prime/Crystal)
```

#### B. Netlify Functions

**File 3:** `netlify/functions/ingest-statement.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 3
Location: Create new file
Lines: ~90 (upload to Storage, create imports record, trigger Byte)
```

**File 4:** `netlify/functions/byte-ocr-parse.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 4
Location: Create new file
Lines: ~250 (PDF/CSV/Image parsing, normalization, idempotent upsert)
```

**File 5:** `netlify/functions/prime-handoff.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 5
Location: Create new file
Lines: ~80 (Prime acknowledgment, create handoff record)
```

**File 6:** `netlify/functions/crystal-analyze-import.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 6
Location: Create new file
Lines: ~190 (Crystal insights, budget impact, forecast delta)
```

### Modify Existing Files

**File 7:** `src/pages/dashboard/SmartImportAI.tsx`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 1 (PATCH)
Location: Update existing file
Changes: Add upload card, parsed preview, advisory result UI
```

**File 8:** `src/ai/prime/buildPrompt.ts`
```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → File 7 (PATCH)
Location: Update existing file
Changes: Filter facts by confidence > 0.85
```

---

## 📊 STEP 3: Run SQL Migration

**File:** `sql/migrations/20251018_smart_import_schema.sql`

```
Copy from: XSPENSESAI_AUDIT_SMART_IMPORT.md → SQL MIGRATIONS section
```

### Option A: Supabase Dashboard (Recommended)
1. Open https://app.supabase.com → Your Project
2. Go to **SQL Editor**
3. Click **New Query**
4. Paste entire SQL script
5. Click **Run**
6. Verify: Tables created with no errors

### Option B: Supabase CLI
```bash
supabase db push
```

### Verify Success
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('imports', 'transactions_staging', 'handoffs', 'advice_messages');

-- Check RLS enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
AND tablename IN ('imports', 'transactions_staging', 'handoffs', 'advice_messages');
```

---

## 🔐 STEP 4: Set Environment Variables

### Local Development (`.env.local`)

```bash
# Copy these to your .env.local file

# Chat & Ingest Endpoints
VITE_CHAT_FUNCTION_PATH=/.netlify/functions/chat-v3-production
VITE_INGEST_STATEMENT_PATH=/.netlify/functions/ingest-statement
VITE_OCR_PARSE_PATH=/.netlify/functions/byte-ocr-parse
VITE_PRIME_HANDOFF_PATH=/.netlify/functions/prime-handoff
VITE_CRYSTAL_ANALYZE_PATH=/.netlify/functions/crystal-analyze-import

# Feature Flags
IMPORTS_ENABLED=1
BYTE_OCR_ENABLED=1
CRYSTAL_ENABLED=1
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1

# Storage
SUPABASE_STORAGE_BUCKET=xspenses-imports

# Timeouts (ms)
INGEST_TIMEOUT=30000
OCR_TIMEOUT=60000
PRIME_HANDOFF_TIMEOUT=10000
CRYSTAL_ANALYZE_TIMEOUT=30000

# Logging
LOG_LEVEL=debug
TELEMETRY_ENABLED=1
```

### Production (Netlify Dashboard)

**Go to:** Settings → Build & deploy → Environment

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
OPENAI_API_KEY=sk-...
SUPABASE_STORAGE_BUCKET=xspenses-imports
```

---

## 🧪 STEP 5: Test Deployment

### Create Test Data Directory

```bash
mkdir test-data
```

### Upload Test Files

**Option A: Create dummy files**
```bash
# Create PDF (minimal valid PDF)
echo "%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
200
%%EOF" > test-data/bank-statement.pdf
```

**Option B: Use real files**
```bash
# Copy actual bank statement, CSV, and receipt
cp ~/Downloads/statement.pdf test-data/bank-statement.pdf
cp ~/Downloads/transactions.csv test-data/transactions.csv
cp ~/Downloads/receipt.jpg test-data/receipt.jpg
```

### Run QA Tests (7 Steps)

```
# TEST 1: Upload PDF
1. Navigate: http://localhost:3000/dashboard/smart-import-ai
2. Drag & drop: test-data/bank-statement.pdf
3. Verify: Progress bar → 100%, upload card shows

# TEST 2: View Parsed Preview
1. Verify: Table shows rows (Date, Merchant, Category, Amount)
2. Check: First 20 rows displayed
3. Validate: Data looks correct

# TEST 3: Send to Prime & Crystal
1. Click: "Approve & Send to Prime & Crystal"
2. Wait: Processing state shows
3. Verify: No errors in browser console

# TEST 4: Check Database
# Run in Supabase SQL Editor:
SELECT COUNT(*) FROM imports WHERE status = 'completed';
SELECT COUNT(*) FROM transactions WHERE user_id = 'your-user-id';
SELECT COUNT(*) FROM handoffs WHERE from_employee = 'prime-boss';
SELECT COUNT(*) FROM advice_messages WHERE employee_key = 'crystal-analytics';

# TEST 5: View Crystal's Advisory
1. Verify: Advisory card shows
2. Check: Budget Impact visible
3. Check: Forecast Delta visible
4. Verify: Links to Transactions & Insights work

# TEST 6: Test CSV Upload
1. Drag & drop: test-data/transactions.csv
2. Repeat: Steps 1-5

# TEST 7: Test Image (OCR)
1. Drag & drop: test-data/receipt.jpg
2. Repeat: Steps 1-5
```

---

## 📋 CHECKLIST

```
□ Review XSPENSESAI_AUDIT_SMART_IMPORT.md (10 min)
□ Create 6 new Netlify functions (5 min)
□ Modify 2 existing React files (5 min)
□ Run SQL migration (2 min)
□ Set environment variables (3 min)
□ Test upload → preview → advisory (5 min)
□ Verify database records (2 min)
□ Check Netlify logs (2 min)
□ Ready for production ✅
```

---

## 🐛 TROUBLESHOOTING

### Issue: Upload fails with "MIME type not allowed"
**Fix:** Ensure StatementUpload.tsx has:
```typescript
const ACCEPTED_TYPES = ['application/pdf', 'text/csv', 'image/png', 'image/jpeg'];
```

### Issue: "Table already exists" error on SQL migration
**Fix:** SQL migration is idempotent (uses `create table if not exists`). Safe to re-run.

### Issue: Byte OCR parsing fails
**Fix:** Check dependencies:
```bash
npm install pdfjs-dist tesseract.js papaparse
```

### Issue: Crystal analysis missing or times out
**Fix:** Check in Netlify functions:
1. OpenAI API key is set
2. Crystal-analyze-import function has valid error handling
3. Handoff record exists in database

### Issue: RLS blocks queries
**Fix:** Verify RLS policies in Supabase:
```sql
SELECT * FROM pg_policies WHERE tablename = 'imports';
```
Should show 3 policies: select_own, insert_own, update_own

---

## 🔗 QUICK LINKS

| Resource | Path |
|----------|------|
| Main Audit | `XSPENSESAI_AUDIT_SMART_IMPORT.md` |
| SmartImportAI Page | `src/pages/dashboard/SmartImportAI.tsx` |
| Upload Component | `src/ui/components/Upload/StatementUpload.tsx` |
| Ingest Function | `netlify/functions/ingest-statement.ts` |
| OCR Function | `netlify/functions/byte-ocr-parse.ts` |
| Prime Handoff | `netlify/functions/prime-handoff.ts` |
| Crystal Analysis | `netlify/functions/crystal-analyze-import.ts` |
| SQL Migration | `sql/migrations/20251018_smart_import_schema.sql` |

---

## 📊 DATA FLOW (Quick Reference)

```
User uploads PDF
      ↓
StatementUpload.tsx validates (MIME, size)
      ↓
ingest-statement.ts → Supabase Storage
      ↓
Create imports record (status='pending')
      ↓
Trigger byte-ocr-parse.ts
      ↓
Parse PDF → normalize → validate
      ↓
Upsert to transactions_staging + transactions (idempotent)
      ↓
Update imports status='completed'
      ↓
SmartImportAI shows parsed preview
      ↓
User clicks "Approve & Send to Prime & Crystal"
      ↓
prime-handoff.ts creates handoff record
      ↓
Prime acknowledges + saves message
      ↓
crystal-analyze-import.ts runs analysis
      ↓
Crystal generates insights + saves to advice_messages
      ↓
SmartImportAI displays advisory result
```

---

## 🎯 EXPECTED OUTPUTS

### After Upload + Processing

**Database:**
```sql
-- imports table
id: uuid, user_id: uuid, status: 'completed', pages: N, file_type: 'application/pdf'

-- transactions table
(N rows added, user_id matches, posted_at filled, amount > 0)

-- handoffs table
id: uuid, from_employee: 'prime-boss', to_employee: 'crystal-analytics', status: 'completed'

-- advice_messages table
content: "Crystal's 2-3 sentence analysis", insights_json: {...}
```

**UI:**
```
Upload Card → Upload complete ✅
Preview Card → Table with 20 rows
Advisory Card → Crystal's insights + budget impact + forecast delta
Links → "View Transactions" + "View Insights"
```

---

## 📞 SUPPORT

For issues, check:
1. **Browser console** → Client-side errors
2. **Netlify functions logs** → Server errors
3. **Supabase SQL Editor** → Query errors
4. **RLS policies** → Permission denied errors

All code is TypeScript strict. Hover over errors for types.

---

## ✨ NEXT STEPS (After Deployment)

1. **Monitor Telemetry** → Check Netlify function logs for metrics
2. **Optimize OCR** → Adjust regex patterns for your bank statements
3. **Add More File Types** → Support Excel, OFX, MT940
4. **Batch Import** → Allow multiple files at once
5. **AI Categorization** → Use Tag agent to auto-categorize parsed rows

---

**Estimated Time to Production:** 30-45 minutes  
**Testing Time:** 10-15 minutes  
**Total:** ~1 hour  

🚀 **Ready to deploy!**





