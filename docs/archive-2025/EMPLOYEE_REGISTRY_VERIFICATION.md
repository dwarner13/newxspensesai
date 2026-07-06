# Employee Registry v1 - Verification Checklist

**Date:** January 2025  
**Purpose:** Verification steps for Employee Registry system  
**Status:** Ready for Testing

---

## Phase A: Audit ✅ Complete

- [x] Audit report created: `EMPLOYEE_REGISTRY_AUDIT.md`
- [x] File list documented
- [x] Duplication identified
- [x] Breaking points identified

---

## Phase B: Frontend Registry ✅ Complete

### Files Created:
- [x] `src/types/employee.ts` - Type definitions
- [x] `src/agents/employees/employeeRegistry.ts` - Enhanced registry
- [x] `src/hooks/useEmployeeRegistry.ts` - React hook

### Verification Steps:

#### 1. Registry Loads Correctly
```typescript
// Test in browser console or component
import { getEmployeeBySlug, listEmployees } from '@/agents/employees/employeeRegistry';

// Should return Prime employee
const prime = await getEmployeeBySlug('prime-boss');
console.log('Prime:', prime);

// Should return all employees
const all = await listEmployees();
console.log('Total employees:', all.length);
```

**Expected:**
- Returns `EmployeeResolved` object with merged config
- Falls back to static defaults if DB unavailable
- Caches results (check localStorage: `employee_registry_cache`)

#### 2. Hook Works in Components
```typescript
// In a React component
import { useEmployeeRegistry } from '@/hooks/useEmployeeRegistry';

function TestComponent() {
  const { employees, getBySlug, isLoading, error } = useEmployeeRegistry();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const prime = getBySlug('prime-boss');
  return <div>Found: {prime?.display_name}</div>;
}
```

**Expected:**
- `isLoading` starts as `true`, becomes `false` after load
- `employees` array populated with resolved employees
- `getBySlug` returns employee or null
- No errors in console

#### 3. Offline Fallback Works
```typescript
// Disable network, then:
const employee = await getEmployeeBySlug('prime-boss');
console.log('Offline employee:', employee);
```

**Expected:**
- Returns employee from static defaults
- No errors thrown
- Employee has basic display info (name, emoji, etc.)

#### 4. Cache Works
```typescript
// First call (loads from DB)
const start1 = Date.now();
await getEmployeeBySlug('prime-boss');
const time1 = Date.now() - start1;

// Second call (from cache)
const start2 = Date.now();
await getEmployeeBySlug('prime-boss');
const time2 = Date.now() - start2;

console.log('First call:', time1, 'ms');
console.log('Second call:', time2, 'ms');
console.log('Cache working:', time2 < time1);
```

**Expected:**
- Second call is faster (from cache)
- localStorage has `employee_registry_cache` entry
- Cache expires after 5 minutes

---

## Phase C: Supabase Schema ✅ Complete

### Migration File:
- [x] `supabase/migrations/20250125_employee_registry_v1.sql`

### Verification Steps:

#### 1. Run Migration
```bash
# Apply migration
supabase migration up
# OR via Supabase dashboard: Run SQL migration
```

**Expected:**
- Migration runs without errors
- Tables created: `employee_capabilities`, `employee_tools`
- Columns added to `employee_profiles`: `employee_key`, `display_name`, `description`, `avatar_url`, `theme`, `prompt_version`
- `is_active` renamed to `is_enabled` (if existed)

#### 2. Verify Tables Exist
```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('employee_profiles', 'employee_capabilities', 'employee_tools');

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employee_profiles' 
  AND column_name IN ('employee_key', 'display_name', 'description', 'avatar_url', 'theme', 'is_enabled');
```

**Expected:**
- All 3 tables exist
- All required columns exist
- `employee_key` is NOT NULL and unique

#### 3. Verify Seed Data
```sql
-- Check seeded employees
SELECT employee_key, slug, display_name, is_enabled 
FROM employee_profiles 
WHERE employee_key IN ('prime', 'byte', 'tag', 'crystal');

-- Check capabilities
SELECT employee_key, capability_key, enabled 
FROM employee_capabilities 
WHERE employee_key IN ('prime', 'byte', 'tag', 'crystal');

-- Check tools
SELECT employee_key, tool_key, enabled 
FROM employee_tools 
WHERE employee_key IN ('prime', 'byte', 'tag', 'crystal');
```

**Expected:**
- 4 employees exist (prime, byte, tag, crystal)
- Each has at least 1 capability
- Prime and Tag have tools assigned

#### 4. Test RLS Policies
```sql
-- As authenticated user (should work)
SELECT * FROM employee_capabilities LIMIT 1;

-- As service role (should work)
-- (No client write policies = service role only)
```

**Expected:**
- Read access works for authenticated users
- Write access requires service role

---

## Phase D: Wire Registry ✅ Partial

### Files to Update:
- [ ] `src/hooks/useUnifiedChatEngine.ts` - Replace `mapEmployeeSlugToOverride`
- [ ] `src/utils/employeeUtils.ts` - Use registry for display info
- [ ] `netlify/functions/chat.ts` - Use registry for employee loading

### Verification Steps:

#### 1. Registry Used in Chat Engine
```typescript
// In useUnifiedChatEngine.ts
import { resolveEmployee } from '@/agents/employees/employeeRegistry';

// Replace mapEmployeeSlugToOverride with:
const resolved = await resolveEmployee(employeeSlug);
const employeeKey = resolved?.employee_key;
```

