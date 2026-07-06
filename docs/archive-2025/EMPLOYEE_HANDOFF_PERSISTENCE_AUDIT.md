# Employee Handoff Persistence Audit

**Date:** 2025-01-XX  
**Goal:** Verify employee handoff persists across reloads, drawer close/open, and history reload  
**Status:** Discovery Only - No Implementation

---

## A) HANDOFF HANDLING LOCATION

### **Backend: `netlify/functions/chat.ts`**

**Handoff Tool Execution:**
- **Streaming path:** Lines 1933-2065
- **Non-streaming path:** Lines 2619-2750

**Key Code (Streaming, lines 2000-2010):**
```typescript
// Update session's employee_slug
try {
  await sb
    .from('chat_sessions')
    .update({ employee_slug: targetSlug })
    .eq('id', finalSessionId);
  
  console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug}`);
} catch (error: any) {
  console.warn('[Chat] Failed to update session employee_slug:', error);
}
```

**Status:** ✅ Backend updates `chat_sessions.employee_slug` on handoff

---

## B) ACTIVE EMPLOYEE STORAGE LOCATION

### **1. Database Storage: `chat_sessions.employee_slug`**

**Location:** `netlify/functions/_shared/session.ts`  
**Lines:** 64-78

**How it's loaded:**
```typescript
if (sessionId) {
  const { data, error } = await sb
    .from('chat_sessions')
    .select('id, employee_slug')  // ✅ Loads employee_slug from session
    .eq('id', sessionId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!error && data) {
    const effectiveSlug = data.employee_slug || employeeSlug;
    return { sessionId, employee_slug: effectiveSlug };  // ✅ Returns employee_slug
  }
}
```

**How it's used:** `netlify/functions/chat.ts` lines 1074-1084
```typescript
const sessionResult = await ensureSession(sb, userId, sessionId, finalEmployeeSlug);
// Use employee_slug from session if available (handles handoff scenarios)
if (sessionResult?.employee_slug) {
  sessionEmployeeSlug = sessionResult.employee_slug;
  // If session has a different employee than requested, update finalEmployeeSlug
  if (sessionEmployeeSlug !== finalEmployeeSlug) {
    console.log(`[Chat] Session employee mismatch: requested ${finalEmployeeSlug}, session has ${sessionEmployeeSlug} (likely from handoff)`);
    finalEmployeeSlug = sessionEmployeeSlug;  // ✅ Backend uses session's employee_slug
  }
}
```

**Status:** ✅ Backend correctly loads and uses `chat_sessions.employee_slug` as canonical source

---

### **2. Frontend State: `activeEmployeeSlug`**

**Location:** `src/hooks/usePrimeChat.ts`  
**Line:** 250

**Initialization:**
```typescript
const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string | undefined>(undefined);
```

**Updated from SSE events:**
- **Line 284:** `setActiveEmployeeSlug(j.to)` when `type: 'handoff'` event received
- **Line 297:** `setActiveEmployeeSlug(j.employee)` when `type: 'employee'` event received

**Status:** ❌ **NOT initialized from session on mount** - only updated from SSE events

---

### **3. Frontend localStorage: Session ID Storage**

**Location:** `src/hooks/usePrimeChat.ts`  
**Lines:** 107, 650

**Storage Key Format:**
```typescript
const storageKey = `chat_session_${safeUserId}_${employeeSlug}`;
localStorage.setItem(storageKey, responseSessionId);
```

**Problem:** ❌ **Storage key includes employee slug**, so after handoff:
- Old key: `chat_session_${userId}_prime-boss` (still exists)
- New key: `chat_session_${userId}_byte-docs` (doesn't exist yet)
- Frontend tries to load from old key → gets old sessionId → but session has `employee_slug=byte-docs` → mismatch

---

## C) FRONTEND DERIVATION FLOW

### **1. `usePrimeChat` Hook**

**File:** `src/hooks/usePrimeChat.ts`

**activeEmployeeSlug State:**
- **Line 250:** `const [activeEmployeeSlug, setActiveEmployeeSlug] = useState<string | undefined>(undefined);`
- **Line 284:** Updated from `type: 'handoff'` SSE event
- **Line 297:** Updated from `type: 'employee'` SSE event
- **Line 815:** Returned as `activeEmployeeSlug: activeEmployeeSlug || headers.employee`

**Session ID Loading:**
- **Lines 81-113:** Loads sessionId from localStorage using `chat_session_${userId}_${employeeSlug}` key
- **Problem:** Uses `employeeOverride` prop to determine storage key, not session's actual `employee_slug`

**Status:** ❌ **activeEmployeeSlug never initialized from session** - only from SSE events

---

### **2. `useUnifiedChatEngine` Hook**

**File:** `src/hooks/useUnifiedChatEngine.ts`

**activeEmployeeSlug Pass-through:**
- **Line 206:** `activeEmployeeSlug: primeChat.activeEmployeeSlug`
- Simply passes through from `usePrimeChat`

**Status:** ✅ Passes through correctly (no transformation)

---

### **3. `UnifiedAssistantChat` Component**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`

