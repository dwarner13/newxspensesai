# Supabase Custodian Onboarding Audit Report

## TASK A — Profile Source of Truth

### Canonical Profile Loader
**File:** `src/contexts/ProfileContext.tsx`
- **Component:** `ProfileProvider`
- **Function:** `fetchProfile()` (line 245)
- **Hook:** `useProfileContext()` exports `profile`, `refreshProfile()`, `userIdentity`

**Alternative Loader:**
- **File:** `src/lib/profileHelpers.ts`
- **Function:** `getOrCreateProfile(userId, userEmail)` (line 40)
- **Used by:** `AuthContext` on initial load

### Profile Type Definition
**Primary:** `src/contexts/ProfileContext.tsx` (line 14-29)
```typescript
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  account_type: string | null;
  settings: Record<string, any> | null; // profiles.settings JSONB
  metadata: Record<string, any> | null; // profiles.metadata JSONB
  [key: string]: any;
}
```

**Secondary:** `src/lib/profileHelpers.ts` (line 10-27) - Similar but includes `onboarding_completed` boolean

---

## TASK B — Supabase Schema

### Profiles Table Structure
**Migration:** `supabase/migrations/20250120_create_profiles_table_rls.sql`

**Columns:**
- `id` TEXT PRIMARY KEY (auth.uid()::text)
- `email` TEXT
- `display_name` TEXT
- `avatar_url` TEXT
- `role` TEXT DEFAULT 'free'
- `plan` TEXT DEFAULT 'free'
- `account_type` TEXT (added later)
- `settings` JSONB (exists, confirmed in code)
- `metadata` JSONB (exists, confirmed in code)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ
- `onboarding_completed` BOOLEAN (legacy column, not used)
- `onboarding_completed_at` TIMESTAMPTZ (legacy column, not used)

### RLS Policies
✅ **Policies exist and are correct:**
- `Users can view own profile` - SELECT for authenticated users
- `Users can insert own profile` - INSERT for authenticated users
- `Users can update own profile` - UPDATE for authenticated users
- `Service role full access` - Full access for service_role

**Status:** ✅ RLS is properly configured, no public access

### Existing Onboarding Structure in Metadata
**Current structure (from code):**
```json
{
  "onboarding": {
    "completed": true,
    "version": 1,
    "completed_at": "2025-01-20T12:00:00Z"
  },
  "settings": {
    "primary_goal": "debt",
    "proactivity_level": "proactive"
  }
}
```

**Note:** Code writes to `metadata.settings` but should write to `profiles.settings` OR `metadata.onboarding.answers`

---

## TASK C — Existing Onboarding Writes

### Write Locations

**1. On Completion (Final Write):**
- **File:** `src/components/onboarding/PrimeCustodianOnboardingModal.tsx`
- **Function:** `handleComplete()` (line 475)
- **What it writes:**
  - `metadata.onboarding.completed = true`
  - `metadata.onboarding.version = 1`
  - `metadata.onboarding.completed_at = ISO timestamp`
  - `metadata.settings.primary_goal` (WRONG LOCATION)
  - `metadata.settings.proactivity_level` (WRONG LOCATION)
  - `display_name` (top-level column) ✅
  - `account_type` (top-level column) ✅

**2. Incremental Writes (During Flow):**
- **File:** `src/components/onboarding/PrimeCustodianOnboardingModal.tsx`
- **Function:** `persistAnswer()` (line 340)
- **What it writes:**
  - `metadata.settings[key]` for each answer (WRONG LOCATION)
  - `display_name` or `account_type` (top-level) ✅

**3. Helper Function:**
- **File:** `src/lib/profileMetadataHelpers.ts`
- **Function:** `updateProfileMetadata()` (line 23)
- **Behavior:** ✅ **SAFE MERGE** - Always merges with existing metadata, never replaces

### Update Strategy
✅ **Safe Merges:** All metadata updates use `updateProfileMetadata()` which:
- Fetches existing metadata
- Merges new data with existing
- Preserves all existing keys
- Uses `upsert` with `onConflict: 'id'`

❌ **Issue:** Writes to `metadata.settings` instead of `profiles.settings` OR `metadata.onboarding.answers`

---

## TASK D — Missing Pieces Report

### What Exists ✅
1. ✅ Profile loader (`ProfileContext`)
2. ✅ Metadata JSONB column exists
3. ✅ Safe merge helper (`updateProfileMetadata`)
4. ✅ Onboarding completion write (`metadata.onboarding.completed`)
5. ✅ Top-level fields write (`display_name`, `account_type`)

