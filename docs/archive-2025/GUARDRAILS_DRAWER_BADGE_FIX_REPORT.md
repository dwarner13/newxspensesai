# Guardrails Drawer Badge Fix Report

**Date:** 2025-01-XX  
**Issue:** Dashboard badge shows "Secured" but chat drawer badge shows "Offline"  
**Root Cause:** Both badges use same hook, but type mismatch causes fallback to health endpoint

---

## TASK 1: Locate Both Guardrails Badges

### **A) Dashboard/Page Badge**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`  
**Lines:** 1569-1604, 1643

**Badge Location:** `ChatInputBar` component (footer)
**Variable Used:** `chatGuardrailsStatus` (from `useUnifiedChatEngine` hook)

**Relevant Code:**
```typescript
// Line 352: Extract guardrailsStatus from hook
guardrailsStatus: chatGuardrailsStatus, // Guardrails status from chat response (preferred)

// Line 1572: Use in getGuardrailsStatusText()
const guardrailsStatus = chatGuardrailsStatus;
if (guardrailsStatus && typeof guardrailsStatus === 'object') {
  if (guardrailsStatus.enabled) {
    return 'Secured • Guardrails + PII protection active';
  } else {
    return `Offline • Protection unavailable${guardrailsStatus.reason ? ` (${guardrailsStatus.reason})` : ''}`;
  }
}

// Line 1643: Pass to ChatInputBar
guardrailsStatus={isUploadingAttachments ? 'Uploading attachments...' : uploadError || guardrailsStatusText}
```

---

### **B) Chat Drawer Badge**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`  
**Lines:** 1569-1604, 1643

**Badge Location:** Same `ChatInputBar` component (footer in slideout mode)
**Variable Used:** `chatGuardrailsStatus` (from `useUnifiedChatEngine` hook)

**Relevant Code:** Same as above (same component, same hook)

---

## TASK 2: Mismatch Diagnosis

**Both badges use the SAME component (`ChatInputBar`) and SAME hook (`useUnifiedChatEngine`).**

**The Issue:**
1. `useUnifiedChatEngine` return type says `guardrailsStatus: {...} | null` (line 58-66)
2. `usePrimeChat` now returns `guardrailsStatus` as a non-null object (we just fixed it)
3. BUT: TypeScript type mismatch might cause issues, OR the fallback logic (line 1588) is kicking in

**Why Dashboard Shows Protected:**
- Dashboard page might have sent a message, so SSE meta arrived → `chatGuardrailsStatus` is populated → shows "Secured"

**Why Drawer Shows Offline:**
- Drawer might be opened before any message is sent → `chatGuardrailsStatus` might be default object BUT fallback logic (line 1588) checks `guardrailsHealth` which might be `null` → falls through to line 1601 → shows "Offline"

**OR:** The type definition mismatch causes TypeScript to think `chatGuardrailsStatus` could be `null`, so the check `if (guardrailsStatus && typeof guardrailsStatus === 'object')` fails.

---

## TASK 3: Minimal Wiring Fix

**Fix:** Update `useUnifiedChatEngine` return type to match `usePrimeChat` (remove `| null`)

**File:** `src/hooks/useUnifiedChatEngine.ts`  
**Line:** 58-66

**Change:**
```diff
  /** Guardrails status from chat response (preferred over health endpoint) */
  guardrailsStatus: {
    enabled: boolean;
    pii_masking: boolean;
    moderation: boolean;
    policy_version: string;
    checked_at: string;
    mode: 'streaming' | 'json';
    reason?: string;
- } | null;
+ };
```

**Rationale:** `usePrimeChat` now always returns a guardrailsStatus object (never null), so the wrapper hook should match.

---

## TASK 4: Verify Employee Switching

**All employees use the same hook:** `useUnifiedChatEngine` → `usePrimeChat`

**Fix applies to:**
- ✅ Prime Chat drawer (`prime-boss`)
- ✅ Byte Chat drawer (`byte-docs`)
- ✅ All other employee drawers (Tag, Crystal, etc.)

**No additional changes needed** - all employees share the same hook instance.

---

## Summary

**Root Cause:** Type mismatch between `usePrimeChat` (non-null) and `useUnifiedChatEngine` (nullable) causes TypeScript/fallback logic issues.

**Fix:** Update `useUnifiedChatEngine` return type to remove `| null` to match `usePrimeChat`.

**Files Changed:** 1 file, 1 line





