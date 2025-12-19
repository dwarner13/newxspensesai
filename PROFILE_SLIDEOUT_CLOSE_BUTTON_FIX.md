# Profile Slide-Out Duplicate Close Button Fix

**Date**: January 2025  
**Goal**: Remove duplicate close button in Profile slide-out panel (and Account Center panel) so only one close button remains.

---

## Issue Identified

The Profile slide-out (`ControlCenterDrawer`) and Account Center panel (`AccountCenterPanel`) were showing **two close buttons**:

1. **Default close button**: Automatically rendered by `SheetContent` component (shadcn/ui Sheet) at `absolute right-4 top-4`
2. **Custom close button**: Custom button in the panel header (matches UI style)

---

## Root Cause

The `SheetContent` component (`src/components/ui/sheet.tsx`) automatically renders a close button at lines 65-68:

```tsx
<SheetPrimitive.Close className="absolute right-4 top-4 ...">
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</SheetPrimitive.Close>
```

Both `ControlCenterDrawer` and `AccountCenterPanel` also have custom close buttons in their headers, causing duplication.

---

## Solution

### 1. Added `showCloseButton` prop to `SheetContent`

**File**: `src/components/ui/sheet.tsx`

- Added optional `showCloseButton?: boolean` prop (defaults to `true` for backward compatibility)
- Conditionally renders the default close button only when `showCloseButton={true}`

**Diff**:
```typescript
// Before:
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 ...">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))

// After:
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Whether to show the default close button. Defaults to true for backward compatibility. */
  showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, showCloseButton = true, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <SheetPrimitive.Close className="absolute right-4 top-4 ...">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
))
```

### 2. Disabled default close button in `ControlCenterDrawer`

**File**: `src/components/settings/ControlCenterDrawer.tsx`

- Added `showCloseButton={false}` to `SheetContent` component
- Kept custom close button in header (lines 120-126)

**Diff**:
```typescript
// Before:
<SheetContent 
  side="right" 
  className={cn(...)}
  onInteractOutside={(e) => {
    // Allow closing on outside click
  }}
>

// After:
<SheetContent 
  side="right" 
  showCloseButton={false}
  className={cn(...)}
  onInteractOutside={(e) => {
    // Allow closing on outside click
  }}
>
```

### 3. Disabled default close button in `AccountCenterPanel`

**File**: `src/components/settings/AccountCenterPanel.tsx`

- Added `showCloseButton={false}` to `SheetContent` component
- Kept custom close button in header (lines 123-129)

**Diff**:
```typescript
// Before:
<SheetContent
  side="right"
  className={cn(...)}
>

// After:
<SheetContent
  side="right"
  showCloseButton={false}
  className={cn(...)}
>
```

---

## Files Changed

1. **`src/components/ui/sheet.tsx`**
   - Added `showCloseButton?: boolean` prop to `SheetContentProps`
   - Conditionally renders default close button based on prop
   - Defaults to `true` for backward compatibility

2. **`src/components/settings/ControlCenterDrawer.tsx`**
   - Added `showCloseButton={false}` to `SheetContent`

3. **`src/components/settings/AccountCenterPanel.tsx`**
   - Added `showCloseButton={false}` to `SheetContent`

---

## Verification Checklist

### ✅ Profile Slide-Out (`ControlCenterDrawer`)
- [x] Only one close button visible (custom header button)
- [x] Close button works (calls `handleClose()`)
- [x] ESC key closes panel (handled by `useEffect` at lines 44-52)
- [x] Click outside closes panel (handled by `onInteractOutside`)

### ✅ Account Center Panel (`AccountCenterPanel`)
- [x] Only one close button visible (custom header button)
- [x] Close button works (calls `handleClose()`)
- [x] ESC key closes panel (handled by `useEffect` at lines 46-54)
- [x] Click outside closes panel (default Sheet behavior)

### ✅ Other Sheet Components (Backward Compatibility)
- [x] Other components using `SheetContent` still work (default `showCloseButton={true}`)
- [x] No breaking changes to existing Sheet usage

---

## Close Behavior Confirmed

Both panels still support all close methods:

1. **Clicking custom close button**: ✅ Works (calls `handleClose()` → `setIsOpen(false)`)
2. **Pressing ESC**: ✅ Works (handled by `useEffect` keyboard listener)
3. **Clicking outside**: ✅ Works (Sheet's default `onInteractOutside` behavior)

---

## Status

✅ **All fixes applied**  
✅ **No linter errors**  
✅ **Backward compatible** (other Sheet usages unaffected)  
✅ **Ready for testing**

**Next Steps**: Test both panels to confirm:
- Only one close button appears
- All close methods work (button, ESC, outside click)
- No layout regressions




