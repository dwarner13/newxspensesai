# Unified Pipeline Audit Report

**Date:** January 2025  
**Purpose:** Verify Guardrails + PII + OCR + Handoff are unified into ONE canonical pipeline  
**Status:** ✅ Audit Complete

---

## Phase 1: Canonical Request Pipeline ✅

### Pipeline Order (netlify/functions/chat.ts)

```
1. Auth Verification (line 684)
   ↓
2. Request Parsing (line 709)
   ↓
3. Rate Limiting (line 740) - Optional, fails open
   ↓
4. UNIFIED GUARDRAILS (line 807-873)
   ├─ Load guardrail config (line 819)
   ├─ Run runInputGuardrails() (line 838)
   ├─ PII masking happens FIRST (before any API calls)
   ├─ Content moderation on masked text
   ├─ Jailbreak detection on masked text
   └─ Return blocked response if violated
   ↓
5. Employee Routing (line 931-973)
   └─ Uses MASKED text (line 948)
   ↓
6. Load Employee Profile & Tools (line 995-1052)
   ↓
7. Ensure Thread Exists (line 1055-1094)
   └─ Uses employee_key from registry
   ↓
8. Load Recent Messages (line 1100-1150)
   ↓
9. Memory Retrieval (line 1155-1250)
   └─ Uses MASKED text
   ↓
10. Build Model Messages (line 1500-1600)
    └─ Uses MASKED text for user messages
    └─ Includes document context (if documentIds provided)
    ↓
11. Save User Message (line 1950-2019)
    └─ Saves MASKED content to chat_messages
    └─ redacted_content = masked content
    ↓
12. OpenAI API Call (line 2081)
    └─ Uses MASKED messages
    ↓
13. Stream Tokens (line 2129-2144)
    └─ SSE events: text, tool_executing, tool_result
    ↓
14. Tool Execution (line 2200-2451)
    └─ If request_employee_handoff:
       ├─ Store handoff context (line 2314)
       ├─ Update session employee_slug (line 2335)
       └─ Insert system handoff message (line 2351)
    ↓
15. Second Completion (if tools executed) (line 2455-2517)
    └─ Uses tool results in messages
    ↓
16. Persist Assistant Message (line 2687)
    └─ Saves assistant content to chat_messages
    └─ Single insert per request
    ↓
17. Return SSE Stream (line 2598-2600)
```

### Key Findings:

✅ **Guardrails run FIRST** (line 807-873) - Before routing, before model calls  
✅ **PII masking happens FIRST** - Before any API calls or storage  
✅ **Masked text used throughout** - Routing, memory, model calls all use masked text  
✅ **Single persistence point** - User message saved once (line 1982), assistant message saved once (line 2687)  
✅ **Handoff uses same pipeline** - request_employee_handoff tool executes within same flow

---

## Phase 2: OCR Entry Points ❌ NOT UNIFIED

### OCR Call Locations Found:

1. **`netlify/functions/smart-import-ocr.ts`** ✅ CANONICAL
   - Function: `runOCR()` (line 23-75)
   - Called by: `smart-import-finalize.ts` after upload
   - Uses: Google Vision API (preferred) or OCR.space (fallback)
   - **Guardrails:** ✅ YES - Runs `runGuardrailsForText()` before storage (line 129-147)
   - **Storage:** ✅ Stores redacted OCR text in `user_documents.ocr_text` (line 168)

2. **`src/utils/ocrService.ts`** ⚠️ DUPLICATE
   - Function: `processImageWithOCR()` (line 626-737)
   - Called by: Frontend Smart Import UI
   - Uses: OCR.space API directly
   - **Guardrails:** ❌ NO - Does NOT run guardrails
   - **Storage:** ⚠️ Stores raw OCR text (not redacted)

3. **`netlify/functions/_shared/ocr_providers.ts`** ⚠️ LIBRARY
   - Functions: `ocrOCRSpace()`, `ocrVision()`, `bestEffortOCR()`
   - Called by: Multiple places
   - **Guardrails:** ❌ NO - Provider functions don't run guardrails
   - **Usage:** Used by `smart-import-ocr.ts` (canonical) and potentially others

4. **`worker/src/ocr/index.ts`** ⚠️ WORKER MODULE
   - Class: `OCRProcessor`
   - Called by: Worker processes
   - **Guardrails:** ❌ NO - Does NOT run guardrails
   - **Status:** May be legacy/unused

5. **`src/agent/tools/impl/vision_ocr_light.ts`** ⚠️ TOOL
   - Tool: `vision_ocr_light`
   - Called by: Byte employee via tool calls
   - **Guardrails:** ❌ UNKNOWN - Need to verify

