> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](../XSPENSESAI_SYSTEM.md).**

# Employee System Unification Plan

**Date:** February 16, 2025  
**Goal:** Create one source of truth for all AI employees

---

## 📊 Current State Analysis

### Critical Issues Found

1. **Slug Conflicts** (2876 matches across 403 files)
   - `crystal-ai` vs `crystal-analytics` (both in use)
   - `tag-ai` vs `tag-categorize` (both in use)
   - `byte-doc` vs `byte-docs` (both in use)
   - `goalie-coach` vs `goalie-goals` (both in use)
   - `prime-boss` vs `prime` (both in use)

2. **Multiple Sources of Truth**
   - Database: `employee_profiles` table (7 employees)
   - Config: `src/config/ai-employees.js` (20+ employees)
   - Router: `netlify/functions/_shared/router.ts` (PERSONAS)
   - Controller: `src/services/UniversalAIController.ts` (16 employees)
   - Model Config: `netlify/functions/_shared/employeeModelConfig.ts` (8 employees)
   - System: `src/systems/AIEmployeeSystem.ts` (7 employees)

3. **Model/Temperature Inconsistencies**
   - Database has `model`, `temperature`, `max_tokens`
   - `employeeModelConfig.ts` has different values
   - Some employees missing from one or the other

---

## 🎯 Proposed Unified Schema

### Canonical Slugs (Final Decision)

| Old Slug(s) | New Canonical Slug | Reason |
|-------------|-------------------|--------|
| `prime`, `prime-boss` | `prime-boss` | Database standard |
| `byte`, `byte-doc`, `byte-docs` | `byte-docs` | Matches router |
| `tag`, `tag-ai`, `tag-categorize` | `tag-ai` | Database standard |
| `crystal`, `crystal-ai`, `crystal-analytics` | `crystal-ai` | Latest migration |
| `ledger`, `ledger-tax` | `ledger-tax` | Database standard |
| `goalie`, `goalie-coach`, `goalie-goals` | `goalie-goals` | Matches router |
| `blitz`, `blitz-debt` | `blitz-debt` | Database standard |
| `finley`, `finley-ai` | `finley-ai` | Router standard |

### Unified `employee_profiles` Schema

```sql
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  system_prompt TEXT NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  tools_allowed TEXT[] DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.3,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employee_profiles_slug ON public.employee_profiles(slug);
CREATE INDEX idx_employee_profiles_active ON public.employee_profiles(is_active) WHERE is_active = true;
```

---

## 📋 Step-by-Step Implementation Plan

### Phase 1: Database Consolidation

**Goal:** Ensure all active employees exist in `employee_profiles` with correct slugs

**Migration:** `supabase/migrations/20250216_unify_employee_slugs.sql`

**Actions:**
1. Update existing employees to canonical slugs
2. Add missing employees (Finley, etc.)
3. Standardize model/temperature/max_tokens
4. Add slug aliases table for backward compatibility

### Phase 2: Create Central Registry

**File:** `src/employees/registry.ts`

**Purpose:** Single TypeScript module that reads from Supabase and provides:
- Type-safe employee definitions
- Runtime employee lookup
- Slug aliasing
- Model config access

### Phase 3: Refactor Router

**File:** `netlify/functions/_shared/router.ts`

**Changes:**
- Remove hardcoded `PERSONAS` object
- Import from registry
- Use database slugs only

### Phase 4: Refactor Controllers

**Files:**
- `src/services/UniversalAIController.ts`
- `src/systems/AIEmployeeSystem.ts`
- `netlify/functions/_shared/employeeModelConfig.ts`

**Changes:**
- Remove hardcoded employee definitions
- Import from registry
- Use registry for model config

### Phase 5: Update All References

**Files:** 400+ files with employee slug references

**Strategy:**
- Use find/replace with canonical slugs
- Add backward compatibility aliases
- Update tests

---

## 🔧 Implementation Files

### 1. Database Migration

**File:** `supabase/migrations/20250216_unify_employee_slugs.sql`

### 2. Central Registry

**File:** `src/employees/registry.ts`

### 3. Slug Alias Table

**File:** `supabase/migrations/20250216_add_slug_aliases.sql`

### 4. Router Refactor

**File:** `netlify/functions/_shared/router.ts` (diff)

### 5. Model Config Refactor

**File:** `netlify/functions/_shared/employeeModelConfig.ts` (diff)

---

## ✅ Testing Plan

### Unit Tests
1. Registry loads all employees from database
2. Slug aliases resolve correctly
3. Model config matches database

### Integration Tests
1. Router selects correct employee
2. Chat endpoint uses correct employee
3. Tool calling works with unified slugs

### Manual Tests
1. Prime responds correctly
2. Crystal routes correctly
3. Tag categorization works
4. Byte document processing works
5. Finley forecasting works

---

## 📝 Next Steps

1. Review this plan
2. Approve canonical slugs
3. Create migration files
4. Build registry
5. Refactor router
6. Update references
7. Test thoroughly
8. Deploy

---

**Status:** ⏳ **AWAITING APPROVAL**

