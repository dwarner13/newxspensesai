# 🔄 EMPLOYEE ACTIVE TOGGLE GUIDE

**Function:** `toggle_employee_active(slug, is_active)`  
**Status:** ✅ Ready to Use  
**Purpose:** Activate/deactivate employee profiles in Supabase  

---

## ⚡ QUICK START

### Activate an Employee
```sql
select toggle_employee_active('crystal-analytics', true);
```

### Deactivate an Employee
```sql
select toggle_employee_active('crystal-analytics', false);
```

### Expected Response
```
toggle_employee_active
----------------------
t
```

Returns `t` (true) if successful, `f` (false) if failed.

---

## 📋 FUNCTION SIGNATURE

```sql
toggle_employee_active(slug text, is_active boolean) → boolean
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | text | Yes | Employee identifier (e.g., `crystal-analytics`, `prime-boss`) |
| `is_active` | boolean | Yes | `true` to activate, `false` to deactivate |

### Return Value

| Value | Meaning |
|-------|---------|
| `t` (true) | Success — employee status updated |
| `f` (false) | Failed — employee not found or error |

---

## 🎯 SUPPORTED EMPLOYEES

| Slug | Employee | Function |
|------|----------|----------|
| `crystal-analytics` | Crystal | Financial Intelligence AI |
| `prime-boss` | Prime | CEO Orchestrator |
| `byte-docs` | Byte | Document Processing OCR |
| `tag-categorizer` | Tag | Transaction Categorization |
| `ledger-tax` | Ledger | Tax & Compliance |
| `goalie-agent` | Goalie | Goals & Reminders |

---

## 💡 USE CASES

### Use Case 1: Enable Crystal After Deployment
```sql
-- Deploy Crystal 2.0, then activate
select toggle_employee_active('crystal-analytics', true);

-- Verify
select slug, is_active from employee_profiles where slug = 'crystal-analytics';
```

**Response:**
```
slug               | is_active
-------------------+-----------
crystal-analytics  | true
```

### Use Case 2: Disable an Employee for Maintenance
```sql
-- Take Crystal offline temporarily
select toggle_employee_active('crystal-analytics', false);

-- Do maintenance...

-- Bring back online
select toggle_employee_active('crystal-analytics', true);
```

### Use Case 3: A/B Test Two Versions
```sql
-- Version A is active
select toggle_employee_active('crystal-analytics', true);

-- Collect metrics...
-- Not satisfied? Try Version B

-- Deactivate Version A
select toggle_employee_active('crystal-analytics', false);

-- Meanwhile, update prompt in employee_profiles table
update employee_profiles 
set system_prompt = 'new prompt...'
where slug = 'crystal-analytics';

-- Activate for testing
select toggle_employee_active('crystal-analytics', true);
```

### Use Case 4: Disable All Except Core
```sql
-- Keep only Prime active during incident
select toggle_employee_active('crystal-analytics', false);
select toggle_employee_active('byte-docs', false);
select toggle_employee_active('tag-categorizer', false);
select toggle_employee_active('ledger-tax', false);
select toggle_employee_active('goalie-agent', false);

-- Prime stays active for orchestration
```

---

## 🔍 VERIFY STATUS

### Check Single Employee
```sql
select slug, is_active, updated_at 
from employee_profiles 
where slug = 'crystal-analytics';
```

**Response:**
```
slug               | is_active | updated_at
-------------------+-----------+-------------------------------
crystal-analytics  | true      | 2025-10-18 14:32:01.123456+00
```

### Check All Employees
```sql
select slug, title, is_active, updated_at 
from employee_profiles 
order by updated_at desc;
```

**Response:**
```
slug               | title                                      | is_active | updated_at
-------------------+--------------------------------------------+-----------+-------------------------------
crystal-analytics  | Crystal — Financial Intelligence (AI CFO)  | true      | 2025-10-18 14:32:01.123456+00
prime-boss         | Prime — AI Financial CEO & Orchestrator    | true      | 2025-10-18 14:30:00.000000+00
byte-docs          | Byte — Document Processing & OCR           | false     | 2025-10-18 13:00:00.000000+00
tag-categorizer    | Tag — Transaction Categorization            | true      | 2025-10-18 12:15:00.000000+00
ledger-tax         | Ledger — Tax & Compliance                   | true      | 2025-10-18 12:10:00.000000+00
goalie-agent       | Goalie — Goals & Reminders                  | true      | 2025-10-18 12:05:00.000000+00
```

---

## ⚙️ HOW IT WORKS

### Behind the Scenes

The function:

1. **Finds** the employee by `slug`
2. **Updates** the `is_active` column
3. **Updates** the `updated_at` timestamp
4. **Returns** success/failure

### Implementation Pattern

```sql
create or replace function toggle_employee_active(
  p_slug text,
  p_is_active boolean
) returns boolean as $$
declare
  v_updated boolean;
