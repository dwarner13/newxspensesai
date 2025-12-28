# Upload Concurrency + Speed Test + Upload Failsafe - Verification Checklist

**Date:** January 26, 2025  
**Purpose:** Step-by-step verification of implemented features

---

## Prerequisites

- Development server running (`npm run dev`)
- Netlify functions running (`netlify dev`)
- Supabase Storage bucket `docs` exists
- User authenticated

---

## Test 1: Upload 10 Files - Only 2 Concurrent (Desktop)

### Steps:
1. Navigate to Smart Import page (`/dashboard/smart-import`)
2. Select 10 files (PDFs, images, CSVs - mix is fine)
3. Click "Upload" or trigger upload
4. Observe upload progress

### Expected Behavior:
- ✅ Only 2 files upload simultaneously (desktop)
- ✅ Remaining files queue and start as slots become available
- ✅ Per-file progress bars show individual progress
- ✅ Overall progress shows combined progress
- ✅ Speed (Mbps) and ETA displayed per file and overall

### Expected Logs:
```
[UploadQueue] Starting upload: file1.pdf
[UploadQueue] Starting upload: file2.jpg
[UploadQueue] Item progress: file1.pdf (45%)
[UploadQueue] Item completed: file1.pdf
[UploadQueue] Starting upload: file3.pdf
```

### Mobile Test:
- Resize browser to < 768px width OR use mobile device
- ✅ Only 1 file uploads at a time

---

## Test 2: Refresh Mid-Upload - No Duplicate OCR Starts

### Steps:
1. Start uploading 5 files
2. Wait for 2-3 files to start uploading
3. Refresh page (F5 or Cmd+R)
4. Check Netlify function logs for `smart-import-ocr`

### Expected Behavior:
- ✅ New upload session starts (different upload_id prefix)
- ✅ Old uploads complete (if they were already in progress)
- ✅ No duplicate OCR calls for same file
- ✅ Completeness check prevents OCR on incomplete uploads

### Expected Logs:
```
[smart-import-finalize] File not found in bucket: user_123/doc_abc.pdf
[smart-import-finalize] Returning PENDING_UPLOAD status
```

### Verify in Supabase:
```sql
-- Check for duplicate document records
SELECT id, original_name, created_at 
FROM user_documents 
WHERE original_name = 'test.pdf' 
ORDER BY created_at DESC;
-- Should show only one record per unique file
```

---

## Test 3: Incomplete Upload Cannot Trigger OCR

### Steps:
1. **Method A - Cancel Upload:**
   - Start uploading a large file (10MB+)
   - Cancel upload mid-transfer (close browser tab or cancel button)
   - Check if OCR was triggered

2. **Method B - Simulate Incomplete Upload:**
   - Upload file normally
   - Manually delete file from Supabase Storage before finalize completes
   - Check OCR handler response

### Expected Behavior:
- ✅ `smart-import-finalize` returns `PENDING_UPLOAD` status
- ✅ `smart-import-ocr` returns `PENDING_UPLOAD` status (if called)
- ✅ No OCR processing occurs
- ✅ Document status remains `pending` or shows error

### Expected Logs:
```
[smart-import-finalize] File not found in bucket: user_123/doc_abc.pdf
[smart-import-finalize] Returning PENDING_UPLOAD status
[smart-import-ocr] File not found in bucket listing: user_123/doc_abc.pdf
[smart-import-ocr] Returning PENDING_UPLOAD status
```

### Expected Response:
```json
{
  "pending": true,
  "status": "PENDING_UPLOAD",
  "message": "File upload not yet complete. Please wait and retry."
}
```

---

## Test 4: Speed Test Shows Mbps and Completes Cleanup

### Steps:
1. Navigate to `/dev/upload-speed-test` (or add route if not exists)
2. Click "Run Speed Test" button
3. Wait for tests to complete (5MB and 20MB)
4. Check Supabase Storage for test files
5. Check localStorage for stored results

### Expected Behavior:
- ✅ Tests run sequentially (5MB, then 20MB)
- ✅ Shows speed (Mbps) for each test
- ✅ Shows upload time and latency
- ✅ Test files deleted from Supabase Storage
- ✅ Document records deleted from `user_documents`
- ✅ Results stored in localStorage
- ✅ "Last Test Results" section shows previous results

