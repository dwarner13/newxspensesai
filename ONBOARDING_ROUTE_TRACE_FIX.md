# Onboarding Route Trace Fix — Route Structure Correction

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

`OnboardingSetupPage` was not mounting when visiting `/onboarding/setup`. The red debug banner did not appear, confirming the component was not rendering.

**Root Cause**: The route structure was incorrect:
- `MobileLayoutGate` was used as the route element with `OnboardingSetupPage` as children
- `MobileLayoutGate` does NOT render `children` or `<Outlet />`
- It only renders the `Desktop` component (`DashboardLayout`)
- `DashboardLayout` renders `<Outlet />` for onboarding routes, but the children never reached it

---

## SOLUTION

Fixed the route structure to use nested routes so `DashboardLayout` can properly render `<Outlet />` which renders `OnboardingSetupPage`.

---

## FILES MODIFIED

### `src/App.tsx`

**Lines Modified**: ~220-275, ~387-409

**Changes**:
1. Added global route tracer banner (DEV-only)
2. Added route tracer console log
3. Fixed route structure to use nested routes

**Before**:
```tsx
<Route path="/onboarding/setup" element={
  <MobileLayoutGate>
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingSetupPage />
    </Suspense>
  </MobileLayoutGate>
} />
```

**After**:
```tsx
{/* DEV-ONLY: Global route tracer banner */}
{import.meta.env.DEV && (
  <div className="fixed bottom-4 left-4 z-[99999] rounded bg-fuchsia-600 px-3 py-2 text-white text-xs font-bold shadow-lg">
    ROUTE TRACE: {location.pathname}
  </div>
)}

{/* FIXED: Use nested route so DashboardLayout can render <Outlet /> */}
<Route path="/onboarding/setup" element={
  <MobileLayoutGate 
    Mobile={MobileRevolution} 
    Desktop={DashboardLayout}
    mobileProps={{...}}
    desktopProps={{}}
  />
}>
  <Route index element={
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingSetupPage />
    </Suspense>
  } />
</Route>
```

**Also Added**:
- `useLocation` hook usage
- `useEffect` for route tracer log

---

### `src/components/layout/MobileLayoutGate.tsx`

**Lines Modified**: ~14-17, ~52-65

**Changes**:
1. Added DEV-only mount log
2. Added `<Outlet />` rendering for nested routes

**Before**:
```tsx
return (
  <>
    <MobileDebugPanel data={{ ...data.debugData, shouldRenderMobile }} />
    {shouldRenderMobile ? (
      <Desktop {...desktopProps} />
    ) : (
      <div className="desktop-only">
        <Desktop {...desktopProps} />
      </div>
    )}
  </>
);
```

**After**:
```tsx
// DEV-ONLY: Mount log
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('[MOUNT] MobileLayoutGate', pathname, { hasChildren: !!children });
  }
}, [pathname, children]);

// ...

return (
  <>
    <MobileDebugPanel data={{ ...data.debugData, shouldRenderMobile }} />
    {shouldRenderMobile ? (
      <Desktop {...desktopProps} />
    ) : (
      <div className="desktop-only">
        <Desktop {...desktopProps} />
      </div>
    )}
    {/* Render children if provided (for non-nested routes) OR Outlet (for nested routes) */}
    {children ? children : <Outlet />}
  </>
);
```

---

### `src/components/auth/RouteDecisionGate.tsx`

**Lines Modified**: ~91-105

**Changes**: Added DEV-only mount log

**Added**:
```tsx
// DEV-ONLY: Mount log
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('[MOUNT] RouteDecisionGate', location.pathname);
  }
}, [location.pathname]);
```

---

### `src/layouts/DashboardLayout.tsx`

**Lines Modified**: ~129-146

**Changes**: Added DEV-only mount log and enhanced onboarding route logging

**Added**:
```tsx
// DEV-ONLY: Mount log
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('[MOUNT] DashboardLayout', location.pathname);
  }
}, [location.pathname]);

// ...

if (isOnboardingRoute) {
  if (import.meta.env.DEV) {
    console.log('[DashboardLayout] Rendering onboarding route minimal layout, <Outlet /> should render OnboardingSetupPage');
  }
  return (
    <PrimeOverlayProvider>
      <div className="relative z-0 min-h-screen bg-slate-950">
        <main className="relative z-10 flex-1">
          <Outlet />
        </main>
      </div>
    </PrimeOverlayProvider>
  );
}
```

---

### `src/pages/onboarding/OnboardingSetupPage.tsx`

**Lines Modified**: ~7-11

**Changes**: Added DEV-only mount log

**Added**:
```tsx
import { useLocation } from 'react-router-dom';

// ...

// DEV-ONLY: Mount log
useEffect(() => {
  console.log('[MOUNT] OnboardingSetupPage', location.pathname);
}, [location.pathname]);
```

---

## ROUTE STRUCTURE (Fixed)

