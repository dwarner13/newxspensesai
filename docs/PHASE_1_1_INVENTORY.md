# Phase 1.1 - Employee Definitions Inventory

**Date**: November 20, 2025  
**Purpose**: Complete inventory of all employee definitions before consolidation

---

## Current State Summary

### ✅ Already Using Database (via Registry)
- **Registry**: `src/employees/registry.ts` - Already reads from `employee_profiles` table
- **Router**: `netlify/functions/_shared/router.ts` - Already uses registry via `resolveSlug()` and `getEmployeeSystemPrompt()`

### ❌ Hardcoded Employee Definitions Found

#### 1. `src/systems/AIEmployeeSystem.ts`
Contains `AIEmployees` object with:
- `prime` (id: 'prime')
- `byte` (id: 'byte')
- `crystal` (id: 'crystal')
- `tag` (id: 'tag')
- `ledger` (id: 'ledger')
- `goalie` (id: 'goalie')
- `blitz` (id: 'blitz')
- `blitz-ai` (id: 'blitz-ai') - **DUPLICATE**
- `finley` (id: 'finley')
- `chime` (id: 'chime')
- `chime-ai` (id: 'chime-ai') - **DUPLICATE**

**Issues**: 
- Duplicate entries for `blitz` and `chime`
- Uses old slugs (`prime`, `byte`, etc.) instead of canonical (`prime-boss`, `byte-docs`, etc.)
- Contains full system prompts that should be in database

#### 2. `src/config/ai-employees.js`
Contains `AI_EMPLOYEES` object with:
- `prime-boss` ✅ (canonical slug)
- `goalie-security` (id: 'goalie-security') - **DIFFERENT from goalie-ai**
- `byte-doc` ✅ (canonical slug)
- `crystal-ai` ✅ (canonical slug)
- `tag-ai` ✅ (canonical slug)
- `ledger-tax` ✅ (canonical slug)
- `goalie-coach` (id: 'goalie-coach') - **DIFFERENT from goalie-ai**
- `blitz-debt` (id: 'blitz-debt') - **DIFFERENT from blitz-ai**
- `liberty` (id: 'liberty', active: false) - **PLACEHOLDER**
- Many "coming soon" placeholders (spark, wisdom, serenity, fortune, nova, harmony, etc.)

**Issues**:
- Multiple Goalie variants (`goalie-security`, `goalie-coach` vs `goalie-ai`)
- Multiple Blitz variants (`blitz-debt` vs `blitz-ai`)
- Liberty is placeholder (should be `liberty-ai`)
- Contains system prompts that should be in database

#### 3. `src/lib/universalAIEmployeeConnection.ts`
Contains `employeePersonalities` object with personality definitions for:
- `blitz`, `tag`, `byte`, `crystal`, `crystal-ai`, `wisdom`, `fortune`, `savage-sally`, `serenity`, `harmony`, `goalie`, `spark`, `intelia`, `ledger`, `automa`, `dash`, `dj-zen`, `nova`, etc.

**Purpose**: Personality helpers (tone, catchphrases, expertise)  
**Status**: Can be kept as **augmentation** helpers, but should not define full employees

---

## Employees in Database (from Migrations)

### Confirmed in Database (via migrations):
1. **goalie-ai** - `202511181146_add_goalie_employee.sql`
2. **liberty-ai** - `202511181827_add_liberty_employee.sql`
3. **chime-ai** - `20251118_add_chime_employee.sql`
4. **crystal-ai** - `20250216_add_crystal_employee.sql`
5. **liberty-ai** (upgraded) - `20250222_upgrade_liberty_debt_freedom.sql`

### Likely in Database (need to verify):
- **prime-boss** - Should exist (default employee)
- **byte-docs** - Should exist (document processing)
- **tag-ai** - Should exist (categorization)
- **finley-ai** - Should exist (forecasting)
- **blitz-ai** - Should exist (actions)
- **ledger-tax** - Should exist (tax)

---

## Canonical Slug Mapping

Based on router usage and audit, canonical slugs are:

| Old Slug | Canonical Slug | Status |
|----------|---------------|--------|
| `prime` | `prime-boss` | ✅ Canonical |
| `prime-ai` | `prime-boss` | ✅ Alias |
| `byte` | `byte-docs` | ✅ Canonical |
| `byte-doc` | `byte-docs` | ✅ Alias |
| `tag` | `tag-ai` | ✅ Canonical |
| `tag-categorize` | `tag-ai` | ✅ Alias |
| `crystal` | `crystal-ai` | ✅ Canonical |
| `crystal-analytics` | `crystal-ai` | ✅ Alias |
| `finley` | `finley-ai` | ✅ Canonical |
| `goalie` | `goalie-ai` | ✅ Canonical |
| `goalie-coach` | `goalie-ai` | ❌ Should consolidate |
| `goalie-security` | `goalie-ai` | ❌ Should consolidate |
| `liberty` | `liberty-ai` | ✅ Canonical |
| `liberty-freedom` | `liberty-ai` | ✅ Alias |
| `blitz` | `blitz-ai` | ✅ Canonical |
| `blitz-debt` | `blitz-ai` | ❌ Should consolidate |
| `chime` | `chime-ai` | ✅ Canonical |
| `ledger` | `ledger-tax` | ✅ Canonical |

---

## Active Employees (from Audit)

Based on `COMPLETE_CHAT_SYSTEM_AUDIT.md`, active employees are:

1. **prime-boss** - Prime (CEO/Orchestrator)
2. **byte-docs** - Byte (Document Processing)
3. **tag-ai** - Tag (Categorization)
4. **crystal-ai** - Crystal (Analytics)
5. **finley-ai** - Finley (Forecasting)
6. **goalie-ai** - Goalie (Goals)
7. **liberty-ai** - Liberty (Debt Freedom)
8. **blitz-ai** - Blitz (Actions)
9. **chime-ai** - Chime (Notifications)
10. **ledger-tax** - Ledger (Tax) - May be missing from DB

---

## Next Steps

1. ✅ Create comprehensive migration to ensure all 10 active employees are in database
2. ✅ Extract system prompts from code definitions (use most complete/up-to-date version)
3. ✅ Update registry to handle all aliases correctly
4. ✅ Remove hardcoded employee objects from code
5. ✅ Keep only types/interfaces and personality helpers
6. ✅ Update all references to use registry

---

**End of Inventory**



