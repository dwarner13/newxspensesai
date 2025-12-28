# Smart Import Demo User & user_documents Table Fix

## Summary of Changes

All code has been updated to:
1. Use consistent demo user UUID: `00000000-0000-4000-8000-000000000001`
2. Use `user_documents` table instead of `documents` table
3. Map field names correctly (e.g., `original_name` instead of `file_name`, `created_at` instead of `uploaded_at`)

## Files Modified

### Frontend
- `src/constants/demoUser.ts` - NEW: Centralized demo user constant
- `src/services/smartImportConversation.ts` - Updated to use `user_documents` and demo UUID
- `src/components/chat/_legacy/ByteDocumentChat.tsx` - Updated all `default-user` references to use `getUserId()`
- `src/services/AIService.js` - Updated default userId parameter to demo UUID
- `src/utils/aiService.ts` - Updated default userId to demo UUID
- `src/lib/universalAIEmployeeConnection.ts` - Updated default userId to demo UUID

### Worker/Backend
- `worker/src/store/documentStore.ts` - Updated to use `user_documents` table and ensure UUID userId
- `worker/src/supabase.ts` - Updated `createDocument`, `updateDocumentStatus`, `getDocument`, `getCategorizationRules` to use `user_documents` and ensure UUID userId
- `worker/src/categorize/index.ts` - Updated to use demo UUID instead of `default-user`

## Field Mappings

The code now maps fields as follows when saving to `user_documents`:

| StoredDocument Field | user_documents Column |
|---------------------|----------------------|
| `id` | `id` |
| `userId` | `user_id` (ensured to be UUID) |
| `fileName` | `original_name` |
| `docType` | `doc_type` |
| `transactionCount` | `transaction_count` |
| `summary` | `summary` |
| `totalDebits` | `total_debits` |
| `totalCredits` | `total_credits` |
| `periodStart` | `period_start` |
| `periodEnd` | `period_end` |
| `uploadedAt` | `created_at` |
| `redactedUrl` | `storage_path` |
| `status` | `status` |

Additional fields set:
- `source`: `'upload'`
- `mime_type`: Inferred from filename
- `updated_at`: Current timestamp

## Database Schema Requirements

The `user_documents` table should have these columns (or the code will gracefully fall back to in-memory storage):

```sql
CREATE TABLE user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_name text,
  doc_type text,
  transaction_count integer DEFAULT 0,
  summary text,
  total_debits numeric(12,2) DEFAULT 0,
  total_credits numeric(12,2) DEFAULT 0,
  period_start date,
  period_end date,
  status text DEFAULT 'pending',
  source text NOT NULL DEFAULT 'upload',
  mime_type text,
  storage_path text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Testing Instructions

### 1. Start Services
```bash
# Terminal 1: Worker
npm run worker:dev

# Terminal 2: Netlify Functions
npm run netlify:dev
```

### 2. Open Smart Import AI Page
Navigate to: `http://localhost:8888/dashboard/smart-import-ai`

### 3. Expected Console Logs

**On Page Load:**
- ✅ No errors about `invalid input syntax for type uuid: "default-user"`
- ✅ No errors about `Could not find the table 'public.documents'`
- ✅ `[SmartImportConversation]` logs should show successful conversation creation/fetch
- ✅ `[SmartImportConversation]` logs should show recent documents fetch (may be empty initially)

**During Upload:**
- ✅ `[DocumentStore]` logs should show attempt to save to `user_documents`
- ✅ If table exists: Success logs
- ✅ If table missing: Warning logs but processing continues

**After Upload Completes:**
- ✅ No `400` errors on chat sessions
- ✅ No `404` errors on documents
- ✅ Byte's review message appears
- ✅ Prime's follow-up message appears

### 4. Verify Database Rows

**Check `chat_sessions` table:**
```sql
SELECT id, user_id, employee_slug, title, context, created_at 
FROM chat_sessions 
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC 
LIMIT 5;
```

Expected:
- At least one row with `employee_slug = 'prime-boss'`
- `user_id` should be `00000000-0000-4000-8000-000000000001` (UUID format)
- `context` should contain `{"workspace": "smart_import_ai"}`

**Check `user_documents` table:**
```sql
SELECT id, user_id, original_name, doc_type, transaction_count, summary, 
       total_debits, total_credits, period_start, period_end, created_at
FROM user_documents 
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC 
LIMIT 5;
```

Expected:
- Rows for each uploaded document
- `user_id` should be `00000000-0000-4000-8000-000000000001` (UUID format)
- `original_name` should match the uploaded filename
- `doc_type` should be `'bank_statement'` or `'receipt'`
- `transaction_count`, `summary`, `total_debits`, `total_credits` should be populated if processing succeeded

### 5. Test Recent Documents Recall

1. Upload a PDF bank statement
2. Wait for processing to complete
3. Refresh the page
4. Prime should show a welcome message mentioning the uploaded document
5. Check browser console - should see `[SmartImportConversation]` logs fetching recent documents successfully

### 6. Verify No More Errors

**Before Fix:**
- ❌ `invalid input syntax for type uuid: "default-user"`
- ❌ `Could not find the table 'public.documents'`
- ❌ `Failed to create session with code 22P02`
- ❌ `Failed to fetch recent documents with code PGRST205`

**After Fix:**
- ✅ All UUIDs are valid UUID format
- ✅ All queries use `user_documents` table
- ✅ Session creation succeeds
- ✅ Recent documents fetch succeeds (or returns empty array gracefully)

## Notes

- If `user_documents` table is missing required columns, the code will log warnings but continue processing (using in-memory storage as fallback)
- The demo user UUID is consistent across all services
- All `default-user` strings have been replaced with the demo UUID or `getUserId()` helper
- The code gracefully handles missing tables but will persist to database when tables exist