begin
  update employee_profiles
  set is_active = p_is_active,
      updated_at = now()
  where slug = p_slug;
  
  v_updated := found;
  return v_updated;
exception
  when others then
    return false;
end;
$$ language plpgsql;
```

---

## 🔐 SECURITY

### Who Can Execute?
- **Service Role Key** — ✅ Yes (full access)
- **Authenticated Users** — ✅ Yes (if RLS allows)
- **Public/Anon** — ❌ No (requires auth)

### RLS Considerations
If RLS is enabled on `employee_profiles`:
- Function may require admin privileges
- Service role key grants full access
- Individual user keys may be restricted

### Safe Usage
```sql
-- Best practice: Use service role key
-- In your app code:
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.rpc('toggle_employee_active', {
  p_slug: 'crystal-analytics',
  p_is_active: true
});
```

---

## 🚨 COMMON ISSUES

### Issue 1: Function Not Found
```
ERROR: function toggle_employee_active(text, boolean) does not exist
```

**Solution:**
- Verify function exists in Supabase
- Check function is in `public` schema
- Recreate if needed:

```sql
create or replace function public.toggle_employee_active(
  p_slug text,
  p_is_active boolean
) returns boolean as $$
...
$$ language plpgsql;
```

### Issue 2: Returns `f` (False)
**Meaning:** Employee slug not found

**Solution:**
```sql
-- Check available slugs
select slug from employee_profiles;

-- Use exact slug
select toggle_employee_active('crystal-analytics', true);  -- ✅ Correct
-- NOT: select toggle_employee_active('crystal', true);    -- ❌ Wrong
```

### Issue 3: Permission Denied
```
ERROR: permission denied for relation employee_profiles
```

**Solution:**
- Use service role key (not anon key)
- Check RLS policies
- Grant appropriate permissions

---

## 📊 STATUS WORKFLOW

```
Employee Inactive
    ↓
select toggle_employee_active('slug', true)
    ↓
Employee Active
    ↓
API routes now use this employee
    ↓
Queries include: is_active = true
    ↓
Employee loaded when requested
    ↓
---
    ↓
select toggle_employee_active('slug', false)
    ↓
Employee Inactive
    ↓
API routes skip this employee
    ↓
Returns "employee not found" to users
```

---

## 🔄 DEPLOYMENT WORKFLOW

### Step 1: Create Employee Profile
```sql
select upsert_employee_prompt(
  'crystal-analytics',
  'Crystal — Financial Intelligence (AI CFO)',
  $$system prompt here$$,
  array['capability1','capability2',...],
  array['delegate'],
  false  -- starts inactive
);
```

### Step 2: Verify Creation
```sql
select slug, is_active from employee_profiles 
where slug = 'crystal-analytics';
```

### Step 3: Activate When Ready
```sql
select toggle_employee_active('crystal-analytics', true);
```

### Step 4: Verify Activation
```sql
select slug, is_active from employee_profiles 
where slug = 'crystal-analytics';
-- Should return: crystal-analytics | true
```

### Step 5: Test in Production
```bash
# API request should now work
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"Hi Crystal","employeeSlug":"crystal-analytics"}'

