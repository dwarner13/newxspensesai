# Chat UX Audit Report

## Part A — Audit Summary

### Root Cause #1: Panel Shrinks After Sending

**Files Involved:**
- `src/components/prime/PrimeSlideoutShell.tsx` (lines 77-88, 106-187)
- `src/components/chat/UnifiedAssistantChat.tsx` (lines 634-645, 651-675, 1136-1139)

**Issues Found:**
1. **Welcome region conditionally disappears**: When `hasMessages` becomes true, `welcomeRegion` disappears (line 651), causing layout shift
2. **Byte upload panel may collapse**: `byteUploadRegion` has `max-h-[220px] overflow-hidden` but no minimum height, can collapse to 0
3. **No fixed height strategy**: Panel relies on `flex h-full` which can shrink if content changes
4. **Outer wrapper padding**: `<div className="flex h-full justify-end items-stretch py-6 pr-4">` has `py-6` which reduces available height

**Exact Code:**
```typescript
// UnifiedAssistantChat.tsx:651
const welcomeRegion = !hasMessages && !isStreaming && !isTag && !isByte && (
  // This entire region disappears when messages appear
)

// UnifiedAssistantChat.tsx:636
const byteUploadRegion = isByte ? (
  <div className="px-4 pt-3 pb-2 shrink-0" ref={byteUploadPanelRef}>
    // No min-height, can collapse
  </div>
) : null;
```

---

### Root Cause #2: Input Blocked While Streaming

**Files Involved:**
- `src/components/chat/ChatInputBar.tsx` (line 209)
- `src/components/chat/UnifiedAssistantChat.tsx` (line 760)

**Issues Found:**
1. **Textarea disabled during streaming**: `disabled={disabled || isStreaming}` prevents typing
2. **No "Stop" button**: Only shows spinner in send button, no way to cancel
3. **Send button disabled**: `disabled={isStreaming || (!value.trim() && attachments.length === 0) || disabled}` blocks sending

**Exact Code:**
```typescript
// ChatInputBar.tsx:209
<textarea
  ref={textareaRef}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={handleKeyPress}
  placeholder={placeholder}
  rows={1}
  disabled={disabled || isStreaming}  // ❌ BLOCKS TYPING
  className="..."
/>

// ChatInputBar.tsx:217
<button
  type="submit"
  disabled={isStreaming || (!value.trim() && attachments.length === 0) || disabled}
  // ❌ No "Stop" button shown during streaming
/>
```

---

### Root Cause #3: Cancel/Close Gets Stuck

**Files Involved:**
- `src/components/chat/UnifiedAssistantChat.tsx` (lines 70, 1042)
- `src/hooks/usePrimeChat.ts` (lines 188-192, 563-565)
- `src/hooks/useUnifiedChatEngine.ts` (lines 164-166)

**Issues Found:**
1. **No cleanup on close**: `onClose` handler doesn't call `cancelStream()` to abort in-flight requests
2. **No cleanup on unmount**: Component doesn't abort requests when unmounting
3. **AbortController exists but not used on close**: `usePrimeChat` has `abortRef` and `stop()` method, but `UnifiedAssistantChat` doesn't call it

**Exact Code:**
```typescript
// UnifiedAssistantChat.tsx:1042
<PrimeSlideoutShell
  onClose={onClose}  // ❌ Just closes panel, doesn't abort request
  ...
/>

// usePrimeChat.ts:563-565
const stop = useCallback(() => {
  resetStream();  // ✅ Aborts request and clears state
}, [resetStream]);

// UnifiedAssistantChat.tsx - NO cleanup useEffect
// ❌ Missing: useEffect(() => () => cancelStream(), [])
```

---

## Files to Change

1. `src/components/prime/PrimeSlideoutShell.tsx` - Fix panel height stability
2. `src/components/chat/UnifiedAssistantChat.tsx` - Fix welcome region, add cleanup, wire cancel
3. `src/components/chat/ChatInputBar.tsx` - Remove input disable, add Stop button
4. `src/hooks/useUnifiedChatEngine.ts` - Ensure cancelStream is exposed (already done)

---

## Part B — Implementation Plan

### 1) Stop Panel from Shrinking
- Make welcome region have fixed height or use absolute positioning
- Ensure Byte upload panel has min-height
- Remove conditional layout changes based on `hasMessages`
- Use stable height strategy: `h-[calc(100vh-...)]` or `max-h-[...]`

### 2) Input Must Stay Usable
- Remove `disabled={isStreaming}` from textarea
- Keep send button disabled during streaming (prevent double-send)
- Add "Stop" button that appears during streaming
- Wire Stop button to `cancelStream()`

### 3) Cancel/Close Must Abort
- Call `cancelStream()` in `onClose` handler
- Add cleanup `useEffect` to abort on unmount
- Ensure streaming state clears immediately on abort

### 4) Make Consistent
- All fixes apply to `UnifiedAssistantChat` which is used by all workers
- No per-worker changes needed
















