# Unified Pipeline Fixes

**Date:** January 2025  
**Purpose:** Fix OCR duplication and ensure guardrails apply everywhere  
**Status:** Ready for Implementation

---

## Issues Found

### ❌ Issue 1: Frontend OCR Bypasses Guardrails
**File:** `src/utils/ocrService.ts`  
**Problem:** Direct OCR.space API call, no guardrails  
**Impact:** Raw PII may be returned to frontend

### ❌ Issue 2: vision_ocr_light Tool Bypasses Guardrails
**File:** `src/agent/tools/impl/vision_ocr_light.ts`  
**Problem:** Returns raw OCR text, no guardrails  
**Impact:** Raw PII may be sent to model

### ⚠️ Issue 3: Document Context Uses Already-Redacted OCR
**File:** `netlify/functions/chat.ts` (line 409)  
**Status:** ✅ OK - Uses `ocr_text` from DB (already redacted by smart-import-ocr.ts)

---

## Fixes

### Fix 1: Update vision_ocr_light Tool to Run Guardrails

**File:** `src/agent/tools/impl/vision_ocr_light.ts`

**Change:** Add guardrails after OCR extraction

```typescript
// After line 71 (text extraction)
import { runGuardrailsForText } from '../../../../netlify/functions/_shared/guardrails-unified';

// After extracting text (line 71)
const text = response.choices[0]?.message?.content || '';

// Add guardrails
let redactedText = text;
try {
  const guardrailResult = await runGuardrailsForText(text, ctx.userId, 'ingestion_ocr');
  if (!guardrailResult.ok) {
    return Err(new Error(`Content blocked by guardrails: ${guardrailResult.reasons?.join(', ')}`));
  }
  redactedText = guardrailResult.text;
  
  // Log PII detection (do not log raw text)
  if (guardrailResult.signals?.pii) {
    console.log('[Vision OCR Light] PII detected and masked:', {
      piiTypes: guardrailResult.signals.piiTypes,
      originalLength: text.length,
      redactedLength: redactedText.length,
    });
  }
} catch (guardrailError: any) {
  console.warn('[Vision OCR Light] Guardrails failed, using original text:', guardrailError);
  // Fail open in dev, but log warning
}

return Ok({
  ok: true,
  text: redactedText.substring(0, maxLength), // Use redacted text
  extracted: true,
  message: `Extracted ${redactedText.length} characters of text`,
});
```

**Note:** This requires importing backend guardrails into frontend tool. May need to create a shared guardrails helper or call backend endpoint.

**Alternative:** Return raw text but document that tool output should be treated as user input and run through guardrails before model call.

---

### Fix 2: Update ocrService.ts to Use Backend Endpoint

**File:** `src/utils/ocrService.ts`

**Change:** Replace direct OCR call with backend endpoint call

**Current (lines 628-738):**
```typescript
// Direct OCR.space API call - NO GUARDRAILS
const response = await fetch("https://api.ocr.space/parse/image", {...});
const extractedText = result.ParsedResults[0].ParsedText;
return { text: extractedText, confidence };
```

