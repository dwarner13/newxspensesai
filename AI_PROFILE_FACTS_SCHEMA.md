# 🧠 AI PROFILE FACTS SCHEMA GUIDE

**Purpose:** Store extracted user facts and profile information from conversations  
**Status:** ✅ Production Ready  
**Schema:** PostgreSQL with Row-Level Security  
**Primary User:** Prime (CEO) through entity extraction  

---

## 🎯 OVERVIEW

The `ai_profile_facts` table stores key-value pairs of user profile information extracted by Prime from natural conversations. Instead of explicit forms, Prime learns about users through chat interactions.

```
Prime: "You mentioned you run a bakery in Edmonton, right?"
User: "Yes, that's correct"
  ↓
Extraction: k="business_type", v="bakery"
Extraction: k="business_location", v="Edmonton"
  ↓
Stored in ai_profile_facts table
```

---

## 📋 SCHEMA STRUCTURE

### Table: `ai_profile_facts`

```sql
create table if not exists ai_profile_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  k text not null,
  v text not null,
  confidence numeric default 0.9,
  source text default 'prime/entity-extraction',
  updated_at timestamptz not null default now(),
  unique (user_id, k)
);
```

### Column Definitions

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `id` | uuid | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| `user_id` | uuid | User owning the fact | `123e4567-e89b-12d3-a456-426614174000` |
| `k` | text | Fact key (name/type) | `"business_type"` |
| `v` | text | Fact value | `"bakery"` |
| `confidence` | numeric | Extraction confidence (0-1) | `0.95` (95% confident) |
| `source` | text | Where extracted from | `"prime/entity-extraction"` |
| `updated_at` | timestamptz | Last update timestamp | `2024-10-18 12:34:56+00` |

### Constraints

- **Primary Key:** `id` (UUID)
- **Unique:** `(user_id, k)` — One fact per user per key (upsert behavior)
- **NOT NULL:** `user_id`, `k`, `v`
- **Default Values:**
  - `confidence`: `0.9` (90% by default)
  - `source`: `'prime/entity-extraction'`
  - `updated_at`: Current timestamp

---

## 🔍 INDEXES

```sql
-- Find all facts for a user
create index idx_ai_profile_facts_user on ai_profile_facts (user_id);

-- Find all users with a specific fact key
create index idx_ai_profile_facts_k on ai_profile_facts (k);
```

**Why These Indexes:**
- User queries (most common): "Get all facts for user X"
- Analytics queries: "How many users have business_type fact?"

---

## 🔐 ROW LEVEL SECURITY

### Policy 1: SELECT (Users can read their own facts)
```sql
create policy ai_profile_facts_select_self on ai_profile_facts
  for select using (auth.uid() = user_id);
```
- Users see only their own facts
- No data leakage between users

### Policy 2: INSERT (Users can add their own facts)
```sql
create policy ai_profile_facts_upsert_self on ai_profile_facts
  for insert with check (auth.uid() = user_id);
```
- Prime (via server role) inserts facts
- Prevents users from inserting facts for others

### Policy 3: UPDATE (Users can update their own facts)
```sql
create policy ai_profile_facts_update_self on ai_profile_facts
  for update using (auth.uid() = user_id);
```
- Facts can be updated/corrected
- Only the user can update their facts

---

## 💾 EXAMPLE DATA

```sql
-- User's profile facts
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source) VALUES
  ('user-123', 'business_type', 'bakery', 0.95, 'prime/entity-extraction'),
  ('user-123', 'business_location', 'Edmonton', 0.92, 'prime/entity-extraction'),
  ('user-123', 'export_preference', 'CSV', 0.88, 'prime/entity-extraction'),
  ('user-123', 'industry', 'food & beverage', 0.91, 'prime/entity-extraction'),
  ('user-123', 'company_size', 'small', 0.85, 'prime/entity-extraction'),
  ('user-123', 'annual_revenue', '500k-1m', 0.80, 'prime/entity-extraction');

-- Example of upsert (unique constraint on user_id, k)
INSERT INTO ai_profile_facts (user_id, k, v, confidence) VALUES
  ('user-123', 'business_type', 'artisan bakery', 0.98, 'prime/entity-extraction')
ON CONFLICT (user_id, k) DO UPDATE SET
  v = EXCLUDED.v,
  confidence = EXCLUDED.confidence,
  updated_at = now();
```

---

## 🎯 COMMON FACT KEYS

### Business Information
- `business_type` — Type of business (bakery, consulting, etc.)
- `business_name` — Name of the business
- `business_location` — Primary business location
- `industry` — Industry/sector
- `company_size` — Small/medium/large
- `annual_revenue` — Revenue range
- `employees` — Number of employees

