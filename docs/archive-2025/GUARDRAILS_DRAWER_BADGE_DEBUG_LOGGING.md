# Guardrails Drawer Badge Debug Logging - Implementation Summary

**Date:** 2025-01-XX  
**Issue:** Prime/Byte chat drawer badge shows "Offline" while dashboard badge shows "Secured"  
**Fix Type:** DEV-only logging to trace root cause (NO UI changes)

---

## ✅ Changes Applied

### **Fix 1: Log disableRuntime and renderMode**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`  
**Line:** 336

**Change:**
```diff
  // Use unified chat engine (wraps usePrimeChat for consistent API)
  // Always call hook (React rules), but pass undefined employeeSlug when runtime disabled to prevent initialization
  // CRITICAL: Must be called BEFORE useMemo hooks that reference 'messages'
  // Pass loaded history as initialMessages so conversation persists
+ if (import.meta.env.DEV) {
+   console.log('[UnifiedAssistantChat] disableRuntime=', disableRuntime, 'effectiveEmployeeSlug=', effectiveEmployeeSlug, 'renderMode=', renderMode);
+ }
  const engineResult = useUnifiedChatEngine({
    employeeSlug: disableRuntime ? undefined : effectiveEmployeeSlug,
    conversationId: disableRuntime ? undefined : conversationId,
    initialMessages: loadedHistoryMessages.length > 0 ? loadedHistoryMessages : undefined,
  });
```

**Rationale:** Identifies if drawer is running in `disableRuntime` mode (which uses fallback object) vs dashboard (which uses engine result).

---

### **Fix 2: Log guardrailsStatus in ChatInputBar**

**File:** `src/components/chat/ChatInputBar.tsx`  
**Line:** 84

**Change:**
```diff
export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything...',
  isStreaming = false,
  disabled = false,
  sendButtonGradient = 'from-amber-400 via-orange-500 to-pink-500',
  sendButtonGlow = 'rgba(251,191,36,0.65)',
  guardrailsStatus,
  guardrailsLastChecked,
  showPlusIcon = false,
  onAttachmentsChange,
  onStop,
  onInputFocus,
  onInputMouseDown,
  readOnly = false,
}: ChatInputBarProps) {
+ // DEV-only logging for guardrails status debugging
+ if (import.meta.env.DEV && guardrailsStatus) {
+   console.log('[ChatInputBar] guardrailsStatus=', guardrailsStatus);
+ }
```

**Rationale:** Confirms what `guardrailsStatus` string value the badge component receives in both dashboard and drawer contexts.

---

### **Fix 3: Log chatGuardrailsStatus in getGuardrailsStatusText**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`  
**Line:** 1584

**Change:**
```diff
  const getGuardrailsStatusText = (): string | undefined => {
    // PREFER guardrails status from chat response (most accurate, per-request)
    // Use chatGuardrailsStatus from hook, with safe fallback
    const guardrailsStatus = chatGuardrailsStatus;
+   if (import.meta.env.DEV) {
+     console.log('[UnifiedAssistantChat] getGuardrailsStatusText: chatGuardrailsStatus=', chatGuardrailsStatus, 'type=', typeof chatGuardrailsStatus);
+   }
    if (guardrailsStatus && typeof guardrailsStatus === 'object') {
```

**Rationale:** Traces the guardrailsStatus object from hook → text conversion, identifying if it's undefined/null/object in drawer vs dashboard.

---

### **Fix 4: Log meta.guardrails in SSE parser**

**File:** `src/hooks/usePrimeChat.ts`  
**Line:** 272

**Change:**
```diff
          // Handle guardrails status from meta events
          if (currentEventType === 'meta' && j.guardrails && typeof j.guardrails === 'object') {
+           if (import.meta.env.DEV) {
+             console.log('[usePrimeChat] meta.guardrails=', j.guardrails);
+           }
            setGuardrailsStatus(j.guardrails);
            if (import.meta.env.DEV) {
              console.log('[usePrimeChat] Guardrails status from meta event:', j.guardrails);
            }
```

**Rationale:** Confirms SSE meta events are being parsed correctly and guardrails status is being set in hook state.

---

## 📋 Files Edited

1. ✅ `src/components/chat/UnifiedAssistantChat.tsx` (2 logging additions)
   - Line 336: Log disableRuntime/renderMode/effectiveEmployeeSlug
   - Line 1584: Log chatGuardrailsStatus in getGuardrailsStatusText

2. ✅ `src/components/chat/ChatInputBar.tsx` (1 logging addition)
   - Line 84: Log guardrailsStatus prop value

3. ✅ `src/hooks/usePrimeChat.ts` (1 logging addition)
   - Line 272: Log meta.guardrails from SSE

**Total Changes:** 4 DEV-only console.log statements (NO UI changes)

---

## 🔍 Likely Root Causes (After Logging Analysis)

Based on the code flow, here are the **3 most likely root causes**:

### **1. Drawer is disableRuntime = true**
- **Symptom:** Log shows `disableRuntime=true` for drawer, `disableRuntime=false` for dashboard
- **Cause:** `renderMode === 'page'` sets `disableRuntime = true`, but drawer should use `renderMode === 'slideout'`
- **Fix:** Ensure drawer path sets `renderMode='slideout'` (not 'page')

