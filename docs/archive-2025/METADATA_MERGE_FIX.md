# ✅ Metadata Merge Fix - Complete

**Date**: 2025-02-06  
**Status**: ✅ Complete

---

## 📋 Summary

Fixed all destructive metadata writes to ensure `profiles.metadata` is ALWAYS merged, never replaced. This prevents onboarding fields (`expense_mode`, `onboarding_completed`, etc.) from being wiped.

---

## 🔧 Files Changed

### 1. `src/lib/profileMetadataHelpers.ts` (Enhanced)

**Changes**:
- ✅ Enhanced `updateProfileMetadata()` with optional `existingMetadata` parameter
- ✅ Added regression guard: Warns in dev if existing keys are overwritten
- ✅ Added error check: Fails if existing keys are missing after merge
- ✅ Added comprehensive dev logging
- ✅ Added critical comments: "Metadata must ALWAYS be merged, never replaced"

**Key Features**:
- Fetches existing metadata if not provided
- Merges patch into existing metadata
- Validates merge didn't lose existing keys
- Returns updated profile

### 2. `src/components/onboarding/PrimeCustodianOnboardingModal.tsx`

**Before** (Destructive):
```typescript
metadata: {
  guidance_style: finalData.guidance_style,
  consent_confirmed: finalData.consent_confirmed,
}
```

**After** (Merged):
```typescript
// Use updateProfileMetadata helper
await updateProfileMetadata(userId, {
  guidance_style: finalData.guidance_style,
  consent_confirmed: finalData.consent_confirmed,
});
```

### 3. `src/components/onboarding/CustodianOnboardingOverlay.tsx`

**Before** (Manual merge):
```typescript
const mergedMetadata = {
  ...existingMetadata,
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
};
metadata: mergedMetadata,
```

**After** (Helper):
```typescript
// Use updateProfileMetadata helper
await updateProfileMetadata(userId, {
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}, profile?.metadata);
```

### 4. `src/pages/onboarding/OnboardingSetupPage.tsx`

**Before** (Manual merge):
```typescript
const mergedMetadata = {
  ...existingMetadata,
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
};
metadata: mergedMetadata,
```

**After** (Helper):
```typescript
// Use updateProfileMetadata helper
await updateProfileMetadata(userId, {
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}, profile?.metadata);
```

---

## ✅ All Metadata Updates Now Use Helper

### Verified Safe (Already Using Helper):
- ✅ `src/components/chat/PrimeOnboardingWelcome.tsx` - Uses `updateProfileMetadata()`
- ✅ `src/lib/primeSecurityMessages.ts` - Uses `updateProfileMetadata()`

### Fixed (Now Using Helper):
- ✅ `src/components/onboarding/PrimeCustodianOnboardingModal.tsx`
- ✅ `src/components/onboarding/CustodianOnboardingOverlay.tsx`
- ✅ `src/pages/onboarding/OnboardingSetupPage.tsx`

### Verified Safe (No Metadata Updates):
- ✅ `src/components/settings/tabs/ProfileTab.tsx` - Only updates non-metadata fields
- ✅ `src/components/settings/tabs/AccountTab.tsx` - Only updates `display_name`
- ✅ `src/components/settings/tabs/PreferencesTab.tsx` - Updates `preferences` column (not metadata)

---

## 🛡️ Regression Guard

The enhanced `updateProfileMetadata()` helper includes:

1. **Dev Warning**: If existing keys are overwritten (not in patch)
2. **Error Check**: If existing keys are missing after merge (should never happen)
3. **Comprehensive Logging**: Shows existing keys, patch keys, merged keys

**Example Dev Log**:
```
[updateProfileMetadata] ✅ Metadata updated successfully {
  userId: "...",
  existingKeys: ["expense_mode", "currency", "onboarding_completed"],
  patchKeys: ["onboarding_completed"],
  mergedKeys: ["expense_mode", "currency", "onboarding_completed"]
}
```

---

## 🧪 Verification Checklist

### Test A: SQL Setup
```sql
-- Set metadata with onboarding keys
UPDATE profiles 
SET metadata = jsonb_build_object(
  'expense_mode', 'business',
  'onboarding_completed', true,
  'onboarding_version', 'v1',
  'debug_last_write', now()::text
)
WHERE id = '<your-user-id>';
```

### Test B: Refresh App
- [ ] Refresh localhost app
- [ ] Check console: Should see `[updateProfileMetadata] ✅ Metadata updated successfully`
- [ ] No errors about missing keys

### Test C: Verify Persistence
```sql
-- Re-run SELECT
SELECT id, email, metadata 
FROM profiles 
WHERE id = '<your-user-id>';
```

**Expected**:
- ✅ `metadata` contains ALL keys: `expense_mode`, `onboarding_completed`, `onboarding_version`, `debug_last_write`, `currency` (if set)
- ✅ `metadata` does NOT revert to `{"currency":"CAD"}`

### Test D: Prime Onboarding
- [ ] Open Prime chat
- [ ] Complete onboarding (select BUSINESS + USD)
- [ ] Check Supabase: `metadata.expense_mode = "business"`, `metadata.currency = "USD"`
- [ ] Check Supabase: `metadata` still contains `onboarding_completed`, `onboarding_version`, etc.
- [ ] Refresh page
- [ ] Greeting shows: "You're set up for business expenses in USD"

---

## 📝 Key Points

1. **Single Helper**: All metadata updates go through `updateProfileMetadata()`
2. **Always Merge**: Helper always merges with existing metadata
3. **Regression Guard**: Dev warnings/errors if merge fails
4. **No Direct Updates**: No code directly sets `metadata: { ... }` in upsert/update

---

## ✅ Deliverables

- ✅ Enhanced `updateProfileMetadata()` helper with regression guard
- ✅ Fixed all direct metadata updates to use helper
- ✅ Added critical comments: "Metadata must be merged, never replaced"
- ✅ Test checklist above

**Status**: Ready for testing










