/**
 * Tag AI Categorization Audit Schema
 *
 * Tables:
 * - transaction_categorizations: Immutable history of all category assignments (versioned)
 * - model_runs: Track AI model executions (latency, tokens)
 * - ai_categorization_events: Link transactions to AI model runs
 * - metrics_categorization_daily: Daily aggregated metrics
 * - metrics_rule_performance: Rule-level hit/miss tracking
 * - metrics_function_performance: Function latency & error tracking
 * - metrics_user_corrections: User manual corrections for learning
 *
 * Created: October 19, 2025
 */

-- ============================================================================
-- TRANSACTION CATEGORIZATIONS (Immutable Versioned History)
-- ============================================================================

create table if not exists public.transaction_categorizations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  user_id uuid not null,
  category_id uuid references public.categories(id) on delete cascade,
  source text not null, -- 'rule', 'ai', 'manual', 'default'
  confidence int not null default 0, -- 0-100
  reason text, -- "Matched rule pattern", "AI suggestion", etc.
  version int not null default 1, -- Immutable: 1, 2, 3, ...
  created_by uuid references auth.users(id) on delete set null, -- null = automated (AI)
  created_at timestamptz not null default now()
);

comment on table public.transaction_categorizations is 'Immutable versioned history of category assignments';
comment on column public.transaction_categorizations.version is '1 = initial, 2 = first correction, etc.';
comment on column public.transaction_categorizations.source is 'How category was assigned: rule, ai, manual, or default';
comment on column public.transaction_categorizations.created_by is 'null = automated/AI, UUID = manual user override';

create unique index transaction_categorizations_unique_latest on public.transaction_categorizations(transaction_id, user_id, version)
  where version > 0;

create index transaction_categorizations_user_id_idx on public.transaction_categorizations(user_id);
create index transaction_categorizations_category_id_idx on public.transaction_categorizations(category_id);
create index transaction_categorizations_created_at_idx on public.transaction_categorizations(created_at);
create index transaction_categorizations_source_idx on public.transaction_categorizations(source);

-- ============================================================================
-- MODEL RUNS (AI Model Execution Tracking)
-- ============================================================================

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_name text not null, -- 'gpt-4-turbo', 'crystal-2.0', etc.
  latency_ms int, -- Execution time
  input_tokens int, -- Prompt tokens
  output_tokens int, -- Completion tokens
  cost_usd numeric(8, 4), -- Estimated cost
  success boolean default true,
  error_message text, -- If failed
  created_at timestamptz not null default now()
);

comment on table public.model_runs is 'Track AI model executions for cost & performance analysis';
comment on column public.model_runs.latency_ms is 'Time to generate categorization';
comment on column public.model_runs.cost_usd is 'Estimated OpenAI/API cost';

create index model_runs_user_id_idx on public.model_runs(user_id);
create index model_runs_model_name_idx on public.model_runs(model_name);
create index model_runs_created_at_idx on public.model_runs(created_at);

-- ============================================================================
-- AI CATEGORIZATION EVENTS (Link Transactions to Model Runs)
-- ============================================================================

create table if not exists public.ai_categorization_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  model_run_id uuid not null references public.model_runs(id) on delete cascade,
  suggested_category_id uuid references public.categories(id) on delete set null,
  confidence int not null default 0, -- 0-100
  rationale text, -- AI reasoning (redacted for PII)
  user_accepted boolean, -- Did user keep the suggestion?
  user_corrected_to_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.ai_categorization_events is 'Track AI suggestions & user responses for model improvement';
comment on column public.ai_categorization_events.user_accepted is 'true = kept, false = corrected, null = not yet reviewed';

create index ai_categorization_events_user_id_idx on public.ai_categorization_events(user_id);
create index ai_categorization_events_transaction_id_idx on public.ai_categorization_events(transaction_id);
create index ai_categorization_events_model_run_id_idx on public.ai_categorization_events(model_run_id);
create index ai_categorization_events_created_at_idx on public.ai_categorization_events(created_at);

-- ============================================================================
-- DAILY METRICS (Aggregated Categorization Stats)
-- ============================================================================

