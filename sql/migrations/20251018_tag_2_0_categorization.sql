-- Tag 2.0 Categorization Schema
-- Purpose: Rules-based + AI-assisted transaction categorization with history tracking

-- Category rules for auto-categorization
create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  merchant_pattern text not null,     -- e.g. 'COSTCO', 'AMAZON%PRIME%'
  category text not null,             -- e.g. 'Groceries'
  priority int not null default 100,  -- smaller = earlier
  match_type text not null default 'ilike', -- 'ilike'|'regex'
  created_at timestamptz not null default now()
);

comment on table public.category_rules is 'User-defined and system rules for merchant → category mapping';
comment on column public.category_rules.priority is 'Lower priority (0-50) = user rules, higher = defaults. Evaluated in order.';
comment on column public.category_rules.match_type is 'ilike: substring match; regex: full regex pattern';

create index if not exists category_rules_user_priority_idx
  on public.category_rules(user_id, priority);

-- Normalized merchant names (canonical form)
create table if not exists public.normalized_merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  vendor_raw text not null,           -- as-imported (e.g. "AMZN.COM/AMZONS3")
  merchant_norm text not null,        -- canonical (e.g. "Amazon")
  created_at timestamptz not null default now()
);

comment on table public.normalized_merchants is 'Learned normalization map for merchants (cleanup + deduplication)';
comment on column public.normalized_merchants.vendor_raw is 'Raw vendor string from import';
comment on column public.normalized_merchants.merchant_norm is 'Canonical normalized name for UI + analytics';

create unique index if not exists normalized_merchants_unique
  on public.normalized_merchants(user_id, vendor_raw);

-- Category change history (audit trail + ML training data)
create table if not exists public.category_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  old_category text,
  new_category text not null,
  reason text not null,               -- 'rule','user_correction','ai'
  confidence numeric(5,2) default 100,
  created_at timestamptz not null default now()
);

comment on table public.category_history is 'Audit trail of category changes for learning + analytics';
comment on column public.category_history.reason is 'Source of the change: rule-based, user override, or AI suggestion';
comment on column public.category_history.confidence is 'How confident the system is (0-100)';

create index if not exists category_history_user_idx on public.category_history(user_id);
create index if not exists category_history_txn_idx on public.category_history(transaction_id);

-- Add tracking fields to transactions
alter table public.transactions
  add column if not exists category_confidence numeric(5,2),
  add column if not exists merchant_norm text;

comment on column public.transactions.category_confidence is 'How confident (0-100) the category assignment is';
comment on column public.transactions.merchant_norm is 'Normalized merchant name (canonical form)';

-- Row-Level Security
alter table public.category_rules enable row level security;
alter table public.normalized_merchants enable row level security;
alter table public.category_history enable row level security;

create policy "rules_by_owner" on public.category_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "norms_by_owner" on public.normalized_merchants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cat_history_by_owner" on public.category_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);