### Issue: Multiple OCR Entry Points

**Problem:**
- `smart-import-ocr.ts` is canonical (has guardrails)
- `ocrService.ts` (frontend) bypasses guardrails
- `vision_ocr_light` tool may bypass guardrails

**Recommendation:**
- ✅ Keep `smart-import-ocr.ts` as canonical backend entrypoint
- ⚠️ Update `ocrService.ts` to call backend endpoint instead of direct OCR
- ⚠️ Verify `vision_ocr_light` tool runs guardrails

---

## Phase 3: Guardrails + PII on OCR Content ✅ PARTIAL

### Current State:

#### ✅ `smart-import-ocr.ts` (CANONICAL)
```typescript
// Line 129-147: OCR output runs through STRICT guardrails
const guardrailResult = await runGuardrailsForText(
  ocrText, 
  userId, 
  'ingestion_ocr'  // OCR stage
);

// Line 168: Stores REDACTED OCR text
ocr_text: guardrailResult.text,  // Redacted
```

**Status:** ✅ **CORRECT** - OCR text is masked before storage

#### ❌ `ocrService.ts` (FRONTEND)
```typescript
// Line 626-737: Direct OCR call, no guardrails
const response = await fetch("https://api.ocr.space/parse/image", ...)
// Returns raw OCR text
```

**Status:** ❌ **INCORRECT** - Raw OCR text returned to frontend

#### ⚠️ `vision_ocr_light` Tool
**Status:** ⚠️ **UNKNOWN** - Need to verify if tool runs guardrails

### Logging:

#### ✅ `smart-import-ocr.ts`
- ✅ Logs PII detection: `pii_redacted: guardrailResult.signals?.pii`
- ✅ Logs PII types: `pii_types: guardrailResult.signals?.piiTypes`
- ✅ Does NOT log raw OCR text (safe)

#### ❌ `ocrService.ts`
- ❌ No guardrail logging
- ⚠️ May log raw OCR text in dev (needs verification)

### Recommendation:

1. ✅ **Keep `smart-import-ocr.ts` as canonical** - Already correct
2. ⚠️ **Update `ocrService.ts`** - Call backend endpoint instead of direct OCR
3. ⚠️ **Verify `vision_ocr_light`** - Ensure it uses canonical OCR path

---

## Phase 4: Message Persistence Duplication ✅ NO DUPLICATION

### Message Persistence Points:

#### User Messages:
- **Line 1982:** Single insert to `chat_messages`
  ```typescript
  await sb.from('chat_messages').insert(messageData);
  ```
  - `content`: MASKED text
  - `redacted_content`: MASKED text (same)
  - `thread_id`: Required
  - `session_id`: Required

**Status:** ✅ Single persistence point

#### Assistant Messages:
- **Line 2687:** Single insert to `chat_messages` (streaming)
  ```typescript
  await sb.from('chat_messages').insert(messageData);
  ```
  - `content`: Assistant response
  - `role`: 'assistant'
  - `thread_id`: Required
  - `session_id`: Required

- **Line 3199:** Single insert to `chat_messages` (non-streaming)
  ```typescript
  await sb.from('chat_messages').insert(messageData);
  ```
  - Same structure as streaming

**Status:** ✅ Single persistence point per request (streaming OR non-streaming, not both)

#### Tool Results:
- **Line 2428-2432:** Tool results added to `toolResults` array
  ```typescript
  toolResults.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: JSON.stringify(result),
  });
  ```
  - Used in second completion call (line 2462)
  - **NOT persisted separately** - Only assistant message is persisted

**Status:** ✅ No duplication - Tool results are part of conversation context, not separate messages

#### Handoff Messages:
- **Line 2351:** System message inserted for handoff
  ```typescript
  await sb.from('chat_messages').insert({
    role: 'system',
    content: handoffMessage,
    thread_id: threadId,
  });
  ```
  - Single insert per handoff
  - System message (not assistant)

**Status:** ✅ Single persistence point per handoff

### Verification:

**Search Results:**
- `chat_messages.insert` appears 5 times:
  1. Line 1982: User message (single)
  2. Line 2351: Handoff system message (single per handoff)
  3. Line 2687: Assistant message streaming (single)
  4. Line 3077: Handoff system message non-streaming (single per handoff)
  5. Line 3199: Assistant message non-streaming (single)

**Conclusion:** ✅ **NO DUPLICATION** - Each message type persists exactly once per request

---

## Summary

### ✅ Unified:
- ✅ Guardrails + PII masking pipeline (single entrypoint: `runInputGuardrails`)
- ✅ Message persistence (single insert per message type)
- ✅ Handoff uses same pipeline

