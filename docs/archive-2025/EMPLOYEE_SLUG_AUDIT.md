# 🏷️ Employee Slug Audit - Standardization

**Audit Date**: 2025-10-09  
**Goal**: Standardize all employee slugs to canonical versions

---

## 📊 Canonical Slug List

| Canonical Slug | Old Variations | Status |
|----------------|----------------|--------|
| `prime-boss` | prime | ✅ Standardize |
| `byte-doc` | byte, smart-import | 🔴 CRITICAL - 3 versions |
| `tag-ai` | tag, categorization | 🔴 CRITICAL - 3 versions |
| `crystal-analytics` | crystal, spending-predictions | 🟡 2 versions |
| `ledger-tax` | ledger, tax-optimization | 🟡 2 versions |
| `goalie-coach` | goalie, goal-concierge | 🟡 2 versions |
| `blitz-debt` | blitz, debt-elimination | 🟡 2 versions |

---

## 🔍 Files with Old Slugs

### Found in `src/config/ai-employees.js`

**Lines 33-193**: Uses SHORT slugs

```javascript
// BEFORE
byte: { id: 'byte', ... }
tag: { id: 'tag', ... }
crystal: { id: 'crystal', ... }
ledger: { id: 'ledger', ... }
goalie: { id: 'goalie', ... }
blitz: { id: 'blitz', ... }

// AFTER (NEEDED)
'byte-doc': { id: 'byte-doc', ... }
'tag-ai': { id: 'tag-ai', ... }
'crystal-analytics': { id: 'crystal-analytics', ... }
'ledger-tax': { id: 'ledger-tax', ... }
'goalie-coach': { id: 'goalie-coach', ... }
'blitz-debt': { id: 'blitz-debt', ... }
```

**Action**: Update all keys and id values

---

### Found in `src/lib/team-api.ts`

**Lines 26, 31, 36, 41, 46**: Mock data uses SHORT slugs

```typescript
// BEFORE
route_to: 'byte'
route_to: 'tag'
route_to: 'crystal'
route_to: 'ledger'
route_to: 'blitz'

// AFTER (NEEDED)
route_to: 'byte-doc'
route_to: 'tag-ai'
route_to: 'crystal-analytics'
route_to: 'ledger-tax'
route_to: 'blitz-debt'
```

---

### Found in `src/pages/dashboard/SmartImportAIPage.tsx`

**Lines 171, 181, 193, 201**: Worker IDs use SHORT slugs

```typescript
// BEFORE
{ id: 'byte', name: 'Byte', ... }
{ id: 'crystal', name: 'Crystal', ... }
{ id: 'tag', name: 'Tag', ... }
{ id: 'prime', name: 'Prime', ... }

// AFTER (NEEDED)
{ id: 'byte-doc', name: 'Byte', ... }
{ id: 'crystal-analytics', name: 'Crystal', ... }
{ id: 'tag-ai', name: 'Tag', ... }
{ id: 'prime-boss', name: 'Prime', ... }
```

---

## 📋 Slug Mapping Table

### Active Employees (Use These!)

| OLD Slug(s) | NEW Canonical | Database Match |
|-------------|---------------|----------------|
| `prime` | `prime-boss` | ✅ Matches seed |
| `byte`, `smart-import` | `byte-doc` | ✅ Matches seed |
| `tag`, `categorization` | `tag-ai` | ✅ Matches seed |
| `crystal`, `spending-predictions` | `crystal-analytics` | ⚠️ Not in DB yet |
| `ledger`, `tax-optimization` | `ledger-tax` | ⚠️ Not in DB yet |
| `goalie`, `goal-concierge` | `goalie-coach` | ⚠️ Not in DB yet |
| `blitz`, `debt-elimination` | `blitz-debt` | ⚠️ Not in DB yet |

---

## 🔧 Required Changes

### Config File Updates

**File**: `src/config/ai-employees.js`

Replace all instances:
```javascript
// Find & Replace (case-sensitive)
byte: {
  id: 'byte',          → 'byte-doc': { id: 'byte-doc',

tag: {
  id: 'tag',           → 'tag-ai': { id: 'tag-ai',

crystal: {
  id: 'crystal',       → 'crystal-analytics': { id: 'crystal-analytics',

ledger: {
  id: 'ledger',        → 'ledger-tax': { id: 'ledger-tax',

goalie: {
  id: 'goalie',        → 'goalie-coach': { id: 'goalie-coach',

blitz: {
  id: 'blitz',         → 'blitz-debt': { id: 'blitz-debt',

prime: {
  id: 'prime',         → 'prime-boss': { id: 'prime-boss',
```

---

### Helper Function Updates

**File**: `src/config/ai-employees.js:409-425`

```javascript
// Update these functions to use new keys
export const getEmployeeById = (id) => {
  // OLD: AI_EMPLOYEES[id]
  // NEW: Check both old and new for compatibility
  return AI_EMPLOYEES[id] || 
         AI_EMPLOYEES[OLD_TO_NEW_SLUG_MAP[id]] || 
         null;
};
```

**Add slug compatibility map**:
```javascript
const OLD_TO_NEW_SLUG_MAP = {
  'byte': 'byte-doc',
  'tag': 'tag-ai',
  'crystal': 'crystal-analytics',
  'ledger': 'ledger-tax',
  'goalie': 'goalie-coach',
  'blitz': 'blitz-debt',
  'prime': 'prime-boss',
  'smart-import': 'byte-doc',
  'categorization': 'tag-ai',
  'spending-predictions': 'crystal-analytics',
  'tax-optimization': 'ledger-tax',
  'goal-concierge': 'goalie-coach',
  'debt-elimination': 'blitz-debt'
};
```

---

## ✅ Verification Steps

### Step 1: Check config uses canonical slugs

```bash
# Should return 0 results
grep -E "id: '(byte|tag|crystal|ledger|goalie|blitz)'," src/config/ai-employees.js

# Should return 7 results  
grep -E "id: '(byte-doc|tag-ai|crystal-analytics|ledger-tax|goalie-coach|blitz-debt|prime-boss)'," src/config/ai-employees.js
```

### Step 2: Check no hardcoded old slugs in components

```bash
# Should return 0 results (or only in comments)
grep -r "employeeSlug.*'byte'" src/components/
grep -r "employeeSlug.*'tag'" src/components/
```

### Step 3: Database sync

```sql
-- All sessions should use canonical slugs
SELECT DISTINCT employee_slug FROM chat_sessions;
-- Expected: prime-boss, byte-doc, tag-ai (only canonical)
```

---

## 📊 Impact Analysis

### Low Risk
- Config file key changes (backward compatible with map)
- Mock data slug updates

### Medium Risk
- Component prop changes (test all chat UIs)
- Route parameter changes (if any)

### High Risk
- None (no breaking DB changes)

---

**Next**: Apply changes and produce diffs

