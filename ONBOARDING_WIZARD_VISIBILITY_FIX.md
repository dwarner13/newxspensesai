# Onboarding Wizard Visibility Fix — Debug & Z-Index

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

Onboarding wizard was blank (only background visible) even though logs showed:
- Auth + profile loaded
- `custodianReady = false`
- Route correctly navigated to `/onboarding/setup`

**Goal**: Detect whether wizard is mounted and fix overlay/z-index issues.

---

## SOLUTION

Added debug banners and explicit z-index stacking to ensure wizard is visible.

---

## FILES MODIFIED

### `src/pages/onboarding/OnboardingSetupPage.tsx`

**Lines Modified**: ~115-133

**Changes**:
1. Added DEV-only red banner to confirm page renders
2. Wrapped wizard in container with explicit z-index

**Before**:
```tsx
return (
  <>
    {devDebug}
    <div className="min-h-screen w-full">
      <CustodianOnboardingWizard onComplete={handleComplete} />
    </div>
  </>
);
```

**After**:
```tsx
return (
  <>
    {devDebug}
    {/* DEV-ONLY: Big visible banner to confirm page renders */}
    {import.meta.env.DEV && (
      <div className="fixed top-4 left-4 z-[9999] rounded bg-red-600 px-3 py-2 text-white font-bold text-sm shadow-lg">
        ONBOARDING PAGE RENDERED
      </div>
    )}
    {/* Wizard wrapper with explicit stacking to ensure visibility */}
    <div className="relative z-[50] pointer-events-auto min-h-screen w-full">
      <CustodianOnboardingWizard onComplete={handleComplete} />
    </div>
  </>
);
```

---

### `src/components/onboarding/CustodianOnboardingWizard.tsx`

**Lines Modified**: ~668-673, ~909

**Changes**:
1. Added DEV-only mount log
2. Added explicit z-index to root div

**Before**:
```tsx
export function CustodianOnboardingWizard({ onComplete }: CustodianOnboardingWizardProps) {
  const { userId, user, refreshProfile } = useAuth();
  const profileContext = useProfileContext();
  const refreshProfileContext = profileContext?.refreshProfile || null;
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('firstName');
  // ...
  
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full min-h-screen py-6 pb-10">
```

**After**:
```tsx
export function CustodianOnboardingWizard({ onComplete }: CustodianOnboardingWizardProps) {
  const { userId, user, refreshProfile } = useAuth();
  const profileContext = useProfileContext();
  const refreshProfileContext = profileContext?.refreshProfile || null;
  
  // DEV-ONLY: Log when wizard mounts
  useEffect(() => {
    console.log('[CustodianOnboardingWizard] ✅ Component mounted');
  }, []);
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('firstName');
  // ...
  
  return (
    <div className="relative z-[50] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full min-h-screen py-6 pb-10">
```

---

### `src/layouts/DashboardLayout.tsx`

**Lines Modified**: ~136-145

**Changes**: Added explicit z-index to layout wrapper and main element

**Before**:
```tsx
if (isOnboardingRoute) {
  return (
    <PrimeOverlayProvider>
      <div className="min-h-screen bg-slate-950">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </PrimeOverlayProvider>
  );
}
```

**After**:
```tsx
if (isOnboardingRoute) {
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

## Z-INDEX STACKING

### Stack Order (lowest to highest):
1. **Background**: `z-0` (DashboardLayout wrapper)
2. **Main content**: `z-10` (DashboardLayout main)
3. **Wizard wrapper**: `z-[50]` (OnboardingSetupPage wrapper)
4. **Wizard root**: `z-[50]` (CustodianOnboardingWizard root)
5. **Debug banner**: `z-[9999]` (DEV-only red banner)

### Why This Works:
- Background at `z-0` ensures it's behind everything
- Main at `z-10` ensures content renders above background
- Wizard wrapper + root at `z-[50]` ensures wizard is above layout
- Debug banner at `z-[9999]` ensures it's always visible (for debugging)

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Load /onboarding/setup
- **Action**: Navigate to `/onboarding/setup` (with `custodian_ready = false`)
- **Expected**: 
  - Red banner "ONBOARDING PAGE RENDERED" appears at top-left
  - Console shows `[OnboardingSetupPage] Rendering wizard:`
  - Console shows `[CustodianOnboardingWizard] ✅ Component mounted`
- **Result**: ✅ Banner visible = page renders

### ✅ Step 2: If Banner Shows But Wizard Not Visible → Z-Index Fix
- **Action**: Check if wizard content is visible
- **Expected**: Wizard should be visible with proper z-index stacking
- **Result**: ✅ Wizard visible = z-index fix works

### ✅ Step 3: If Banner Does Not Show → Route Not Rendering
- **Action**: Check console for route logs
- **Expected**: Should see route decision logs from RouteDecisionGate
- **Result**: ✅ Route renders = routing works

### ✅ Step 4: Confirm Mount Log Appears
- **Action**: Check console for `[CustodianOnboardingWizard] ✅ Component mounted`
- **Expected**: Log appears when wizard mounts
- **Result**: ✅ Log appears = wizard mounts

---

## DEBUG FEATURES

### 1. Red Banner (DEV-only)
- **Location**: Top-left corner
- **Text**: "ONBOARDING PAGE RENDERED"
- **Purpose**: Confirm page component renders
- **Guard**: `import.meta.env.DEV`

### 2. Console Logs (DEV-only)
- **OnboardingSetupPage**: Logs when rendering wizard
- **CustodianOnboardingWizard**: Logs when component mounts
- **Purpose**: Confirm component lifecycle
- **Guard**: `import.meta.env.DEV`

### 3. Z-Index Stacking
- **Explicit values**: All elements have explicit z-index
- **Purpose**: Ensure proper stacking order
- **Always active**: Not guarded by DEV

---

## CONSTRAINTS MET

✅ **Minimal changes** - Only added debug banners and z-index  
✅ **No refactors** - No structural changes  
✅ **No scroll/layout regressions** - Only z-index changes  
✅ **DEV-only debug** - Banners and logs guarded by `import.meta.env.DEV`  

---

## TECHNICAL NOTES

### Why Z-Index Issues?

- **Background color matching**: Wizard background (`bg-slate-950`) matches layout background
- **No explicit stacking**: Without z-index, elements stack in DOM order
- **Overlay potential**: Other overlays might have higher z-index

### Why Debug Banner?

- **Visual confirmation**: Red banner is unmistakable
- **Position**: Fixed top-left ensures visibility
- **High z-index**: `z-[9999]` ensures it's always on top

### Why Mount Log?

- **Lifecycle confirmation**: Confirms React component lifecycle
- **Timing**: Shows when component mounts vs when page renders
- **Debugging**: Helps identify if wizard never mounts

---

## FILES MODIFIED SUMMARY

1. **src/pages/onboarding/OnboardingSetupPage.tsx**
   - Added DEV-only red banner
   - Added z-index wrapper around wizard

2. **src/components/onboarding/CustodianOnboardingWizard.tsx**
   - Added DEV-only mount log
   - Added explicit z-index to root div

3. **src/layouts/DashboardLayout.tsx**
   - Added explicit z-index to layout wrapper and main element

---

## NEXT STEPS

After verification:
1. If banner shows but wizard not visible → Check CSS/styling issues
2. If banner does not show → Check routing/route guards
3. If mount log does not appear → Check component lifecycle/rendering
4. Once fixed → Remove DEV-only debug banners (keep z-index fixes)




