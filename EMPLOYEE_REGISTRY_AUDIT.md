# Employee Registry System Audit Report

**Date:** January 2025  
**Purpose:** Audit existing employee system before building unified registry for 30+ employees  
**Status:** ✅ Complete

---

## Phase A: Audit Results

### 1. Existing Employee Mapping Functions

#### Found Locations:

1. **`src/hooks/useUnifiedChatEngine.ts`** (lines 102-130)
   - Function: `mapEmployeeSlugToOverride()`
   - Maps slugs to EmployeeOverride union type
   - Hardcoded slug map with 17 employees
   - **Issue:** Type union must be extended for each new employee

2. **`src/utils/employeeUtils.ts`** (lines 9-30, 133-165)
   - `SLUG_TO_KEY` mapping (hardcoded)
   - `getEmployeeDisplay()` switch statement (hardcoded cases)
   - `getChatTabDisplay()` switch statement (hardcoded cases)
   - **Issue:** Switch statements break when adding new employees

3. **`src/employees/registry.ts`** (lines 131-233)
   - `resolveSlug()` with hardcoded alias fallback map
   - **Issue:** Duplicate alias mappings scattered across codebase

4. **`netlify/functions/_shared/capabilities.ts`** (lines 10-27)
   - Hardcoded `CAPABILITIES` map by employee_key
   - **Issue:** No database backing, must update code for new employees

### 2. Existing Employee Profile Loading

#### Found:

1. **`src/employees/registry.ts`**
   - ✅ `loadEmployees()` - loads from `employee_profiles` table
   - ✅ `getEmployee(slug)` - gets single employee
   - ✅ `getAllEmployees()` - lists all employees
   - ✅ 5-minute in-memory cache
   - ⚠️ **Missing:** Static defaults fallback, capability merging, tool gating

2. **`src/hooks/useAIEmployees.ts`**
   - Legacy hook for AI employee interactions
   - Not using registry

3. **`src/hooks/useAIMemory.ts`**
   - Uses `employeeKey` parameter
   - Not integrated with registry

### 3. Existing Supabase Tables

#### Found:

1. **`employee_profiles`** ✅ EXISTS
   - Columns: `id`, `slug`, `title`, `emoji`, `system_prompt`, `capabilities` (text[]), `tools_allowed` (text[]), `model`, `temperature`, `max_tokens`, `is_active`, `created_at`, `updated_at`
   - Migration: `supabase/migrations/20250216_unify_employee_slugs.sql`
   - **Issue:** `capabilities` and `tools_allowed` are arrays, not normalized tables

2. **`employee_slug_aliases`** ✅ EXISTS
   - Columns: `alias`, `canonical_slug`, `created_at`
   - Migration: `supabase/migrations/20250216_unify_employee_slugs.sql`
   - Function: `resolve_employee_slug(input_slug TEXT)`

3. **`employee_capabilities`** ❌ DOES NOT EXIST
   - Needed for normalized capability model

4. **`employee_tools`** ❌ DOES NOT EXIST
   - Needed for normalized tool gating

### 4. Backend Employee Logic

#### Found:

1. **`netlify/functions/chat.ts`**
   - Uses `employeeSlug` from request
   - Loads from `employee_profiles` table (line ~544)
   - Maps slug to `employee_key` (line ~1057)
   - **Issue:** Hardcoded slug-to-key mapping

2. **`netlify/functions/_shared/router.ts`**
   - Routes messages to employees
   - Uses hardcoded `PERSONAS` object (likely)

3. **`netlify/functions/_shared/capabilities.ts`**
   - Hardcoded capability map
   - Used by `tool_router.ts` for tool gating

4. **`netlify/functions/_shared/employeeModelConfig.ts`**
   - Likely has hardcoded model configs

---

## What Currently Exists

### ✅ Working Systems:

1. **Database-backed employee profiles** (`employee_profiles` table)
2. **Slug resolution** (`resolveSlug()` function + `employee_slug_aliases` table)
3. **Basic registry** (`src/employees/registry.ts` with caching)
4. **Backend employee loading** (chat.ts loads from DB)

### ⚠️ Partial Systems:

1. **Capability model** - exists as array in DB, not normalized
2. **Tool gating** - exists as array in DB, hardcoded in capabilities.ts
3. **Display config** - hardcoded in multiple files

---

## What Is Duplicated / Scattered

### Duplication Count: **5+ locations**

1. **Slug-to-key mapping:**
   - `src/utils/employeeUtils.ts` (SLUG_TO_KEY)
   - `src/hooks/useUnifiedChatEngine.ts` (slugMap in mapEmployeeSlugToOverride)
   - `src/employees/registry.ts` (alias fallback map)
   - Backend chat.ts (likely)

