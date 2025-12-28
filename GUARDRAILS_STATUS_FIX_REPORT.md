# Guardrails Status Fix Report

**Date:** 2025-01-XX  
**Issue:** Prime Chat shows "Offline • Protection unavailable" even though guardrails exist  
**Scope:** Backend + Hook wiring only (NO UI changes)

---

## 1) BACKEND AUDIT: `netlify/functions/chat.ts`

### ✅ **SSE Meta Event IS Sent**

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

**Response Headers:** Line 2451
```typescript
headers: {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
}
```

**Response Body:** Line 2457
```typescript
body: streamBuffer, // Contains guardrails meta event
```

**✅ Backend sends meta immediately?** **YES** (line 1791, BEFORE any tokens)

**✅ Includes guardrails status?** **YES** (`guardrails: { enabled, pii_masking, moderation, ... }`)

---

## 2) FRONTEND SSE PARSING AUDIT: `src/hooks/usePrimeChat.ts`

### ✅ **Frontend PARSES Meta Event**

**Location:** `src/hooks/usePrimeChat.ts` lines 245-272

**Exact Code:**
```typescript
const parseSSEEvent = useCallback((event: string, aiText: string, aiId: string) => {
  const lines = event.split('\n');
  let currentEventType: string | null = null;
  
  for (const line of lines) {
    // Handle event type line (event: meta)
    if (line.startsWith('event: ')) {
      currentEventType = line.slice(7).trim();
      continue;
    }
    
    if (line.startsWith('data: ')) {
      const payload = line.slice(6).trim();
      const j = JSON.parse(payload);
      
      // Handle guardrails status from meta events
      if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
        setGuardrailsStatus(j.guardrails); // ✅ Updates state
        currentEventType = null;
        continue;
      }
    }
  }
}, []);
```

**✅ Frontend listens for `event: meta`?** **YES** (line 252)

**✅ Updates guardrails state?** **YES** (line 266: `setGuardrailsStatus(j.guardrails)`)

---

### 🔴 **CRITICAL ISSUE: State NOT Returned**

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
- State is set correctly (`setGuardrailsStatus` at line 266)
- But `guardrailsStatus` is NOT in return object
- `useUnifiedChatEngine` (line 208) tries to access `primeChat.guardrailsStatus` → gets `undefined`
- UI receives `undefined` → shows "Offline • Protection unavailable" (line 1601)

---

### 🔴 **ISSUE: Initial State is Null**

**Location:** `src/hooks/usePrimeChat.ts` line 150

**Current:**
```typescript
const [guardrailsStatus, setGuardrailsStatus] = useState<{
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  mode: 'streaming' | 'json';
  reason?: string;
} | null>(null); // ❌ Initializes as null
```

**Impact:**
- Before SSE meta arrives, `guardrailsStatus` is `null`
- UI checks `if (guardrailsStatus && typeof guardrailsStatus === 'object')` → fails
- Falls back to health endpoint check → may show "offline" during initial load

---

## 3) Field Name Mismatches

**✅ NO MISMATCHES**

Backend sends:
- `enabled` (boolean)
- `pii_masking` (boolean)
- `moderation` (boolean)
- `policy_version` (string)
- `checked_at` (string)
- `mode` ('streaming' | 'json')
- `reason?` (optional string)

Frontend expects:
- `enabled` (boolean) ✅
- `pii_masking` (boolean) ✅
- `moderation` (boolean) ✅
- `policy_version` (string) ✅
- `checked_at` (string) ✅
- `mode` ('streaming' | 'json') ✅
- `reason?` (optional string) ✅

**All field names match exactly.**

---

## 4) Exact Minimal Code Edits Required

### **Fix 1: Add `guardrailsStatus` to Return Statement**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 816 (add to return object)

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

**Rationale:** Exposes guardrails status to `useUnifiedChatEngine` and UI components.

---

### **Fix 2: Initialize with Default "Enabled" State**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 150 (change initial state)

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
  enabled: true,  // ✅ Optimistically assume enabled
  pii_masking: true,
  moderation: true,
  policy_version: 'balanced',
  checked_at: new Date().toISOString(),
  mode: 'streaming',
});
```

**Rationale:** UI shows "Secured" by default until actual status arrives. Prevents "offline" during initial load.

---

### **Fix 3 (Optional): Add Guardrails to Error Handler**

**File:** `netlify/functions/chat.ts`  
**Location:** Lines 2468-2479 (error handler)

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

**Rationale:** Frontend can extract guardrails status from error JSON responses. Prevents "offline" on streaming errors.

---

## Summary

### **Backend sends meta?** ✅ **YES**
- Location: `netlify/functions/chat.ts` line 1791
- Format: `event: meta\ndata: {"guardrails":{...}}`
- Timing: Sent IMMEDIATELY when stream starts (before tokens)

### **Frontend expects meta?** ✅ **YES**
- Location: `src/hooks/usePrimeChat.ts` line 265
- Parsing: Correctly handles `event: meta` + `data: {"guardrails":{...}}`

### **Field name mismatches?** ❌ **NO**
- All fields match exactly

### **Root Cause:**
1. ❌ `guardrailsStatus` NOT returned from `usePrimeChat` hook (line 816)
2. ❌ Initial state is `null` instead of default "enabled" (line 150)

### **Minimal Fixes Required:**
1. **Add `guardrailsStatus` to return statement** (`src/hooks/usePrimeChat.ts` line 816)
2. **Initialize with default "enabled" object** (`src/hooks/usePrimeChat.ts` line 150)
3. **(Optional) Add guardrails to error handler** (`netlify/functions/chat.ts` line 2477)

---

## Implementation Order

1. **Fix 1** (return statement) - **CRITICAL** - Fixes main issue
2. **Fix 2** (default state) - **IMPORTANT** - Prevents "offline" during load
3. **Fix 3** (error handler) - **OPTIONAL** - Prevents "offline" on errors

**Total Changes:** 2-3 lines of code (backend + hook wiring only, NO UI changes)