**effectiveEmployeeSlug:**
- **Line 322:** `const effectiveEmployeeSlug = useMemo(() => { ... }, [initialEmployeeSlug, engineActiveEmployeeSlug, ...])`
- Uses `engineActiveEmployeeSlug` from `useUnifiedChatEngine`
- Falls back to `initialEmployeeSlug` prop

**History Loading:**
- **Lines 185-193:** Loads sessionId from localStorage using `chat_session_${userId}_${effectiveEmployeeSlug}` key
- **Problem:** Uses `effectiveEmployeeSlug` (from prop/state) instead of session's actual `employee_slug`

**Status:** ❌ **Uses prop/state employee slug, not session's canonical employee_slug**

---

## D) SINGLE SOURCE OF TRUTH ANALYSIS

### **Where Employee Slug SHOULD Be Stored:**

✅ **`chat_sessions.employee_slug`** (Database)
- Updated on handoff (lines 2004, 2690)
- Loaded by backend on every request (line 1078)
- Canonical source of truth

### **Where Employee Slug IS Currently Stored:**

1. ✅ **`chat_sessions.employee_slug`** (Database) - **CORRECT**
2. ❌ **Frontend `activeEmployeeSlug` state** - Only updated from SSE events, never initialized from session
3. ❌ **Frontend localStorage key** - Includes employee slug in key name, causing mismatch after handoff

---

## E) ROOT CAUSE IDENTIFIED

### **Problem 1: Frontend State Not Initialized from Session**

**Issue:** `activeEmployeeSlug` in `usePrimeChat` is initialized as `undefined` and only updated from SSE events.

**Impact:** On page reload:
- `activeEmployeeSlug` starts as `undefined`
- Frontend uses `initialEmployeeSlug` prop (e.g., 'prime-boss')
- But session has `employee_slug='byte-docs'` (from previous handoff)
- Mismatch causes frontend to use wrong employee

**Location:** `src/hooks/usePrimeChat.ts` line 250

---

### **Problem 2: localStorage Key Includes Employee Slug**

**Issue:** SessionId is stored with employee slug in key: `chat_session_${userId}_${employeeSlug}`

**Impact:** After handoff:
- Old key: `chat_session_${userId}_prime-boss` → points to sessionId
- Session updated: `chat_sessions.employee_slug = 'byte-docs'`
- Frontend tries: `chat_session_${userId}_prime-boss` → gets sessionId ✅
- But frontend thinks employee is still `prime-boss` ❌
- Should use: `chat_session_${userId}_byte-docs` → but key doesn't exist yet

**Location:** `src/hooks/usePrimeChat.ts` lines 107, 650

---

### **Problem 3: No Query to Load Employee Slug from Session**

**Issue:** Frontend never queries `chat_sessions.employee_slug` to initialize `activeEmployeeSlug`.

**Impact:** Frontend relies on:
- `initialEmployeeSlug` prop (may be wrong after handoff)
- SSE events (only work if stream is active)

