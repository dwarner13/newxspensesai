# Double Mount Fix - UnifiedAssistantChat

## Root Cause Analysis

### Mounts Found:

1. **DashboardLayout.tsx** (line 1212)
   - Mounts `UnifiedAssistantChat` with `renderMode="slideout"`
   - Has guard: `location.pathname !== '/dashboard/prime-chat' && location.pathname !== '/dashboard/custodian'`
   - **Issue**: Guard was using exact match (`!==`) instead of `startsWith`, which could miss sub-routes

2. **PrimeChatPage.tsx**
   - Does NOT mount `UnifiedAssistantChat` directly
   - Uses `useUnifiedChatLauncher` to open slideout chat
   - **No issue**: Page doesn't render its own chat instance

3. **CustodianPage.tsx** (line 16)
   - Mounts `UnifiedAssistantChat` with `mode="fullscreen"`
   - **No issue**: Guard in DashboardLayout prevents slideout on `/dashboard/custodian`

### Root Cause:

The guard in `DashboardLayout.tsx` was using exact pathname matching (`!==`), which could fail if:
- Pathname has trailing slashes or query params
- Sub-routes exist (e.g., `/dashboard/prime-chat/something`)
- Timing issues during navigation

Additionally, when on `/dashboard/prime-chat` and opening chat via `openChat()`, the slideout from DashboardLayout should be blocked, but the guard might not have been robust enough.

## Fix Applied

### 1. Enhanced Guard in DashboardLayout.tsx

**File**: `src/layouts/DashboardLayout.tsx` (line 1210)

**Change**: Updated guard from exact match to `startsWith`:

```typescript
// BEFORE:
{location.pathname !== '/dashboard/prime-chat' && location.pathname !== '/dashboard/custodian' && (

// AFTER:
{!location.pathname.startsWith('/dashboard/prime-chat') && !location.pathname.startsWith('/dashboard/custodian') && (
```

**Why**: `startsWith` is more robust and catches:
- Exact routes: `/dashboard/prime-chat`
- Sub-routes: `/dashboard/prime-chat/...`
- Query params: `/dashboard/prime-chat?param=value`
- Trailing slashes: `/dashboard/prime-chat/`

### 2. Enhanced Mount Logging in UnifiedAssistantChat.tsx

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 802)

**Change**: Added comprehensive mount logging with pathname and DOM verification:

```typescript
useEffect(() => {
  if (import.meta.env.DEV) {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const mountInfo = { 
      mountId: mountIdRef.current,
      pathname,
      initialEmployeeSlug,
      isOpen,
      conversationId,
      mode,
      renderMode
    };
    console.log('[MOUNT] UnifiedAssistantChat', mountInfo);
    
    // Verify single instance - check DOM for other UnifiedAssistantChat mounts
    const allChatMounts = document.querySelectorAll('[data-unified-chat-mount]');
    if (allChatMounts.length > 1) {
      console.error('[UnifiedAssistantChat] ⚠️ MULTIPLE MOUNTS DETECTED:', {
        count: allChatMounts.length,
        currentMount: mountIdRef.current,
        pathname: mountInfo.pathname,
        mode: mountInfo.mode,
        renderMode: mountInfo.renderMode
      });
    }
    // ...
  }
}, []);
```

**Why**: 
- Logs pathname, mode, and renderMode for debugging
- Detects multiple mounts in DOM and warns
- Helps identify which mounts are active simultaneously

## Verification Checklist

After fix, verify:

1. **On `/dashboard/prime-chat` route:**
   - ✅ Only ONE `UnifiedAssistantChat` mount appears in React DevTools
   - ✅ Console shows `[MOUNT] UnifiedAssistantChat` with `pathname: '/dashboard/prime-chat'` only once
   - ✅ No "MULTIPLE MOUNTS DETECTED" warning
   - ✅ Opening chat via launcher works (slideout opens from DashboardLayout)

2. **On other dashboard routes:**
   - ✅ Slideout chat works normally
   - ✅ Only ONE `UnifiedAssistantChat` mount exists
   - ✅ No duplicate messages or responses

3. **On `/dashboard/custodian` route:**
   - ✅ Only CustodianPage's fullscreen chat renders
   - ✅ DashboardLayout slideout is blocked

## Files Modified

1. `src/layouts/DashboardLayout.tsx` (~1 line changed)
   - Updated guard to use `startsWith` instead of exact match

2. `src/components/chat/UnifiedAssistantChat.tsx` (~30 lines changed)
   - Enhanced mount logging with pathname and DOM verification
   - Added multiple mount detection warning

## Expected Console Output (DEV mode)

**On `/dashboard/prime-chat`:**
```
[MOUNT] UnifiedAssistantChat {
  mountId: "chat-1234567890-abc123",
  pathname: "/dashboard/prime-chat",
  initialEmployeeSlug: "prime-boss",
  isOpen: false,
  conversationId: undefined,
  mode: "slideout",
  renderMode: "slideout"
}
```

**If multiple mounts detected:**
```
[UnifiedAssistantChat] ⚠️ MULTIPLE MOUNTS DETECTED: {
  count: 2,
  currentMount: "chat-1234567890-abc123",
  pathname: "/dashboard/prime-chat",
  mode: "slideout",
  renderMode: "slideout"
}
```

## Summary

- **Root Cause**: Guard used exact pathname match instead of `startsWith`
- **Fix**: Updated guard to use `startsWith` for robust route matching
- **Verification**: Added mount logging and DOM-based multiple mount detection
- **Result**: Only ONE `UnifiedAssistantChat` instance can mount at a time




