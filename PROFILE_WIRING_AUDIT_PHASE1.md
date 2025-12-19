# Profile Wiring Audit - Phase 1 Report

**Date**: 2025-01-27  
**Scope**: Read-only audit of profile references, auth logic, demo/guest mode, and onboarding flows

---

## Executive Summary

The codebase has **multiple systems** handling user identity:
1. **AuthContext** - Loads profile but doesn't expose it consistently
2. **ProfileContext** - Separate context with profile hydration
3. **userIdentity.ts** - Guest/authenticated identity resolver
4. **Direct Supabase queries** - Many components query profiles directly
5. **Hardcoded/mock data** - Several places use placeholders

**Key Finding**: No single canonical source of truth for profile data. Components use different fallback chains.

---

## 1. Profiles Table References

### Core Profile Loading

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/contexts/AuthContext.tsx` | 164-194, 326-343 | Loads profile on session, stores in local state, computes `firstName` | Expose `profile` object + `isProfileLoading` in context |
| `src/contexts/ProfileContext.tsx` | 71-91, 205-209 | Separate context, auto-hydrates missing profiles | **Consolidate with AuthContext** or make it the single source |
| `src/lib/userIdentity.ts` | 77-81, 204-210 | Queries profiles for `getUserIdentity()` and `isProfileComplete()` | Use AuthContext profile instead of direct queries |

### Onboarding Flow

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/onboarding/PrimeCustodianOnboardingModal.tsx` | 226-238 | Saves to `profiles` table with `profile_completed: true` | ✅ Correct - keep this pattern |
| `src/components/auth/OnboardingGuard.tsx` | 54-58 | Checks `profile_completed` field directly | Use AuthContext `profile.profile_completed` instead |
| `src/lib/userIdentity.ts` | 204-210 | Checks `profile_completed` for authenticated users | Use AuthContext profile |

