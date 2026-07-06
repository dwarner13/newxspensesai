# Byte Work Visibility - Verification Checklist

**Date:** January 26, 2025  
**Purpose:** Step-by-step verification of Byte visibility implementation

---

## Prerequisites

- Development server running (`npm run dev`)
- Netlify functions running (`netlify dev`)
- Supabase `ai_activity_events` table exists
- User authenticated

---

## Test 1: One Completion Event Per Import Run

### Steps:
1. Upload 3 files via Smart Import UI
2. Wait for uploads to complete
3. Call `smart-import-sync` (or wait for auto-sync)
4. Check `ai_activity_events` table

### Expected Behavior:
- ✅ ONE event with `event_type='byte.import.completed'`
- ✅ Event has `import_run_id` in details
- ✅ Event has `doc_count=3` in details
- ✅ Event has `doc_ids` array with 3 doc IDs

### Expected Logs:
```
[smart-import-sync] Sync complete { docIds: [...], transactionCount: X }
[logByteImportCompleted] Event logged for importRunId: import-...
```

### Verify in Supabase:
```sql
SELECT id, event_type, status, label, details->>'import_run_id' as import_run_id, details->>'doc_count' as doc_count
FROM ai_activity_events
WHERE event_type = 'byte.import.completed'
ORDER BY created_at DESC
LIMIT 5;
-- Should show ONE event per import run
```

### Retry Test:
1. Call `smart-import-sync` again with same docIds
2. **Expected**: No duplicate event created
3. **Expected Logs**: `[logByteImportCompleted] Event already exists for importRunId: ..., skipping`

---

## Test 2: Prime Shows Summary Exactly Once

### Steps:
1. Complete an import run (upload files, sync completes)
2. Navigate to `/dashboard/prime-chat`
3. Check Activity Feed sidebar (right side)

### Expected Behavior:
- ✅ Activity feed shows Byte completion event
- ✅ Shows: "Byte finished importing X documents"
- ✅ Shows doc count, transaction count, pages (if PDFs)
- ✅ Shows integrity badge (Verified ✅ or Warning)
- ✅ "View results" button present
- ✅ "Chat with Byte" button present

### Expected UI:
```
📄 Byte finished importing 3 documents
   Imported 3 documents and created 15 transactions.
   📄 3 docs • 15 transactions • 5 pages
   [Verified ✅]
   View results • Chat with Byte
   just now
```

### Click Actions:
1. Click "View results" → **Expected**: Navigates to `/dashboard/smart-import-ai`
2. Click "Chat with Byte" → **Expected**: Opens chat with Byte, shows context about imported docs

### Verify No Duplicates:
1. Refresh Prime chat page
2. **Expected**: Same event shown once (not duplicated)
3. **Expected**: Event appears in chronological order with other activity

---

## Test 3: Custodian Verified Shows for Successful Runs

### Steps:
1. Upload files and complete import (all successful)
2. Check Upload Queue Panel (Smart Import page)
3. Check Prime Activity Feed
4. Check `ai_activity_events` table

### Expected Behavior:
- ✅ Upload Queue Panel shows "Verified ✅" badge on completed files
- ✅ Prime Activity Feed shows "Verified ✅" badge in ByteActivityItem
- ✅ Event in `ai_activity_events` has `integrity_verified: true` in details

### Expected UI (Upload Queue Panel):
```
file1.pdf
[Completed] [Verified ✅]
```

### Expected UI (Prime Activity Feed):
```
📄 Byte finished importing 3 documents
   [Verified ✅]
```

### Verify in Supabase:
```sql
SELECT details->>'integrity_verified' as verified, details->>'integrity_reason' as reason
FROM ai_activity_events
WHERE event_type = 'byte.import.completed'
ORDER BY created_at DESC
LIMIT 1;
-- Should show: verified = "true", reason = null
```

### Integrity Failure Test:
1. Manually reject a document (update `user_documents.status = 'rejected'`)
2. Complete import run
3. **Expected**: Integrity badge shows "Warning" (not Verified)
4. **Expected**: Event has `integrity_verified: false` and `integrity_reason` in details

---

## Test 4: No Duplicate Chat Messages Introduced

