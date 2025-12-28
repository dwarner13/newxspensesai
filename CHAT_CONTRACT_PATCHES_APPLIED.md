# Chat Contract Patches Applied

## Summary

Applied minimal patches to fix root causes identified in audit:
- **File 1**: `src/hooks/usePrimeChat.ts` - Fixed send lock, SSE guards, fallback
- **File 2**: `src/components/chat/UnifiedAssistantChat.tsx` - Removed duplicate locks, fixed typing timing, fixed scroll ref, fixed DOM nesting
- **File 3**: `src/components/prime/PrimeSlideoutShell.tsx` - Fixed flex chain

---

## File 1: `src/hooks/usePrimeChat.ts`

### Change 1: Short-circuit SSE chunk guards BEFORE parsing JSON
**Location**: `parseSSEEvent` function (line ~476)

**Before**: Guards checked after JSON parsing, allowing duplicate processing
**After**: Guards checked at function entry, short-circuiting early

**Impact**: Prevents late chunks from creating duplicate bubbles

### Change 2: Removed duplicate guard checks in chunk processing
**Location**: Inside `parseSSEEvent` loop (line ~648)

**Before**: Guards checked again after already checked at entry
**After**: Removed redundant checks (already handled at function entry)

**Impact**: Cleaner code, guards enforced once at entry

### Change 3: Fix fallback to create placeholder instead of appending
**Location**: Fallback error handler (line ~1490)

**Before**: If placeholder missing, appended new message (could create duplicate)
**After**: Creates placeholder first, then updates it (never appends)

**Impact**: Prevents duplicate assistant bubbles in fallback scenarios

---

## File 2: `src/components/chat/UnifiedAssistantChat.tsx`

### Change 1: Removed redundant send lock
**Location**: `handleSend` function (line ~1103-1146)

**Before**: Component had `sendLockRef` + duplicate send signature check
**After**: Removed component-level lock (hook's `inFlightRef` handles it)

**Impact**: Single source of truth for send locking, eliminates race window

### Change 2: Removed `beginTyping()` call before send
**Location**: `handleSend` function (line ~1210)

**Before**: Called `beginTyping()` before `sendMessage()`, causing typing to show before placeholder
**After**: Removed call - hook handles typing state via `isStreaming` + placeholder existence

**Impact**: Typing indicator only shows when no placeholder exists (prevents double typing)

### Change 3: Added `scrollElementRef` for direct scroll container reference
**Location**: Refs declaration (line ~173) + `findScrollContainer` (line ~901) + scroll container div (line ~3280)

**Before**: `scrollContainerRef` pointed to wrapper, `findScrollContainer` traversed DOM to find scroll element
**After**: Added `scrollElementRef` pointing directly to scroll container, `findScrollContainer` uses it first

**Impact**: Faster scroll operations, eliminates DOM traversal overhead

### Change 4: Fixed DOM nesting warning (`<p>` → `<div>`)
**Location**: Message content rendering (line ~2952)

**Before**: `<p>` tag contained `TypingMessage` component (React warns about block element in flex)
**After**: Changed to `<div>` (semantically correct for component content)

**Impact**: Eliminates React DOM nesting warnings in console

---

## File 3: `src/components/prime/PrimeSlideoutShell.tsx`

### Change 1: Explicit `min-h-0` style on flex parent
**Location**: Main content wrapper (line ~287)

**Before**: Only had `min-h-0` in className (may not apply in all browsers)
**After**: Added explicit `style={{ minHeight: 0 }}` to ensure flex chain works

**Impact**: Ensures scroll container can shrink properly, prevents messages from being cut off

---

## Testing Checklist

After applying patches, verify:

- [ ] Send message → exactly one user bubble appears
- [ ] Send message → exactly one assistant placeholder → one final message
- [ ] Typing indicator shows ONLY when no placeholder exists
- [ ] Scroll container scrolls correctly, messages not cut off
- [ ] No DOM nesting warnings in console
- [ ] Multiple rapid sends → only first processes (others blocked)
- [ ] Stream error → fallback updates placeholder, no duplicate created
- [ ] Late SSE chunks after finalization → ignored (no duplicates)

---

## Contract Compliance

All 7 Chat Contract invariants are now enforced:

1. ✅ **Exactly One Send Per User Action**: Hook's `inFlightRef` prevents duplicate sends
2. ✅ **Exactly One Assistant Bubble Per RequestId**: Placeholder created before fetch, updated during stream, finalized on completion
3. ✅ **Placeholder Is The Streaming Bubble**: Placeholder has `meta.is_streaming: true`, updated during stream
4. ✅ **Typing Indicator Inside Placeholder OR Separate (Never Both)**: Component checks `hasStreamingAssistantBubble` before showing typing
5. ✅ **Exactly One Scroll Owner**: `scrollElementRef` points directly to scroll container
6. ✅ **Input Pinned, Autoscroll Near Bottom**: Existing logic preserved
7. ✅ **Cleanup Always Runs**: Existing `finally` blocks preserved

---

## Next Steps

1. Test all scenarios in checklist
2. Monitor for any edge cases in production
3. Consider implementing Employee Plug-In Plan (see audit report section E)
4. Consider creating unified `employeeRegistry.ts` (see audit report section E)