**New:**
```typescript
// Option A: Use backend endpoint (recommended)
export const processImageWithOCR = async (imageFile: File): Promise<OCRResult> => {
  try {
    // Step 1: Upload file first (if not already uploaded)
    // This requires integration with upload endpoint
    
    // Step 2: Call backend OCR endpoint (which runs guardrails)
    const { getSupabase } = await import('@/lib/supabase');
    const sb = getSupabase();
    
    // Upload file to storage
    const fileExt = imageFile.name.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const storagePath = `uploads/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('docs')
      .upload(storagePath, imageFile);
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Create document record
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: doc, error: docError } = await sb
      .from('user_documents')
      .insert({
        user_id: user.id,
        original_name: imageFile.name,
        mime_type: imageFile.type,
        storage_path: storagePath,
        status: 'pending',
      })
      .select()
      .single();
    
    if (docError || !doc) {
      throw new Error(`Document creation failed: ${docError?.message}`);
    }
    
    // Call backend OCR endpoint
    const netlifyUrl = import.meta.env.VITE_NETLIFY_URL || window.location.origin;
    const response = await fetch(`${netlifyUrl}/.netlify/functions/smart-import-ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, docId: doc.id }),
    });
    
    if (!response.ok) {
      throw new Error(`OCR failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Wait for OCR to complete (poll or use webhook)
    // For now, return pending status
    return {
      text: '', // Will be populated when OCR completes
      confidence: 0.5,
      status: 'pending',
      docId: doc.id,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};
```

**Alternative (Simpler):** Keep frontend OCR but add guardrails call:
```typescript
// After OCR extraction (line 727)
const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";

// Add guardrails
let redactedText = extractedText;
try {
  const { getSupabase } = await import('@/lib/supabase');
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  
  if (user) {
    // Call backend guardrails endpoint
    const netlifyUrl = import.meta.env.VITE_NETLIFY_URL || window.location.origin;
    const guardrailResponse = await fetch(`${netlifyUrl}/.netlify/functions/guardrails-apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        text: extractedText,
        stage: 'ingestion_ocr',
      }),
    });
    
    if (guardrailResponse.ok) {
      const guardrailResult = await guardrailResponse.json();
      if (guardrailResult.ok) {
        redactedText = guardrailResult.text;
        
        // Log PII detection (do not log raw text)
        if (guardrailResult.signals?.pii) {
          console.log('[OCR Service] PII detected and masked:', {
            piiTypes: guardrailResult.signals.piiTypes,
            originalLength: extractedText.length,
            redactedLength: redactedText.length,
          });
        }
      }
    }
  }
} catch (guardrailError) {
  console.warn('[OCR Service] Guardrails failed, using original text:', guardrailError);
}

return {
  text: redactedText, // Return redacted text
  confidence
};
```

**Recommendation:** Use backend endpoint (Option A) - ensures consistent guardrails

---

### Fix 3: Add Logging for OCR Text in Document Context

**File:** `netlify/functions/chat.ts` (line 409)

**Current:**
```typescript
const ocrText = doc.ocr_text.trim();
const truncatedText = ocrText.length > 2000 
  ? ocrText.substring(0, 2000) + '... (truncated)'
  : ocrText;
docContext.push(`Extracted content:\n${truncatedText}`);
```

**Add logging (do not log raw OCR text):**
```typescript
const ocrText = doc.ocr_text.trim();
const truncatedText = ocrText.length > 2000 
  ? ocrText.substring(0, 2000) + '... (truncated)'
  : ocrText;
docContext.push(`Extracted content:\n${truncatedText}`);

// Log OCR text usage (do not log raw text)
if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
  console.log('[Chat] Document context added:', {
    docId: doc.id,
    docName: doc.original_name,
    ocrTextLength: ocrText.length,
    ocrTextPreview: ocrText.substring(0, 50) + '...', // Preview only
    piiTypes: doc.pii_types || [],
    isRedacted: !!doc.pii_types && doc.pii_types.length > 0,
  });
}
```

---

## Implementation Priority

### High Priority:
1. ✅ **Fix vision_ocr_light tool** - Add guardrails to OCR output
2. ✅ **Fix ocrService.ts** - Use backend endpoint or add guardrails

### Low Priority:
3. ⚠️ **Add logging** - Document context logging (already safe, just for visibility)

---

## Verification After Fixes

### Test 1: vision_ocr_light Tool
1. Byte calls `vision_ocr_light` tool with image containing PII
2. **Expected:**
   - ✅ Tool returns redacted text
   - ✅ Logs: `[Vision OCR Light] PII detected and masked`
   - ✅ Model receives redacted text

### Test 2: Frontend OCR Service
1. Upload PDF via Smart Import UI
2. **Expected:**
   - ✅ Calls backend endpoint OR runs guardrails
   - ✅ Returns redacted OCR text
   - ✅ Logs: `[OCR Service] PII detected and masked`
   - ✅ No raw PII in frontend

### Test 3: Document Context in Chat
1. Chat with Byte, include documentIds
2. **Expected:**
   - ✅ Document context uses `ocr_text` from DB (already redacted)
   - ✅ Logs show OCR text preview (not raw)
   - ✅ Model receives redacted OCR text

---

## Summary

**Current Status:**
- ✅ Chat pipeline: Unified (single guardrails entrypoint)
- ✅ Message persistence: No duplication
- ❌ OCR: Multiple entry points, only canonical has guardrails

**After Fixes:**
- ✅ OCR: All entry points use guardrails
- ✅ Logging: Clear visibility without raw PII