### User Preferences
- `export_preference` — CSV, PDF, Excel, etc.
- `reporting_frequency` — Daily, weekly, monthly
- `timezone` — User's timezone
- `currency` — Preferred currency
- `language` — Preferred language

### Financial Context
- `accounting_software` — QuickBooks, Xero, etc.
- `fiscal_year_start` — Month when fiscal year starts
- `tax_jurisdiction` — Tax filing location
- `sales_model` — B2B, B2C, services, etc.

### Goals & Priorities
- `primary_goal` — Cost reduction, growth, tax optimization
- `pain_point` — Main business challenge
- `investment_appetite` — Conservative, moderate, aggressive

---

## 🔄 INTEGRATION WITH PRIME

### Step 1: Prime Extracts Facts from Chat

```
User: "I run a bakery in Edmonton, we do about half a million a year in revenue"

Prime (thinking):
  Entities extracted:
  - business_type: "bakery"
  - business_location: "Edmonton"
  - annual_revenue: "500k"
```

### Step 2: Prime Stores Facts

```typescript
// In chat-v3-production.ts
await supabaseSrv
  .from('ai_profile_facts')
  .upsert({
    user_id: userId,
    k: 'business_type',
    v: 'bakery',
    confidence: 0.95,
    source: 'prime/entity-extraction'
  });
```

### Step 3: Prime Uses Facts for Personalization

```
Later conversation:
User: "Give me advice"

Prime (checking facts):
  SELECT * FROM ai_profile_facts WHERE user_id = ? 
  → Gets: business_type="bakery", location="Edmonton"

Prime: "As a bakery owner in Edmonton, here's my advice..."
```

---

## 📊 CONFIDENCE SCORES

| Score | Meaning | Use Case |
|-------|---------|----------|
| 0.95+ | Very High | Direct user confirmation |
| 0.85-0.94 | High | Extracted from clear context |
| 0.75-0.84 | Moderate | Inferred from context |
| 0.65-0.74 | Low | Guess or assumption |
| <0.65 | Very Low | Don't use for decisions |

**Example:**
```
User: "I think we're spending too much"
  → Extracted: pain_point="cost_reduction" (confidence: 0.75)

User: "We run a bakery"
  → Extracted: business_type="bakery" (confidence: 0.98)
```

---

## 🚀 UPSERT PATTERN (Recommended)

Instead of INSERT OR IGNORE, use proper upsert:

```sql
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source) 
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, k) DO UPDATE SET
  v = EXCLUDED.v,
  confidence = EXCLUDED.confidence,
  updated_at = now();
```

**Benefits:**
- Updates existing facts with higher confidence
- Maintains single source of truth
- Timestamp reflects most recent extraction

---

## 📈 USAGE PATTERNS

### Pattern 1: Get All User Facts

```sql
SELECT k, v, confidence FROM ai_profile_facts 
WHERE user_id = $1 
ORDER BY confidence DESC;

-- Returns:
-- k: "business_type", v: "bakery", confidence: 0.98
-- k: "business_location", v: "Edmonton", confidence: 0.95
-- ...
```

### Pattern 2: Get Specific Fact

```sql
SELECT v, confidence FROM ai_profile_facts 
WHERE user_id = $1 AND k = $2;

-- Returns: v: "bakery", confidence: 0.98
```

### Pattern 3: Get High-Confidence Facts Only

```sql
SELECT k, v FROM ai_profile_facts 
WHERE user_id = $1 AND confidence > 0.9 
ORDER BY k;

-- Returns only facts with >90% confidence
```

### Pattern 4: Fact Timeline

```sql
SELECT k, v, confidence, updated_at FROM ai_profile_facts 
WHERE user_id = $1 AND k = $2 
ORDER BY updated_at DESC;

-- Shows how fact value has changed over time
```

---

## 🔧 TYPESCRIPT INTEGRATION

### Get All Facts for User

```typescript
const { data: facts, error } = await supabaseSrv
  .from('ai_profile_facts')
  .select('k, v, confidence')
  .eq('user_id', userId)
  .order('confidence', { ascending: false });

// facts = [
//   { k: 'business_type', v: 'bakery', confidence: 0.98 },
//   { k: 'business_location', v: 'Edmonton', confidence: 0.95 }
// ]
```

### Store Extracted Fact

```typescript
const { error } = await supabaseSrv
  .from('ai_profile_facts')
  .upsert({
    user_id: userId,
    k: 'business_type',
    v: 'bakery',
    confidence: 0.95,
    source: 'prime/entity-extraction'
  });
```

### Build Context from Facts