**Expected:**
- Chat engine uses registry instead of hardcoded map
- Employee resolution works for all slugs
- No breaking changes to existing chat flows

#### 2. Display Components Use Registry
```typescript
// In employeeUtils.ts or display components
import { getEmployeeBySlug } from '@/agents/employees/employeeRegistry';

// Replace switch statements with:
const employee = await getEmployeeBySlug(slug);
return {
  emoji: employee?.emoji || '🤖',
  shortName: employee?.display_name || 'Unknown',
};
```

**Expected:**
- Display components show correct emoji/name from DB
- Falls back gracefully if employee not found
- No hardcoded switch statements

#### 3. Backend Uses Registry
```typescript
// In chat.ts
import { getEmployeeBySlug } from '@/agents/employees/employeeRegistry';

// Replace direct DB query with:
const employee = await getEmployeeBySlug(finalEmployeeSlug);
```

**Expected:**
- Backend loads employees via registry
- Caching works (faster subsequent calls)
- Falls back to static defaults if DB fails

---

## Phase E: Future-Proof APIs ✅ Complete

### Files Created:
- [x] `src/types/employee.ts` - Type definitions
- [x] `netlify/functions/_lib/employeeAccess.ts` - Backend helper

### Verification Steps:

#### 1. Backend Helper Works
```typescript
// In backend function
import { canEmployeeUseTool, getEmployeeCapabilities } from './_lib/employeeAccess';

// Check tool access
const canUse = await canEmployeeUseTool('prime', 'request_employee_handoff');
console.log('Prime can use handoff:', canUse);

// Get capabilities
const caps = await getEmployeeCapabilities('tag');
console.log('Tag capabilities:', caps);
```

**Expected:**
- Returns correct tool access (true/false)
- Returns capability list
- Caches results per lambda instance

#### 2. Types Compile
```bash
# Run TypeScript check
npx tsc --noEmit
```

**Expected:**
- No type errors
- All imports resolve correctly
- Types exported correctly

---

## How to Confirm Registry Loads

### Method 1: Browser Console
```javascript
// Open browser console on app
import { getEmployeeBySlug } from '@/agents/employees/employeeRegistry';
const prime = await getEmployeeBySlug('prime-boss');
console.log('Registry loaded:', prime);
```

### Method 2: React Component
```typescript
import { useEmployeeRegistry } from '@/hooks/useEmployeeRegistry';

function RegistryTest() {
  const { employees, isLoading } = useEmployeeRegistry();
  
  useEffect(() => {
    if (!isLoading) {
      console.log('Registry loaded:', employees.length, 'employees');
    }
  }, [isLoading, employees]);
  
  return null;
}
```

### Method 3: Network Tab
- Open DevTools → Network
- Look for Supabase requests to `employee_profiles`, `employee_capabilities`, `employee_tools`
- Should see requests on first load, then cached

---

## How to Confirm 30 Employees Can Be Added

### Test: Add New Employee via DB Only

```sql
-- 1. Insert employee profile
INSERT INTO employee_profiles (
  employee_key,
  slug,
  display_name,
  title,
  description,
  emoji,
  system_prompt,
  is_enabled,
  model,
  temperature,
  max_tokens
) VALUES (
  'newbie',
  'newbie-assistant',
  'Newbie',
  'New Assistant',
  'A new AI assistant',
  '🆕',
  'You are Newbie, a new assistant.',
  true,
  'gpt-4o-mini',
  0.5,
  2000
);

-- 2. Add capabilities
INSERT INTO employee_capabilities (employee_key, capability_key, enabled) VALUES
('newbie', 'chat', true),
('newbie', 'analytics', true);

-- 3. Add tools
INSERT INTO employee_tools (employee_key, tool_key, enabled) VALUES
('newbie', 'crystal_summarize_income', true);

-- 4. Verify it appears in registry
```

**Expected:**
- Employee appears in `listEmployees()` without code changes
- Display name/emoji from DB
- Capabilities and tools loaded correctly
- No TypeScript errors (types are flexible)

---

## How to Confirm UI Uses DB-Backed Display Names

### Test: Update Display Name in DB

```sql
-- Update Prime's display name
UPDATE employee_profiles
SET display_name = 'Prime Boss'
WHERE employee_key = 'prime';
```

**Expected:**
- UI shows "Prime Boss" instead of "Prime"
- Change appears after cache expires (5 min) or manual refresh
- No code deployment needed

---

## How to Confirm Tool Gating Scaffolds Compile

### Test: Use Backend Helper

```typescript
// In netlify/functions/chat.ts or similar
import { canEmployeeUseTool } from './_lib/employeeAccess';

// Before executing tool
if (!await canEmployeeUseTool(employeeKey, toolKey)) {
  return { error: 'Employee does not have access to this tool' };
}
```

**Expected:**
- TypeScript compiles without errors
- Function returns boolean
- Caches results correctly

---

## Summary

**✅ Completed:**
- Audit report
- Enhanced registry with merged configs
- React hook
- Supabase migrations
- Type definitions
- Backend helper

**⏳ Remaining:**
- Wire registry into useUnifiedChatEngine
- Update display components to use registry
- Update backend chat.ts to use registry

**🎯 Next Steps:**
1. Run migration: `supabase migration up`
2. Test registry loading in browser
3. Wire registry into chat engine (Phase D)
4. Test with 30+ employees (add via DB only)


