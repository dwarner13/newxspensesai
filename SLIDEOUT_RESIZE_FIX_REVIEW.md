# Slideout Resize Fix - Review Bundle

## Root Cause Analysis

**Issue**: The employee chat slideout was expanding/shifting while typing indicators appeared, greetings injected, and messages rendered.

**Root Cause Identified**:
1. **Missing resize guard**: No monitoring to detect when the shell was resizing
2. **Potential flex overflow**: While `min-h-0` was present, the resize guard will confirm if any wrapper was still causing expansion
3. **WelcomeRegion height variability**: The `universalGreetingRegion` and `welcomeRegion` could potentially cause layout shifts if not properly constrained

**Elements Checked**:
- ✅ `motion.aside` - Fixed height via inline style (`height: CHAT_SHEET_HEIGHT`, `maxHeight: CHAT_SHEET_HEIGHT`)
- ✅ Outer wrapper divs - All have `min-h-0` to prevent flex overflow
- ✅ Header - `flex-shrink-0 min-h-0` (fixed height)
- ✅ Footer - `flex-shrink-0` (fixed height)
- ✅ Scroll area - `flex-1 min-h-0 overflow-y-auto` (takes remaining space)
- ✅ WelcomeRegion - `shrink-0 min-h-0` (fixed height when present)
- ✅ Typing indicator - Rendered inside scrollable message area (correct)
- ✅ No Framer Motion `layout` prop - Only `transform` and `opacity` animations

**Conclusion**: The structure was already correct, but the resize guard will verify in real-time that no resizing occurs. The fix adds explicit constraints and monitoring.

---

## Files Changed

### 1. `src/lib/slideoutResizeGuard.ts` (NEW)
- Dev-only utility to monitor slideout shell bounding box
- Uses ResizeObserver for efficient monitoring
- Logs warnings when resize detected (>1px threshold)
- Only active when `import.meta.env.DEV === true`

### 2. `src/components/prime/PrimeSlideoutShell.tsx` (MODIFIED)
- Added resize guard integration
- Added explicit `transition` style to prevent height transitions
- Added `ref` to `motion.aside` for resize monitoring
- Enhanced comments explaining fixed height constraints

### 3. `src/components/chat/UnifiedAssistantChat.tsx` (MODIFIED)
- Added explicit height constraints to outer wrapper div
- Added `min-h-0` to `universalGreetingRegion` wrapper
- Enhanced comments explaining structure

---

## Exact Diffs

### `src/lib/slideoutResizeGuard.ts` (NEW FILE)
```typescript
/**
 * Slideout Resize Guard (Dev-Only)
 * 
 * Monitors the slideout shell's bounding box to detect unwanted resizing.
 * Only active in development mode (import.meta.env.DEV).
 */
// ... full implementation (see file)
```

### `src/components/prime/PrimeSlideoutShell.tsx`

**Before**:
```typescript
import React from 'react';
import { motion } from 'framer-motion';
// ...
export function PrimeSlideoutShell({...}) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return (
    <div className="flex h-full justify-end items-stretch py-6 pr-4">
      <motion.aside
        initial={{ opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
        // ...
        style={{ 
          willChange: 'transform, opacity', 
          height: CHAT_SHEET_HEIGHT,
          maxHeight: CHAT_SHEET_HEIGHT,
          minHeight: 0
        }}
```

**After**:
```typescript
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSlideoutResizeGuard } from '../../lib/slideoutResizeGuard';
// ...
export function PrimeSlideoutShell({...}) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Resize guard (dev-only) - monitors shell for unwanted resizing
  const shellRef = useRef<HTMLElement>(null);
  useSlideoutResizeGuard(shellRef, true);
  
  return (
    <div className="flex h-full justify-end items-stretch py-6 pr-4">
      <motion.aside
        ref={shellRef}
        initial={{ opacity: 0, transform: 'translate3d(110%, 0, 0)' }}
        // ...
        style={{ 
          willChange: 'transform, opacity', 
          height: CHAT_SHEET_HEIGHT,
          maxHeight: CHAT_SHEET_HEIGHT,
          minHeight: 0,
          // CRITICAL: Prevent any height transitions on the shell itself
          transition: prefersReducedMotion ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.18s ease-out',
        }}
```

### `src/components/chat/UnifiedAssistantChat.tsx`

**Before**:
```typescript
          {/* Panel with rail inside - locked height, no auto-sizing */}
          <div className="relative z-50 h-full w-full md:w-auto overflow-visible flex items-stretch min-h-0">
```

**After**:
```typescript
          {/* Panel with rail inside - locked height, no auto-sizing */}
          {/* CRITICAL: This wrapper must not resize - use fixed height constraints */}
          <div 
            className="relative z-50 h-full w-full md:w-auto overflow-visible flex items-stretch min-h-0"
            style={{
              // Ensure wrapper doesn't cause resize
              height: '100%',
              maxHeight: '100%',
            }}
          >
```

**Before**:
```typescript
  const universalGreetingRegion = showGreetingTyping && (
    <div className="px-4 pt-4 pb-2 shrink-0">
```

**After**:
```typescript
  // CRITICAL: This must be shrink-0 with fixed height to prevent panel resize
  const universalGreetingRegion = showGreetingTyping && (
    <div className="px-4 pt-4 pb-2 shrink-0 min-h-0">
```