```typescript
const { data: facts } = await supabaseSrv
  .from('ai_profile_facts')
  .select('k, v, confidence')
  .eq('user_id', userId)
  .gt('confidence', 0.85);

// Format for Prime's context
const factContext = facts
  .map(f => `- User's ${f.k}: ${f.v}`)
  .join('\n');

// Add to system prompt
const systemPrompt = `${primePersona}\n\n## Known about user:\n${factContext}`;
```

---

## 💡 ENTITY EXTRACTION PROCESS

### Step 1: User Mentions Something

```
User: "We mostly handle retail customers in Toronto"
```

### Step 2: Prime Extracts Entities

```typescript
// Natural language processing
const entities = [
  { type: 'sales_model', value: 'retail', confidence: 0.92 },
  { type: 'business_location', value: 'Toronto', confidence: 0.98 },
  { type: 'customer_type', value: 'retail', confidence: 0.90 }
];
```

### Step 3: Store in Database

```typescript
for (const entity of entities) {
  await supabaseSrv
    .from('ai_profile_facts')
    .upsert({
      user_id: userId,
      k: entity.type,
      v: entity.value,
      confidence: entity.confidence,
      source: 'prime/entity-extraction'
    });
}
```

### Step 4: Use for Personalization

```
Next conversation:
Prime: "For a retail business in Toronto handling X volume..."
```

---

## 🎓 BEST PRACTICES

### 1. Always Include Confidence Score
```typescript
// ✅ Good
await insert({ k: 'business_type', v: 'bakery', confidence: 0.95 });

// ❌ Bad
await insert({ k: 'business_type', v: 'bakery' }); // Uses default 0.9
```

### 2. Use Meaningful Keys
```typescript
// ✅ Good
k: 'business_location'

// ❌ Bad
k: 'location_of_business'
k: 'user_location'
```

### 3. Upsert Don't Insert
```typescript
// ✅ Good - Updates existing
await upsert({ user_id, k, v, confidence });

// ❌ Bad - Fails if exists
await insert({ user_id, k, v, confidence });
```

### 4. Only High-Confidence Facts in Context
```typescript
// ✅ Good
SELECT * FROM ai_profile_facts 
WHERE user_id = $1 AND confidence > 0.85;

// ❌ Bad - Includes low confidence
SELECT * FROM ai_profile_facts WHERE user_id = $1;
```

---

## 🧪 TEST DATA

```sql
-- Insert test facts
INSERT INTO ai_profile_facts (user_id, k, v, confidence, source) VALUES
  (gen_random_uuid(), 'business_type', 'bakery', 0.95, 'prime/entity-extraction'),
  (gen_random_uuid(), 'business_location', 'Edmonton', 0.92, 'prime/entity-extraction'),
  (gen_random_uuid(), 'export_preference', 'CSV', 0.88, 'prime/entity-extraction');

-- Query facts
SELECT * FROM ai_profile_facts 
WHERE confidence > 0.90 
ORDER BY updated_at DESC;

-- Update confidence
UPDATE ai_profile_facts 
SET confidence = 0.99 
WHERE k = 'business_type';

-- Delete low confidence
DELETE FROM ai_profile_facts 
WHERE confidence < 0.70;
```

---

## 📊 MONITORING & ANALYTICS

### Monitor Extraction Quality

```sql
-- Average confidence by fact type
SELECT k, AVG(confidence) as avg_confidence, COUNT(*) as count
FROM ai_profile_facts
GROUP BY k
ORDER BY avg_confidence DESC;

-- Recent extractions
SELECT k, v, confidence, updated_at
FROM ai_profile_facts
WHERE updated_at > now() - interval '24 hours'
ORDER BY updated_at DESC;

-- Facts needing review (low confidence)
SELECT user_id, k, v, confidence
FROM ai_profile_facts
WHERE confidence < 0.75
ORDER BY confidence ASC;
```

---

## 🔄 LIFECYCLE

1. **Extraction** — Prime extracts from conversation
2. **Storage** — Fact upserted to database
3. **Usage** — Prime uses facts for personalization
4. **Update** — User corrects or Prime re-extracts with higher confidence
5. **Archival** — Old facts archived (optional)

---

## 🎯 SUMMARY

| Aspect | Details |
|--------|---------|
| **Purpose** | Store extracted user profile facts |
| **Primary Key** | `id` (UUID) |
| **Unique Constraint** | `(user_id, k)` |
| **RLS** | Users see only their own facts |
| **Default Confidence** | 0.9 (90%) |
| **Source** | Mostly `prime/entity-extraction` |
| **Update Strategy** | Upsert on `(user_id, k)` |

---

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Last Updated:** Today  

🧠 **Prime's memory system ready for deployment!**