### ❌ Not Unified:
- ❌ OCR has multiple entry points:
  - ✅ `smart-import-ocr.ts` (canonical, has guardrails)
  - ❌ `ocrService.ts` (frontend, bypasses guardrails)
  - ⚠️ `vision_ocr_light` tool (needs verification)

### ⚠️ Partial:
- ⚠️ OCR guardrails: Only canonical path has guardrails
- ⚠️ OCR logging: Only canonical path logs PII detection

---

## Recommendations

### 1. Consolidate OCR Entry Points

**Option A: Update Frontend to Use Backend**
```typescript
// src/utils/ocrService.ts
// Replace direct OCR call with backend endpoint
async function processImageWithOCR(imageFile: File) {
  // Upload file first
  const uploadResult = await uploadFile(imageFile);
  
  // Call backend OCR endpoint (which runs guardrails)
  const response = await fetch('/.netlify/functions/smart-import-ocr', {
    method: 'POST',
    body: JSON.stringify({ userId, docId: uploadResult.docId }),
  });
  
  return response.json(); // Returns redacted OCR text
}
```

**Option B: Add Guardrails to Frontend OCR**
```typescript
// src/utils/ocrService.ts
// Add guardrails after OCR
const ocrText = await runOCRSpace(imageFile);
const guardrailResult = await runGuardrailsForText(ocrText, userId, 'ingestion_ocr');
return guardrailResult.text; // Return redacted text
```

**Recommendation:** Option A (use backend endpoint) - Ensures consistent guardrails

### 2. Verify `vision_ocr_light` Tool

**Check:** Does `vision_ocr_light` tool call `smart-import-ocr.ts` or direct OCR?

**If direct OCR:** Update to use canonical path  
**If backend:** Verify guardrails are applied

### 3. Add Logging

**Add to `ocrService.ts` (if kept):**
```typescript
console.log('[OCR] PII masked:', guardrailResult.signals?.pii);
console.log('[OCR] PII types:', guardrailResult.signals?.piiTypes);
// DO NOT log raw OCR text
```

---

## Verification Checklist

### Test 1: User Message Pipeline
1. Send message with PII: "My SSN is 123-45-6789"
2. **Expected:**
   - ✅ Guardrails log: `PII masked: true`
   - ✅ Guardrails log: `PII types: ['ssn']`
   - ✅ Database: `content` contains masked text (e.g., "SSN-XXXX-XXXX")
   - ✅ Database: `redacted_content` = masked text
   - ✅ OpenAI receives masked text (check logs)

### Test 2: OCR Pipeline (Canonical)
1. Upload PDF via Smart Import
2. **Expected:**
   - ✅ `smart-import-ocr.ts` runs OCR
   - ✅ Guardrails log: `[OCR] Content blocked` OR `[OCR] PII redacted`
   - ✅ Database: `user_documents.ocr_text` contains masked text
   - ✅ Database: `user_documents.pii_types` contains detected types
   - ✅ No raw OCR text in logs

### Test 3: OCR Pipeline (Frontend - Current Issue)
1. Upload PDF via frontend `ocrService.ts`
2. **Expected (Current):**
   - ❌ Raw OCR text returned (no guardrails)
3. **Expected (After Fix):**
   - ✅ Calls backend endpoint
   - ✅ Returns masked OCR text

### Test 4: Handoff Pipeline
1. Prime → Byte handoff via `request_employee_handoff` tool
2. **Expected:**
   - ✅ Handoff context stored in `handoffs` table
   - ✅ Single system message inserted (line 2351)
   - ✅ Session `employee_slug` updated
   - ✅ No duplicate messages

### Test 5: Message Persistence
1. Send message, wait for response
2. **Expected:**
   - ✅ Single user message in `chat_messages`
   - ✅ Single assistant message in `chat_messages`
   - ✅ No duplicate messages (check by `thread_id` + `created_at`)

---

## Files to Modify

### High Priority:
1. **`src/utils/ocrService.ts`** - Update to use backend endpoint
2. **`src/agent/tools/impl/vision_ocr_light.ts`** - Verify guardrails

### Low Priority:
1. **`netlify/functions/chat.ts`** - Add logging for OCR text in document context (line 408)

---

## Status: ⚠️ PARTIALLY UNIFIED

**Guardrails + PII:** ✅ Unified (single entrypoint)  
**OCR:** ❌ Not unified (multiple entry points, only canonical has guardrails)  
**Message Persistence:** ✅ Unified (single insert per message type)  
**Handoff:** ✅ Unified (uses same pipeline)