### Settings/Account Pages

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/settings/tabs/AccountTab.tsx` | 49, 88 | Queries profiles directly for display name | Use AuthContext profile |
| `src/components/settings/tabs/ProfileTab.tsx` | 91, 155 | Queries profiles, saves updates | Use AuthContext profile + refreshProfile() |
| `src/pages/settings/ProfilePage.tsx` | 95, 127, 252, 303 | Has mock mode flag, queries profiles directly | Remove mock mode, use AuthContext profile |

### Other Direct Queries (Lower Priority)

- `src/pages/onboarding/OnboardingSetupPage.tsx` (65, 73)
- `src/pages/onboarding/FinalScreen.tsx` (19, 44)
- `src/components/gamification/*` (multiple files)
- `src/server/db.ts` (370, 378) - Server-side, OK
- `src/lib/agents/context.tsx` (19) - Uses different fields (`full_name`, `plan`, `email`)

---

## 2. AuthContext / Session / User ID Logic

### Current State

| File | Lines | Current Behavior | Issue |
|------|-------|------------------|-------|
| `src/contexts/AuthContext.tsx` | 45-609 | Main auth provider, loads profile but doesn't expose it | `profile` state exists but not exported in context type |
| `src/contexts/AuthContext.tsx` | 68-79 | Computes `firstName` from profile/user metadata | Should use `profile.display_name` as primary source |
| `src/contexts/AuthContext.tsx` | 154-194 | Profile loading logic (duplicated in ProfileContext) | **Consolidate** - AuthContext should be canonical |

### Context Exports

**Current AuthContext exports:**
```typescript
{
  user, userId, loading, signInWithGoogle, signInWithApple, 
  signInWithOtp, signOut, session, ready, isDemoUser, firstName, profile
}
```

**Issue**: `profile` is in state but not consistently used. `firstName` is computed but should prefer `profile.display_name`.

**Should export:**
```typescript
{
  user, userId, session, loading, ready, isDemoUser,
  profile,           // ← Add to type
  isProfileLoading,  // ← Add
  refreshProfile,    // ← Add
  firstName          // ← Keep (computed from profile)
}
```

---

## 3. Demo User / Guest Mode / Hardcoded Identity

### Demo User Constants

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/lib/demoAuth.ts` | 11-13 | `DEMO_USER_ID`, `DEMO_USER_EMAIL`, `DEMO_USER_NAME` | ✅ Keep for guest mode |
| `src/contexts/AuthContext.tsx` | 46 | `DEMO_USER_ID` constant | ✅ Keep |

### Guest Mode Logic

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/lib/userIdentity.ts` | 41-52, 186-194 | Guest uses localStorage, checks `GUEST_PROFILE_COMPLETED_KEY` | ✅ Keep guest mode separate |
| `src/components/onboarding/PrimeCustodianOnboardingModal.tsx` | 205-218 | Saves guest profile to localStorage | ✅ Keep |
| `src/components/auth/OnboardingGuard.tsx` | 34-41 | Skips onboarding check for demo users | ✅ Keep |

### Hardcoded Names / Mock Data

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/pages/settings/ProfilePage.tsx` | 45, 72-83 | `useMockData = true` flag, hardcoded "Darrell Warner" | **Remove mock mode**, use real profile |
| `src/components/dashboard/sections/OverviewSection.tsx` | 50-52 | Falls back to hardcoded "Darrell" | Use `profile.display_name` or `firstName` from AuthContext |
| `src/components/dashboard/Header.jsx` | 13 | Hardcoded "Welcome back, Darrell!" | Use AuthContext `firstName` |
| `src/contexts/PersonalPodcastContext.tsx` | 292, 338 | Hardcoded `userName = 'Sarah'` | Use AuthContext `profile.display_name` |
| `src/components/navigation/AIEnhancedSidebar.tsx` | 536 | Uses `profile.fullName` (from useProfile hook) | ✅ Already using profile, verify source |

---

## 4. Onboarding Flow Components

### Prime → Custodian Flow

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/onboarding/PrimeCustodianOnboardingModal.tsx` | 192-238 | Saves to `profiles` table, sets `profile_completed: true` | ✅ Correct pattern - keep |
| `src/components/onboarding/UnifiedOnboardingFlow.tsx` | 30-37 | Checks `isProfileComplete()` for guest/authenticated | Use AuthContext `profile.profile_completed` |
| `src/components/onboarding/GuestOnboardingFlow.tsx` | 31-40 | Checks guest profile completion | ✅ Keep guest logic separate |

### Onboarding Guard

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/auth/OnboardingGuard.tsx` | 54-77 | Queries `profiles.profile_completed` directly | Use AuthContext `profile.profile_completed` |

---

## 5. UI Surfaces Using User Names

### Dashboard Header / Greeting

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/ui/DashboardHeader.tsx` | 162 | Uses `firstName` from AuthContext | ✅ Already correct - verify `firstName` uses profile |
| `src/components/dashboard/sections/OverviewSection.tsx` | 50-52, 108 | Falls back to hardcoded "Darrell" | Use AuthContext `firstName` (which should use profile) |
| `src/components/dashboard/Header.jsx` | 13 | Hardcoded "Darrell" | Use AuthContext `firstName` |

### Settings / Account Center

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/settings/tabs/AccountTab.tsx` | 49, 88 | Queries profiles directly | Use AuthContext `profile.display_name` |
| `src/components/navigation/AIEnhancedSidebar.tsx` | 536 | Uses `profile.fullName` from useProfile | Verify source is AuthContext |

### Chat Components

| File | Lines | Current Behavior | Should Do |
|------|-------|------------------|-----------|
| `src/components/chat/PrimeWelcomeCard.tsx` | 17-20 | Falls back to "there" if no userName prop | Use AuthContext `firstName` as default |

---

## 6. Database Schema Reference

### Profiles Table Columns (from `src/types/database.types.ts`)

**Key columns:**
- `id` (string, primary key)
- `display_name` (string | null) ← **Primary name field**
- `full_name` (string | null)
- `first_name` (string | null)
- `email` (string | null)
- `profile_completed` (boolean | null) ← **Onboarding gate**
- `onboarding_completed` (boolean | null) ← **Alternative field?**
- `onboarding_completed_at` (string | null)
- `account_mode` (string | null) ← Used for primary_mode
- `metadata` (jsonb) ← Used for guidance_style, consent_confirmed

**Note**: Both `profile_completed` and `onboarding_completed` exist. Need to verify which is canonical.

---

## 7. Canonical Profile Loading Location

### Current State

**Two contexts load profiles:**
1. **AuthContext** (`src/contexts/AuthContext.tsx:154-194`)
   - Loads profile on session
   - Stores in local state
   - Computes `firstName`
   - **Doesn't expose `profile` in context type**

2. **ProfileContext** (`src/contexts/ProfileContext.tsx:176-250`)
   - Separate context
   - Auto-hydrates missing profiles
   - Exposes `profile`, `loading`, `refreshProfile()`
   - **Duplicates AuthContext logic**

### Recommendation

**Make AuthContext the canonical source:**
- AuthContext already loads profile on session
- Add `profile`, `isProfileLoading`, `refreshProfile` to context exports
- Keep ProfileContext for now (used by some components) but mark as deprecated
- Migrate components to use AuthContext profile

---

## 8. Summary of Issues

### Critical Issues
1. ❌ **No single source of truth** - AuthContext and ProfileContext both load profiles
2. ❌ **AuthContext doesn't expose profile** - Profile is loaded but not in context type
3. ❌ **Direct Supabase queries** - Many components query profiles directly instead of using context
4. ❌ **Hardcoded names** - Several places use "Darrell", "Sarah", "there" as fallbacks

### Medium Priority
5. ⚠️ **Mock mode in ProfilePage** - `useMockData = true` flag should be removed
6. ⚠️ **Inconsistent field names** - Some use `profile_completed`, others use `onboarding_completed`
7. ⚠️ **firstName computation** - Should prefer `profile.display_name` over user metadata

### Low Priority
8. ℹ️ **Guest mode separation** - Guest mode logic is separate (OK, but should be documented)
9. ℹ️ **Server-side queries** - Server functions query profiles directly (OK, expected)

---

## 9. Files Requiring Changes (Phase 3)

### High Priority
- `src/contexts/AuthContext.tsx` - Add profile exports, consolidate loading
- `src/components/auth/OnboardingGuard.tsx` - Use AuthContext profile
- `src/lib/userIdentity.ts` - Use AuthContext profile instead of direct queries
- `src/components/dashboard/sections/OverviewSection.tsx` - Remove hardcoded "Darrell"
- `src/components/dashboard/Header.jsx` - Use AuthContext firstName
- `src/contexts/PersonalPodcastContext.tsx` - Remove hardcoded "Sarah"

### Medium Priority
- `src/components/settings/tabs/AccountTab.tsx` - Use AuthContext profile
- `src/components/settings/tabs/ProfileTab.tsx` - Use AuthContext profile
- `src/pages/settings/ProfilePage.tsx` - Remove mock mode, use AuthContext profile
- `src/components/chat/PrimeWelcomeCard.tsx` - Use AuthContext firstName as default

### Low Priority
- `src/components/onboarding/UnifiedOnboardingFlow.tsx` - Use AuthContext profile
- Other components with direct profile queries (gamification, etc.)

---

## Next Steps

**Phase 2**: Create wiring plan with minimal architecture changes  
**Phase 3**: Implement changes incrementally, test after each batch

