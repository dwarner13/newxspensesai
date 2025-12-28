# Guardrails Status Flow Report

**Date:** 2025-01-XX  
**Issue:** UI sometimes shows "unknown/offline" for guardrails status

---

## 1) Backend: `netlify/functions/chat.ts`

### ✅ **Backend SENDS meta event with guardrails**

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
  headers: {
    ...baseHeaders,
    ...headers,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Chat-Backend': 'v2',
  },
  body: streamBuffer, // Contains guardrails meta event
};
```

**⚠️ ISSUE:** If streaming fails BEFORE line 1791 (e.g., OpenAI API error at line 1766), the guardrails meta event is never added to `streamBuffer`. The error handler (line 2459) returns JSON, not SSE, so guardrails status is lost.

**Error Path:** Lines 2459-2479
```typescript
} catch (streamingError: any) {
  console.error('[Chat] Streaming OpenAI call failed:', streamingError);
  return {
    statusCode: 500,
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json', // ❌ JSON, not SSE
    },
    body: JSON.stringify({
      ok: false,
      error: 'Streaming call failed',
      message: errorMessage,
    }),
  };
}
```

**⚠️ MISSING:** Error handler doesn't include guardrails status.

---

## 2) Frontend: `src/hooks/usePrimeChat.ts`

### ✅ **Frontend EXPECTS and PARSES meta event**

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
      if (!payload || payload === '[DONE]') continue;
      
      try {
        const j = JSON.parse(payload);
        
        // Handle guardrails status from meta events
        if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
          setGuardrailsStatus(j.guardrails);
          if (import.meta.env.DEV) {
            console.log('[usePrimeChat] Guardrails status from meta event:', j.guardrails);
          }
          currentEventType = null; // Reset event type
          continue; // Don't process further for guardrails meta events
        }
      } catch {
        // Non-JSON format: skip
      }
    }
  }
}, []);
```

**Expected Fields:** Lines 142-150
```typescript
const [guardrailsStatus, setGuardrailsStatus] = useState<{
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  mode: 'streaming' | 'json';
  reason?: string;
} | null>(null); // ⚠️ Initialized as null
```

**UI Display:** `src/components/chat/UnifiedAssistantChat.tsx` lines 1573-1579
```typescript
const guardrailsStatus = chatGuardrailsStatus;
if (guardrailsStatus && typeof guardrailsStatus === 'object') {
  if (guardrailsStatus.enabled) {
    return 'Secured • Guardrails + PII protection active';
  } else {
    return `Offline • Protection unavailable${guardrailsStatus.reason ? ` (${guardrailsStatus.reason})` : ''}`;
  }
}
```

**⚠️ ISSUE:** If `guardrailsStatus` is `null` (initial state), UI falls back to health endpoint check (lines 1581-1597), which may show "unknown/offline".

---

## 3) Report Summary

### **Backend sends meta?** ✅ **YES**

**Location:** `netlify/functions/chat.ts` line 1791  
**Format:** `event: meta\ndata: {"guardrails":{...}}`  
**Fields Sent:**
- `enabled` (boolean)
- `pii_masking` (boolean)
- `moderation` (boolean)
- `policy_version` (string)
- `checked_at` (string, ISO timestamp)
- `mode` ('streaming' | 'json')
- `reason?` (string, optional)

### **Frontend expects meta?** ✅ **YES**

**Location:** `src/hooks/usePrimeChat.ts` line 265  
**Format:** Parses `event: meta` + `data: {"guardrails":{...}}`  
**Fields Expected:**
- `enabled` (boolean) ✅ **MATCHES**
- `pii_masking` (boolean) ✅ **MATCHES**
- `moderation` (boolean) ✅ **MATCHES**
- `policy_version` (string) ✅ **MATCHES**
- `checked_at` (string) ✅ **MATCHES**
- `mode` ('streaming' | 'json') ✅ **MATCHES**
- `reason?` (string, optional) ✅ **MATCHES**

### **Exact field names mismatch?** ❌ **NO**

All field names match exactly. No mismatches.

---

## 4) Root Causes of "Unknown/Offline" Status

### **Issue 1: Error Handler Doesn't Send Guardrails**

