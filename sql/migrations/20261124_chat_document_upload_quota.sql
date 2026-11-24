-- Attachments E8: atomic per-user chat-document upload quota.
--
-- STATUS: prepared locally for owner review. NOT applied to any shared or production database.
-- Separate from 20261123_user_documents_purpose.sql; apply after it (chat documents cannot be
-- created until both exist, so the feature fails closed until then).
--
-- smart-import-init calls claim_chat_document_upload(user, hourly, daily) with the SERVICE ROLE
-- before creating a chat document. Inside one transaction the function:
--   1. takes a per-user advisory lock (concurrent requests for the same user queue; other users
--      are unaffected),
--   2. counts that user's claims in the last hour and day,
--   3. records the claim only if both limits allow it.
-- So N concurrent uploads can never exceed the limit. Limits are passed in by the server (default
-- 10/hour, 30/day; later from subscription entitlements) — the database stores no plan logic.
--
-- Rollback (only if needed):
--   begin;
--   drop function if exists public.claim_chat_document_upload(uuid, integer, integer);
--   drop table if exists public.chat_document_upload_events;
--   commit;

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.chat_document_upload_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_document_upload_events_user_time
  on public.chat_document_upload_events (user_id, created_at desc);

-- Service role only: RLS on with no policies; no grants to client roles.
alter table public.chat_document_upload_events enable row level security;
revoke all on table public.chat_document_upload_events from public, anon, authenticated;

create or replace function public.claim_chat_document_upload(
  p_user_id uuid,
  p_hourly_limit integer,
  p_daily_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hour integer;
  v_day integer;
  v_oldest timestamptz;
begin
  if p_user_id is null or p_hourly_limit is null or p_daily_limit is null
     or p_hourly_limit < 0 or p_daily_limit < 0 then
    raise exception 'invalid_arguments' using errcode = '22023';
  end if;

  -- Serialize claims per user for the rest of this transaction.
  perform pg_advisory_xact_lock(hashtextextended('chat_document_upload:' || p_user_id::text, 0));

  -- Keep the table small: drop this user's claims older than two days.
  delete from public.chat_document_upload_events
   where user_id = p_user_id and created_at < now() - interval '2 days';

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into v_hour, v_day
    from public.chat_document_upload_events
   where user_id = p_user_id and created_at > now() - interval '1 day';

  if v_hour >= p_hourly_limit then
    select min(created_at) into v_oldest from public.chat_document_upload_events
     where user_id = p_user_id and created_at > now() - interval '1 hour';
    return jsonb_build_object('allowed', false, 'scope', 'hourly',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (coalesce(v_oldest, now()) + interval '1 hour' - now())))::int));
  end if;
  if v_day >= p_daily_limit then
    select min(created_at) into v_oldest from public.chat_document_upload_events
     where user_id = p_user_id and created_at > now() - interval '1 day';
    return jsonb_build_object('allowed', false, 'scope', 'daily',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (coalesce(v_oldest, now()) + interval '1 day' - now())))::int));
  end if;

  insert into public.chat_document_upload_events (user_id) values (p_user_id);
  return jsonb_build_object('allowed', true, 'hourly_used', v_hour + 1, 'daily_used', v_day + 1);
end;
$$;

-- Only the server (service role) may claim; customers can never call it with someone else's id.
revoke all on function public.claim_chat_document_upload(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_chat_document_upload(uuid, integer, integer) to service_role;

commit;

-- Verification (read-only, after applying):
--   select has_function_privilege('anon', 'public.claim_chat_document_upload(uuid,integer,integer)', 'EXECUTE') as anon_exec,          -- false
--          has_function_privilege('authenticated', 'public.claim_chat_document_upload(uuid,integer,integer)', 'EXECUTE') as auth_exec, -- false
--          has_function_privilege('service_role', 'public.claim_chat_document_upload(uuid,integer,integer)', 'EXECUTE') as svc_exec;   -- true
--   select relrowsecurity from pg_class where oid = 'public.chat_document_upload_events'::regclass;                                    -- true
