# Smart Import Upload Paths Documentation

## Pipeline Overview

### Current Flow:
```
1. smart-import-init
   ↓ Creates doc record, returns signed URL
   
2. Client uploads file to signed URL
   ↓ File stored in Supabase Storage
   
3. smart-import-finalize
   ↓ Routes by file type:
   ├─ Images/PDFs → smart-import-ocr (async)
   └─ CSV/OFX/QIF → smart-import-parse-csv (async)
   
4. smart-import-ocr / smart-import-parse-csv
   ↓ Applies guardrails, extracts text
   ↓ Calls normalize-transactions (async)
   
5. normalize-transactions
   ↓ Extracts transactions, categorizes (Tag), inserts to staging
   ↓ Returns transactionCount
   
6. commit-import (MANUAL - not automatic)
   ↓ Moves transactions from staging to final table
```

## Upload Entry Points

### ✅ Canonical Pipeline (useSmartImport hook)
- **File**: `src/hooks/useSmartImport.ts`
- **Function**: `uploadFiles(userId, files[], source)`
- **Calls**: `uploadFile()` for each file
- **Flow**: init → upload → finalize → (async OCR/parse → normalize → staging)
- **Used by**: 
  - `SmartImportChatPage.tsx` (Dashboard)
  - `ByteUnifiedCard.tsx` (via props)

### ⚠️ Direct uploadFile Calls (Need Refactoring)
- **File**: `src/components/chat/EmployeeChatWorkspace.tsx`
  - Line 382: `await uploadFile(userId, file, 'chat')`
  - **Issue**: Calls hook function directly, bypasses shared state
  
- **File**: `src/components/chat/UnifiedAssistantChat.tsx`
  - Line 270: `await uploadFile(userId, file, 'chat')`
  - **Issue**: Calls hook function directly, bypasses shared state

### ⚠️ Manual Commit Paths
- **File**: `src/pages/dashboard/SmartImportAI.tsx`
  - Line 98: `commit-import` called manually
  - **Issue**: Separate flow, not integrated with uploadFiles

- **File**: `src/components/smart-import/ImportList.tsx`
  - Line 91: `commit-import` called manually

## Netlify Functions

### Core Functions:
1. **smart-import-init** (`netlify/functions/smart-import-init.ts`)
   - Creates `user_documents` record
   - Returns signed upload URL
   - **Called by**: `uploadFile()` in useSmartImport

2. **smart-import-finalize** (`netlify/functions/smart-import-finalize.ts`)
   - Routes by file type
   - Calls OCR or CSV parser (async)
   - **Called by**: `uploadFile()` in useSmartImport

3. **smart-import-ocr** (`netlify/functions/smart-import-ocr.ts`)
   - Runs OCR on images/PDFs
   - Applies guardrails
   - Calls `normalize-transactions` (async)
   - **Called by**: `smart-import-finalize`

4. **smart-import-parse-csv** (`netlify/functions/smart-import-parse-csv.ts`)
   - Parses CSV/OFX/QIF
   - Applies guardrails
   - Calls `normalize-transactions` (async)
   - **Called by**: `smart-import-finalize`

5. **normalize-transactions** (`netlify/functions/normalize-transactions.ts`)
   - Extracts transactions from OCR/parsed text
   - Categorizes via Tag AI
   - Inserts to `transactions_staging` table
   - Returns `transactionCount`
   - **Called by**: `smart-import-ocr`, `smart-import-parse-csv`

6. **commit-import** (`netlify/functions/commit-import.ts`)
   - Moves transactions from staging to final table
   - **Status**: MANUAL - not called automatically
   - **Called by**: User action in UI

## Issues Identified

### 1. Transaction Count Not Available Immediately
- `uploadFile()` returns after `finalize`, but normalization is async
- `transactionCount` in `UploadResult` is undefined until normalization completes
- **Fix**: Poll for completion or use webhooks/events

### 2. Multiple Upload Entry Points
- `EmployeeChatWorkspace` and `UnifiedAssistantChat` call `uploadFile` directly
- They should use `uploadFiles` from `useSmartImport` hook
- **Fix**: Refactor to use hook instance

### 3. Commit Not Automatic
- Transactions stay in staging until manual commit
- `uploadFiles` doesn't trigger commit automatically
- **Fix**: Add optional auto-commit flag or separate commit step

### 4. Activity Feed Events
- `lastUploadSummary` is set immediately after upload
- But `transactionCount` may be 0 if normalization hasn't completed
- **Fix**: Update summary when normalization completes (via polling or events)

## Recommended Fixes

1. **Make uploadFiles the single entry point**
   - Refactor `EmployeeChatWorkspace` and `UnifiedAssistantChat` to use hook
   - Remove direct `uploadFile` calls from components

2. **Add transaction count polling**
   - After upload completes, poll `normalize-transactions` status
   - Update `lastUploadSummary` when count is available

3. **Optional auto-commit**
   - Add flag to `uploadFiles`: `autoCommit?: boolean`
   - If true, call `commit-import` after normalization completes

4. **Event-driven updates**
   - Use Supabase realtime or event bus for normalization completion
   - Update Activity Feed when transactions are ready








