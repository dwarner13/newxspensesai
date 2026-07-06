# Upload Concurrency Audit Report

**Date:** January 26, 2025  
**Purpose:** Audit current upload limits and concurrency behavior

---

## Current Limits Found

### File Count Limits:
- **SmartImportAIPage.tsx** (line 354): `MAX_FILES = 10`
- **ByteDocumentChat_backup.tsx** (line 152): `MAX_FILES = 5`
- **PrimeUpload.tsx** (line 18): `MAX_FILES_PER_UPLOAD = 1`

### File Size Limits:
- **SmartImportAIPage.tsx** (line 355): `MAX_FILE_SIZE = 10MB` (10 * 1024 * 1024)
- **ByteDocumentChat_backup.tsx** (line 153): `MAX_FILE_SIZE = 10MB`
- **PrimeUpload.tsx** (line 17): `MAX_MB = 25`

### Concurrency Behavior:
- **useSmartImport.ts** (line 261): **Sequential uploads** - "Upload sequentially to avoid rate limiting"
  ```typescript
  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(userId, files[i], source);
    results.push(result);
  }
  ```
- No concurrent uploads currently implemented
- No concurrency cap or queue system

### Server/Function Limits:
- **smart-import-init.ts**: No explicit limits found
- **smart-import-finalize.ts**: No explicit limits found
- **smart-import-ocr.ts**: No explicit limits found

---

## Current Upload Flow

1. **Frontend:** `useSmartImport.uploadFiles()` → Sequential loop
2. **Step 1:** `smart-import-init` → Creates doc record, returns signed URL
3. **Step 2:** Client uploads file to signed URL (PUT request)
4. **Step 3:** `smart-import-finalize` → Triggers OCR/parse (async)
5. **Step 4:** `smart-import-ocr` → Runs OCR (no completeness check)

---

## Issues Identified

### ❌ No Concurrency Control
- All uploads are sequential (one at a time)
- No parallel uploads for better performance
- No concurrency cap (could overwhelm server with many files)

### ❌ No Upload Completeness Check
- OCR can run before upload completes
- No verification that file exists in bucket before OCR
- No size verification (file size matches expected)

### ❌ No Speed Metrics
- No upload speed measurement (Mbps)
- No ETA calculation
- No per-file progress tracking

### ❌ No Duplicate Prevention
- Double-click or refresh can start duplicate uploads
- No stable upload_id key per file selection

---

## Practical Limits Summary

| Component | Max Files | Max Size | Concurrency |
|-----------|-----------|----------|-------------|
| SmartImportAIPage | 10 | 10MB | Sequential |
| ByteDocumentChat | 5 | 10MB | Sequential |
| PrimeUpload | 1 | 25MB | Sequential |
| useSmartImport | Unlimited* | No limit* | Sequential |

*No explicit limits in hook, relies on UI components

---

## Recommendations

1. **Add Upload Queue** - Concurrency cap: 2 (desktop), 1 (mobile)
2. **Add Completeness Contract** - Verify upload before OCR
3. **Add Speed Test** - Measure and display Mbps
4. **Add Duplicate Prevention** - Stable upload_id per file selection