**Problem:** If streaming fails BEFORE guardrails meta event is added (e.g., OpenAI API error), the error response is JSON, not SSE, so guardrails status is never sent.

**Location:** `netlify/functions/chat.ts` lines 2459-2479

**Impact:** Frontend receives error response, `guardrailsStatus` stays `null`, UI shows "unknown/offline".

---

### **Issue 2: Initial State is Null**

**Problem:** `guardrailsStatus` is initialized as `null` (line 150). If SSE parsing fails or meta event is missed, status remains `null`.

**Location:** `src/hooks/usePrimeChat.ts` line 150

**Impact:** UI falls back to health endpoint check, which may be stale or unavailable.

---

### **Issue 3: SSE Event Parsing May Miss Meta Event**

**Problem:** If SSE events are split across chunks incorrectly, the `event: meta` line might be in a different chunk than the `data: {...}` line, causing parsing to fail.

**Location:** `src/hooks/usePrimeChat.ts` lines 677-692

**Current Logic:**
- Buffers chunks until `\n\n` is found
- Processes complete events
- Resets `currentEventType` after processing

**Potential Issue:** If `event: meta` and `data: {...}` are in separate chunks, `currentEventType` might be reset before the data line is processed.

---

## 5) Minimum Change List (Backend-Only)

### **Fix 1: Add Guardrails Status to Error Handler**

**File:** `netlify/functions/chat.ts`  
**Location:** Lines 2459-2479

**Change:**
```typescript
} catch (streamingError: any) {
  console.error('[Chat] Streaming OpenAI call failed:', streamingError);
  
  // Build guardrails status even on error (so UI can show status)
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

**Rationale:** Even on error, frontend can extract guardrails status from JSON response.

---

### **Fix 2: Ensure Guardrails Meta Event is ALWAYS First**

**File:** `netlify/functions/chat.ts`  
**Location:** Line 1786 (before any other streamBuffer operations)

**Current:** Guardrails meta is added at line 1791, but `streamBuffer` is initialized at line 1787.

**Change:** Ensure guardrails meta is added IMMEDIATELY after initialization, before any conditional logic that might skip it.

**Current Code (lines 1786-1791):**
```typescript
let streamBuffer = `event: meta\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`;

// Send guardrails status as FIRST meta event
const guardrailsStatus = buildGuardrailsStatus('streaming');
streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;
```

**✅ ALREADY CORRECT** - Guardrails meta is added immediately after initialization.

---

### **Fix 3: Initialize Frontend with Default "Enabled" State**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 142-150

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
} | null>({
  enabled: true,  // ✅ DEFAULT TO ENABLED
  pii_masking: true,
  moderation: true,
  policy_version: 'balanced',
  checked_at: new Date().toISOString(),
  mode: 'streaming',
}); // ✅ Remove null, use default object
```

**Rationale:** UI shows "Secured" by default until actual status is received. Prevents "unknown/offline" during initial load.

---

## 6) Alternative: Frontend-Only Fix (If Backend Can't Be Changed)

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 265

**Change:** Add fallback to extract guardrails from error response:
```typescript
// After fetch, check if response is error JSON
if (!res.ok) {
  const errorJson = await res.json();
  if (errorJson.guardrails) {
    setGuardrailsStatus(errorJson.guardrails);
  }
}
```

**Rationale:** Handles error responses that include guardrails status.

---

## 7) Recommended Fix Priority

1. **HIGH:** Fix 1 (Add guardrails to error handler) - Prevents "unknown" on errors
2. **MEDIUM:** Fix 3 (Initialize with default) - Prevents "unknown" during initial load
3. **LOW:** Fix 2 (Already correct, no change needed)

---

## Summary

- ✅ Backend sends `event: meta` with guardrails
- ✅ Frontend parses `event: meta` correctly
- ✅ Field names match exactly
- ⚠️ **Issue:** Error handler doesn't include guardrails status
- ⚠️ **Issue:** Frontend initializes guardrailsStatus as `null`

**Minimum Changes:**
1. Add `guardrails: buildGuardrailsStatus('streaming')` to error handler JSON response
2. Initialize `guardrailsStatus` with default "enabled" object instead of `null`





