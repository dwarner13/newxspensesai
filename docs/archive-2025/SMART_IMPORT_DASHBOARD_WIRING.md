# Smart Import Dashboard Wiring Map

**Date:** 2025-01-20  
**Status:** ✅ Complete Integration  
**Objective:** Wire OCR/Smart Import into Dashboard with canonical upload flow

---

## 📋 Wiring Map

### Complete Flow: Dashboard CTA → Smart Import → OCR Pipeline → Transactions

```
1. DASHBOARD CTA BUTTON
   ↓
   Location: src/components/dashboard/sections/OverviewSection.tsx:158
   Action: navigate('/dashboard/smart-import-ai?auto=upload')
   ↓
   
2. SMART IMPORT CARD (Dashboard)
   ↓
   Location: src/components/dashboard/SmartImportCard.tsx
   - Shows recent 3 uploads from imports table
   - Status badges (queued/processing/parsed/failed)
   - "Upload Receipt/Statement" CTA button
   - "View All Imports" link
   ↓
   Action: navigate('/dashboard/smart-import-ai?auto=upload')
   ↓
   
3. SMART IMPORT PAGE
   ↓
   Location: src/pages/dashboard/SmartImportAI.tsx
   - Checks ?auto=upload query param (line 53-56)
   - Emits UPLOAD_REQUESTED event
   - StatementUpload component listens and opens file picker
   ↓
   
4. STATEMENT UPLOAD COMPONENT
   ↓
   Location: src/ui/components/Upload/StatementUpload.tsx
   - User selects file
   - Calls get-upload-url → gets signed URL
   - Uploads file to Supabase Storage
   - Calls ingest-statement → creates import record
   - Calls byte-ocr-parse → triggers OCR
   - Emits PARSE_COMPLETED event
   ↓
   
5. OCR PIPELINE (Backend - Already Working)
   ↓
   netlify/functions/smart-import-ocr.ts
   - Downloads file from Storage
   - Runs OCR (Google Vision or OCR.space)
   - Applies STRICT guardrails (PII redaction)
   - Stores redacted OCR text in user_documents.ocr_text
   - Calls normalize-transactions (async)
   ↓
   
6. NORMALIZE TRANSACTIONS
   ↓
   netlify/functions/normalize-transactions.ts
   - Parses OCR text → NormalizedTransaction[]
   - Saves to transactions_staging table
   - Commits to transactions table (idempotent upsert)
   ↓
   
7. VISIBLE RESULTS
   ↓
   - Smart Import Card shows updated status
   - Import History shows parsed transactions
   - Transactions page shows new transactions
   - Chat can reference document content
```

---

## 📁 File Changes Summary

### 1. New Component: SmartImportCard

**File:** `src/components/dashboard/SmartImportCard.tsx` (NEW)

**Features:**
- Fetches recent 3 uploads from `imports` table
- Displays status badges (queued/processing/parsed/failed)
- Shows transaction count for committed imports
- "Upload Receipt/Statement" CTA button
- "View All Imports" link
- "View Results" button for parsed imports

**Database Query:**
```typescript
SELECT id, file_url, file_type, status, created_at, committed_count
FROM imports
WHERE user_id = userId
ORDER BY created_at DESC
LIMIT 3
```

---

### 2. Updated: CoreAIToolsSection

**File:** `src/components/dashboard/sections/CoreAIToolsSection.tsx`

**Change:** Replaced generic Smart Import card with enhanced SmartImportCard component

**Before:** Generic DashboardStatCard with basic stats  
**After:** SmartImportCard showing recent uploads with status badges

---

### 3. Updated: OverviewSection

**File:** `src/components/dashboard/sections/OverviewSection.tsx`

**Change:** Added "Upload Receipt/Statement" CTA button

**Location:** Line 158-167  
**Action:** `navigate('/dashboard/smart-import-ai?auto=upload')`

---

### 4. Updated: SmartImportAI Page

**File:** `src/pages/dashboard/SmartImportAI.tsx`

**Changes:**
- Added StatementUpload component (hidden, mounted)
- Added event listener for UPLOAD_REQUESTED
- Calls `uploadRef.current.open(accept)` when event received

**Flow:**
1. Page loads with `?auto=upload` query param
2. Emits `UPLOAD_REQUESTED` event
3. StatementUpload listens and opens file picker
4. User selects file → canonical upload flow begins

---

## 🔄 Canonical Upload Flow (No Duplicates)

### Single Upload Handler

**Component:** `StatementUpload` (`src/ui/components/Upload/StatementUpload.tsx`)

**Used By:**
- ✅ SmartImportAI page (mounted directly)
- ✅ Dashboard CTA buttons (via event bus)
- ✅ Smart Import Card (via navigation + event bus)

**Flow:**
```
UPLOAD_REQUESTED event
  ↓
StatementUpload.open(accept)
  ↓
File picker opens
  ↓
User selects file
  ↓
get-upload-url → signed URL
  ↓
Upload to Supabase Storage
  ↓
ingest-statement → creates import
  ↓
byte-ocr-parse → OCR processing
  ↓
PARSE_COMPLETED event
  ↓
Preview shown in SmartImportAI page
```

**No Duplicate Handlers:** All uploads go through StatementUpload component

---

## 🎨 UI Design

### Smart Import Card

**Styling:**
- Matches existing dashboard card design
- Uses `rounded-3xl`, `border-slate-700/60`, `bg-slate-900/70`
- Consistent spacing (`p-6`, `gap-6`)
- No scrollbars (fixed height, overflow handled)
- Premium look with gradient buttons