### What's Missing ❌

**1. Incremental Answer Persistence**
- ❌ No writes during Custodian onboarding steps
- ❌ `useCustodianOnboarding` hook doesn't persist answers
- ❌ Answers only saved at completion

**2. Resume Capability**
- ❌ No `currentStep` stored in metadata
- ❌ No way to resume from last completed step
- ❌ Onboarding always starts from beginning

**3. Answer Storage Location**
- ❌ Answers written to `metadata.settings` (wrong)
- ✅ Should be `profiles.settings` OR `metadata.onboarding.answers`

**4. Single Accessor for Preferences**
- ❌ No unified helper to read `preferredName`, `experienceLevel`, `primaryGoal`
- ❌ `ProfileContext.userIdentity` reads from `profiles.settings` but writes go to `metadata.settings`
- ❌ Mismatch between read/write locations

---

## IMPLEMENTATION PLAN

### File Edits Required

#### 1. Update `src/hooks/useCustodianOnboarding.ts`
**Add:**
- `saveAnswersToSupabase()` function
- `loadAnswersFromSupabase()` function
- `currentStep` persistence to `metadata.onboarding.currentStep`
- Auto-save after each answer

#### 2. Update `src/components/onboarding/CustodianOnboardingPanel.tsx`
**Add:**
- Call `saveAnswersToSupabase()` after each answer
- Load saved answers on mount
- Resume from `currentStep` if exists

#### 3. Create `src/lib/onboardingHelpers.ts` (NEW)
**Functions:**
- `saveOnboardingAnswer(userId, step, answer)` - Incremental write
- `loadOnboardingState(userId)` - Load currentStep + answers
- `markOnboardingComplete(userId)` - Set completed flag
- `getOnboardingPreferences(profile)` - Single accessor for Settings/Prime

#### 4. Update `src/components/onboarding/PrimeCustodianOnboardingModal.tsx`
**Changes:**
- Remove writes to `metadata.settings`
- Use `profiles.settings` for `primary_goal` and `proactivity_level`
- Use `metadata.onboarding.answers` for step-by-step answers
- Use `metadata.onboarding.currentStep` for resume

#### 5. Update `src/contexts/ProfileContext.tsx`
**Changes:**
- Update `computeUserIdentity()` to read from correct locations:
  - `preferredName` from `display_name` → `first_name` → `full_name`
  - `primaryGoal` from `profiles.settings.primary_goal`
  - `proactivityLevel` from `profiles.settings.proactivity_level`
  - `experienceLevel` from `metadata.onboarding.answers.experienceLevel` (NEW)

#### 6. Update `src/lib/profileMetadataHelpers.ts`
**Add:**
- `updateOnboardingStep(userId, step)` - Update currentStep only
- `updateOnboardingAnswers(userId, answers)` - Merge answers object

---

## DATA MODEL PROPOSAL

### Final Structure

**`profiles.settings` (JSONB):**
```json
{
  "primary_goal": "debt",
  "proactivity_level": "proactive"
}
```

**`profiles.metadata.onboarding` (JSONB):**
```json
{
  "completed": false,
  "version": 1,
  "currentStep": "level",
  "answers": {
    "preferredName": "John",
    "experienceLevel": "intermediate",
    "primaryGoal": "debt"
  },
  "completed_at": null
}
```

**Top-level columns:**
- `display_name` = preferredName
- `account_type` = "personal" | "business" | "both" | "exploring"

---

## SUMMARY

### Canonical Profile Loader
- **File:** `src/contexts/ProfileContext.tsx`
- **Function:** `fetchProfile()` in `ProfileProvider`
- **Hook:** `useProfileContext()`

### Metadata JSONB Status
✅ Exists and is used
✅ Safe merge helper exists (`updateProfileMetadata`)

### Onboarding Metadata Writes
✅ Completion writes exist
❌ Incremental writes missing
❌ Resume capability missing

### Update Safety
✅ All updates use safe merge (never destructive)

### Missing Pieces
1. Incremental answer persistence during steps
2. `currentStep` storage for resume
3. Unified answer storage location (`metadata.onboarding.answers`)
4. Single accessor helper for preferences
5. Fix write location mismatch (`metadata.settings` → `profiles.settings`)








