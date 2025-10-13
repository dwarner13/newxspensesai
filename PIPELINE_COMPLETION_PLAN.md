# 🔗 Pipeline Completion Plan
## Connect Everything Into One Reliable Flow

**Goal**: Upload/Gmail → Guardrails → OCR → Normalize → Categorize → Notify → Chat Summary

**Approach**: Align existing code, don't rebuild

---

## 📊 **Current State (What Exists)**

### ✅ **Already Built**:
1. `smart-import-init.ts` - Create doc + signed URL
2. `smart-import-finalize.ts` - Route by file type + guardrails on CSV
3. `smart-import-ocr.ts` - OCR with guardrails
4. `smart-import-parse-csv.ts` - CSV parser
5. `normalize-transactions.ts` - Transaction normalizer with notifications
6. `_shared/guardrails.ts` - PII protection
7. `_shared/notify.ts` - Notification helper
8. `gmail-sync.ts` - Background Gmail sync with guardrails
9. `tools/email-search.ts` - Gmail search tool
10. `tools/email-fetch-attachments.ts` - Attachment fetcher

### ⚠️ **Deprecated (Keep but Don't Call)**:
- `src/utils/ocrService.ts` - Old client-side OCR
- `worker/src/ocr/*` - Worker module OCR

---

## 🔗 **Connections Needed**

### **1. OCR Output → Normalize**
- ✅ `smart-import-ocr.ts` already calls `normalize-transactions`
- Status: **CONNECTED**

### **2. Normalize → Categorize**
- ❌ `normalize-transactions.ts` doesn't call categorization
- **NEED**: Wire Tag AI categorizer

### **3. Normalize → Notify**
- ✅ `normalize-transactions.ts` already calls `notify()`
- Status: **CONNECTED**

### **4. Chat → Recent Import Summary**
- ❌ Prime can't query recent imports
- **NEED**: Create `get_recent_imports` tool

### **5. Upload.ts Missing Functions**
- ❌ Build errors because `upload.ts` not found by Netlify
- **NEED**: Verify file exists and restart dev server

---

## 🎯 **Implementation Steps**

### **STEP 1**: Fix upload.ts visibility ✅ (DONE)
- Created `netlify/functions/_shared/upload.ts`
- Committed and pushed

### **STEP 2**: Wire categorization
- Add Tag AI call in `normalize-transactions.ts`
- Use existing categorizer (pick one from utils)

### **STEP 3**: Create recent imports tool
- Add `tools/get-recent-imports.ts`
- Prime can summarize what was imported

### **STEP 4**: Test complete flow
- Upload file → verify all steps execute
- Check notifications appear
- Ask Prime "what did I upload recently?"

---

## 📋 **Next Actions**

1. Run SQL migration (user's task)
2. Wire categorization (my task)
3. Create recent imports tool (my task)
4. Test end-to-end (both)


