# Custodian Migration Fix - Schema Alignment

**Date:** January 22, 2025  
**Issue:** Migration referenced correct columns but values didn't match requirements  
**Status:** ✅ Fixed

## Changes Made

### Migration File Updated
**File:** `supabase/migrations/20250122_add_custodian_employee.sql`

**Corrections:**
1. ✅ **title**: Changed from `'Custodian - System Brain & Handoff Triage'` → `'Custodian'`
2. ✅ **temperature**: Changed from `0.4` → `0.2` (more precise diagnosis)
3. ✅ **max_tokens**: Changed from `2500` → `900` (shorter, focused responses)
4. ✅ **capabilities**: Updated to exact array:
   ```sql
   ARRAY['settings','diagnostics','handoff-triage','security','integrations','ui-consistency','data-health']
   ```
5. ✅ **system_prompt**: Enhanced with explicit guardrails:
   - Never invent user facts
   - Only use explicit user input + auth/profile metadata
   - User must confirm before saving
   - Clear close-out summary format

## Schema Verification

The migration uses the correct `employee_profiles` columns:
- ✅ `slug` (text, PK)
- ✅ `title` (text) - **NOT** `display_name` or `name`
- ✅ `emoji` (text)
- ✅ `system_prompt` (text)
- ✅ `capabilities` (text[])
- ✅ `tools_allowed` (text[])
- ✅ `model` (text)
- ✅ `temperature` (double precision)
- ✅ `max_tokens` (integer)
- ✅ `is_active` (boolean)
- ✅ `updated_at` (timestamptz) - set automatically via `NOW()`

## Code Alignment Check

**Checked files:**
- ✅ `src/employees/registry.ts` - Uses `title` (correct)
- ✅ `netlify/functions/chat.ts` - Uses `title` (correct)
- ✅ `netlify/functions/prime-live-stats.ts` - Has fallback: `emp.title || emp.display_name || emp.slug` (safe)

**No code changes needed** - All code correctly uses `title` from `employee_profiles`.

**Note:** `display_name` references found are for `profiles` table (user profiles), not `employee_profiles` (AI employees).

## Verification Steps

### In Supabase SQL Editor:

```sql
-- Verify Custodian exists with correct values
SELECT 
  slug, 
  title, 
  is_active, 
  temperature, 
  max_tokens, 
  capabilities,
  tools_allowed,
  model
FROM public.employee_profiles 
WHERE slug = 'custodian';
```

**Expected Result:**
```
slug: 'custodian'
title: 'Custodian'
is_active: true
temperature: 0.2
max_tokens: 900
capabilities: ['settings','diagnostics','handoff-triage','security','integrations','ui-consistency','data-health']
tools_allowed: ['request_employee_handoff']
model: 'gpt-4o'
```

### Additional Verification:

```sql
-- Check all active employees (should include Custodian)
SELECT slug, title, is_active 
FROM public.employee_profiles 
WHERE is_active = true 
ORDER BY slug;

-- Verify Custodian can be resolved via registry
-- (This would be tested in application code)
```

## Migration Execution

The migration uses `ON CONFLICT (slug) DO UPDATE SET` for idempotency:
- Safe to run multiple times
- Updates existing Custodian if already present
- Creates new Custodian if not present

## Summary

✅ **Migration fixed** - Uses correct schema and values  
✅ **No code changes needed** - All code already uses `title`  
✅ **Idempotent** - Safe to re-run  
✅ **Verified** - Schema matches actual `employee_profiles` table




