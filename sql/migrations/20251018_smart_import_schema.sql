-- Smart Import AI Schema Migration
-- Created: October 18, 2025
-- Purpose: Foundation tables for document upload, OCR parsing, transaction staging, and financial advisory

-- CORE TABLES ---------------------------------------------------

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_key text not null,
  mime text not null,
  bytes bigint not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now()
);

comment on table public.imports is 'Tracks uploaded files and their processing status';
comment on column public.imports.user_id is 'Owner of the import';
comment on column public.imports.file_key is 'Path in Supabase Storage (e.g., users/xyz/file.pdf)';
comment on column public.imports.status is 'uploaded → parsed_preview → committed → analyzed_crystal';

create table if not exists public.transactions_staging (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  occurred_at timestamptz,
  description text,
  amount numeric(14,2),
  currency text default 'CAD',
  memo text,
  vendor_raw text,
  category_suggested text,
  source_line int,
  hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.transactions_staging is 'Temporary table for parsed transactions before final commitment';
comment on column public.transactions_staging.hash is 'Unique identifier for idempotency (prevents duplicates)';
comment on column public.transactions_staging.category_suggested is 'AI-suggested category before user review';

create unique index if not exists transactions_staging_hash_uidx on public.transactions_staging(hash);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  occurred_at timestamptz,
  description text,
  amount numeric(14,2),
  currency text default 'CAD',
  memo text,
  vendor_raw text,
  vendor_normalized text,
  category text,
  source_line int,
  hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Final committed transactions after user approval';
comment on column public.transactions.hash is 'Unique identifier for idempotency (prevents duplicates on re-commit)';
comment on column public.transactions.vendor_normalized is 'Cleaned vendor name (e.g., "Amazon" vs "AMAZON.COM INC")';

create unique index if not exists transactions_hash_uidx on public.transactions(hash);
create index if not exists transactions_import_id_idx on public.transactions(import_id);
create index if not exists transactions_occurred_at_idx on public.transactions(occurred_at);

create table if not exists public.handoffs (
  id uuid primary key,
  import_id uuid not null references public.imports(id) on delete cascade,
  from_agent text not null,
  to_agent text not null,
  status text not null default 'queued',
  payload jsonb,
  created_at timestamptz not null default now()
);

comment on table public.handoffs is 'Agent-to-agent handoff records (e.g., Byte → Prime, Prime → Crystal)';
comment on column public.handoffs.payload is 'Context passed between agents (import metadata, analysis results)';

create index if not exists handoffs_import_id_idx on public.handoffs(import_id);
create index if not exists handoffs_status_idx on public.handoffs(status);

create table if not exists public.advice_messages (
  id uuid primary key,
  import_id uuid references public.imports(id) on delete cascade,
  role text not null,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

comment on table public.advice_messages is 'Financial advisory messages from AI agents (Crystal, Prime, etc.)';
comment on column public.advice_messages.role is 'AI agent that generated the advice (e.g., crystal-analytics, prime-boss)';
comment on column public.advice_messages.message is 'Human-readable advisory text';
comment on column public.advice_messages.meta is 'Additional data (budget_impact, forecast_delta, top_drivers, etc.)';

create index if not exists advice_messages_import_id_idx on public.advice_messages(import_id);
create index if not exists advice_messages_role_idx on public.advice_messages(role);

-- RLS (Row-Level Security) ---------------------------------------------------
-- All tables use owner-based access control through the imports.user_id

alter table public.imports enable row level security;
alter table public.transactions_staging enable row level security;
alter table public.transactions enable row level security;
alter table public.handoffs enable row level security;
alter table public.advice_messages enable row level security;

-- imports: owner can see/modify only their own
create policy "imports_owner" on public.imports
  for all using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- transactions_staging: owner can see/modify only their own imports' staging rows
create policy "staging_by_owner" on public.transactions_staging
  for all using (
    exists (select 1 from public.imports i where i.id = transactions_staging.import_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.imports i where i.id = transactions_staging.import_id and i.user_id = auth.uid())
  );

-- transactions: owner can see/modify only their own imports' final transactions
create policy "transactions_by_owner" on public.transactions
  for all using (
    exists (select 1 from public.imports i where i.id = transactions.import_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.imports i where i.id = transactions.import_id and i.user_id = auth.uid())
  );

-- handoffs: owner can see/modify only their own imports' handoffs
create policy "handoffs_by_owner" on public.handoffs
  for all using (
    exists (select 1 from public.imports i where i.id = handoffs.import_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.imports i where i.id = handoffs.import_id and i.user_id = auth.uid())
  );

-- advice_messages: owner can see/modify only their own imports' advice
create policy "advice_by_owner" on public.advice_messages
  for all using (
    advice_messages.import_id is null
    or exists (select 1 from public.imports i where i.id = advice_messages.import_id and i.user_id = auth.uid())
  )
  with check (
    advice_messages.import_id is null
    or exists (select 1 from public.imports i where i.id = advice_messages.import_id and i.user_id = auth.uid())
  );

-- GRANTS (for Netlify service role - already has full access via service key)
-- No additional grants needed; service role key has superuser permissions






