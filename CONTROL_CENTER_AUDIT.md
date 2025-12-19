# Control Center Drawer - Audit Map

## Entry Points Found

### 1. Top-Right Profile Icon
**File:** `src/components/ui/DashboardHeader.tsx`
- **Line:** ~374
- **Current Behavior:** Opens dropdown menu (`setIsProfileOpen`)
- **Handler:** `onClick={() => setIsProfileOpen(!isProfileOpen)}`
- **Target:** Should open drawer with "profile" tab

### 2. Settings Page Buttons
**File:** `src/components/settings/SettingsUnifiedCard.tsx`
- **Profile Button:** Line ~68 - `navigate('/dashboard/settings/profile')`
- **Preferences Button:** Line ~77 - `navigate('/dashboard/settings/preferences')`
- **Security Button:** Line ~86 - `navigate('/dashboard/settings/security')`
- **Target:** Should open drawer with respective tabs instead of navigating

## Existing Drawer/Sheet Components

### 1. Radix UI Sheet (Recommended)
**File:** `src/components/ui/sheet.tsx`
- **Type:** Radix UI Dialog-based sheet
- **Features:** 
  - Smooth animations (built-in)
  - ESC key support (built-in)
  - Click outside to close (built-in)
  - Right-side slide-in (default)
  - Width: `w-3/4 sm:max-w-sm` (configurable)
- **Status:** ✅ Perfect for this use case

### 2. PrimeSlideoutShell
**File:** `src/components/prime/PrimeSlideoutShell.tsx`
- **Type:** Custom Framer Motion slideout
- **Features:** More complex, designed for Prime chat panels
- **Status:** ⚠️ Overkill for settings drawer

## UI Store Pattern

**File:** `src/lib/uiStore.ts`
- **Pattern:** Jotai atoms
- **Existing atoms:**
  - `isMobileMenuOpenAtom`
  - `isNotificationsOpenAtom`
- **Status:** ✅ Can add control center drawer atoms here

## Current Profile Page

**File:** `src/pages/settings/ProfilePage.tsx`
- **Current:** Full page component
- **Needs:** Extract form logic to be reusable in drawer

## Implementation Plan

1. ✅ Add drawer state atoms to `uiStore.ts`
2. ✅ Create `ControlCenterDrawer.tsx` using Sheet component
3. ✅ Create `userIdentity.ts` for guest/auth resolution
4. ✅ Wire DashboardHeader profile icon
5. ✅ Wire SettingsUnifiedCard buttons
6. ✅ Create Profile tab content with Custodian setup
7. ✅ Create Preferences tab content
8. ✅ Create Security tab content




