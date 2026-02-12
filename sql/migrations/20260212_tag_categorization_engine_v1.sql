-- TAG Categorization Engine v1
-- Safe, staging-only categorization support.

-- 1) Vendor memory table
create table if not exists public.vendor_category_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor_key text not null,
  category text not null,
  subcategory text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vendor_category_memory_user_vendor_key_uidx
  on public.vendor_category_memory(user_id, vendor_key);

create index if not exists vendor_category_memory_user_id_idx
  on public.vendor_category_memory(user_id);

alter table public.vendor_category_memory enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_category_memory'
      and policyname = 'vendor_category_memory_select_own'
  ) then
    create policy vendor_category_memory_select_own
      on public.vendor_category_memory
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_category_memory'
      and policyname = 'vendor_category_memory_insert_own'
  ) then
    create policy vendor_category_memory_insert_own
      on public.vendor_category_memory
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_category_memory'
      and policyname = 'vendor_category_memory_update_own'
  ) then
    create policy vendor_category_memory_update_own
      on public.vendor_category_memory
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_category_memory'
      and policyname = 'vendor_category_memory_delete_own'
  ) then
    create policy vendor_category_memory_delete_own
      on public.vendor_category_memory
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- 2) Minimal TAG columns on transactions_staging
alter table public.transactions_staging
  add column if not exists tag_category text,
  add column if not exists tag_subcategory text,
  add column if not exists tag_confidence numeric(4,3),
  add column if not exists tag_reason text,
  add column if not exists tag_status text,
  add column if not exists tag_version text,
  add column if not exists tag_rule_source text,
  add column if not exists tag_model text,
  add column if not exists tag_updated_at timestamptz;

create index if not exists transactions_staging_tag_status_idx
  on public.transactions_staging(tag_status);