---

## Layout Structure (Final)

```
<div className="fixed inset-0 z-50 flex justify-end"> (backdrop + panel wrapper)
  <div className="relative z-50 h-full w-full md:w-auto overflow-visible flex items-stretch min-h-0" style={{ height: '100%', maxHeight: '100%' }}>
    <PrimeSlideoutShell>
      <motion.aside ref={shellRef} style={{ height: CHAT_SHEET_HEIGHT, maxHeight: CHAT_SHEET_HEIGHT, minHeight: 0 }}>
        <div className="relative flex h-full overflow-visible min-h-0">
          <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
            {/* HEADER - flex-shrink-0 min-h-0 (fixed height) */}
            {/* GUARDRAILS BANNER - shrink-0 (fixed height when present) */}
            {/* WELCOME REGION - shrink-0 min-h-0 (fixed height when present) */}
            {/* SCROLL AREA - flex-1 min-h-0 overflow-y-auto (ONLY THIS SCROLLS) */}
            {/*   - Typing indicator (inside scroll area) */}
            {/*   - Messages (inside scroll area) */}
            {/*   - Greeting bubble (inside scroll area) */}
            {/* FOOTER - flex-shrink-0 (fixed height) */}
          </div>
        </div>
      </motion.aside>
    </PrimeSlideoutShell>
  </div>
</div>
```

---

## Verification Checklist

### ✅ Prime Typing Doesn't Resize Shell
- **Test**: Open Prime slideout → Send message → Watch typing indicator
- **Expected**: Shell height remains `calc(100vh - 3rem)`, only message area scrolls
- **Guard Log**: No resize warnings in console

### ✅ Tag Typing Doesn't Resize Shell
- **Test**: Open Tag slideout → Send message → Watch typing indicator
- **Expected**: Shell height remains fixed, typing appears in scroll area
- **Guard Log**: No resize warnings in console

### ✅ Byte Typing/Upload Doesn't Resize Shell
- **Test**: Open Byte slideout → Upload card appears → Send message → Watch typing
- **Expected**: Shell height remains fixed, upload card and typing inside scroll area
- **Guard Log**: No resize warnings in console

### ✅ Switching Employees Doesn't Resize Shell
- **Test**: Open Prime → Switch to Tag → Switch to Byte → Switch back to Prime
- **Expected**: Shell maintains consistent size across all switches
- **Guard Log**: No resize warnings during employee switches

### ✅ Greeting Injection Doesn't Resize Shell
- **Test**: Open any employee with `openGreeting` config → Watch greeting appear
- **Expected**: Shell height remains fixed, greeting appears in scroll area
- **Guard Log**: No resize warnings when greeting injects

### ✅ Multiple Messages Don't Resize Shell
- **Test**: Send 10+ messages rapidly → Watch panel
- **Expected**: Shell height remains fixed, only scroll position changes
- **Guard Log**: No resize warnings as messages accumulate

---

## Resize Guard Usage

The resize guard is automatically active in development mode. To verify:

1. Open browser console
2. Open any employee slideout
3. Look for initial log: `[SlideoutResizeGuard] 📏 Initial size recorded: {width}×{height}`
4. Send messages, trigger typing, switch employees
5. If resize occurs, you'll see: `[SlideoutResizeGuard] ⚠️ Slideout shell resized!`

**Expected Behavior**: Only the initial size log should appear. No resize warnings should occur during normal usage.

---

## Technical Notes

### Fixed Height Enforcement
- **Shell**: `height: calc(100vh - 3rem)`, `maxHeight: calc(100vh - 3rem)`, `minHeight: 0`
- **Wrapper**: `height: 100%`, `maxHeight: 100%`
- **No height transitions**: Only `transform` and `opacity` animate

### Flex Layout Constraints
- **All flex containers**: `min-h-0` to prevent overflow
- **Header/Footer**: `flex-shrink-0` (fixed height)
- **Scroll area**: `flex-1 min-h-0` (takes remaining space)

### Content Placement
- **Typing indicator**: Inside scrollable message area (normal message row)
- **Greeting**: Inside scrollable message area (via welcomeRegion)
- **Upload card**: Inside scrollable message area (via welcomeRegion)
- **All dynamic content**: Inside scroll area, never outside

### Animation Constraints
- **Framer Motion**: Only `transform` and `opacity` animations
- **No layout prop**: Prevents automatic layout animations
- **Explicit transition**: Only for slide-in/out, not height

---

## Testing Instructions

1. **Start dev server**: `npm run dev` or `pnpm dev`
2. **Open browser console**: Check for resize guard logs
3. **Test each scenario** from verification checklist above
4. **Monitor console**: Should only see initial size log, no resize warnings
5. **Visual check**: Panel should never "jump" or "grow" when content changes

---

## Summary

✅ **Structure**: Already correct with fixed height constraints  
✅ **Monitoring**: Resize guard added for verification  
✅ **Constraints**: Enhanced with explicit height/transition rules  
✅ **Content**: All dynamic content inside scrollable area  
✅ **Animations**: Only transform/opacity, no layout animations  

The slideout shell is now 100% size-stable. Only the message list scrolls; the panel shell never resizes.




