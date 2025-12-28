# Dashboard Shell Regression Fix

## Summary

Fixed two critical regressions:
1. **Header overlap**: Search bar was overlapping title due to `min-w-0` on grid container causing excessive shrinking
2. **Floating rail not mounting**: Rail was conditionally unmounted when chat opened (`!isChatOpen`), causing `document.querySelector('[data-floating-rail]')` to return `null`

## Root Cause Analysis

### Regression 1: Header Overlap
**Problem**: The grid container had `min-w-0` which caused the entire grid to shrink below its natural size, allowing the title zone to expand into the search zone.

**Location**: `src/components/ui/DashboardHeader.tsx` line 217

**Before**:
```tsx
<div className="grid grid-cols-[1fr_minmax(320px,560px)_auto] items-center gap-4 w-full min-w-0">
```

**After**:
```tsx
<div className="grid grid-cols-[1fr_minmax(320px,560px)_auto] items-center gap-4 w-full">
```

**Also fixed**: Simplified left zone structure - removed unnecessary nested flex containers that were causing layout issues.

### Regression 2: Floating Rail Not Mounting
**Problem**: Rail was conditionally rendered with `{!isChatOpen && !isPrimeChatPage && <DesktopChatSideBar />}`, causing it to unmount from DOM when chat opened.

**Location**: `src/layouts/DashboardLayout.tsx` line 583

**Before**:
```tsx
{!isChatOpen && !isPrimeChatPage && (
  <DesktopChatSideBar 
    onHistoryClick={handleOpenChatHistory}
  />
)}
```

**After**:
```tsx
{!isPrimeChatPage && (
  <DesktopChatSideBar 
    onHistoryClick={handleOpenChatHistory}
  />
)}
```

**Visual dimming**: Rail now visually dims (`opacity-30 pointer-events-none`) when chat is open, but stays mounted in DOM for stability.

## Changes Made

### 1. `src/components/ui/DashboardHeader.tsx`

**Fixed grid container**:
- Removed `min-w-0` from grid container (line 217)
- Simplified left zone structure (removed unnecessary flex wrapper)
- Ensured proper zone constraints:
  - Left: `min-w-0 overflow-hidden` (allows truncation)
  - Center: `justify-self-center max-w-[560px] min-w-[320px]` (fixed width range)
  - Right: `justify-self-end shrink-0` (pinned to right, never shrinks)

**Key changes**:
```tsx
// Before:
<div className="grid ... min-w-0">
  <div className="flex items-start gap-3 min-w-0 overflow-hidden">
    <div className="flex flex-col min-w-0 shrink-0 max-w-full">

// After:
<div className="grid ...">
  <div className="min-w-0 overflow-hidden">
    <div className="flex flex-col min-w-0">
```

### 2. `src/layouts/DashboardLayout.tsx`

**Fixed rail conditional rendering**:
- Removed `!isChatOpen` condition (line 583)
- Rail now always mounts on desktop (except Prime Chat page)
- Updated comment to reflect new behavior

**Key changes**:
```tsx
// Before:
{!isChatOpen && !isPrimeChatPage && (
  <DesktopChatSideBar />
)}

// After:
{!isPrimeChatPage && (
  <DesktopChatSideBar />
)}
```

### 3. `src/components/chat/DesktopChatSideBar.tsx`

**Added visual dimming when chat is open**:
- Added `isChatOpen` check from `useUnifiedChatLauncher`
- Rail dims (`opacity-30 pointer-events-none`) when chat is open
- Rail stays mounted in DOM for stability

**Key changes**:
```tsx
// Added:
const isChatOpen = isOpen;

// Updated className:
(isChatOpen || activeMiniWorkspace) && 'opacity-30 pointer-events-none'
```

## Verification Checklist

### ✅ 1. Header Layout
- [ ] Title and search never overlap at 1280px wide and up
- [ ] Right icon/profile cluster is pinned to far right edge inside header padding (`px-8`)
- [ ] Search bar stays centered in its column
- [ ] Long titles truncate properly with ellipsis

### ✅ 2. Floating Rail
- [ ] Rail is always visible and clickable on desktop (md+)
- [ ] Rail visually dims when chat slideout is open (but stays mounted)
- [ ] `document.querySelector('[data-floating-rail]')` returns element (NOT null)
- [ ] Rail has correct z-index (`z-[999]`) and is above content
- [ ] No card slides under rail on scroll

### ✅ 3. Space Reservation
- [ ] Main content column has `pr-[calc(32px+84px)]` on desktop
- [ ] Content never overlaps rail
- [ ] Right edge spacing feels intentional

### ✅ 4. DevTools Console
- [ ] Run: `document.querySelector('[data-floating-rail]')`
- [ ] Should return element (NOT null) even when chat is open
- [ ] Check `[LayoutDebug]` logs show `railFound: true`

## Technical Details

### Grid Layout Structure
```
grid-cols-[1fr_minmax(320px,560px)_auto]
│         │                    │      │
│         │                    │      └─ Right: auto (icons, never shrinks)
│         │                    └──────── Center: 320px-560px (search, fixed range)
│         └───────────────────────────── Left: 1fr (title, shrinks as needed)
```

**Key**: Grid container must NOT have `min-w-0` - this causes the grid to shrink below its natural size.

### Rail Mounting Strategy
- **Always mount** on desktop (md+) except Prime Chat page
- **Visual dimming** when chat is open (`opacity-30 pointer-events-none`)
- **Portal rendering** to `document.body` ensures no clipping
- **Stable selector** `data-floating-rail` for debugging

### Space Reservation
- **Mobile**: `pr-4` (16px)
- **Desktop**: `pr-[calc(32px+84px)]` = 116px
  - 32px: edge padding (matches `px-8`)
  - 84px: rail width (~44px) + gap (~12px) + safety margin (~28px)

## Files Modified

1. `src/components/ui/DashboardHeader.tsx`
   - Removed `min-w-0` from grid container
   - Simplified left zone structure

2. `src/layouts/DashboardLayout.tsx`
   - Removed `!isChatOpen` condition from rail rendering
   - Updated comment

3. `src/components/chat/DesktopChatSideBar.tsx`
   - Added visual dimming when chat is open
   - Rail stays mounted but dims

## Next Steps

1. Test on multiple screen sizes (mobile, tablet, desktop)
2. Verify rail clickability with `elementFromPoint` test
3. Monitor DEV console for `[LayoutDebug]` output
4. Confirm rail is queryable even when chat is open




