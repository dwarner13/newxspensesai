# Tag 2.0 Deployment Guide

**Quick Start**: Deploy Tag 2.0 categorization system in 5 minutes.

---

## Prerequisites

- ✅ Supabase project set up
- ✅ Smart Import AI schema already deployed (imports, transactions tables)
- ✅ Netlify functions deployed

---

## Step 1: Deploy SQL Schema (2 min)

### Option A: Supabase Dashboard (Easiest)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy entire contents of: `sql/migrations/20251018_tag_2_0_categorization.sql`
4. Paste into the editor
5. Click **RUN**
6. Verify: Check **Table Editor** → Confirm 3 new tables exist:
   - `category_rules`
   - `normalized_merchants`
   - `category_history`

### Option B: Supabase CLI

```bash
# If using migration system
supabase migration up

# Or manually via psql
psql postgresql://user:pass@host/dbname < sql/migrations/20251018_tag_2_0_categorization.sql
```

### Verify

```sql
select table_name from information_schema.tables 
where table_schema = 'public' and table_name like 'category_%';
-- Should return: category_rules, category_history

select table_name from information_schema.tables 
where table_schema = 'public' and table_name = 'normalized_merchants';
-- Should return: normalized_merchants
```

---

## Step 2: Deploy Netlify Functions (2 min)

### New Functions to Deploy

Copy these files to your Netlify functions directory:

1. **`netlify/functions/categorize-transactions.ts`**
   - Auto-categorizes transactions using rules
   
2. **`netlify/functions/category-correct.ts`**
   - Handles user corrections + learns rules

Both files already exist in the project. Netlify automatically deploys on git push.

### Local Testing

```bash
# Terminal 1: Start Netlify dev server
npm run dev:netlify

# Terminal 2: Test categorize-transactions
curl -X POST http://localhost:8888/.netlify/functions/categorize-transactions \
  -H "Content-Type: application/json" \
  -d '{"importId":"550e8400-e29b-41d4-a716-446655440000"}'

# Terminal 2: Test category-correct
curl -X POST http://localhost:8888/.netlify/functions/category-correct \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"550e8400-e29b-41d4-a716-446655440000","newCategory":"Dining"}'
```

**Expected Responses:**
```json
// categorize-transactions
{"updated":42,"history":42}

// category-correct
{"ok":true}
```

---

## Step 3: Deploy React Component (1 min)

The `CategoryPill.tsx` component is already created at:
- `src/ui/components/CategoryPill.tsx`

No deployment needed—included in your React build.

### Verify in IDE

```bash
# Check file exists
ls -la src/ui/components/CategoryPill.tsx

# Should exist ✅
```

---

## Step 4: Integrate into SmartImportAI Flow (1 min)

The integration is **already done** in `SmartImportAI.tsx`:

```typescript
// In approveAndAnalyze function, after commit-import:
const catResult = await fetch('/.netlify/functions/categorize-transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ importId: activeImportId }),
}).then(r => r.json()).catch(() => ({ updated: 0 }));
```

✅ Already integrated.

---

## Step 5: Push to Production

```bash
git add .
git commit -m "feat(tag): implement Tag 2.0 categorization system

- Add category_rules table for rule-based tagging
- Add normalized_merchants for merchant cleanup
- Add category_history audit trail
- Implement categorize-transactions function
- Implement category-correct function with learning
- Add CategoryPill React component
- Integrate into SmartImportAI E2E flow
- Add RLS policies and indexes"

git push origin main
```

Netlify automatically deploys. Check:
- **Netlify Deploy Log**: https://app.netlify.com/sites/<your-site>/deploys
- **Function Logs**: https://app.netlify.com/sites/<your-site>/functions

---

## Step 6: Verify Production Deployment

### 1. Check Tables Exist

```sql
select exists (select 1 from information_schema.tables 
  where table_name = 'category_rules');
-- Should return: true
```

### 2. Check Functions Are Live

```bash
curl https://<your-domain>/.netlify/functions/categorize-transactions \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"importId":"550e8400-e29b-41d4-a716-446655440000"}'

# Should return 200 OK (even if import doesn't exist, no error)
```

### 3. Create Test Rule

```sql
insert into category_rules (user_id, merchant_pattern, category, priority, match_type)
values (
  'YOUR_USER_ID',
  'COSTCO',
  'Groceries',
  50,
  'ilike'
);
```