**Location:** `src/hooks/usePrimeChat.ts` - Missing initialization logic

---

## F) MINIMAL CHANGE NEEDED

### **Change 1: Initialize activeEmployeeSlug from Session**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** After line 250 (where `activeEmployeeSlug` state is declared)

**Action:** Add `useEffect` to query `chat_sessions.employee_slug` when sessionId is available:
```typescript
// Initialize activeEmployeeSlug from session on mount
useEffect(() => {
  if (!effectiveSessionId || !safeUserId) return;
  
  // Query session to get employee_slug
  const loadEmployeeFromSession = async () => {
    try {
      const { getSupabase } = await import('../lib/supabase');
      const supabase = getSupabase();
      if (!supabase) return;
      
      const { data } = await supabase
        .from('chat_sessions')
        .select('employee_slug')
        .eq('id', effectiveSessionId)
        .single();
      
      if (data?.employee_slug) {
        setActiveEmployeeSlug(data.employee_slug);
      }
    } catch (e) {
      // Fail silently - will use prop/SSE fallback
    }
  };
  
  loadEmployeeFromSession();
}, [effectiveSessionId, safeUserId]);
```

---

### **Change 2: Update localStorage Key After Handoff**

**File:** `src/hooks/usePrimeChat.ts`  
**Location:** Line 284 (after `setActiveEmployeeSlug(j.to)`)

**Action:** Update localStorage key when handoff occurs:
```typescript
if (j.type === 'handoff' && j.from && j.to) {
  setActiveEmployeeSlug(j.to);
  
  // Update localStorage key to match new employee
  if (safeUserId && effectiveSessionId) {
    try {
      const oldKey = `chat_session_${safeUserId}_${j.from}`;
      const newKey = `chat_session_${safeUserId}_${j.to}`;
      const sessionId = localStorage.getItem(oldKey);
      if (sessionId) {
        localStorage.setItem(newKey, sessionId);
        localStorage.removeItem(oldKey); // Clean up old key
      }
    } catch (e) {
      console.warn('[usePrimeChat] Failed to update localStorage key after handoff:', e);
    }
  }
}
```

---

### **Change 3: Use Session Employee Slug for Storage Key**

**Alternative Approach:** Store sessionId with a single key (not per-employee):
- Key: `chat_session_${userId}_${sessionId}` (sessionId-based, not employee-based)
- Or: `chat_session_${userId}` (single session per user)

**Trade-off:** Requires refactoring localStorage key structure (more invasive)

---

## G) SUMMARY

### **Single Source of Truth:**

✅ **`chat_sessions.employee_slug`** (Database) - **CORRECT**

### **Current Storage Locations:**

1. ✅ `chat_sessions.employee_slug` (Database) - Updated on handoff, loaded by backend
2. ❌ `activeEmployeeSlug` state (Frontend) - Not initialized from session
3. ❌ localStorage key format - Includes employee slug, causing mismatch

### **Minimal Changes Required:**

1. **Initialize `activeEmployeeSlug` from session** on mount (query `chat_sessions.employee_slug`)
2. **Update localStorage key** when handoff SSE event received
3. **(Optional) Refactor localStorage key** to not include employee slug

### **Files to Modify:**

1. `src/hooks/usePrimeChat.ts` (2 changes)
   - Add `useEffect` to load `employee_slug` from session
   - Update localStorage key on handoff event

**Total Changes:** ~30 lines (initialization + localStorage update)

---

## H) VERIFICATION CHECKLIST

After implementation, verify:
1. ✅ Prime hands off to Byte → `chat_sessions.employee_slug` = 'byte-docs'
2. ✅ Page refresh → Frontend loads `employee_slug` from session → `activeEmployeeSlug` = 'byte-docs'
3. ✅ Drawer close/open → `activeEmployeeSlug` persists (from session)
4. ✅ History reload → Uses correct employee slug from session
5. ✅ localStorage key updated → `chat_session_${userId}_byte-docs` exists





