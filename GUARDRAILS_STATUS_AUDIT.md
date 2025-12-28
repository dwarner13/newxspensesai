# Guardrails Status Audit - Prime Chat

**Date:** 2025-01-XX  
**Issue:** Guardrails status not showing as active in Prime Chat UI

---

## 1) Backend: `netlify/functions/chat.ts`

### ✅ **Backend SENDS guardrails meta event**

**Location:** `netlify/functions/chat.ts` lines 1786-1791

**Exact Code:**
```typescript
// Send meta event at start for debugging
let streamBuffer = `event: meta\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`;

// Send guardrails status as FIRST meta event (so UI can show "Secured" immediately)
const guardrailsStatus = buildGuardrailsStatus('streaming');
streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;
```

**SSE Format Sent:**
```
event: meta
data: {"status":"starting"}

event: meta
data: {"guardrails":{"enabled":true,"pii_masking":true,"moderation":true,"policy_version":"balanced","checked_at":"2025-01-XX...","mode":"streaming"}}
```

**buildGuardrailsStatus Function:** Lines 862-899
```typescript
function buildGuardrailsStatus(mode: 'streaming' | 'json'): {
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  mode: 'streaming' | 'json';
  reason?: string;
} {
  const hasPiiMasking = guardrailConfig?.chat?.pii !== false && guardrailConfig?.ingestion?.pii !== false;
  const hasModeration = guardrailConfig?.chat?.moderation === true || guardrailConfig?.ingestion?.moderation === true;
  const isEnabled = guardrailResult?.ok !== false && guardrailConfig !== null;
  
  const policyVersion = guardrailConfig?.preset || 'balanced';
  
  let reason: string | undefined;
  if (!isEnabled) {
    if (!guardrailConfig) {
      reason = 'config_load_failed';
    } else if (!guardrailResult?.ok) {
      reason = guardrailResult?.blockedReason || 'execution_failed';
    } else {
      reason = 'unknown';
    }
  }
  
  return {
    enabled: isEnabled,
    pii_masking: hasPiiMasking && isEnabled,
    moderation: hasModeration && isEnabled,
    policy_version: policyVersion,
    checked_at: new Date().toISOString(),
    mode,
    ...(reason ? { reason } : {}),
  };
}
```

**Response Sent:** Line 2457
```typescript
return {
  statusCode: 200,
  headers: { ...headers, 'Content-Type': 'text/event-stream' },
  body: streamBuffer, // Contains guardrails meta event
};
```

**✅ Backend sends guardrails meta?** **YES**

---

## 2) Frontend: `src/hooks/usePrimeChat.ts`

### ✅ **Frontend PARSES guardrails meta event**

**Location:** `src/hooks/usePrimeChat.ts` lines 264-272

**Exact Code:**
```typescript
// Handle guardrails status from meta events
if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
  setGuardrailsStatus(j.guardrails);
  if (import.meta.env.DEV) {
    console.log('[usePrimeChat] Guardrails status from meta event:', j.guardrails);
  }
  currentEventType = null; // Reset event type
  continue; // Don't process further for guardrails meta events
}
```

**State Declaration:** Lines 142-150
```typescript
const [guardrailsStatus, setGuardrailsStatus] = useState<{
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  mode: 'streaming' | 'json';
  reason?: string;
} | null>(null);
```

**Expected Fields:**
- ✅ `enabled` (boolean)
- ✅ `pii_masking` (boolean)
- ✅ `moderation` (boolean)
- ✅ `policy_version` (string)
- ✅ `checked_at` (string)
- ✅ `mode` ('streaming' | 'json')
- ✅ `reason?` (optional string)

**✅ Frontend expects guardrails meta?** **YES**

---

## 3) 🔴 **CRITICAL ISSUE FOUND**

### **Problem: `guardrailsStatus` is NOT returned from `usePrimeChat` hook**

**Location:** `src/hooks/usePrimeChat.ts` lines 800-816

**Current Return Statement:**
```typescript
return {
  messages,
  input,
  setInput,
  isStreaming,
  uploads,
  headers,
  toolCalls: import.meta.env.DEV ? toolCalls : [],
  activeEmployeeSlug: activeEmployeeSlug || headers.employee,
  pendingConfirmation,
  confirmToolExecution,
  cancelToolExecution,
  addUploadFiles,
  removeUpload,
  send,
  stop,
  // ❌ MISSING: guardrailsStatus
};
```