# Should return Crystal's response
```

---

## 📈 MONITORING

### Check Active Employees
```sql
select slug, title 
from employee_profiles 
where is_active = true 
order by updated_at desc;
```

### Check Inactive Employees
```sql
select slug, title, updated_at 
from employee_profiles 
where is_active = false 
order by updated_at desc;
```

### Check Toggle History
```sql
select slug, is_active, updated_at 
from employee_profiles 
where slug = 'crystal-analytics'
order by updated_at desc;
```

---

## 🎯 COMMON QUERIES

### Activate All Employees
```sql
select toggle_employee_active('crystal-analytics', true);
select toggle_employee_active('prime-boss', true);
select toggle_employee_active('byte-docs', true);
select toggle_employee_active('tag-categorizer', true);
select toggle_employee_active('ledger-tax', true);
select toggle_employee_active('goalie-agent', true);
```

### Deactivate All Except Prime
```sql
select toggle_employee_active('crystal-analytics', false);
select toggle_employee_active('byte-docs', false);
select toggle_employee_active('tag-categorizer', false);
select toggle_employee_active('ledger-tax', false);
select toggle_employee_active('goalie-agent', false);
-- prime-boss stays true
```

### Toggle Crystal Only
```sql
-- Check current state
select is_active from employee_profiles 
where slug = 'crystal-analytics';

-- Toggle (flip the value)
select toggle_employee_active('crystal-analytics', 
  (select not is_active from employee_profiles 
   where slug = 'crystal-analytics')
);
```

---

## 📊 EXAMPLES

### Example 1: Deploy Crystal 2.0
```sql
-- 1. Create profile (inactive)
select upsert_employee_prompt(
  'crystal-analytics',
  'Crystal — Financial Intelligence (AI CFO)',
  $$...20-section prompt...$$,
  array['spending-intelligence',...],
  array['delegate'],
  false
);

-- 2. Verify creation
select slug, is_active from employee_profiles 
where slug = 'crystal-analytics';

-- 3. Activate
select toggle_employee_active('crystal-analytics', true);

-- 4. Verify activation
select slug, is_active from employee_profiles 
where slug = 'crystal-analytics';
-- Result: crystal-analytics | true ✅
```

### Example 2: Maintenance Window
```sql
-- Take Crystal offline
select toggle_employee_active('crystal-analytics', false);

-- Do maintenance, updates, testing...

-- Bring back online
select toggle_employee_active('crystal-analytics', true);
```

### Example 3: Gradual Rollout
```sql
-- Day 1: Activate Crystal (testing)
select toggle_employee_active('crystal-analytics', true);

-- Day 2: Monitor performance, collect feedback

-- Day 3: Gradual ramp (if needed)
-- Keep active, monitor

-- Day 4: Full production
-- Already active, monitor metrics
```

---

## ✅ SUCCESS CHECKLIST

- [x] Function exists in Supabase (`public` schema)
- [x] Can call with service role key
- [x] Returns `t` (true) when successful
- [x] `is_active` column updates
- [x] `updated_at` timestamp updates
- [x] Employee now appears in API queries
- [x] Users can interact with employee

---

## 📞 QUICK REFERENCE

### Activate Crystal
```sql
select toggle_employee_active('crystal-analytics', true);
```

### Deactivate Crystal
```sql
select toggle_employee_active('crystal-analytics', false);
```

### Check Status
```sql
select is_active from employee_profiles where slug = 'crystal-analytics';
```

### List All
```sql
select slug, is_active from employee_profiles;
```

---

## 🎯 SUMMARY

**Function:** `toggle_employee_active(slug, is_active)`

**Purpose:** Activate/deactivate employee profiles

**Usage:**
- `true` → Activate employee
- `false` → Deactivate employee

**Returns:** `t` (success) or `f` (failure)

**Common Use:** 
```sql
select toggle_employee_active('crystal-analytics', true);
```

**Verification:**
```sql
select is_active from employee_profiles where slug = 'crystal-analytics';
```

---

**Status:** ✅ Ready to Use  
**Documentation:** Complete  
**Examples:** Comprehensive  

🔄 **Employee activation is straightforward!**





