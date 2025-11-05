# Database Schema & Migrations

**Last Updated**: 2025-01-XX  
**Version**: 1.0

---

## Overview

This document describes the database schema, migration policy, and table structure for XspensesAI. All migrations use **idempotent** patterns to ensure safe re-runs.

---

## Migration Policy

### Idempotent Patterns

All migrations use these patterns:

1. **`CREATE TABLE IF NOT EXISTS`**: Safe to run multiple times
2. **`CREATE INDEX IF NOT EXISTS`**: Safe to run multiple times
3. **`ON CONFLICT DO NOTHING`**: Prevents duplicate inserts
4. **`UNIQUE` constraints**: Enforced at database level

### Migration Files

Migrations are stored in `netlify/functions/_shared/sql/`:

- `day4_memory.sql` - Memory facts and embeddings
- `day5_session_summaries.sql` - Session summaries
- `day6_orchestration_events.sql` - Employee routing logs
- `day9_transactions.sql` - Transactions and items
- `day10_memory_xp.sql` - Vendor aliases and XP ledger

### Running Migrations

**Option 1: Supabase SQL Editor**
1. Open Supabase Dashboard → SQL Editor
2. Copy migration file contents
3. Paste and run
4. Verify with `\d table_name` (PostgreSQL)

**Option 2: Programmatic (Future)**
```typescript
import { admin } from './supabase';
const sql = await fetch('./sql/day4_memory.sql').then(r => r.text());
await admin().rpc('exec_sql', { sql });
```

---

## Core Tables

### `user_memory_facts`

Stores user-specific memory facts for RAG recall.

```sql
CREATE TABLE IF NOT EXISTS user_memory_facts (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  convo_id text,
  source text DEFAULT 'chat',
  fact text NOT NULL,
  hash_sha256 text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hash_sha256)
);
```

**Indexes**:
- `(user_id, created_at DESC)` - For recall queries
- `(hash_sha256)` - For deduplication

**Usage**: Facts are extracted from chat messages and stored with PII masked.

---

### `memory_embeddings`

Stores vector embeddings for semantic search.

```sql
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id bigserial PRIMARY KEY,
  fact_id bigint REFERENCES user_memory_facts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  text text NOT NULL,
  embedding vector(3072), -- text-embedding-3-large
  model text DEFAULT 'text-embedding-3-large',
  created_at timestamptz DEFAULT now(),
  UNIQUE(fact_id, model)
);
```

**Indexes**:
- `(user_id, created_at DESC)` - For recall queries
- Vector index (pgvector) on `embedding` - For similarity search

**Usage**: Embeddings enable semantic memory recall via `pgvector`.

---

### `chat_convo_summaries`

Stores session summaries for context injection.

```sql
CREATE TABLE IF NOT EXISTS chat_convo_summaries (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  convo_id text NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `(user_id, convo_id, created_at DESC)` - For latest summary lookup

**Usage**: Summaries are generated when thresholds are met (turn count, tokens, time).

---

### `orchestration_events`

Logs employee routing decisions.

```sql
CREATE TABLE IF NOT EXISTS orchestration_events (
  id bigserial PRIMARY KEY,
  user_id text,
  convo_id text,
  employee text,
  confidence numeric,
  reason text,
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `(user_id, convo_id, created_at DESC)` - For routing history

**Usage**: Tracks which employee handled each request and why.

---

### `transactions`

Stores normalized transactions from OCR/imports.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  doc_id text,
  kind text NOT NULL CHECK (kind IN ('invoice', 'receipt', 'bank')),
  date date,
  merchant text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  category text,
  subcategory text,
  source text DEFAULT 'ocr',
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `(user_id, date DESC)` - For transaction queries
- `(user_id, category)` - For category filtering
- `(user_id, date, merchant, amount, currency)` UNIQUE - For deduplication

**Usage**: Normalized transaction data from OCR parsing.

---

### `transaction_items`

Stores line items for transactions.

```sql
CREATE TABLE IF NOT EXISTS transaction_items (
  id bigserial PRIMARY KEY,
  transaction_id bigint REFERENCES transactions(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty numeric,
  unit text,
  price numeric
);
```

**Indexes**:
- `(transaction_id)` - For item lookups

**Usage**: Line items (e.g., invoice line items, receipt items).

---

### `vendor_aliases`

Stores vendor name aliases for canonicalization.

```sql
CREATE TABLE IF NOT EXISTS vendor_aliases (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  merchant text NOT NULL,
  alias text NOT NULL,
  confidence numeric DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant, alias)
);
```

**Indexes**:
- `(user_id, merchant)` - For vendor lookups

**Usage**: Maps merchant names to canonical names (e.g., "Save On Foods" → "Save-On-Foods").

---

### `user_xp_ledger`

Stores XP points awarded to users.

```sql
CREATE TABLE IF NOT EXISTS user_xp_ledger (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  action text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `(user_id, created_at DESC)` - For XP history
- `(user_id, action)` - For action filtering
- `(user_id, action, meta->>'transaction_id', ...)` UNIQUE - For idempotency

**Usage**: Tracks XP awards for gamification (scans, categorizations, corrections).

---

### `guardrail_events`

Logs guardrails checks and blocks.

```sql
CREATE TABLE IF NOT EXISTS guardrail_events (
  id bigserial PRIMARY KEY,
  user_id text,
  convo_id text,
  stage text, -- 'chat', 'ocr', 'ingestion'
  rule_type text,
  action text, -- 'allowed', 'blocked'
  severity integer,
  content_hash text,
  provider text,
  blocked boolean,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `(user_id, created_at DESC)` - For audit logs
- `(stage, blocked)` - For monitoring

**Usage**: Audit trail for guardrails checks and blocks.

---

## Relationships

```
user_memory_facts (1) ──> (N) memory_embeddings
transactions (1) ──> (N) transaction_items
```

---

## Constraints

### Deduplication

- **Memory facts**: `UNIQUE(user_id, hash_sha256)` - Prevents duplicate facts
- **Transactions**: `UNIQUE(user_id, date, merchant, amount, currency)` - Prevents duplicate transactions
- **XP awards**: `UNIQUE(user_id, action, meta)` - Prevents duplicate XP awards (idempotent)

### Referential Integrity

- `memory_embeddings.fact_id` → `user_memory_facts.id` (CASCADE DELETE)
- `transaction_items.transaction_id` → `transactions.id` (CASCADE DELETE)

---

## Best Practices

1. **Always use idempotent patterns** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
2. **Add indexes** for common query patterns
3. **Use `user_id` filtering** for all user-scoped queries
4. **Mask PII** before storing in `user_memory_facts`
5. **Hash facts** for deduplication (`hash_sha256`)

---

## Environment Variables

Required for database access:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## See Also

- `netlify/functions/_shared/sql/` - Migration files
- `netlify/functions/_shared/supabase.ts` - Database client
- `reports/DAY4_CHANGELOG.md` - Memory schema details
- `reports/DAY9_CHANGELOG.md` - Transactions schema details
- `reports/DAY10_CHANGELOG.md` - Vendor aliases and XP schema details

