# Upload Queue Integration - Complete

**Date:** January 26, 2025  
**Purpose:** Integration of upload queue into Smart Import with auto-retry and UI

---

## Summary

✅ **Phase 1: Integrate Queue into Smart Import** - Complete
✅ **Phase 2: Auto Retry on PENDING_UPLOAD** - Complete  
✅ **Phase 3: Queue UI Component** - Complete
✅ **Phase 4: DEV Route for Speed Test** - Complete

---

## Files Created/Modified

### New Files:
1. **`src/lib/upload/retryOcrProcessing.ts`** - Auto-retry logic for PENDING_UPLOAD
2. **`src/components/upload/UploadQueuePanel.tsx`** - Queue UI component

### Modified Files:
1. **`src/hooks/useSmartImport.ts`** - Integrated `useUploadQueue` for concurrent uploads
2. **`src/pages/dashboard/SmartImportAIPage.tsx`** - Uses queue and displays `UploadQueuePanel`
3. **`src/lib/ocr/requestOcrProcessing.ts`** - Returns PENDING_UPLOAD status code
4. **`src/App.tsx`** - Added DEV route for speed test (`/dashboard/dev/upload-speed-test`)

---

## Implementation Details

### Phase 1: Queue Integration

**`src/hooks/useSmartImport.ts`**:
- Now uses `useUploadQueue` internally for concurrent uploads
- `uploadFiles()` method enqueues files and waits for completion
- Maintains backward compatibility with existing API
- Exposes queue state via `uploadQueue` property

**Key Changes**:
- Replaced sequential `for` loop with queue-based uploads
- Concurrency: 2 (desktop), 1 (mobile) - auto-detected
- Dedupe prevention via stable upload IDs
- Progress tracking via queue events

### Phase 2: Auto Retry

**`src/lib/upload/retryOcrProcessing.ts`**:
- Handles `PENDING_UPLOAD` status automatically
- Exponential backoff: 500ms, 1s, 2s, 4s, 8s (max 5 attempts)
- Reuses `requestId` for idempotency
- Status callbacks: `uploading` → `finalizing` → `ready`/`failed`

**`src/lib/ocr/requestOcrProcessing.ts`**:
- Returns `PENDING_UPLOAD` error code when upload incomplete
- Passes `expectedSize` to finalize for completeness check

### Phase 3: Queue UI

**`src/components/upload/UploadQueuePanel.tsx`**:
- Displays queue with per-file progress
- Shows: file name, size, progress bar, speed (Mbps), ETA
- Status pills: queued/uploading/uploaded/processing/done/failed
- Cancel/retry buttons per file
- Overall progress and speed

**`src/pages/dashboard/SmartImportAIPage.tsx`**:
- Integrated `UploadQueuePanel` at top of page
- Only shows when queue has items
- Uses `smartImport.uploadQueue` for state

### Phase 4: Speed Test Route

**`src/App.tsx`**:
- Added route: `/dashboard/dev/upload-speed-test`
- DEV-only (checks `import.meta.env.DEV`)
- Lazy-loaded component

---

## Usage

### Using Queue in Components

```typescript
import { useSmartImport } from '../hooks/useSmartImport';

function MyComponent() {
  const { userId } = useAuth();
  const smartImport = useSmartImport(userId, 'upload');
  
  const handleFiles = (files: File[]) => {
    smartImport.uploadFiles(userId, files, 'upload')
      .then(results => {
        console.log('Upload complete:', results);
      })
      .catch(error => {
        console.error('Upload failed:', error);
      });
  };
  
  return (
    <div>
      {/* Queue Panel */}
      {smartImport.uploadQueue.items.length > 0 && (
        <UploadQueuePanel
          items={smartImport.uploadQueue.items}
          progress={smartImport.uploadQueue.progress}
          onCancel={smartImport.uploadQueue.cancel}
          onRetry={smartImport.uploadQueue.retry}
        />
      )}
      
      {/* File Input */}
      <input type="file" multiple onChange={e => {
        if (e.target.files) {
          handleFiles(Array.from(e.target.files));
        }
      }} />
    </div>
  );
}
```

### Auto-Retry (Internal)

Auto-retry is handled automatically when `requestOcrProcessing` returns `PENDING_UPLOAD`. No manual intervention needed.

---

## Verification Checklist

### ✅ Upload 10 Files: Only 2 Concurrent (Desktop)
1. Navigate to `/dashboard/smart-import-ai`
2. Select 10 files
3. **Expected**: Only 2 files upload simultaneously
4. **Expected**: Remaining files queue and start as slots become available
5. **Expected**: Queue panel shows progress for all files

### ✅ Refresh Mid-Upload: No Duplicate Uploads/OCR
1. Start uploading files
2. Refresh page mid-upload
3. **Expected**: New upload session starts (different upload_id prefix)
4. **Expected**: Old uploads complete, but no duplicate OCR calls
5. **Expected**: Completeness check prevents OCR on incomplete uploads

### ✅ PENDING_UPLOAD Auto Retries and Succeeds
1. Simulate incomplete upload (cancel mid-transfer or delete file from storage)
2. **Expected**: `smart-import-finalize` returns `PENDING_UPLOAD`
3. **Expected**: Auto-retry logic retries with exponential backoff
4. **Expected**: UI shows "Finalizing upload..." status
5. **Expected**: OCR proceeds once upload completes

### ✅ Queue UI Updates Correctly
1. Upload multiple files
2. **Expected**: Queue panel shows all files
3. **Expected**: Per-file progress bars update in real-time
4. **Expected**: Speed and ETA update dynamically
5. **Expected**: Cancel/retry buttons work correctly
6. **Expected**: Status pills update (pending → uploading → completed)

### ✅ Speed Test Page Works and Cleans Up
1. Navigate to `/dashboard/dev/upload-speed-test` (DEV only)
2. Click "Run Speed Test"
3. **Expected**: Tests 5MB and 20MB uploads
4. **Expected**: Shows speed (Mbps), upload time, latency
5. **Expected**: Test files deleted from storage
6. **Expected**: Document records deleted
7. **Expected**: Results stored in localStorage

---

## Notes

- **Dedupe Prevention**: Uses stable upload IDs (`filename-size-timestamp`) to prevent duplicate uploads
- **Mobile Detection**: Auto-detects mobile (< 768px) and uses concurrency = 1
- **Error Handling**: Queue handles errors gracefully, allows retry per file
- **Backward Compatibility**: `useSmartImport` maintains existing API, queue is internal
- **DEV Route**: Speed test route only available in development mode

---

## Next Steps (Optional)

1. **Add Queue Persistence**: Persist queue state across page refreshes (localStorage)
2. **Add Queue Limits**: Configurable max queue size (e.g., 50 files)
3. **Add Batch Operations**: Cancel all, retry all failed
4. **Add Queue History**: Show completed uploads from previous sessions
5. **Add Upload Analytics**: Track average speed, success rate, etc.