### Expected UI:
```
Test Results
├─ 5 MB
│  ├─ Speed: X.XX Mbps
│  ├─ Upload Time: X.XXs
│  ├─ Latency: XXXms
│  └─ Timestamp: HH:MM:SS
└─ 20 MB
   ├─ Speed: X.XX Mbps
   ├─ Upload Time: X.XXs
   ├─ Latency: XXXms
   └─ Timestamp: HH:MM:SS
```

### Verify Cleanup:
```sql
-- Check for test files (should be empty)
SELECT id, original_name, created_at 
FROM user_documents 
WHERE original_name LIKE 'speed-test-%'
ORDER BY created_at DESC;
-- Should return 0 rows after test completes
```

### Verify localStorage:
```javascript
// In browser console
JSON.parse(localStorage.getItem('upload_speed_test_last_result'));
// Should return array of test results
```

---

## Test 5: File Size Verification

### Steps:
1. Upload a file (e.g., 5MB PDF)
2. Check `smart-import-finalize` logs for size verification
3. Verify OCR runs only after size matches

### Expected Behavior:
- ✅ `smart-import-finalize` receives `expectedSize` from client
- ✅ Compares stored file size with `expectedSize`
- ✅ Tolerance: 1KB (allows for metadata differences)
- ✅ OCR only runs if size matches (within tolerance)

### Expected Logs:
```
[smart-import-finalize] Verifying file completeness: user_123/doc_abc.pdf
[smart-import-finalize] Expected size: 5242880, Stored size: 5242880
[smart-import-finalize] Size match: OK
[smart-import-finalize] Proceeding with OCR
```

### Size Mismatch Test:
- Manually modify file size in storage (if possible)
- ✅ Should return `PENDING_UPLOAD` if size mismatch > 1KB

---

## Test 6: Queue Progress UI (If Integrated)

### Steps:
1. Use `useUploadQueue` hook in a component
2. Upload multiple files
3. Observe queue progress UI

### Expected UI Elements:
- ✅ Overall progress bar (0-100%)
- ✅ Overall speed (Mbps)
- ✅ Overall ETA (seconds)
- ✅ Per-file progress bars
- ✅ Per-file speed and ETA
- ✅ Cancel button per file (if uploading)
- ✅ Retry button per file (if error)

### Expected State:
```typescript
{
  items: [
    { id: '...', file: File, status: 'uploading', progress: 45, speed: 2.5, eta: 10 },
    { id: '...', file: File, status: 'pending', progress: 0, speed: 0, eta: 0 },
  ],
  progress: {
    total: 2,
    completed: 0,
    uploading: 1,
    pending: 1,
    overallProgress: 22.5,
    overallSpeed: 2.5,
    overallEta: 10,
  }
}
```

---

## Troubleshooting

### Issue: Queue not limiting concurrency
- **Check**: Mobile detection working? (`window.innerWidth < 768`)
- **Check**: Concurrency parameter passed correctly?
- **Fix**: Verify `isMobile()` function in `uploadQueue.ts`

### Issue: Completeness check always fails
- **Check**: Supabase Storage bucket `docs` exists?
- **Check**: File path correct? (`doc.storage_path`)
- **Fix**: Verify `storage_path` is set correctly in `smart-import-init`

### Issue: Speed test fails cleanup
- **Check**: User has permission to delete from Storage?
- **Check**: Document record exists before deletion?
- **Fix**: Add error handling for cleanup failures (non-blocking)

### Issue: Duplicate uploads on refresh
- **Check**: `uploadIdPrefixRef` generating unique prefix?
- **Check**: `generateUploadId` includes timestamp?
- **Fix**: Ensure prefix includes timestamp and random component

---

## Success Criteria

✅ All tests pass  
✅ No duplicate OCR calls  
✅ No OCR on incomplete uploads  
✅ Concurrency limited correctly  
✅ Speed test completes and cleans up  
✅ Queue progress UI works (if integrated)

---

## Next Steps After Verification

1. **Integrate Queue into `useSmartImport`**: Replace sequential uploads with queue
2. **Add Queue UI Component**: Create reusable progress component
3. **Add Retry Logic**: Automatic retry for `PENDING_UPLOAD` responses
4. **Add Queue Persistence**: Persist queue state across refreshes
5. **Add Queue Limits**: Configurable max queue size


