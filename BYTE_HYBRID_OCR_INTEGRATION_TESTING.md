# Byte's Hybrid OCR Integration - Testing Guide

**Date:** February 20, 2025  
**Status:** ✅ **INTEGRATED**

---

## 📋 What Changed

The `processDocument.ts` workflow now uses `runHybridOCR()` for all document parsing instead of the old per-file-type logic. All documents (PDF, CSV, text, images) now go through the unified Hybrid OCR pipeline.

**Key Changes:**
- ✅ Replaced ~135 lines of per-file-type parsing logic with single `runHybridOCR()` call
- ✅ Added comprehensive logging for source, confidence, warnings, and per-page details
- ✅ Preserved existing Smart Import behavior and output shape
- ✅ Same error handling and user-friendly messages

---

## 🧪 How to Test

### Prerequisites

1. **Start the worker:**
   ```bash
   cd worker
   npm run dev
   # Or: npm run start:tsx
   ```

2. **Start Netlify dev (for Smart Import UI):**
   ```bash
   cd ..
   npm run netlify:dev
   ```

3. **Ensure environment variables are set:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OCRSPACE_API_KEY` (or `OCR_ENGINE=tesseract` for local OCR)

---

### Test 1: PDF with Text (Primary Parser)

**Goal:** Test that PDFs with extractable text use `pdf-parse` (primary parser).

**Steps:**
1. Open Smart Import page: `http://localhost:5173/dashboard/smart-import-ai`
2. Upload a PDF bank statement that has selectable text (not scanned)
3. Watch the worker logs

**Expected Logs:**
```
[processDocument] Running Hybrid OCR pipeline for: statement.pdf
[processDocument] Buffer size: XXXXX bytes, detected type: PDF
[processDocument] Hybrid OCR completed:
  Source: primary (primary parser only)
  Confidence: 75.0%
  File type: pdf
  Pages: 1
  Text length: 1234 characters
  Processing time: 234ms
  Primary method: pdf-parse
[processDocument] Successfully extracted 1234 characters using primary method
```

**Expected Behavior:**
- ✅ Document processes successfully
- ✅ Transactions are extracted
- ✅ Smart Import shows parsed transactions
- ✅ No OCR fallback warnings

---

### Test 2: Scanned PDF (OCR Fallback)

**Goal:** Test that scanned PDFs trigger OCR fallback.

**Steps:**
1. Upload a scanned PDF (image-based PDF, no selectable text)
2. Watch the worker logs

**Expected Logs:**
```
[processDocument] Running Hybrid OCR pipeline for: scanned-statement.pdf
[processDocument] Buffer size: XXXXX bytes, detected type: PDF
[processDocument] Hybrid OCR completed:
  Source: fallback (used fallback)
  Confidence: 85.0%
  File type: pdf
  Pages: 1
  Text length: 2345 characters
  Processing time: 3456ms
  Primary method: pdf-parse
  Fallback method: ocr
[processDocument] Hybrid OCR warnings:
  1. PDF parsing returned empty text - likely scanned PDF
[processDocument] Successfully extracted 2345 characters using fallback method
```

**Expected Behavior:**
- ✅ Document processes successfully
- ✅ OCR fallback is triggered
- ✅ Warnings logged about scanned PDF
- ✅ Transactions extracted via OCR

---

### Test 3: Image File (Receipt Photo)

**Goal:** Test that images go straight to OCR (no primary parser).

**Steps:**
1. Upload a receipt photo (PNG or JPG)
2. Watch the worker logs

**Expected Logs:**
```
[processDocument] Running Hybrid OCR pipeline for: receipt.jpg
[processDocument] Buffer size: XXXXX bytes, detected type: IMAGE
[processDocument] Hybrid OCR completed:
  Source: fallback (used fallback)
  Confidence: 82.0%
  File type: image
  Pages: 1
  Text length: 567 characters
  Processing time: 1234ms
  Fallback method: ocr
[processDocument] Hybrid OCR warnings:
  1. Image file detected - skipping primary parser, using OCR
[processDocument] Successfully extracted 567 characters using fallback method
```

**Expected Behavior:**
- ✅ Image processes successfully
- ✅ OCR is used (no primary parser attempt)
- ✅ Warning logged about image detection
- ✅ Receipt text extracted

---

### Test 4: Multi-Page PDF

**Goal:** Test per-page logging for multi-page documents.