create table if not exists public.metrics_categorization_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null, -- YYYY-MM-DD
  total_transactions int default 0,
  auto_categorized int default 0, -- Rules or AI
  manual_corrections int default 0,
  avg_confidence numeric(5, 2) default 0, -- 0-100
  confidence_std_dev numeric(5, 2), -- Std deviation
  uncategorized_count int default 0, -- Still uncategorized
  rules_applied int default 0, -- Count of rule matches
  aliases_matched int default 0, -- Count of alias matches
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.metrics_categorization_daily is 'Daily aggregated metrics for dashboard & reporting';

create unique index metrics_categorization_daily_unique on public.metrics_categorization_daily(user_id, day);
create index metrics_categorization_daily_user_idx on public.metrics_categorization_daily(user_id);
create index metrics_categorization_daily_day_idx on public.metrics_categorization_daily(day);

-- ============================================================================
-- RULE PERFORMANCE METRICS
-- ============================================================================

create table if not exists public.metrics_rule_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  rule_id uuid not null,
  matched boolean, -- Did rule fire?
  was_correct boolean default true, -- Did user keep the decision?
  confidence int default 100,
  timestamp timestamptz not null default now()
);

comment on table public.metrics_rule_performance is 'Per-rule performance tracking for rule effectiveness analysis';
comment on column public.metrics_rule_performance.was_correct is 'true = user kept, false = user corrected';

create index metrics_rule_performance_user_idx on public.metrics_rule_performance(user_id);
create index metrics_rule_performance_rule_idx on public.metrics_rule_performance(rule_id);
create index metrics_rule_performance_timestamp_idx on public.metrics_rule_performance(timestamp);

-- ============================================================================
-- FUNCTION PERFORMANCE METRICS
-- ============================================================================

create table if not exists public.metrics_function_performance (
  id uuid primary key default gen_random_uuid(),
  function_name text not null, -- 'tag-categorize', 'resolveCategoryId', etc.
  duration_ms int not null,
  user_id uuid references auth.users(id) on delete set null,
  success boolean default true,
  error_message text,
  cache_hit boolean default false,
  row_count int, -- For batch operations
  timestamp timestamptz not null default now()
);

comment on table public.metrics_function_performance is 'Function-level performance monitoring for SLA tracking';

create index metrics_function_performance_function_idx on public.metrics_function_performance(function_name);
create index metrics_function_performance_user_idx on public.metrics_function_performance(user_id);
create index metrics_function_performance_timestamp_idx on public.metrics_function_performance(timestamp);
create index metrics_function_performance_success_idx on public.metrics_function_performance(success);

-- ============================================================================
-- USER CORRECTIONS (Learning from Manual Overrides)
-- ============================================================================

create table if not exists public.metrics_user_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  old_category_id uuid references public.categories(id) on delete set null,
  new_category_id uuid references public.categories(id) on delete set null,
  merchant_name text,
  confidence_override_pct int, -- Confidence of old suggestion
  rule_created boolean default false, -- Did this create a new rule?
  timestamp timestamptz not null default now()
);

comment on table public.metrics_user_corrections is 'Track user corrections for system learning & rule creation';

create index metrics_user_corrections_user_idx on public.metrics_user_corrections(user_id);
create index metrics_user_corrections_timestamp_idx on public.metrics_user_corrections(timestamp);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

alter table public.transaction_categorizations enable row level security;
alter table public.model_runs enable row level security;
alter table public.ai_categorization_events enable row level security;
alter table public.metrics_categorization_daily enable row level security;
alter table public.metrics_rule_performance enable row level security;
alter table public.metrics_function_performance enable row level security;
alter table public.metrics_user_corrections enable row level security;

-- transaction_categorizations: User sees only their own
create policy "transaction_categorizations_owner" on public.transaction_categorizations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- model_runs: User sees only their own
create policy "model_runs_owner" on public.model_runs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ai_categorization_events: User sees only their own
create policy "ai_categorization_events_owner" on public.ai_categorization_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- metrics_categorization_daily: User sees only their own
create policy "metrics_categorization_daily_owner" on public.metrics_categorization_daily
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- metrics_rule_performance: User sees only their own
create policy "metrics_rule_performance_owner" on public.metrics_rule_performance
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- metrics_function_performance: Users see aggregate, own detail
create policy "metrics_function_performance_owner" on public.metrics_function_performance
  for all using (
    -- Can always see own user's metrics
    auth.uid() = user_id
    -- Or access anonymous (null user_id) for system health
    or user_id is null
  )
  with check (auth.uid() = user_id or user_id is null);

