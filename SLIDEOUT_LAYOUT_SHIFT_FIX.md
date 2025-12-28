# Slideout Layout Shift Fix - Summary

**Date**: January 2025  
**Goal**: Eliminate internal layout shifts that make the slideout appear to expand while typing/sending, even if shell size is fixed.

---

## Issues Fixed

### 1. ✅ ChatInputBar Textarea Auto-Resize

**Problem**: Textarea auto-resized up to 96px, causing footer height changes that made the slideout appear to expand.

**Fix Applied**:
- Increased max-height cap from 96px to 120px (max-h-30)
- Added `overflow-y: auto` when content exceeds max height
- Added fixed height constraints to input container: `minHeight: '36px', maxHeight: '152px'`
- Added `shrink-0` to prevent flex expansion

**File**: `src/components/chat/ChatInputBar.tsx`
- Lines 79-90: Updated auto-resize logic with 120px cap and overflow handling
- Line 225: Added fixed height constraints to input container
- Line 329: Added inline style constraints to textarea wrapper

### 2. ✅ Footer Container Constraints

**Problem**: Footer container could expand if content grew, causing visual layout shifts.

**Fix Applied**:
- Added `maxHeight: '200px', overflowY: 'auto'` to footer container in `PrimeSlideoutShell`
- Added `shrink-0` to footer wrapper in `UnifiedAssistantChat`
- Added `shrink-0` to guardrails status pill container

**Files**:
- `src/components/prime/PrimeSlideoutShell.tsx` (line 209): Added max-height and overflow constraints
- `src/components/chat/UnifiedAssistantChat.tsx` (line 848): Added `shrink-0` to footer wrapper
- `src/components/chat/ChatInputBar.tsx` (line 404): Added `shrink-0` to guardrails status container

### 3. ✅ Typing Indicator Layout Shift

**Problem**: Typing indicator could cause layout shifts if not properly constrained.

**Fix Applied**:
- Wrapped typing indicator in `shrink-0` container to prevent flex expansion

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1381): Wrapped in `<div className="shrink-0">`

### 4. ✅ Dev-Only Mount/Unmount Logging

**Added**: Temporary dev logs to detect remounts:
- `PrimeSlideoutShell`: Logs mount/unmount with title
- `UnifiedAssistantChat`: Logs mount/unmount + render tracking with employee info, message count, streaming state

**Files**:
- `src/components/prime/PrimeSlideoutShell.tsx` (lines 82-90): Added mount/unmount logging
- `src/components/chat/UnifiedAssistantChat.tsx` (lines 175-200): Added render tracking and mount/unmount logging

---

## Files Changed

1. **`src/components/chat/ChatInputBar.tsx`**
   - Fixed textarea auto-resize with 120px cap
   - Added fixed height constraints to input container
   - Added `shrink-0` to prevent flex expansion
   - Added `shrink-0` to guardrails status container

2. **`src/components/prime/PrimeSlideoutShell.tsx`**
   - Added max-height and overflow constraints to footer
   - Added dev-only mount/unmount logging

3. **`src/components/chat/UnifiedAssistantChat.tsx`**
   - Added `shrink-0` to footer wrapper
   - Wrapped typing indicator in `shrink-0` container
   - Added dev-only render tracking and mount/unmount logging

---

## Verification Steps

### 1. Confirm Resize Guard
- Open browser console
- Open any employee chat
- Check for resize guard logs: `[SlideoutResizeGuard] 📏 Initial size recorded: {width}×{height}`
- Send messages and type in textarea
- **Expected**: No resize warnings should appear

### 2. Check Mount/Unmount Logs
- Open browser console
- Open employee chat
- **Expected**: `[PrimeSlideoutShell] 🟢 Mounted` and `[UnifiedAssistantChat] 🟢 Mounted` should appear once
- Switch employees
- **Expected**: Should NOT see unmount/remount logs (slideout should persist, only content changes)
- Close and reopen chat
- **Expected**: Should see unmount then mount logs

### 3. Test Textarea Expansion
- Open chat
- Type multiple lines in textarea (Shift+Enter)
- **Expected**: Textarea scrolls internally, footer height stays fixed
- Textarea should cap at 120px height with internal scroll

### 4. Test Typing Indicator
- Send a message
- Watch typing indicator appear
- **Expected**: No layout shift, typing appears in scroll area only

### 5. Test Footer Stability
- Type in textarea
- Add attachments
- Toggle guardrails status
- **Expected**: Footer height remains stable, no visual expansion

---

## Expected Console Output

### On Chat Open:
```
[PrimeSlideoutShell] 🟢 Mounted { title: "PRIME — CHAT" }
[UnifiedAssistantChat] 🟢 Mounted { initialEmployeeSlug: "prime-boss" }
[SlideoutResizeGuard] 📏 Initial size recorded: 576×900
[UnifiedAssistantChat] 🎨 Render { ...employee info, messageCount: 0, isStreaming: false }
```

### While Typing/Sending:
```
[UnifiedAssistantChat] 🎨 Render { ...messageCount: 1, isStreaming: true }
// (No resize warnings should appear)
```

### On Employee Switch:
```
[UnifiedAssistantChat] 🎨 Render { ...currentEmployeeSlug: "tag-ai", ... }
// (Should NOT see unmount/remount logs)
```

### On Chat Close:
```
[UnifiedAssistantChat] 🔴 Unmounted { initialEmployeeSlug: "prime-boss" }
[PrimeSlideoutShell] 🔴 Unmounted { title: "PRIME — CHAT" }
```

---

## Root Cause Summary

**Primary Issue**: Textarea auto-resize was causing footer height changes, making the slideout appear to expand even though the shell itself wasn't resizing.

**Secondary Issues**:
- Footer container lacked max-height constraints
- Typing indicator wasn't wrapped in shrink-0 container
- Guardrails status container could cause minor shifts

**Solution**: Fixed-height constraints on all dynamic elements (textarea, footer, typing indicator) with proper `shrink-0` and `overflow-y: auto` where needed.

---

## Status

✅ **All fixes applied**  
✅ **Dev logging added**  
✅ **Ready for testing**

**Next Steps**: Test in browser and verify no layout shifts occur during typing/sending. Remove dev logs after verification if desired.















