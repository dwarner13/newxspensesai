# Metadata Merge Fix - Verification Guide

## Quick Test Steps

### 1. Set Test Metadata in Supabase
```sql
UPDATE profiles 
SET metadata = jsonb_build_object(
  'expense_mode', 'business',
  'onboarding_completed', true,
  'onboarding_version', 'v1',
  'currency', 'USD',
  'debug_last_write', now()::text
)
WHERE id = '<your-user-id>';
```

### 2. Refresh App
- Open localhost
- Check browser console for: `[updateProfileMetadata] ✅ Metadata updated successfully`
- Should see existingKeys, patchKeys, mergedKeys logged

### 3. Verify Metadata Persists
```sql
SELECT id, email, metadata 
FROM profiles 
WHERE id = '<your-user-id>';
```

**Expected Result**:
```json
{
  "expense_mode": "business",
  "onboarding_completed": true,
  "onboarding_version": "v1",
  "currency": "USD",
  "debug_last_write": "2025-02-06T..."
}
```

**NOT**:
```json
{
  "currency": "CAD"
}
```

### 4. Test Prime Onboarding
- Open Prime chat
- Select "Business" + "EUR"
- Complete onboarding
- Check Supabase: All keys should still be present
- Refresh page: Greeting should show "business expenses in EUR"

---

## Files Fixed

1. ✅ `src/lib/profileMetadataHelpers.ts` - Enhanced with regression guard
2. ✅ `src/components/onboarding/PrimeCustodianOnboardingModal.tsx` - Uses helper
3. ✅ `src/components/onboarding/CustodianOnboardingOverlay.tsx` - Uses helper
4. ✅ `src/pages/onboarding/OnboardingSetupPage.tsx` - Uses helper

---

## Regression Guard

The helper now:
- ✅ Warns in dev if existing keys are overwritten
- ✅ Errors if existing keys are missing after merge
- ✅ Logs all keys (existing, patch, merged) for debugging










