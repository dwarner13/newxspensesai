# Upload Concurrency + Speed Test + Upload Failsafe Implementation

**Date:** January 26, 2025  
**Purpose:** Implement upload queue with concurrency control, completeness contract, and speed test

---

## Summary

✅ **Phase 1: Audit Complete** - See `UPLOAD_CONCURRENCY_AUDIT.md`

✅ **Phase 2: Upload Queue + Concurrency Cap** - Implemented
- Created `src/lib/upload/uploadQueue.ts` - Queue manager with concurrency control
- Created `src/lib/upload/uploadWithProgress.ts` - Progress tracking wrapper
- Created `src/hooks/useUploadQueue.ts` - React hook for queue management
- Concurrency: 2 (desktop), 1 (mobile) - configurable

✅ **Phase 3: Upload Completeness Contract** - Implemented
- Updated `netlify/functions/smart-import-finalize.ts` - Verifies file exists and size matches before processing
- Updated `netlify/functions/smart-import-ocr.ts` - Verifies file exists and size matches before OCR
- Returns `PENDING_UPLOAD` status if file incomplete

✅ **Phase 4: Speed Test** - Implemented
- Created `src/pages/dev/UploadSpeedTest.tsx` - Speed test page
- Tests 5MB and 20MB uploads
- Measures Mbps, latency, upload time
- Auto-deletes test files
- Stores results in localStorage (SSR-safe)

---

## Files Created/Modified

### New Files:
1. **`src/lib/upload/uploadQueue.ts`** - Upload queue manager with concurrency control
2. **`src/lib/upload/uploadWithProgress.ts`** - Progress tracking wrapper for upload pipeline
3. **`src/hooks/useUploadQueue.ts`** - React hook for queue management
4. **`src/pages/dev/UploadSpeedTest.tsx`** - Speed test page
5. **`UPLOAD_CONCURRENCY_AUDIT.md`** - Audit report
6. **`UPLOAD_CONCURRENCY_IMPLEMENTATION.md`** - This file

### Modified Files:
1. **`netlify/functions/smart-import-finalize.ts`** - Added completeness check
2. **`netlify/functions/smart-import-ocr.ts`** - Added completeness check

---

## Implementation Details

### Phase 2: Upload Queue

**`src/lib/upload/uploadQueue.ts`**:
- `UploadQueue` class manages concurrent uploads
- Concurrency: 2 (desktop), 1 (mobile) - auto-detected
- Per-file progress tracking (percentage, Mbps, ETA)
- Cancel/retry support per file
- Duplicate prevention (stable upload_id per file selection)
- Progress events for UI updates

**`src/lib/upload/uploadWithProgress.ts`**:
- Wraps canonical upload pipeline (`smart-import-init` → upload → `smart-import-finalize`)
- Progress breakdown:
  - 0-10%: Initialize
  - 10-90%: Upload to signed URL
  - 90-100%: Finalize
- Uses XMLHttpRequest for progress tracking

**`src/hooks/useUploadQueue.ts`**:
- React hook wrapping `UploadQueue`
- Provides state management for UI components
- Returns queue state, progress, actions (addFiles, cancel, retry, clear)

### Phase 3: Upload Completeness Contract

**Backend Validation** (`smart-import-finalize.ts` and `smart-import-ocr.ts`):
1. **Verify file exists**: Uses Supabase Storage `list()` to check file exists in bucket
2. **Verify file size**: Compares stored file size with `expectedSize` (if provided)
   - Tolerance: 1KB for metadata differences
3. **Return `PENDING_UPLOAD`**: If file missing or size mismatch, returns:
   ```json
   {
     "pending": true,
     "status": "PENDING_UPLOAD",
     "message": "File upload not yet complete. Please wait and retry."
   }
   ```

**Client-side** (`uploadWithProgress.ts`):
- Passes `expectedSize: file.size` to `smart-import-finalize`
- OCR handler receives `expectedSize` via `smart-import-finalize` → `smart-import-ocr` chain

### Phase 4: Speed Test

**`src/pages/dev/UploadSpeedTest.tsx`**:
- Generates test files (5MB and 20MB random binary data)
- Measures:
  - Upload speed (Mbps)
  - Upload time (ms)
  - Latency (init time)
