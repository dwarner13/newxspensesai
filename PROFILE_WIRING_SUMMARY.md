# Profile Wiring Audit & Implementation Summary

**Date**: 2025-01-27  
**Status**: Phase 1 & 2 Complete, Phase 3 Ready for Implementation

---

## Deliverables

### ✅ Phase 1: Audit Report
**File**: `PROFILE_WIRING_AUDIT_PHASE1.md`

**Findings:**
- 172+ references to `profiles` table across codebase
- No single source of truth (AuthContext + ProfileContext both load profiles)
- Multiple hardcoded names ("Darrell", "Sarah", "there")
- Direct Supabase queries in many components
- Mock mode flag in ProfilePage

**Key Issues:**
1. AuthContext loads profile but doesn't expose it consistently
2. ProfileContext duplicates AuthContext logic
3. OnboardingGuard queries profiles directly
4. UI components use hardcoded fallbacks

---

### ✅ Phase 2: Wiring Plan
**File**: `PROFILE_WIRING_PLAN_PHASE2.md`

**Proposed Architecture:**
- Make AuthContext the single source of truth
- Add `profile`, `isProfileLoading`, `refreshProfile` to AuthContext exports
- Create `getOrCreateProfile()` helper function
- Update components to use AuthContext profile
- Remove hardcoded names and mock modes

**Implementation Steps:**
1. Create helper + update AuthContext (30 min)
2. Update OnboardingGuard (15 min)
3. Update UI surfaces (30 min)
4. Update Settings pages (30 min)
5. Clean up direct queries (1 hour, optional)

**Total Estimated Time**: ~2.5 hours

---

### ⏳ Phase 3: Implementation
**Status**: Ready to implement (awaiting approval)

**Files to Change:**
- `src/lib/profileHelpers.ts` (new)
- `src/contexts/AuthContext.tsx` (enhance)
- `src/components/auth/OnboardingGuard.tsx` (update)
- `src/components/dashboard/sections/OverviewSection.tsx` (fix)
- `src/components/dashboard/Header.jsx` (fix)
- `src/contexts/PersonalPodcastContext.tsx` (fix)
- `src/components/settings/tabs/AccountTab.tsx` (update)
- `src/components/settings/tabs/ProfileTab.tsx` (update)
- `src/pages/settings/ProfilePage.tsx` (remove mock mode)

---

## Quick Test Checklist

### Local Testing
- [ ] Login with new user → Profile auto-creates
- [ ] Login with existing user → Profile loads correctly
- [ ] Onboarding flow → Prime → Custodian → Profile saves → `profile_completed: true`
- [ ] Dashboard header → Shows correct name (not "Darrell")
- [ ] Settings → Account tab → Shows `profile.display_name`
- [ ] Settings → Profile tab → Can update display name → Refreshes correctly
- [ ] Guest mode → Still works (localStorage-based)

### Netlify Staging Testing
- [ ] Deploy to staging
- [ ] Test with real Supabase connection
- [ ] Verify profile queries work
- [ ] Verify onboarding flow completes
- [ ] Verify no console errors

---

## Database Schema Notes

### Profiles Table Columns Used
- `id` (primary key)
- `display_name` ← **Primary name field**
- `full_name` (fallback)
- `email`
- `profile_completed` ← **Onboarding gate** (boolean)
- `onboarding_completed_at` (timestamp)
- `account_mode` (string, used for `primary_mode`)
- `metadata` (jsonb, stores `guidance_style`, `consent_confirmed`)

### Note on `onboarding_completed`
- Both `profile_completed` and `onboarding_completed` exist in schema
- **Recommendation**: Use `profile_completed` (more widely used)
- Verify in database which field is actually set

---

## Risk Mitigation

### Low Risk Changes
- Adding `profile` to AuthContext exports (already in state)
- Updating `firstName` computation (fallback chain exists)
- Updating UI components (simple prop changes)

### Medium Risk Changes
- OnboardingGuard update (critical path, but simple)
- Removing mock mode (verify no dependencies)

### Mitigation Strategy
- Test incrementally after each step
- Keep existing code paths working during migration
- Use feature flags if needed (prefer direct migration)

---

## Next Steps

1. **Review Phase 2 plan** - Confirm architecture approach
2. **Resolve questions**:
   - `profile_completed` vs `onboarding_completed` - which is canonical?
   - ProfileContext deprecation timeline?
3. **Approve Phase 3** - Begin implementation
4. **Implement incrementally** - Test after each step
5. **Deploy to staging** - Verify on Netlify

---

## Files Created

1. `PROFILE_WIRING_AUDIT_PHASE1.md` - Complete audit report
2. `PROFILE_WIRING_PLAN_PHASE2.md` - Implementation plan
3. `PROFILE_WIRING_SUMMARY.md` - This summary document

---

## Questions?

See detailed findings in:
- **Audit Report**: `PROFILE_WIRING_AUDIT_PHASE1.md`
- **Implementation Plan**: `PROFILE_WIRING_PLAN_PHASE2.md`