2. **Display info (emoji + name):**
   - `src/utils/employeeUtils.ts` (getEmployeeDisplay switch)
   - `src/utils/employeeUtils.ts` (getChatTabDisplay switch)
   - `src/data/aiEmployees.ts` (EMPLOYEES array)

3. **Capability definitions:**
   - `employee_profiles.capabilities` (array in DB)
   - `netlify/functions/_shared/capabilities.ts` (hardcoded map)

4. **Tool definitions:**
   - `employee_profiles.tools_allowed` (array in DB)
   - `netlify/functions/_shared/capabilities.ts` (hardcoded map)

---

## What Breaks When Adding 30 Employees

### Critical Failures:

1. **TypeScript Type Unions** ❌
   - `EmployeeOverride` type in `usePrimeChat.ts` must be extended
   - Hardcoded union: `'prime' | 'byte' | 'tag' | ... | 'custodian'`
   - **Impact:** Type errors, must update multiple files

2. **Switch Statements** ❌
   - `getEmployeeDisplay()` in `employeeUtils.ts` (lines 133-165)
   - `getChatTabDisplay()` in `employeeUtils.ts` (lines 189-221)
   - **Impact:** New employees won't display correctly

3. **Hardcoded Maps** ❌
   - `mapEmployeeSlugToOverride()` slugMap (17 entries)
   - `SLUG_TO_KEY` mapping (30+ entries)
   - **Impact:** Must update code for each new employee

4. **Capability Gating** ❌
   - `CAPABILITIES` map in `capabilities.ts`
   - **Impact:** New employees can't use tools without code changes

5. **No Database-Driven Display** ❌
   - Display names/emojis hardcoded
   - **Impact:** Must deploy code to change employee display info

---

## What Can Be Reused Safely

### ✅ Safe to Reuse:

1. **`src/employees/registry.ts`** - Core structure is good
   - Keep: `loadEmployees()`, caching logic, Supabase client setup
   - Enhance: Add static defaults, capability merging, tool resolution

2. **`employee_profiles` table** - Schema is adequate
   - Keep: All existing columns
   - Add: `employee_key` column (if missing), `display_name`, `description`, `avatar_url`, `theme` JSONB

3. **`employee_slug_aliases` table** - Works well
   - Keep: As-is

4. **`resolve_employee_slug()` function** - Works well
   - Keep: As-is

5. **Backend loading logic** - Pattern is correct
   - Keep: Loading from `employee_profiles` in chat.ts
   - Enhance: Use registry instead of direct queries

---

## File List

### Core Employee Files:
- `src/employees/registry.ts` - Main registry (needs enhancement)
- `src/utils/employeeUtils.ts` - Display utilities (needs refactor)
- `src/hooks/useUnifiedChatEngine.ts` - Slug mapping (needs registry)
- `src/data/aiEmployees.ts` - Static employee data (can be fallback)

### Backend Files:
- `netlify/functions/chat.ts` - Employee loading (needs registry)
- `netlify/functions/_shared/router.ts` - Employee routing (needs registry)
- `netlify/functions/_shared/capabilities.ts` - Capability map (needs DB)
- `netlify/functions/_shared/employeeModelConfig.ts` - Model configs (needs registry)

### Database Migrations:
- `supabase/migrations/20250216_unify_employee_slugs.sql` - Employee profiles
- `supabase/migrations/004_add_all_employees.sql` - Employee seeds

---

## Recommendations

### Immediate Actions:

1. ✅ **Enhance `src/employees/registry.ts`** - Add static defaults, capability merging
2. ✅ **Create `employee_capabilities` table** - Normalize capabilities
3. ✅ **Create `employee_tools` table** - Normalize tool gating
4. ✅ **Create `useEmployeeRegistry` hook** - React hook for registry access
5. ✅ **Create `src/types/employee.ts`** - TypeScript types
6. ✅ **Create backend `employeeAccess.ts`** - Tool gating helpers

### Future Actions:

1. Refactor `employeeUtils.ts` to use registry
2. Replace `mapEmployeeSlugToOverride` with registry resolution
3. Migrate `capabilities.ts` to use database
4. Update all display components to use registry

---

## Summary

**Current State:** ✅ Database-backed profiles exist, but display/config is scattered across 5+ files  
**Risk Level:** 🔴 **HIGH** - Adding 30 employees requires code changes in 5+ files  
**Solution:** ✅ Registry system will centralize all employee config, enable DB-only additions

**Estimated Files to Update:** 8-10 files  
**Estimated Migration Files:** 1-2 new migrations  
**Breaking Changes:** None (backward compatible)


