# Profile Wiring Plan - Phase 2

**Date**: 2025-01-27  
**Status**: Proposal (awaiting approval before Phase 3 implementation)

---

## Architecture Overview

### Goal
Make `AuthContext` the **single source of truth** for user profile data, with minimal changes to existing code.

### Principles
1. **Minimal changes** - Reuse existing AuthContext profile loading logic
2. **Backward compatible** - Keep existing APIs working during migration
3. **Incremental** - Wire components one at a time, test after each
4. **Safe fallbacks** - Always have fallback values (email prefix, "there", etc.)

---

## Proposed Architecture

### 1. AuthContext Enhancements

**Current State:**
```typescript
interface AuthContextType {
  user, userId, loading, session, ready, isDemoUser, firstName, profile
}
// profile is in state but not consistently exposed
```

**Proposed State:**
```typescript
interface AuthContextType {
  // Existing
  user: any;
  userId: string | null;
  session: any;
  loading: boolean;
  ready: boolean;
  isDemoUser: boolean;
  firstName: string; // Computed from profile.display_name
  
  // New additions
  profile: Profile | null;           // Full profile object
  isProfileLoading: boolean;          // Separate from auth loading
  refreshProfile: () => Promise<void>; // Refresh profile from DB
}
```

**Implementation:**
- Expose existing `profile` state in context
- Add `isProfileLoading` state (separate from `loading`)
- Add `refreshProfile()` function that reloads profile
- Update `firstName` computation to prefer `profile.display_name`

---

### 2. Profile Loading Helper

**Create:** `src/lib/profileHelpers.ts`

```typescript
/**
 * getOrCreateProfile(userId, userEmail)
 * 
 * Fetches profile from Supabase, creates if missing.
 * Returns profile object or null.
 */
export async function getOrCreateProfile(
  userId: string,
  userEmail: string
): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  
  // Try to fetch existing
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (existing) return existing;
  
  // Create if missing
  const displayName = userEmail.split('@')[0] || 'User';
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: userEmail,
      display_name: displayName,
      role: 'free',
      plan: 'free',
    })
    .select()
    .single();
  
  return newProfile;
}
```

**Usage in AuthContext:**
- Replace existing profile loading logic (lines 154-194) with call to `getOrCreateProfile()`
- This centralizes the "fetch or create" pattern

---

### 3. Onboarding Gating

**Current:** `OnboardingGuard` queries `profiles.profile_completed` directly

**Proposed:** Use AuthContext profile

```typescript
// In OnboardingGuard.tsx
const { profile, isProfileLoading } = useAuth();

// Check profile_completed from context
const profileCompleted = profile?.profile_completed === true;
```

**Note:** Keep guest mode logic separate (checks localStorage flag)

---

### 4. Display Name Resolution

**Current:** Multiple fallback chains across components

**Proposed:** Single function in AuthContext

```typescript
// In AuthContext.tsx
const firstName = useMemo(() => {
  // Priority order:
  // 1. profile.display_name (split to first name)
  // 2. profile.full_name (split to first name)
  // 3. user.user_metadata.full_name (split)
  // 4. user.email (split @)
  // 5. "there" (fallback)
  
  const raw = 
    profile?.display_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0];
  
  if (!raw) return 'there';
  return raw.split(' ')[0];
}, [profile, user]);
```

**All components use:** `const { firstName } = useAuth();`

---

## Implementation Steps (Phase 3)

### Step 1: Create Helper + Update AuthContext
- [ ] Create `src/lib/profileHelpers.ts` with `getOrCreateProfile()`
- [ ] Update `AuthContext.tsx`:
  - Add `isProfileLoading` state
  - Add `refreshProfile()` function
  - Expose `profile` in context type
  - Update `firstName` computation to prefer `profile.display_name`
- [ ] Test: Verify profile loads on login

### Step 2: Update Onboarding Guard
- [ ] Update `OnboardingGuard.tsx` to use `profile.profile_completed` from AuthContext
- [ ] Remove direct Supabase query
- [ ] Test: Verify onboarding flow works

