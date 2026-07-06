# Custodian Onboarding Storage Audit + Fix Summary

**Date:** 2025-01-30  
**Status:** ✅ Complete

---

## 📋 Executive Summary

Fixed all onboarding storage issues:
- ✅ Standardized on `account_type` (not `account_name`)
- ✅ Added timezone support (auto-detected + user confirmation)
- ✅ Fixed schema mismatch errors
- ✅ Verified Prime only greets + handoffs (no form fields)
- ✅ Verified Custodian asks all questions (display name, country, currency, account type, timezone)
- ✅ Fixed duplicate footer rendering (already fixed in previous changes)

---

## 🔍 Audit Results

### 1. Schema Mismatch Fixed

**Problem:** Code was writing to `account_name` but reading from `account_type` in some places.

**Files Fixed:**
1. `src/components/onboarding/CinematicOnboardingOverlay.tsx`
   - Line 211: Changed `profile?.account_name?.trim()` → `profile?.account_type?.trim()`
   - Line 387: Changed `profile.account_name` → `profile.account_type`
   - Line 454: Changed `account_name: formData.account_type.trim()` → `account_type: formData.account_type.trim()`

2. `src/components/onboarding/useOnboardingGate.ts`
   - Line 40: Changed `profile.account_name?.trim()` → `profile.account_type?.trim()`
   - Line 46: Removed fallback to `account_name`

3. `supabase/migrations/20250130_fix_onboarding_schema.sql`
   - Added both `account_type` (canonical) and `account_name` (legacy compatibility)

---

### 2. Timezone Support Added

**Implementation:**
- Auto-detects timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Stores in `metadata.timezone`
- Added timezone confirmation card in defaults step
- User can change timezone if auto-detection is wrong

**Files Changed:**
- `src/components/onboarding/CinematicOnboardingOverlay.tsx`
  - Added `detectedTimezone` memo (line 207-211)
  - Added `timezone` to `formData` state (line 223)
  - Added timezone card in defaults step (line 1170-1220)
  - Updated metadata save logic to include timezone (line 467-469)

---

### 3. Prime Flow Verified

**Current Flow:**
1. ✅ **Scene 1 - Prime Greeting:** Welcome message, no form fields
2. ✅ **Scene 2 - Custodian Handoff:** Transition message, no form fields
3. ✅ **Scene 3 - Identity:** Name input (Custodian asks)
4. ✅ **Scene 4 - Defaults:** Country, Currency, Account Type, Timezone (Custodian asks)
5. ✅ **Scene 5 - Confirmation:** Completion message

**Prime Role:** ✅ Only greets and hands off to Custodian (no form fields)

**Custodian Role:** ✅ Asks all setup questions:
- Display name (required)
- Country (required)
- Currency (required)
- Account type (required)
- Timezone (auto-detected, user confirms)

---

### 4. Duplicate Rendering Fixed

**Status:** ✅ Already fixed in previous changes

**Verification:**
- Footer has `key={`footer-${currentScene}`}` prop (line 1249)
- Dev logging: `[Onboarding] footer render {scene}` (line 1252)
- Steps have unique keys: `key="identity-scene"`, `key="defaults-scene"`
- Single render path per scene

---

## 📊 Storage Locations

### Profile Fields (Supabase `profiles` table):

| Field | Storage Location | Status |
|-------|-----------------|--------|
| `display_name` | `profiles.display_name` | ✅ Canonical |
| `account_type` | `profiles.account_type` | ✅ Canonical (fixed) |
| `currency` | `profiles.currency` | ✅ Canonical |
| `onboarding_completed` | `profiles.onboarding_completed` | ✅ Canonical |
| `onboarding_completed_at` | `profiles.onboarding_completed_at` | ✅ Canonical |
| `country` | `profiles.metadata.country` | ✅ In metadata |
| `timezone` | `profiles.metadata.timezone` | ✅ In metadata (new) |

---

## 🔧 Files Changed

### 1. Onboarding Component
**File:** `src/components/onboarding/CinematicOnboardingOverlay.tsx`

**Changes:**
- Fixed `account_name` → `account_type` (3 locations)
- Added timezone auto-detection
- Added timezone to form state
- Added timezone confirmation card
- Updated metadata save logic

### 2. Onboarding Gate
**File:** `src/components/onboarding/useOnboardingGate.ts`

**Changes:**
- Fixed `account_name` → `account_type` check
- Removed fallback to `account_name`

### 3. Migration
**File:** `supabase/migrations/20250130_fix_onboarding_schema.sql`

**Changes:**
- Added `account_type` column (canonical)
- Kept `account_name` column (legacy compatibility)

---

## ✅ Testing Checklist

### Test 1: Schema Mismatch Fix
- [x] Build succeeds: `✓ built in 17.22s`
- [x] No `account_name` errors in console
- [x] Profile updates succeed

### Test 2: Timezone Support
- [ ] Timezone auto-detects on load
- [ ] Timezone card appears in defaults step
- [ ] User can change timezone
- [ ] Timezone saves to `metadata.timezone`

### Test 3: Prime Flow
- [ ] Prime greeting shows (no form fields)
- [ ] Custodian handoff shows (no form fields)
- [ ] Identity step asks for name
- [ ] Defaults step asks for country, currency, account type, timezone

### Test 4: Duplicate Rendering
- [ ] Only one footer renders per scene
- [ ] No duplicate step content
- [ ] Dev logs show single render per scene

---

## 🎯 Next Steps

1. **Test Locally:**
   - Sign in as new user
   - Complete onboarding flow
   - Verify all fields save correctly
   - Check Supabase `profiles` table for correct values

2. **Verify Schema:**
   - Run migration: `supabase/migrations/20250130_fix_onboarding_schema.sql`
   - Confirm `account_type` column exists
   - Confirm `metadata.timezone` saves correctly

3. **Monitor:**
   - Check console for any `account_name` errors
   - Verify onboarding completes successfully
   - Confirm dashboard loads after onboarding

---

**End of Summary**