**Layout:**
- Header: Icon + Title + Subtitle
- Recent Uploads List: Max 3 items, scrollable if needed
- CTA Button: Full-width gradient button
- View All Link: Subtle link below button

---

## ✅ Verification Steps

### Step 1: Upload from Dashboard CTA

1. Navigate to `/dashboard`
2. Find "Upload Receipt/Statement" button in Prime welcome card
3. Click button
4. **Expected:** Navigate to `/dashboard/smart-import-ai?auto=upload`
5. **Expected:** File picker opens automatically (desktop only)

### Step 2: Upload File

1. Select a PDF/image file
2. Wait for upload to complete
3. **Expected:** See "Uploading…" toast/indicator
4. **Expected:** Navigate to Smart Import page (if not already there)
5. **Expected:** See preview table with parsed transactions

### Step 3: Verify Smart Import Card Shows Recent Upload

1. Navigate back to `/dashboard`
2. Find Smart Import card in "CORE AI TOOLS" section
3. **Expected:** See your recent upload in the list
4. **Expected:** Status badge shows "Processing" or "Parsed"
5. **Expected:** Transaction count shown (if parsed)

### Step 4: View Results

1. In Smart Import card, click "View Results" (eye icon) for parsed import
2. **Expected:** Navigate to `/dashboard/smart-import-ai?importId=<id>`
3. **Expected:** See preview table with parsed transactions
4. **Expected:** Can commit transactions if status is "parsed"

### Step 5: Verify Status Updates

1. Upload a new file
2. Watch Smart Import card
3. **Expected:** New upload appears in list
4. **Expected:** Status changes: "Queued" → "Processing" → "Parsed"
5. **Expected:** Transaction count appears when parsed

### Step 6: Verify Transactions Appear

1. Commit an import (if status is "parsed")
2. Navigate to `/dashboard/transactions`
3. **Expected:** See new transactions from imported document
4. **Expected:** Transactions are properly categorized

---

## 📊 Database Tables Used

### imports Table
- **Read:** `SELECT id, file_url, file_type, status, created_at, committed_count FROM imports WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`
- **Purpose:** Show recent uploads in Smart Import card

### user_documents Table
- **Read:** OCR text for chat context
- **Write:** Document metadata and redacted OCR text

### transactions_staging Table
- **Write:** Parsed transactions before commit
- **Read:** Preview transactions

### transactions Table
- **Write:** Final committed transactions
- **Read:** Display in Transactions page

---

## 🔗 Route Mapping

### Dashboard Routes

- `/dashboard` → Main dashboard (shows Smart Import card)
- `/dashboard/smart-import-ai` → Smart Import page
- `/dashboard/smart-import-ai?auto=upload` → Smart Import page (auto-opens file picker)
- `/dashboard/smart-import-ai?importId=<id>` → Smart Import page (shows specific import)

### Navigation Flow

```
Dashboard CTA → /dashboard/smart-import-ai?auto=upload
Smart Import Card → /dashboard/smart-import-ai?auto=upload
View Results → /dashboard/smart-import-ai?importId=<id>
View All Imports → /dashboard/smart-import-ai
```

---

## 🎯 Key Integration Points

### 1. Event Bus Integration

**Event:** `UPLOAD_REQUESTED`  
**Emitter:** Dashboard CTA, Smart Import Card, Smart Import page tiles  
**Listener:** SmartImportAI page → calls StatementUpload.open()

**Event:** `PARSE_COMPLETED`  
**Emitter:** StatementUpload component  
**Listener:** SmartImportAI page → shows preview table

### 2. Database Integration

**Reads:**
- `imports` table → Recent uploads for card
- `user_documents` table → Document metadata
- `transactions` table → Transaction count

**Writes:**
- `imports` table → New import record (via ingest-statement)
- `user_documents` table → Document + OCR text (via smart-import-ocr)
- `transactions_staging` table → Parsed transactions (via normalize-transactions)
- `transactions` table → Committed transactions (via commit-import)

### 3. Component Integration

**SmartImportCard:**
- Fetches data from `imports` table
- Navigates to Smart Import page
- Shows status badges and transaction counts

**SmartImportAI Page:**
- Mounts StatementUpload component
- Listens to UPLOAD_REQUESTED events
- Shows preview and import history

**StatementUpload:**
- Handles file picker
- Uploads to Supabase Storage
- Triggers OCR pipeline
- Emits events for status updates

---

## 🚀 Summary

### What Was Added

1. ✅ **SmartImportCard Component** - Shows recent uploads with status badges
2. ✅ **Dashboard CTA Button** - "Upload Receipt/Statement" in OverviewSection
3. ✅ **Event Bus Integration** - UPLOAD_REQUESTED → StatementUpload.open()
4. ✅ **StatementUpload Mount** - Added to SmartImportAI page

### What Was Preserved

1. ✅ **Canonical Upload Flow** - All uploads use StatementUpload component
2. ✅ **Existing OCR Pipeline** - No backend changes needed
3. ✅ **Existing Routes** - Smart Import page unchanged
4. ✅ **Existing Design** - Cards match dashboard styling

### No Duplicates

- ✅ Single upload handler (StatementUpload)
- ✅ Single event bus (src/lib/bus.ts)
- ✅ Single Smart Import page (/dashboard/smart-import-ai)
- ✅ Single OCR pipeline (smart-import-ocr.ts)

---

**End of Wiring Map**