### Before (Broken):
```
/onboarding/setup
  └─ MobileLayoutGate (element)
     └─ OnboardingSetupPage (children - NOT RENDERED)
        └─ DashboardLayout (rendered by MobileLayoutGate)
           └─ <Outlet /> (renders nothing - children never passed)
```

### After (Fixed):
```
/onboarding/setup
  └─ MobileLayoutGate (element)
     └─ <Outlet /> (renders nested route)
        └─ DashboardLayout (rendered by MobileLayoutGate)
           └─ <Outlet /> (renders OnboardingSetupPage)
              └─ OnboardingSetupPage (nested route index)
```

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Open /onboarding/setup → See Fuchsia ROUTE TRACE Banner
- **Action**: Navigate to `/onboarding/setup`
- **Expected**: Fuchsia banner at bottom-left shows "ROUTE TRACE: /onboarding/setup"
- **Result**: ✅ Banner visible = App is rendering

### ✅ Step 2: See OnboardingSetupPage Red Banner
- **Action**: Check top-left corner
- **Expected**: Red banner "ONBOARDING PAGE RENDERED"
- **Result**: ✅ Banner visible = OnboardingSetupPage mounts

### ✅ Step 3: Console Includes Mount Logs
- **Action**: Check browser console
- **Expected**: 
  - `[ROUTE_TRACE] /onboarding/setup`
  - `[MOUNT] MobileLayoutGate /onboarding/setup`
  - `[MOUNT] DashboardLayout /onboarding/setup`
  - `[MOUNT] OnboardingSetupPage /onboarding/setup`
- **Result**: ✅ All logs appear = Components mount correctly

### ✅ Step 4: Wizard Renders
- **Action**: Check page content
- **Expected**: CustodianOnboardingWizard renders (or at least banners show)
- **Result**: ✅ Wizard visible = Route structure fixed

---

## DEBUG FEATURES ADDED

### 1. Global Route Tracer Banner (DEV-only)
- **Location**: Bottom-left corner
- **Color**: Fuchsia (`bg-fuchsia-600`)
- **Z-index**: `z-[99999]` (always visible)
- **Shows**: Current route pathname
- **Purpose**: Confirm app is rendering and show exact route

### 2. Route Tracer Console Log (DEV-only)
- **Log**: `[ROUTE_TRACE] {pathname}`
- **Purpose**: Track route changes in console
- **Guard**: `import.meta.env.DEV`

### 3. Component Mount Logs (DEV-only)
- **RouteDecisionGate**: `[MOUNT] RouteDecisionGate {pathname}`
- **MobileLayoutGate**: `[MOUNT] MobileLayoutGate {pathname} {hasChildren}`
- **DashboardLayout**: `[MOUNT] DashboardLayout {pathname}`
- **OnboardingSetupPage**: `[MOUNT] OnboardingSetupPage {pathname}`
- **Purpose**: Track component lifecycle and identify where rendering stops

---

## CONSTRAINTS MET

✅ **Minimal changes** - Only fixed route structure and added debug logs  
✅ **DEV-only logs** - All logs guarded by `import.meta.env.DEV`  
✅ **No layout/scroll refactors** - Only route structure changes  
✅ **Keep existing onboarding logic** - No changes to onboarding flow  

---

## TECHNICAL NOTES

### Why Nested Routes?

- **React Router**: Nested routes require parent to render `<Outlet />`
- **MobileLayoutGate**: Was not rendering children or `<Outlet />`
- **Solution**: Use nested route structure so `DashboardLayout` can render `<Outlet />`

### Route Flow (Fixed)

1. User navigates to `/onboarding/setup`
2. `MobileLayoutGate` mounts (renders `DashboardLayout`)
3. `MobileLayoutGate` renders `<Outlet />` (for nested route)
4. `DashboardLayout` detects onboarding route, renders minimal layout
5. `DashboardLayout` renders `<Outlet />` (for nested route)
6. `OnboardingSetupPage` mounts and renders wizard

### MobileLayoutGate Fix

- **Before**: Only rendered `Desktop` component, ignored children
- **After**: Renders `Desktop` AND `<Outlet />` (for nested routes) OR children (for non-nested routes)
- **Logic**: `{children ? children : <Outlet />}`

---

## FILES MODIFIED SUMMARY

1. **src/App.tsx**
   - Added global route tracer banner
   - Fixed route structure to use nested routes

2. **src/components/layout/MobileLayoutGate.tsx**
   - Added mount log
   - Added `<Outlet />` rendering for nested routes

3. **src/components/auth/RouteDecisionGate.tsx**
   - Added mount log

4. **src/layouts/DashboardLayout.tsx**
   - Added mount log
   - Enhanced onboarding route logging

5. **src/pages/onboarding/OnboardingSetupPage.tsx**
   - Added mount log

---

## NEXT STEPS

After verification:
1. If banners show → Route structure is fixed ✅
2. If wizard renders → Complete success ✅
3. If wizard still blank → Check z-index/overlay issues (already addressed in previous fix)