**Steps:**
1. Upload a multi-page PDF bank statement
2. Watch the worker logs

**Expected Logs:**
```
[processDocument] Hybrid OCR completed:
  Source: primary (primary parser only)
  Confidence: 80.0%
  File type: pdf
  Pages: 3
  Text length: 5678 characters
  Processing time: 456ms
  Primary method: pdf-parse
[processDocument] Per-page text lengths:
  Page 1: 1892 characters
  Page 2: 1923 characters
  Page 3: 1863 characters
```

**Expected Behavior:**
- ✅ All pages processed
- ✅ Per-page text lengths logged
- ✅ Full text contains all pages

---

### Test 5: CSV File

**Goal:** Test CSV handling (if supported).

**Steps:**
1. Upload a CSV file (if Smart Import supports it)
2. Watch the worker logs

**Expected Logs:**
```
[processDocument] Hybrid OCR completed:
  Source: primary (primary parser only)
  Confidence: 90.0%
  File type: csv
  Pages: 1
  Text length: 2345 characters
  Processing time: 12ms
  Primary method: csv-text
```

**Expected Behavior:**
- ✅ CSV processed as text
- ✅ High confidence (0.9)
- ✅ Fast processing (no OCR needed)

---

## 🔍 What to Look For in Logs

### Good Signs ✅

- **Source: primary** → Fast processing, no OCR costs
- **Confidence > 0.5** → Good quality extraction
- **No warnings** → Clean processing
- **Per-page logging** → Multi-page documents handled correctly

### Warning Signs ⚠️

- **Source: fallback** → OCR was needed (expected for images/scanned PDFs)
- **Confidence < 0.3** → Low quality extraction
- **Warnings present** → Check what triggered fallback
- **Empty text** → Processing failed

### Error Signs ❌

- **"Hybrid OCR failed"** → Check error message
- **"no text extracted"** → Document may be corrupted or unsupported
- **Processing timeout** → OCR service may be slow/unavailable

---

## 📊 Verification Checklist

After testing, verify:

- [ ] PDFs with text use `pdf-parse` (primary)
- [ ] Scanned PDFs trigger OCR fallback
- [ ] Images go straight to OCR
- [ ] Confidence scores are logged (0-100%)
- [ ] Source is logged (`primary` or `fallback`)
- [ ] Warnings are logged when fallback is used
- [ ] Per-page details logged for multi-page PDFs
- [ ] Smart Import still works (transactions parsed)
- [ ] No errors in worker logs
- [ ] Processing time is reasonable (< 10s for most docs)

---

## 🐛 Troubleshooting

### Issue: "Hybrid OCR failed"

**Possible Causes:**
- OCR service unavailable (check `OCRSPACE_API_KEY` or `OCR_ENGINE`)
- Document buffer corrupted
- Unsupported file type

**Fix:**
- Check worker logs for detailed error
- Verify OCR configuration in `worker/.env`
- Try a different document

---

### Issue: Low Confidence (< 0.3)

**Possible Causes:**
- Poor quality document
- Scanned PDF with bad image quality
- OCR service having issues

**Fix:**
- Check warnings in logs
- Try uploading a clearer document
- Verify OCR service is working

---

### Issue: No Transactions Extracted

**Possible Causes:**
- Text extracted but parsing failed
- Document format not recognized
- Empty document

**Fix:**
- Check `extractedText` length in logs
- Verify document has transaction data
- Check parsing processor logs

---

## 📝 Example Test Session

```bash
# Terminal 1: Start worker
cd worker
npm run dev

# Terminal 2: Start Netlify dev
cd ..
npm run netlify:dev

# Browser: Open Smart Import
http://localhost:5173/dashboard/smart-import-ai

# Upload PDF → Check worker logs
# Upload Image → Check worker logs
# Verify transactions appear in Smart Import UI
```

---

## ✅ Success Criteria

The integration is successful if:

1. ✅ All document types process through `runHybridOCR()`
2. ✅ Logs show source, confidence, warnings, and per-page details
3. ✅ Smart Import behavior unchanged (transactions parsed correctly)
4. ✅ No errors in worker logs
5. ✅ Processing time is reasonable

---

**Status:** ✅ **READY FOR TESTING**

The Hybrid OCR pipeline is now integrated! Test with your Smart Import page and verify the logs show the new unified flow. 🎉





