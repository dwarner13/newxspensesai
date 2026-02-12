/**
 * Tag AI Categorization — Correction & Learning Schema
 *
 * Tables:
 * - correction_events: Audit trail of user category corrections
 * - merchant_profiles: Learned default categories for merchants
 *
 * Created: October 19, 2025
 */

-- ============================================================================
-- CORRECTION EVENTS (User Manual Corrections)
-- ============================================================================

create table if not exists public.correction_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  from_category_id uuid references public.categories(id) on delete set null,
  to_category_id uuid not null references public.categories(id) on delete cascade,
  from_source text, -- 'rule', 'ai', 'default', 'manual'
  from_confidence int, -- 0-100
  note text, -- User's reason for correction
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.correction_events is 'Audit trail of user category corrections for learning & analytics';
comment on column public.correction_events.from_source is 'Source of the category being overridden';
comment on column public.correction_events.from_confidence is 'Confidence of the original suggestion';
comment on column public.correction_events.note is 'User explanation for correction (for learning)';

create index correction_events_user_id_idx on public.correction_events(user_id);
create index correction_events_transaction_id_idx on public.correction_events(transaction_id);
create index correction_events_created_at_idx on public.correction_events(created_at);
create index correction_events_from_to_idx on public.correction_events(from_category_id, to_category_id);

-- ============================================================================
-- MERCHANT PROFILES (Learned Defaults)
-- ============================================================================

create table if not exists public.merchant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_name text not null,
  default_category_id uuid references public.categories(id) on delete set null,
  times_corrected int default 0, -- How many times user corrected this merchant
  confidence numeric(5, 2) default 0, -- 0-100 accuracy
  updated_at timestamptz not null default now()
);

comment on table public.merchant_profiles is 'Learned default categories for each merchant (user-specific)';
comment on column public.merchant_profiles.merchant_name is 'Canonical merchant name (e.g., "Amazon", "Costco")';
comment on column public.merchant_profiles.default_category_id is 'Category most commonly assigned to this merchant';
comment on column public.merchant_profiles.times_corrected is 'How many times user corrected initial AI suggestion';
comment on column public.merchant_profiles.confidence is 'Accuracy score (high = reliable default)';

create unique index merchant_profiles_unique on public.merchant_profiles(user_id, merchant_name);
create index merchant_profiles_category_idx on public.merchant_profiles(default_category_id);
create index merchant_profiles_updated_at_idx on public.merchant_profiles(updated_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

alter table public.correction_events enable row level security;
alter table public.merchant_profiles enable row level security;

-- correction_events: User sees only their own
create policy "correction_events_owner" on public.correction_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- merchant_profiles: User sees only their own
create policy "merchant_profiles_owner" on public.merchant_profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS (RPC)
-- ============================================================================

/**
 * Create a simple ILIKE rule if one doesn't exist for this merchant
 * Called from tag-correction.ts after user correction
 */
create or replace function maybe_create_contains_rule(
  p_user_id uuid,
  p_merchant text,
  p_category_id uuid
) returns uuid as $$
declare
  v_rule_id uuid;
  v_pattern text;
begin
  v_pattern := '%' || p_merchant || '%';

  -- Check if rule already exists
  select id into v_rule_id
  from public.category_rules
  where user_id = p_user_id
    and merchant_pattern = v_pattern
    and match_type = 'ilike'
  limit 1;

  -- If exists, return existing
  if v_rule_id is not null then
    return v_rule_id;
  end if;

  -- Create new rule
  v_rule_id := gen_random_uuid();
  insert into public.category_rules (
    id, user_id, merchant_pattern, category_id, priority, match_type, source
  ) values (
    v_rule_id, p_user_id, v_pattern, p_category_id, 50, 'ilike', 'user'
  );

  return v_rule_id;
end;
$$ language plpgsql security definer;

/**
 * Get user's learning stats (for dashboard)
 */
create or replace function get_user_learning_stats(p_user_id uuid)
returns table(
  total_corrections int,
  merchants_learned int,
  rules_created int,
  avg_correction_confidence numeric
) as $$
begin
  return query
  select
    count(*)::int as total_corrections,
    (select count(*) from public.merchant_profiles where user_id = p_user_id)::int as merchants_learned,
    (select count(*) from public.category_rules where user_id = p_user_id and source = 'user')::int as rules_created,
    avg(from_confidence)::numeric as avg_correction_confidence
  from public.correction_events
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

/**
 * Get merchant correction history (for analysis)
 */
create or replace function get_merchant_correction_history(
  p_user_id uuid,
  p_merchant_name text
) returns table(
  transaction_id uuid,
  from_category text,
  to_category text,
  from_confidence int,
  note text,
  created_at timestamptz
) as $$
begin
  return query
  select
    ce.transaction_id,
    fc.name as from_category,
    tc.name as to_category,
    ce.from_confidence,
    ce.note,
    ce.created_at
  from public.correction_events ce
  left join public.categories fc on ce.from_category_id = fc.id
  left join public.categories tc on ce.to_category_id = tc.id
  left join public.merchant_profiles mp on mp.user_id = ce.user_id
  where ce.user_id = p_user_id
    and mp.merchant_name = p_merchant_name
  order by ce.created_at desc;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- GRANTS (Netlify Service Role)
-- ============================================================================

-- Service role has full access (already has superuser)
-- No additional grants needed






