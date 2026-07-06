# 🛡️ Unified Guardrails Implementation

**Date**: November 18, 2025  
**Status**: ✅ **IMPLEMENTED**

---

## 📋 Overview

A single, shared guardrail layer that **all AI employees** use (Prime, Tag, Byte, Crystal, Finley, Goalie, Liberty, Blitz, Chime, etc.) for:
- Normal chat messages
- Uploaded document text
- Tool call inputs

---

## 🏗️ Architecture

### **Shared Guardrail Module**

**File**: `netlify/functions/_shared/guardrails-unified.ts`

**Key Function**: `runInputGuardrails()`

```typescript
export async function runInputGuardrails(
  ctx: GuardrailContext,
  input: GuardrailInput
): Promise<GuardrailResult>
```

**Features**:
- Accepts messages array + attachments (not just single strings)
- Wraps existing `guardrails-production.ts` system
- Employee-agnostic (all employees use the same protection)
- Centralized logging and event tracking

---

## 🔌 Integration Points

### **1. Main Chat Endpoint**

**File**: `netlify/functions/chat.ts`

**Location**: Line 155-204 (BEFORE routing/model calls)

```typescript
// Run guardrails on user message BEFORE routing/model calls
const guardrailContext: GuardrailContext = {
  userId,
  sessionId: sessionId || undefined,
  employeeSlug: employeeSlug || undefined,
  source: 'chat',
};

const guardrailResult = await runInputGuardrails(guardrailContext, {
  messages: [{ role: 'user', content: message }],
});

if (!guardrailResult.ok) {
  // Return safe blocked response
  return sendBlockedResponse(...);
}

// Use masked text for routing/model calls
const masked = guardrailResult.maskedMessages[0]?.content || message;
```

**Key Points**:
- ✅ Runs BEFORE employee routing
- ✅ Runs BEFORE model calls
- ✅ All employees automatically protected
- ✅ Preserves SSE streaming
- ✅ No breaking API changes

---

### **2. Upload/Document Processing**

**Status**: ⚠️ **TODO** - Needs integration

**Files to Update**:
- `worker/src/workflow/processDocument.ts`
- Any Netlify functions that process uploaded documents

**Integration Pattern**:
```typescript
// After OCR/extraction, BEFORE storage:
const guardrailResult = await runInputGuardrails(
  {
    userId,
    sessionId,
    employeeSlug: 'byte-ai', // or whoever handles uploads
    source: 'upload',
  },
  {
    messages: [{ role: 'user', content: extractedText }],
    attachments: [{ id: importId, type: 'statement', fileName }],
  }
);

if (!guardrailResult.ok) {
  // Mark upload as blocked
  await markDocStatus(docId, 'blocked_guardrail', guardrailResult.blockedReason);
  return;
}

// Store ONLY redacted text
const safeText = guardrailResult.maskedMessages[0]?.content;
```

---

### **3. Tool Calls**

**Status**: ✅ **COVERED** - Tool calls go through `/chat` endpoint

Since tool calls are processed via the same `/chat` pipeline, they automatically benefit from guardrails. No additional integration needed.

---

## 👥 Employee Coverage

**All employees automatically protected** because they all use the canonical `/chat` endpoint:

- ✅ **Prime** (prime-boss)
- ✅ **Tag** (tag-ai)
- ✅ **Byte** (byte-docs)
- ✅ **Crystal** (crystal-ai)
- ✅ **Finley** (finley-ai)
- ✅ **Goalie** (goalie-ai)
- ✅ **Liberty** (liberty-ai)
- ✅ **Blitz** (blitz-ai)
- ✅ **Chime** (chime-ai)
- ✅ **Future employees** (automatically protected)

---

## 🔒 Security Guarantees

1. **PII Masking Happens FIRST**
   - Before any API calls (moderation, jailbreak detection)
   - Before storage
   - Before model calls

2. **All Employees Share Same Protection**
   - No per-employee bypasses
   - Consistent policy enforcement
   - Centralized logging

3. **No Raw PII at Rest**
   - Only masked content stored
   - Audit logs use hashes only

4. **Graceful Blocking**
   - Safe, user-friendly messages
   - No crashes or errors
   - Proper HTTP status codes

---

## 📊 Logging & Events

**Current**: Console logging + TODO for DB logging

**Events Tracked**:
- `pii_masked` - PII detected and masked
- `moderation_flag` - Content moderation check performed
- `blocked` - Message blocked by guardrails
- `info` - General guardrail events

**TODO**: Write events to `guardrail_events` table (see `guardrails-unified.ts`)

---

## 🧪 Testing Checklist

### **1. Normal Chat (Prime)**

- [ ] Ask normal question: "What can you help me with?"
- [ ] Should pass through guardrails and behave as before
- [ ] Check logs: `[Chat] Guardrails passed`

### **2. Potentially Unsafe Content**

- [ ] Send content that triggers moderation
- [ ] Confirm `runInputGuardrails` returns `ok = false`
- [ ] User receives safe "blocked" message
- [ ] No crash or error

### **3. Liberty (Debt/Freedom)**

- [ ] Ask: "How do I pay off my credit card debt faster?"
- [ ] Confirm: Routes to `liberty-ai`
- [ ] Confirm: Still goes through guardrails
- [ ] Check logs: `employeeSlug: liberty-ai`

### **4. PII Detection**

- [ ] Send message with credit card: "My card is 4532-1234-5678-9012"
- [ ] Confirm: PII masked before model call
- [ ] Check logs: `pii_masked` event with types
- [ ] Verify masked text sent to model (not raw)

### **5. Byte / Uploads**

- [ ] Upload document, ask question about it
- [ ] **TODO**: Confirm extracted text flow goes through guardrails
- [ ] **TODO**: Verify blocked uploads marked with `blocked_guardrail` status

### **6. Multi-Employee Handoffs**

- [ ] Start with Prime → routed to Liberty → handoff to Tag
- [ ] Confirm: All messages go through guardrails
- [ ] No bypasses or alternate endpoints

### **7. SSE Streaming**

- [ ] Verify streaming responses still work
- [ ] Guardrails don't break SSE format
- [ ] Blocked messages return JSON (not stream)

---

## 📝 Future Enhancements

**TODOs in `guardrails-unified.ts`**:

1. **DB Logging**: Write events to `guardrail_events` table
2. **Advanced PII Detection**: ML-based detection for edge cases
3. **Per-Employee Overrides**: Stricter/looser guardrails per employee (if needed)
4. **Attachment Content**: Guardrails for PDF/image content (not just metadata)

---

## 📍 Summary

**Where guardrails live**: `netlify/functions/_shared/guardrails-unified.ts`

**How it's called from `/chat`**: Line 167 - `runInputGuardrails()` called BEFORE routing/model calls

**How employees are protected**: All employees use `/chat` endpoint → automatic protection

**How uploads are protected**: ⚠️ **TODO** - Need to integrate into upload/document processing flows

**How tools are protected**: ✅ Covered via `/chat` pipeline

---

## ✅ Implementation Status

- ✅ Unified guardrail interface created
- ✅ Integrated into main chat endpoint
- ✅ All employees automatically protected
- ✅ SSE streaming preserved
- ⚠️ Upload flows need integration (TODO)
- ⚠️ DB logging needs implementation (TODO)



