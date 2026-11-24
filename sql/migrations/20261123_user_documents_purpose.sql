-- Attachments B1: user_documents.purpose ('chat_document' | 'import'), immutable, with a
-- database backstop so a chat document can never become an import or transactions.
--
-- STATUS: prepared locally for owner review. NOT applied to any shared or production database.
-- Apply only with owner approval, in one transaction (Supabase SQL editor), then run the
-- verification queries at the bottom.
--
-- Compatibility:
--   * Existing rows keep purpose = NULL, which the code treats as 'import'. No backfill needed.
--   * Code deployed before this migration keeps working for imports (smart-import-init drops the
--     column on insert if it is missing) and cannot create chat documents (fail closed).
--
-- Rollback (only if needed; restores the pre-B1 schema, chat documents lose their backstop):
--   begin;
--   drop trigger if exists trg_user_documents_purpose_immutable on public.user_documents;
--   drop trigger if exists trg_imports_reject_chat_document on public.imports;
--   drop trigger if exists trg_transactions_reject_chat_document on public.transactions;
--   drop trigger if exists trg_transactions_staging_reject_chat_document on public.transactions_staging;
--   drop function if exists public.user_documents_purpose_immutable();
--   drop function if exists public.reject_chat_document_link();
--   alter table public.user_documents drop constraint if exists user_documents_purpose_check;
--   alter table public.user_documents drop column if exists purpose;
--   commit;

begin;

-- 1. Column + allowed values
alter table public.user_documents add column if not exists purpose text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_documents_purpose_check' and conrelid = 'public.user_documents'::regclass
  ) then
    alter table public.user_documents
      add constraint user_documents_purpose_check
      check (purpose is null or purpose in ('chat_document', 'import'));
  end if;
end $$;

comment on column public.user_documents.purpose is
  'Attachments B1: set once by smart-import-init. chat_document = attach-and-discuss, never imported. NULL (legacy) = import.';

-- 2. Immutability: purpose can never change once set. The only allowed transition is a legacy
--    NULL row being labelled 'import' (it already behaves as an import).
create or replace function public.user_documents_purpose_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.purpose is distinct from old.purpose then
    if old.purpose is null and new.purpose = 'import' then
      return new;
    end if;
    raise exception 'user_documents.purpose is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_documents_purpose_immutable on public.user_documents;
create trigger trg_user_documents_purpose_immutable
  before update of purpose on public.user_documents
  for each row execute function public.user_documents_purpose_immutable();

-- 3. Backstop: no import, staged row or transaction may reference a chat document, whichever code
--    path (or client) writes it. SECURITY DEFINER so the lookup is not hidden by RLS; it reads one
--    column of one row and returns nothing to the caller.
create or replace function public.reject_chat_document_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.document_id is not null and exists (
    select 1 from public.user_documents d
    where d.id = new.document_id and d.purpose = 'chat_document'
  ) then
    raise exception 'chat_document_not_importable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_chat_document_link() from public;
revoke all on function public.user_documents_purpose_immutable() from public;

-- Attach only to tables that exist and have a document_id column (the live schema is not fully
-- reproducible from git, so this is checked rather than assumed).
do $$
declare
  t text;
begin
  foreach t in array array['imports', 'transactions', 'transactions_staging'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'document_id'
    ) then
      execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_reject_chat_document', t);
      execute format(
        'create trigger %I before insert or update of document_id on public.%I '
        'for each row execute function public.reject_chat_document_link()',
        'trg_' || t || '_reject_chat_document', t
      );
    else
      raise notice 'skipped %: no document_id column', t;
    end if;
  end loop;
end $$;

commit;

-- Verification (read-only, after applying):
--   select column_name, data_type, is_nullable from information_schema.columns
--     where table_schema='public' and table_name='user_documents' and column_name='purpose';
--   select tgname, tgrelid::regclass from pg_trigger
--     where tgname like 'trg_%chat_document' or tgname = 'trg_user_documents_purpose_immutable';
--   select purpose, count(*) from public.user_documents group by purpose;   -- expect only NULL before B1 is activated