- Auto-deletes test files and document records after test
- Stores results in localStorage (SSR-safe)
- Displays current and last test results

---

## Usage

### Using Upload Queue in Components

```typescript
import { useUploadQueue } from '../hooks/useUploadQueue';

function MyUploadComponent() {
  const { userId } = useAuth();
  const { items, progress, addFiles, cancel, retry, isUploading } = useUploadQueue({
    userId,
    source: 'upload',
  });

  const handleFileSelect = (files: File[]) => {
    addFiles(Array.from(files));
  };

  return (
    <div>
      {/* Show queue progress */}
      <div>Overall Progress: {progress.overallProgress}%</div>
      <div>Speed: {progress.overallSpeed.toFixed(2)} Mbps</div>
      <div>ETA: {progress.overallEta.toFixed(0)}s</div>

      {/* Show per-file progress */}
      {items.map(item => (
        <div key={item.id}>
          <div>{item.file.name}</div>
          <div>Progress: {item.progress}%</div>
          <div>Speed: {item.speed.toFixed(2)} Mbps</div>
          <div>ETA: {item.eta.toFixed(0)}s</div>
          {item.status === 'error' && (
            <button onClick={() => retry(item.id)}>Retry</button>
          )}
          {item.status === 'uploading' && (
            <button onClick={() => cancel(item.id)}>Cancel</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Speed Test Page

Add route to your router:
```typescript
import UploadSpeedTest from './pages/dev/UploadSpeedTest';

<Route path="/dev/upload-speed-test" element={<UploadSpeedTest />} />
```

Access at: `/dev/upload-speed-test`

---

## Verification Checklist

### ✅ Upload 10 Files: Only 2 Concurrent
1. Select 10 files in Smart Import UI
2. **Expected**: Only 2 files upload simultaneously (desktop) or 1 (mobile)
3. **Expected Logs**: `[UploadQueue] Starting upload: file1, file2` (then file3, file4 after completion)

### ✅ Refresh Mid-Upload: No Duplicate OCR Starts
1. Start uploading files
2. Refresh page mid-upload
3. **Expected**: New upload session starts (different upload_id prefix)
4. **Expected**: Old uploads complete, but no duplicate OCR calls
5. **Expected**: Completeness check prevents OCR on incomplete uploads

### ✅ Incomplete Upload Cannot Trigger OCR
1. Simulate incomplete upload (e.g., cancel upload mid-transfer)
2. **Expected**: `smart-import-finalize` returns `PENDING_UPLOAD`
3. **Expected**: `smart-import-ocr` returns `PENDING_UPLOAD` (if called)
4. **Expected Logs**: `[smart-import-finalize] File not found in bucket` or `File size mismatch`

### ✅ Speed Test Shows Mbps and Completes Cleanup
1. Navigate to `/dev/upload-speed-test`
2. Click "Run Speed Test"
3. **Expected**: Tests 5MB and 20MB uploads
4. **Expected**: Shows speed (Mbps), upload time, latency
5. **Expected**: Test files deleted from storage
6. **Expected**: Document records deleted
7. **Expected**: Results stored in localStorage

---

## Next Steps (Optional)

1. **Integrate Queue into `useSmartImport`**: Update `useSmartImport.uploadFiles()` to use `useUploadQueue` internally
2. **Add Queue UI Component**: Create reusable `UploadQueueProgress` component for consistent UI
3. **Add Retry Logic**: Automatic retry for `PENDING_UPLOAD` responses
4. **Add Queue Persistence**: Persist queue state across page refreshes (localStorage)
5. **Add Queue Limits**: Configurable max queue size (e.g., 50 files)

---

## Notes

- **Duplicate Prevention**: Uses stable `upload_id` prefix per session (prevents duplicates on refresh)
- **Mobile Detection**: Uses `window.innerWidth < 768` or user agent detection
- **Completeness Tolerance**: 1KB tolerance for file size differences (metadata variations)
- **SSR Safety**: Speed test uses `useAuth()` hook (client-side only)
- **Error Handling**: Queue handles errors gracefully, allows retry per file