### 4. Upload a Test File

1. Navigate to **Smart Import AI** page
2. Upload a CSV with "COSTCO" in merchant column
3. Click **Approve & Send**
4. Verify transaction category = "Groceries"

---

## Rollback (If Needed)

### Drop Tables

```sql
drop table if exists public.category_history cascade;
drop table if exists public.normalized_merchants cascade;
drop table if exists public.category_rules cascade;
```

### Revert Columns from transactions

```sql
alter table public.transactions drop column if exists category_confidence;
alter table public.transactions drop column if exists merchant_norm;
```

### Remove Functions

Delete from Netlify:
- `netlify/functions/categorize-transactions.ts`
- `netlify/functions/category-correct.ts`

Commit & push to trigger redeploy.

---

## Troubleshooting

### Functions Return 404

**Cause**: Netlify not deployed yet

**Fix**:
```bash
# Verify in Netlify Dashboard
# Check "Deploys" tab → latest deployment status
# If not green, wait 2-3 minutes or trigger manual deploy

# Alternative: Redeploy
git commit --allow-empty -m "chore: trigger rebuild"
git push
```

### SQL Error: "Column already exists"

**Cause**: Schema partially applied before

**Fix**:
```sql
alter table public.transactions
  add column if not exists category_confidence numeric(5,2);
alter table public.transactions
  add column if not exists merchant_norm text;
-- "if not exists" prevents errors
```

### RLS Blocks Access

**Symptom**: `{"error": "new row violates row-level security policy"}`

**Cause**: User ID mismatch

**Fix**:
```bash
# Ensure requests include proper auth header
curl -H "Authorization: Bearer $JWT_TOKEN" ...

# For Netlify functions (using service key):
# Service key has superuser access—should bypass RLS
# Check if SUPABASE_SERVICE_ROLE_KEY is set
```

### Preview Rows Show Empty Categories

**Cause**: `byte-ocr-parse` called before categorization (expected)

**Fix**: Categories populate after user clicks "Approve & Send" → `categorize-transactions` runs

---

## Configuration

### Category List (in CategoryPill.tsx)

Edit the `CATEGORIES` array to customize available categories:

```typescript
const CATEGORIES = [
  "Uncategorized",
  "Groceries",
  "Dining",
  // ... add more
];
```

### Priority System

- **User rules**: priority = 50 (evaluated first)
- **System rules**: priority ≥ 51
- **Default**: priority = 100

Lower priority = checked first.

### Confidence Scores

Edit in function files:
- **Substring match** (`ilike`): Default = 90
- **Regex match** (`regex`): Default = 95
- **User correction**: Always = 100

---

## Monitoring

### Check Function Logs

```bash
# Netlify Dashboard
https://app.netlify.com/sites/<site>/functions/categorize-transactions

# Look for:
# - categorize-transactions.success: {importId, updated}
# - categorize-transactions.error: {err}
```

### Check Database Usage

```sql
-- How many rules created?
select count(*) from category_rules;

-- How many user corrections?
select count(*) from category_history where reason = 'user_correction';

-- Categories with most rules?
select category, count(*) as rule_count
from category_rules
group by category
order by rule_count desc;
```

### Monitor Categorization Rate

```sql
-- What % of transactions are categorized?
select
  count(case when category is not null then 1 end) as categorized,
  count(*) as total,
  round(100.0 * count(case when category is not null then 1 end) / count(*)) as percent
from transactions
where created_at > now() - interval '7 days';
```

---

## Next Steps

After successful deployment:

1. **Enable CategoryPill in UI**: Add to transaction detail views
2. **Create default rules**: Set up system-wide category rules
3. **User onboarding**: Educate users on category learning
4. **Advanced**: Implement AI categorization for low-confidence matches

---

## Summary

| Step | Time | Status |
|------|------|--------|
| 1. Deploy SQL schema | 2 min | ✅ Automated |
| 2. Deploy Netlify functions | 2 min | ✅ Auto on push |
| 3. Deploy React component | 1 min | ✅ Included in build |
| 4. Integrate SmartImportAI | 1 min | ✅ Already done |
| 5. Push to production | 1 min | ✅ Single push |
| **Total** | **~7 min** | **READY** |

---

## Support

For issues, check:
- Netlify function logs
- Supabase logs & status
- Browser console for React errors
- Database RLS policies

---

**Deployment Status**: ✅ **READY FOR PRODUCTION**