### Step 3: Update UI Surfaces (High Priority)
- [ ] `OverviewSection.tsx` - Remove hardcoded "Darrell", use `firstName`
- [ ] `Header.jsx` - Use `firstName` from AuthContext
- [ ] `PersonalPodcastContext.tsx` - Remove hardcoded "Sarah", use `profile.display_name`
- [ ] `PrimeWelcomeCard.tsx` - Use `firstName` as default prop
- [ ] Test: Verify names display correctly

### Step 4: Update Settings Pages
- [ ] `AccountTab.tsx` - Use `profile.display_name` from AuthContext
- [ ] `ProfileTab.tsx` - Use AuthContext profile + `refreshProfile()` after save
- [ ] `ProfilePage.tsx` - Remove `useMockData` flag, use AuthContext profile
- [ ] Test: Verify settings pages work

### Step 5: Clean Up Direct Queries (Low Priority)
- [ ] `userIdentity.ts` - Use AuthContext profile instead of direct queries (if possible)
- [ ] Other components with direct queries (gamification, etc.) - Migrate incrementally
- [ ] Test: Verify no regressions

---

## Database Column Mapping

### Confirmed Columns (from audit)
- `display_name` - Primary name field ✅
- `profile_completed` - Onboarding gate ✅
- `onboarding_completed` - Alternative field (verify which is canonical)
- `onboarding_completed_at` - Timestamp ✅
- `account_mode` - Used for `primary_mode` ✅
- `metadata` (jsonb) - Used for `guidance_style`, `consent_confirmed` ✅

### Onboarding Data Storage Pattern

**Current (PrimeCustodianOnboardingModal):**
```typescript
await supabase.from('profiles').upsert({
  id: userId,
  display_name: finalData.display_name,
  account_mode: finalData.primary_mode,
  profile_completed: true,
  onboarding_completed_at: finalData.created_at,
  metadata: {
    guidance_style: finalData.guidance_style,
    consent_confirmed: finalData.consent_confirmed,
  },
});
```

**This pattern is correct** - keep it as-is.

---

## Migration Strategy

### Backward Compatibility

**During migration:**
- Keep ProfileContext working (some components still use it)
- Keep direct Supabase queries working (migrate incrementally)
- Add AuthContext profile as **preferred** source

**After migration:**
- Mark ProfileContext as deprecated
- Remove direct queries gradually

### Testing Checklist

**For each step:**
1. ✅ Profile loads on login
2. ✅ Profile displays in UI (name shows correctly)
3. ✅ Onboarding flow works (Prime → Custodian → Complete)
4. ✅ Settings pages can update profile
5. ✅ Guest mode still works (localStorage)
6. ✅ No console errors

---

## Risk Assessment

### Low Risk
- Adding `profile` to AuthContext exports (already in state)
- Updating `firstName` computation (fallback chain exists)
- Updating UI components to use `firstName` (simple prop change)

### Medium Risk
- Updating OnboardingGuard (critical path, but simple change)
- Removing mock mode from ProfilePage (verify no dependencies)

### Mitigation
- Test each step incrementally
- Keep existing code paths working during migration
- Use feature flags if needed (but prefer direct migration)

---

## Questions to Resolve

1. **`profile_completed` vs `onboarding_completed`** - Which is canonical?
   - **Recommendation**: Use `profile_completed` (more widely used)
   - Verify in database which field is actually set

2. **ProfileContext deprecation** - When to remove?
   - **Recommendation**: Keep for now, mark as deprecated, remove in future PR

3. **Guest mode** - Keep separate or integrate?
   - **Recommendation**: Keep separate (localStorage-based) for now
   - Document that guest mode doesn't use profiles table

---

## Success Criteria

**Phase 3 is complete when:**
1. ✅ AuthContext exposes `profile`, `isProfileLoading`, `refreshProfile`
2. ✅ OnboardingGuard uses AuthContext profile
3. ✅ All hardcoded names removed from UI
4. ✅ Settings pages use AuthContext profile
5. ✅ No direct Supabase profile queries in high-priority components
6. ✅ All tests pass
7. ✅ Guest mode still works

---

## Next Steps

**Awaiting approval** before proceeding to Phase 3 implementation.

**Estimated effort:**
- Step 1: 30 min
- Step 2: 15 min
- Step 3: 30 min
- Step 4: 30 min
- Step 5: 1 hour (optional, can be done later)

**Total**: ~2.5 hours for core implementation

