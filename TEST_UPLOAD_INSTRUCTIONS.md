# Upload Fix Test Instructions

## The Fix
We fixed the upload bug where the code expected `init.url` and `init.token` but the backend returns `init.uploadUrl` with auth embedded.

## Files Fixed
✅ src/lib/upload/uploadWithProgress.ts
✅ src/lib/ocr/requestOcrProcessing.ts  
✅ src/hooks/useSmartImport.ts (2 occurrences)
✅ src/pages/dev/UploadSpeedTest.tsx

## Testing Options

### Option 1: Automated Test Script (Recommended)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Wait for "Local: http://localhost:8888" message

2. **Run the test script** (in a new terminal):
   ```bash
   node test-upload-fix.js
   ```

   This will:
   - Call smart-import-init and verify it returns `uploadUrl`
   - Verify the old `url`/`token` fields are NOT present
   - Test uploading a file using the uploadUrl
   - Show success/failure status

### Option 2: Manual Browser Test

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser to:** http://localhost:8888

3. **Navigate to one of these upload pages:**
   - Smart Import AI: http://localhost:8888/dashboard/smart-import-ai
   - Byte Chat: http://localhost:8888/dashboard/byte-chat
   - Upload Speed Test: http://localhost:8888/dev/upload-speed-test

4. **Try uploading a file** (PDF, CSV, or image)

5. **Check browser console** (F12) for errors:
   - Before fix: You'd see errors about undefined URL or failed uploads
   - After fix: Upload should succeed with progress indicators

### Option 3: cURL Test

1. **Start the dev server**

2. **Test the init endpoint:**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/smart-import-init \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-123","filename":"test.pdf","mime":"application/pdf"}'
   ```

3. **Verify response contains:**
   - ✅ `uploadUrl` field (signed URL)
   - ✅ `docId` field
   - ✅ `storagePath` field
   - ❌ NO `url` or `token` fields (old format)

## What Success Looks Like

### Before the Fix:
```javascript
// Frontend tried to use:
fetch(init.url, {  // ❌ undefined
  headers: {
    'authorization': `Bearer ${init.token}`  // ❌ undefined
  }
})
// Result: Upload fails with network errors
```

### After the Fix:
```javascript
// Frontend now uses:
fetch(init.uploadUrl, {  // ✅ Contains signed URL with auth
  headers: {
    'content-type': file.type  // ✅ Only content-type needed
  }
})
// Result: Upload succeeds!
```

## Expected Test Results

### Automated Script:
```
🧪 Testing Upload Flow with uploadUrl fix...

Step 1: Calling smart-import-init...
✅ Init successful!
   Response keys: [ 'docId', 'uploadUrl', 'storagePath' ]
   Has uploadUrl? true
   Has docId? true
   Has storagePath? true
   
Step 2: Uploading test file...
✅ Upload successful!
   Status: 200 OK

✅ UPLOAD FIX TEST PASSED!
```

### Browser Test:
- File upload progress bar appears
- Upload completes successfully
- No console errors about "undefined" URL or auth
- OCR/processing starts automatically

## Troubleshooting

### If upload still fails:
1. Check browser console for the exact error
2. Verify the backend response structure in Network tab
3. Check that Supabase env vars are configured:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (backend)

### If test script fails:
- Make sure dev server is running on port 8888
- Check Netlify Functions are working: http://localhost:8888/.netlify/functions/smart-import-init
- Verify Node.js version (should be 18+)