-- metrics_user_corrections: User sees only their own
create policy "metrics_user_corrections_owner" on public.metrics_user_corrections
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS (RPC)
-- ============================================================================

-- Atomic increment for daily metrics (high concurrency)
create or replace function metrics_categorization_daily_increment(
  p_user_id uuid,
  p_day text,
  p_total_delta int default 0,
  p_auto_delta int default 0,
  p_manual_delta int default 0,
  p_conf_sample numeric default null,
  p_uncategorized_delta int default 0,
  p_rules_applied_delta int default 0,
  p_aliases_matched_delta int default 0
) returns void as $$
begin
  update public.metrics_categorization_daily
  set
    total_transactions = total_transactions + p_total_delta,
    auto_categorized = auto_categorized + p_auto_delta,
    manual_corrections = manual_corrections + p_manual_delta,
    uncategorized_count = uncategorized_count + p_uncategorized_delta,
    rules_applied = rules_applied + p_rules_applied_delta,
    aliases_matched = aliases_matched + p_aliases_matched_delta,
    avg_confidence = case
      when p_conf_sample is not null
      then (avg_confidence * total_transactions + p_conf_sample) / (total_transactions + 1)
      else avg_confidence
    end,
    updated_at = now()
  where user_id = p_user_id and day = p_day;
end;
$$ language plpgsql security definer;

-- Get confidence distribution buckets
create or replace function get_confidence_distribution(
  p_user_id uuid,
  p_start_date timestamptz
) returns table(
  bucket_0_20 int,
  bucket_20_40 int,
  bucket_40_60 int,
  bucket_60_80 int,
  bucket_80_100 int
) as $$
begin
  return query
  select
    count(*) filter (where confidence >= 0 and confidence < 20) as bucket_0_20,
    count(*) filter (where confidence >= 20 and confidence < 40) as bucket_20_40,
    count(*) filter (where confidence >= 40 and confidence < 60) as bucket_40_60,
    count(*) filter (where confidence >= 60 and confidence < 80) as bucket_60_80,
    count(*) filter (where confidence >= 80 and confidence <= 100) as bucket_80_100
  from public.transaction_categorizations
  where user_id = p_user_id and created_at >= p_start_date;
end;
$$ language plpgsql security definer;

-- Get user mastery score (0-100)
create or replace function get_user_mastery_score(p_user_id uuid)
returns int as $$
declare
  total_corrections int;
  accepted_count int;
  mastery_pct int;
begin
  select count(*) into total_corrections
  from public.metrics_user_corrections
  where user_id = p_user_id;

  if total_corrections = 0 then
    return 50; -- Neutral if no data
  end if;

  select count(*) into accepted_count
  from public.ai_categorization_events
  where user_id = p_user_id and user_accepted = true;

  mastery_pct := case
    when total_corrections = 0 then 50
    else round((accepted_count::float / total_corrections) * 100)
  end;

  return greatest(0, least(100, mastery_pct));
end;
$$ language plpgsql security definer;

-- Get ineffective rules (<threshold accuracy)
create or replace function get_ineffective_rules(p_user_id uuid, p_threshold numeric)
returns table(
  rule_id uuid,
  match_count int,
  correct_count int,
  accuracy numeric
) as $$
begin
  return query
  select
    rule_id,
    count(*) as match_count,
    count(*) filter (where was_correct = true) as correct_count,
    round((count(*) filter (where was_correct = true)::float / count(*)) * 100, 2) as accuracy
  from public.metrics_rule_performance
  where user_id = p_user_id
  group by rule_id
  having (count(*) filter (where was_correct = true)::float / count(*)) < p_threshold
  order by accuracy asc;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- GRANTS (Netlify Service Role)
-- ============================================================================

-- Service role has full access (already has superuser)
-- No additional grants needed






