# Guardrails Drawer renderMode Verification

**Date:** 2025-01-XX  
**Issue:** Drawer badge shows "Offline" while dashboard shows "Secured"  
**Root Cause:** `renderMode` prop already set correctly, but verifying computation

---

## ✅ Current State

### **Drawer Entry Point**

**File:** `src/layouts/DashboardLayout.tsx`  
**Line:** 1125-1133

**Current Code:**
```typescript
<UnifiedAssistantChat
  isOpen={isChatOpen}
  onClose={closeChat}
  initialEmployeeSlug={activeEmployeeSlug || chatOptions.initialEmployeeSlug}
  conversationId={chatOptions.conversationId}
  context={chatOptions.context}
  initialQuestion={chatOptions.initialQuestion}
  renderMode="slideout"  // ✅ Already set correctly
/>
```

**Status:** ✅ `renderMode="slideout"` is already explicitly passed

---

### **Prop Computation Logic**

**File:** `src/components/chat/UnifiedAssistantChat.tsx`  
**Lines:** 105-106

**Current Code:**
```typescript
renderMode = mode === 'inline' ? 'page' : 'slideout', // Default: page for inline, slideout otherwise
disableRuntime = renderMode === 'page', // Default: disable runtime for page mode (slideout = false, page = true)
```

**Logic:**
- If `renderMode="slideout"` is passed (explicit prop) → `renderMode = 'slideout'`
- Then `disableRuntime = 'slideout' === 'page'` → `disableRuntime = false` ✅

**Status:** ✅ Logic is correct - `renderMode="slideout"` should result in `disableRuntime=false`

---

## 🔍 Verification Steps

The drawer should already be working correctly because:
1. ✅ `renderMode="slideout"` is explicitly passed in `DashboardLayout.tsx`
2. ✅ `disableRuntime = renderMode === 'page'` evaluates to `false` when `renderMode="slideout"`
3. ✅ DEV logs will confirm: `disableRuntime=false` in drawer

**If drawer still shows "Offline" after logs are added, the issue is NOT `renderMode` - it's something else (e.g., guardrailsStatus not being passed correctly, or fallback logic triggering).**

---

## 📋 Next Steps

1. **Check DEV logs** when drawer opens:
   ```
   [UnifiedAssistantChat] disableRuntime= false effectiveEmployeeSlug= prime-boss renderMode= slideout
   ```
   - If `disableRuntime=false` → `renderMode` is correct, issue is elsewhere
   - If `disableRuntime=true` → `renderMode` prop is not being applied (unlikely)

2. **If `disableRuntime=false` but badge still shows "Offline":**
   - Check `chatGuardrailsStatus` log in `getGuardrailsStatusText`
   - Check if fallback logic (health endpoint) is triggering
   - Verify `guardrailsStatus` prop is passed to `ChatInputBar`

3. **If `disableRuntime=true` in drawer:**
   - Verify `renderMode` prop is actually being passed (check React DevTools)
   - Check if `mode` prop is interfering (shouldn't, but verify)
   - Add explicit `disableRuntime={false}` prop as fallback

---

## ✅ Summary

**Current State:** `renderMode="slideout"` is already correctly set in `DashboardLayout.tsx`

**Expected Behavior:** Drawer should have `disableRuntime=false` and use real engine state

**If Issue Persists:** Root cause is NOT `renderMode` - investigate guardrailsStatus flow instead