**Impact:**
- `useUnifiedChatEngine` (line 208) tries to access `primeChat.guardrailsStatus`
- But `usePrimeChat` doesn't return it, so it's `undefined`
- `UnifiedAssistantChat` receives `undefined` for `chatGuardrailsStatus`
- UI shows "unknown/offline" because `guardrailsStatus` is `null` or `undefined`

**Flow:**
1. Backend sends `event: meta` with guardrails ✅
2. Frontend parses and calls `setGuardrailsStatus(j.guardrails)` ✅
3. State is updated in `usePrimeChat` ✅
4. **BUT:** `guardrailsStatus` is NOT in the return object ❌
5. `useUnifiedChatEngine` gets `undefined` ❌
6. UI receives `undefined` and shows "unknown/offline" ❌

---

## 4) Field Name Mismatches

**✅ NO MISMATCHES** - All field names match exactly:
- Backend sends: `enabled`, `pii_masking`, `moderation`, `policy_version`, `checked_at`, `mode`, `reason?`
- Frontend expects: `enabled`, `pii_masking`, `moderation`, `policy_version`, `checked_at`, `mode`, `reason?`

---

## 5) Smallest Backend-Only Fix Needed

**⚠️ NOTE:** This is actually a **FRONTEND** issue, not backend. However, if backend-only fix is required:

### **Option 1: Add guardrails to error handler (prevents "unknown" on errors)**

**File:** `netlify/functions/chat.ts`  
**Location:** Lines 2468-2479

**Change:**
```typescript
} catch (streamingError: any) {
  console.error('[Chat] Streaming OpenAI call failed:', streamingError);
  
  // Build guardrails status even on error
  const guardrailsStatus = buildGuardrailsStatus('streaming');
  
  return {
    statusCode: 500,
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ok: false,
      error: 'Streaming call failed',
      message: errorMessage,
      guardrails: guardrailsStatus, // ✅ ADD THIS
      details: process.env.NETLIFY_DEV === 'true' ? streamingError?.message : undefined,
    }),
  };
}
```

**Rationale:** Frontend can extract guardrails from error JSON, but this doesn't fix the main issue.

---

### **Option 2: Initialize frontend with default "enabled" state (prevents "unknown" during load)**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 150

**Change:**
```typescript
const [guardrailsStatus, setGuardrailsStatus] = useState<{
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  mode: 'streaming' | 'json';
  reason?: string;
}>({  // ✅ Remove | null, use default object
  enabled: true,
  pii_masking: true,
  moderation: true,
  policy_version: 'balanced',
  checked_at: new Date().toISOString(),
  mode: 'streaming',
});
```

**Rationale:** Shows "Secured" by default until actual status arrives, but doesn't fix the return issue.

---

## 6) **ACTUAL FIX REQUIRED (Frontend)**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 816 (add to return statement)

**Change:**
```typescript
return {
  messages,
  input,
  setInput,
  isStreaming,
  uploads,
  headers,
  toolCalls: import.meta.env.DEV ? toolCalls : [],
  activeEmployeeSlug: activeEmployeeSlug || headers.employee,
  pendingConfirmation,
  confirmToolExecution,
  cancelToolExecution,
  addUploadFiles,
  removeUpload,
  send,
  stop,
  guardrailsStatus, // ✅ ADD THIS LINE
};
```

**This is the root cause:** The state is set but never returned, so UI can't access it.

---

## Summary

- ✅ **Backend sends guardrails meta?** **YES** (line 1791)
- ✅ **Frontend expects guardrails meta?** **YES** (line 265)
- ✅ **Field names match?** **YES** (all fields match exactly)
- 🔴 **Root Cause:** `guardrailsStatus` is NOT returned from `usePrimeChat` hook (line 800-816)
- 🔴 **Impact:** UI receives `undefined` and shows "unknown/offline"

**Smallest Fix:** Add `guardrailsStatus` to return statement in `usePrimeChat.ts` line 816.

**Backend-Only Workaround:** Add guardrails to error handler (doesn't fix main issue, only prevents "unknown" on errors).





