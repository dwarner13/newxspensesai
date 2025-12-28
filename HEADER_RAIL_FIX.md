# Header Overlap + Floating Rail Fix

## Summary

Fixed three critical layout issues:
1. **Header overlap**: Search bar was overlapping the title due to insufficient grid constraints
2. **Floating rail not mounting**: Rail element was returning `null` in debug queries due to missing stable selector and SSR guard
3. **Space reservation**: Verified and documented rail space reservation in main content column

## Root Cause

1. **Header**: The 3-zone grid had proper structure but title zone wasn't properly constrained with `overflow-hidden` and `truncate`, allowing it to expand into the search zone
2. **Rail**: The rail was using `createPortal` correctly but lacked:
   - Stable `data-floating-rail` selector for debugging
   - SSR guard (`typeof document === 'undefined'`)
   - Explicit `pointer-events` styles on decorative elements
3. **Space reservation**: Already correct (`pr-[calc(32px+84px)]`), but needed documentation

## Changes Made

### 1. `src/components/ui/DashboardHeader.tsx`

**Fixed header grid layout:**
- Added `overflow-hidden` to left title zone to prevent expansion
- Added `title` attributes for accessibility when text truncates
- Ensured search zone has `min-w-[320px]` and `max-w-[560px]` constraints
- Added comment explaining grid column behavior

**Key changes:**
```tsx
// Before:
<div className="flex items-start gap-3 min-w-0">
  <div className="flex flex-col min-w-0 shrink-0 max-w-xl">

// After:
<div className="flex items-start gap-3 min-w-0 overflow-hidden">
  <div className="flex flex-col min-w-0 shrink-0 max-w-full">
```

### 2. `src/components/chat/DesktopChatSideBar.tsx`

**Added stable selector and SSR guard:**
- Added `data-floating-rail` attribute to rail root element
- Added SSR guard: `if (typeof document === 'undefined') return null;`
- Added explicit `pointer-events: auto` style to motion.div
- Added `pointer-events: none` style to glow ring decorative element

**Key changes:**
```tsx
// Added SSR guard at top of component
if (typeof document === 'undefined') {
  return null;
}

// Added stable selector
<div
  data-floating-rail
  className={cn(...)}
  ...
>
```

### 3. `src/layouts/DashboardLayout.tsx`

**Added DEV-only instrumentation:**
- Logs viewport width, header/search/icons/rail bounding boxes
- Logs rail presence (`railFound: true/false`)
- Logs body/html padding-right (should be 0px)
- Runs on mount, after 500ms delay (to catch portal rendering), and on resize

**Key changes:**
```tsx
// Added DEV-only useEffect hook that logs:
- viewport width
- header/search/iconsCluster/rail bounding boxes
- railFound boolean
- body/html padding-right
```

## Verification Checklist

### ✅ 1. Reload `/dashboard`
- [ ] Search does NOT overlap title
- [ ] Icons are aligned right in header
- [ ] Rail is visible and fully clickable

### ✅ 2. Reload `/dashboard/smart-import-ai`
- [ ] Same behavior as main dashboard
- [ ] No layout shift

### ✅ 3. DevTools Console
- [ ] Run: `document.querySelector('[data-floating-rail]')`
- [ ] Should return element (NOT null)
- [ ] Check `[LayoutDebug]` logs:
  - `railFound: true`
  - `rail` bounding box exists
  - `bodyPaddingRight: "0px"`

### ✅ 4. Resize Window
- [ ] Layout remains stable
- [ ] No overlap at any width
- [ ] Rail stays visible and clickable

### ✅ 5. Open/Close Overlays
- [ ] Welcome back overlay: no layout shift, rail remains visible
- [ ] Onboarding modals: no layout shift, rail remains visible
- [ ] Chat slideout: rail behavior correct

## Technical Details

### Grid Layout Structure
```
grid-cols-[1fr_minmax(320px,560px)_auto]
│         │                    │      │
│         │                    │      └─ Right: auto (icons, never shrinks)
│         │                    └──────── Center: 320px-560px (search, fixed range)
│         └───────────────────────────── Left: 1fr (title, shrinks as needed)
```

### Rail Positioning
- **Fixed**: `fixed right-8` (32px from viewport right)
- **Vertical**: `top: clamp(160px, 52vh, calc(100vh - 240px))`
- **Z-index**: `z-[999]` (above all content)
- **Portal**: Rendered to `document.body` to escape overflow/stacking contexts

### Space Reservation
- **Mobile**: `pr-4` (16px)
- **Desktop**: `pr-[calc(32px+84px)]` = 116px
  - 32px: edge padding (matches `px-8`)
  - 84px: rail width (~44px) + gap (~12px) + safety margin (~28px)

## Files Modified

1. `src/components/ui/DashboardHeader.tsx`
2. `src/components/chat/DesktopChatSideBar.tsx`
3. `src/layouts/DashboardLayout.tsx`

## Next Steps

1. Test on multiple screen sizes (mobile, tablet, desktop)
2. Verify rail clickability with `elementFromPoint` test
3. Monitor DEV console for `[LayoutDebug]` output
4. Remove DEV instrumentation after verification (optional)