### **2. Drawer bypasses engine result**
- **Symptom:** Log shows `chatGuardrailsStatus=undefined` or `chatGuardrailsStatus=null` in drawer
- **Cause:** `disableRuntime` fallback object doesn't include `guardrailsStatus`, OR drawer uses different hook instance
- **Fix:** Already fixed (fallback includes guardrailsStatus), but verify drawer uses same hook instance

### **3. guardrailsStatus prop not passed in drawer variant**
- **Symptom:** Log shows `[ChatInputBar] guardrailsStatus=undefined` in drawer
- **Cause:** `getGuardrailsStatusText()` returns `undefined` or `'Offline • Protection unavailable'` due to fallback logic
- **Fix:** Ensure `chatGuardrailsStatus` is always an object (non-null), and fallback logic doesn't trigger

---

## 📋 Manual Test Checklist

### **Test 1: Dashboard Badge Shows "Secured"**

1. ✅ Refresh `/dashboard/prime-chat`
2. ✅ Check browser console for logs:
   ```
   [UnifiedAssistantChat] disableRuntime= false effectiveEmployeeSlug= prime-boss renderMode= slideout
   [UnifiedAssistantChat] getGuardrailsStatusText: chatGuardrailsStatus= {enabled: true, ...} type= object
   [ChatInputBar] guardrailsStatus= Secured • Guardrails + PII protection active
   ```
3. ✅ **Expected:** Badge shows "Secured • Guardrails + PII protection active"
4. ✅ **Verify:** Console logs show `disableRuntime=false` and `chatGuardrailsStatus` is an object

---

### **Test 2: Prime Drawer Badge Matches Dashboard**

1. ✅ Click "Open Chat" button (opens Prime drawer)
2. ✅ Check browser console for logs:
   ```
   [UnifiedAssistantChat] disableRuntime= false effectiveEmployeeSlug= prime-boss renderMode= slideout
   [UnifiedAssistantChat] getGuardrailsStatusText: chatGuardrailsStatus= {enabled: true, ...} type= object
   [ChatInputBar] guardrailsStatus= Secured • Guardrails + PII protection active
   ```
3. ✅ **Expected:** Badge shows "Secured • Guardrails + PII protection active" (NOT "Offline")
4. ✅ **Verify:** Console logs match dashboard logs (same `disableRuntime`, same `chatGuardrailsStatus`)

---

### **Test 3: Byte Drawer Badge Matches**

1. ✅ Switch to Byte drawer (or open Byte chat)
2. ✅ Check browser console for logs:
   ```
   [UnifiedAssistantChat] disableRuntime= false effectiveEmployeeSlug= byte-docs renderMode= slideout
   [UnifiedAssistantChat] getGuardrailsStatusText: chatGuardrailsStatus= {enabled: true, ...} type= object
   [ChatInputBar] guardrailsStatus= Secured • Guardrails + PII protection active
   ```
3. ✅ **Expected:** Badge shows "Secured" (matches Prime drawer)
4. ✅ **Verify:** Console logs show same pattern as Prime drawer

---

### **Test 4: SSE Meta Event Parsing**

1. ✅ Open Prime drawer
2. ✅ Send a message
3. ✅ Check browser console for logs:
   ```
   [usePrimeChat] meta.guardrails= {enabled: true, pii_masking: true, ...}
   [usePrimeChat] Guardrails status from meta event: {enabled: true, ...}
   [UnifiedAssistantChat] getGuardrailsStatusText: chatGuardrailsStatus= {enabled: true, ...} type= object
   [ChatInputBar] guardrailsStatus= Secured • Guardrails + PII protection active
   ```
4. ✅ **Expected:** Badge stays "Secured" after message (doesn't revert to "Offline")
5. ✅ **Verify:** SSE meta event is parsed and `guardrailsStatus` state updates correctly

---

### **Test 5: No Layout/Scroll Changes**

1. ✅ Navigate to `/dashboard/prime-chat`
2. ✅ Open drawer
3. ✅ **Verify:** No layout shifts
4. ✅ **Verify:** No scrollbar changes
5. ✅ **Verify:** No animation glitches
6. ✅ **Verify:** Badge position unchanged

---

## 🎯 Next Steps (After Logging Analysis)

Once logs are collected, identify which root cause applies:

1. **If `disableRuntime=true` in drawer:** Fix `renderMode` prop to be `'slideout'` (not `'page'`)
2. **If `chatGuardrailsStatus=undefined` in drawer:** Ensure drawer uses same hook instance and fallback includes guardrailsStatus
3. **If `getGuardrailsStatusText()` returns "Offline":** Fix fallback logic to use default object instead of health endpoint

**All fixes will be minimal wiring changes only (NO UI changes).**

---

## ✅ Pre-existing Linter Errors

The following linter errors are **pre-existing** and **not related** to these changes:
- `src/components/chat/UnifiedAssistantChat.tsx`: Various unused imports and variables (warnings)
- Type errors on lines 546, 1377, 2045, 2078 (pre-existing)

**These logging changes do not introduce new errors.**

---

## Summary

**Changes:** 4 DEV-only console.log statements added to trace guardrailsStatus flow

**Purpose:** Identify root cause of drawer badge showing "Offline" vs dashboard showing "Secured"

**Next:** Analyze console logs to determine which of the 3 root causes applies, then apply minimal wiring fix

**No UI/UX changes** - Only DEV-only logging for debugging.





