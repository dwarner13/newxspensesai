# Onboarding Storage Audit Report

**Date:** 2025-01-30  
**Status:** 🔍 Audit Complete → Fixes Required

---

## 📋 Executive Summary

**Current Issues:**
1. ❌ Schema mismatch: Code uses `account_name` but should use `account_type`
2. ❌ Inconsistent field usage: `account_name` vs `account_type` confusion
3. ❌ Missing columns: Some writes fail due to missing schema columns
4. ⚠️ Duplicate rendering: Footer may render twice (needs verification)
5. ⚠️ Email-derived name logic still exists in some legacy components

---

## 🔍 Detailed Audit

### 1. Profile Fields Used in Onboarding

#### Fields Currently Written:
- `display_name` ✅ (canonical name field)
- `account_name` ❌ (should be `account_type`)
- `currency` ✅
- `country` (stored in `metadata.country`)
- `onboarding_completed` ✅
- `onboarding_completed_at` ✅
- `time_zone` ⚠️ (mentioned but not consistently used)
- `locale` ⚠️ (mentioned but not consistently used)

#### Fields Currently Read:
- `profile.display_name` ✅
- `profile.account_name` ❌ (should be `profile.account_type`)
- `profile.currency` ✅
- `profile.metadata.country` ✅
- `profile.onboarding_completed` ✅

---

### 2. Files Writing to Profiles

#### Primary Onboarding Component:
**File:** `src/components/onboarding/CinematicOnboardingOverlay.tsx`
- **Line 437-443:** Writes `display_name`, `currency`, `account_name`, `onboarding_completed`, `onboarding_completed_at`
- **Issue:** Uses `account_name` instead of `account_type`
- **Source of Truth:** Local state (`formData`)

#### Legacy Components (Deprecated):
**File:** `src/components/onboarding/CustodianOnboardingOverlay.tsx`
- **Line 99-106:** Writes `display_name`, `account_type`, `currency`
- **Status:** Deprecated, behind `ONBOARDING_MODE.legacyEnabled` flag
- **Issue:** Uses `account_type` (correct) but component is deprecated

**File:** `src/pages/onboarding/AccountSetupScreen.tsx`
- **Line 75-86:** Writes `display_name`, `account_name`, `time_zone`, `date_locale`, `currency`
- **Status:** Legacy page, may not be used
- **Issue:** Uses `account_name` (incorrect)

---

### 3. Files Reading from Profiles

#### Onboarding Gate:
**File:** `src/components/onboarding/useOnboardingGate.ts`
- **Line 38-40:** Reads `display_name`, `currency`, `account_name`
- **Issue:** Checks `profile.account_name` (should be `profile.account_type`)

#### Profile Context:
**File:** `src/contexts/ProfileContext.tsx`
- **Line 175-178:** Reads `display_name`, `first_name`, `full_name` for display name
- **Line 233:** Reads `account_type` (correct field name)
- **Status:** ✅ Uses correct field name

#### Auth Context:
**File:** `src/contexts/AuthContext.tsx`
- **Line 76:** Reads `profile.display_name` for firstName
- **Status:** ✅ Uses correct field name

---

### 4. Schema Mismatch Details

**Problem:** Code writes to `account_name` but reads from `account_type` in some places.

**Evidence:**
1. `CinematicOnboardingOverlay.tsx` line 439: `account_name: formData.account_type.trim()`
2. `useOnboardingGate.ts` line 40: `profile.account_name?.trim()`
3. `ProfileContext.tsx` line 233: `profile.account_type` (correct)

**Root Cause:** Inconsistent field naming - should standardize on `account_type`.

---

### 5. Duplicate Rendering Issues

**File:** `src/components/onboarding/CinematicOnboardingOverlay.tsx`

**Footer Rendering:**
- **Line 1202-1317:** Single footer with conditional rendering
- **Status:** ✅ Already fixed with `key` prop and dev logging
- **Verification:** Dev logs show `[Onboarding] footer render {scene}`

**Step Rendering:**
- **Line 877-943:** Identity step (single render with `key="identity-scene"`)
- **Line 905-1119:** Defaults step (single render with `key="defaults-scene"`)
- **Status:** ✅ Already guarded with keys

---

### 6. Email-Derived Name Logic

**Found in Legacy Components:**
- `CustodianOnboardingOverlay.tsx` line 52-58: Derives from email
- `AccountSetupScreen.tsx` line 39-45: Derives from email
- **Status:** Both deprecated/legacy, not used in active flow

**Active Component:**
- `CinematicOnboardingOverlay.tsx`: ✅ No email derivation (fixed in previous changes)

---

## 🔧 Required Fixes

### Fix 1: Standardize on `account_type`

**Change:** Replace all `account_name` references with `account_type`

**Files to Update:**
1. `src/components/onboarding/CinematicOnboardingOverlay.tsx`
   - Line 211: `account_type: profile?.account_name?.trim() || ''` → `account_type: profile?.account_type?.trim() || ''`
   - Line 374: `account_type: profile.account_name || prev.account_type` → `account_type: profile.account_type || prev.account_type`
   - Line 439: `account_name: formData.account_type.trim()` → `account_type: formData.account_type.trim()`

2. `src/components/onboarding/useOnboardingGate.ts`
   - Line 40: `profile.account_name?.trim()` → `profile.account_type?.trim()`
   - Line 46: Remove fallback to `account_name`

### Fix 2: Ensure Schema Columns Exist

**Migration:** `supabase/migrations/20250130_fix_onboarding_schema.sql` (already created)
- ✅ Adds `account_type` column
- ✅ Adds `display_name` column
- ✅ Adds `onboarding_completed` column
- ✅ Adds `onboarding_completed_at` column
- ✅ Adds `currency` column
- ✅ Adds `locale` column

**Action:** Run migration if not already applied.

### Fix 3: Remove `account_name` Usage

**Strategy:** 
- Keep `account_type` as the canonical field
- Remove any writes to `account_name`
- Update reads to use `account_type`

---

## 📊 Current State Summary

| Field | Write Location | Read Location | Status |
|-------|---------------|---------------|--------|
| `display_name` | CinematicOnboardingOverlay.tsx:437 | useOnboardingGate.ts:38, ProfileContext.tsx:175 | ✅ Correct |
| `account_name` | CinematicOnboardingOverlay.tsx:439 | useOnboardingGate.ts:40 | ❌ Should be `account_type` |
| `account_type` | CustodianOnboardingOverlay.tsx:103 | ProfileContext.tsx:233 | ✅ Correct (but inconsistent) |
| `currency` | CinematicOnboardingOverlay.tsx:438 | useOnboardingGate.ts:39 | ✅ Correct |
| `onboarding_completed` | CinematicOnboardingOverlay.tsx:440 | useOnboardingGate.ts:35 | ✅ Correct |
| `onboarding_completed_at` | CinematicOnboardingOverlay.tsx:441 | - | ✅ Correct |
| `metadata.country` | CinematicOnboardingOverlay.tsx:407 | useOnboardingGate.ts:46 | ✅ Correct |

---

## 🎯 Recommended Actions

1. **Immediate:** Fix `account_name` → `account_type` in active components
2. **Immediate:** Run migration to ensure columns exist
3. **Verify:** Check duplicate rendering (already appears fixed)
4. **Cleanup:** Remove deprecated components or ensure they're fully gated

---

**End of Audit Report**