### Steps:
1. Complete an import run (all successful, verified=true)
2. Check Custodian chat (`/dashboard/custodian` or settings)
3. Check `chat_messages` table

### Expected Behavior:
- ✅ No automatic chat message from Custodian if `verified=true`
- ✅ Custodian chat shows no new messages about Byte imports
- ✅ No duplicate system messages in `chat_messages` table

### Verify in Supabase:
```sql
-- Check for duplicate system messages about Byte imports
SELECT id, role, content, created_at
FROM chat_messages
WHERE role = 'system' AND content LIKE '%Byte%' OR content LIKE '%import%'
ORDER BY created_at DESC
LIMIT 10;
-- Should show no duplicates for same import run
```

### Exception Test (if implemented):
1. Complete import run with integrity failure (`verified=false`)
2. **Expected**: Custodian may show warning message (if exception-only chat implemented)
3. **Expected**: Only ONE message per integrity failure (not per document)

---

## Test 5: Activity Feed Reads from ai_activity_events

### Steps:
1. Complete an import run
2. Navigate to Prime chat page
3. Check browser network tab for activity-feed requests

### Expected Behavior:
- ✅ `activity-feed` function called with `category=prime` (if on Prime page)
- ✅ Response includes Byte completion event
- ✅ Event has correct format: `{ id, createdAt, actorSlug, title, description, category, severity, metadata, eventType }`

### Expected Network Request:
```
GET /.netlify/functions/activity-feed?userId=...&limit=30&category=prime
Response: {
  "ok": true,
  "events": [
    {
      "id": "...",
      "createdAt": "...",
      "actorSlug": "byte-docs",
      "actorLabel": "Byte",
      "title": "Byte finished importing 3 documents",
      "description": "Imported 3 documents and created 15 transactions.",
      "category": "smart-import",
      "severity": "success",
      "metadata": {
        "import_run_id": "...",
        "doc_count": 3,
        "txn_count": 15,
        "integrity_verified": true
      },
      "eventType": "byte.import.completed"
    }
  ]
}
```

---

## Troubleshooting

### Issue: No events showing in Prime activity feed
- **Check**: `activity-feed.ts` function exists and is deployed?
- **Check**: `ai_activity_events` table has events?
- **Check**: User ID matches in events?
- **Fix**: Verify `activity-feed.ts` reads from `ai_activity_events` correctly

### Issue: Duplicate events appearing
- **Check**: `import_run_id` is being generated consistently?
- **Check**: Idempotency check is working (`details->>import_run_id` query)?
- **Fix**: Verify `generateImportRunId` uses stable `requestId` or docIds

### Issue: Integrity badge not showing
- **Check**: Document status is `ready`?
- **Check**: `ocr_text` exists for images/PDFs?
- **Check**: File exists in storage?
- **Fix**: Verify integrity check logic in `custodianIntegrityCheck.ts`

### Issue: Custodian chat messages appearing
- **Check**: Is `verified=false`?
- **Check**: Exception-only chat logic implemented?
- **Fix**: Ensure Custodian only chats on exceptions (if implemented)

---

## Success Criteria

✅ One completion event per import run  
✅ Prime shows summary exactly once  
✅ Custodian verified shows for successful runs  
✅ No duplicate chat messages introduced  
✅ Activity feed reads from `ai_activity_events` correctly

---

## Database Verification Queries

### Check for duplicate events:
```sql
SELECT 
  details->>'import_run_id' as import_run_id,
  COUNT(*) as count
FROM ai_activity_events
WHERE event_type = 'byte.import.completed'
GROUP BY details->>'import_run_id'
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

### Check integrity verification:
```sql
SELECT 
  id,
  label,
  details->>'doc_count' as doc_count,
  details->>'integrity_verified' as verified,
  details->>'integrity_reason' as reason
FROM ai_activity_events
WHERE event_type = 'byte.import.completed'
ORDER BY created_at DESC
LIMIT 10;
```

### Check event details structure:
```sql
SELECT 
  id,
  event_type,
  status,
  label,
  details
FROM ai_activity_events
WHERE event_type = 'byte.import.completed'
ORDER BY created_at DESC
LIMIT 1;
-- Should show: import_run_id, doc_count, doc_ids, txn_count, pages, integrity_verified, etc.
```


