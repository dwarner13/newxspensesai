-- C2-A2 — Storage & ownership verification (READ-ONLY).
--
-- NOT a migration. Run manually in the Supabase SQL editor. Every statement is a SELECT inside a
-- READ ONLY transaction that is rolled back; nothing is changed. Output contains configuration and
-- counts only — no document contents, file names or financial values.
--
-- Expected results are noted above each query. Anything else is a finding to report to the owner.

BEGIN;
SET TRANSACTION READ ONLY;

-- 1. Bucket privacy.
--    EXPECT: docs, receipts, original_docs, redacted_docs, imports, bank-statements -> public = false.
--    (avatars is public by design.) A missing row means the bucket does not exist in this project.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('docs', 'receipts', 'original_docs', 'redacted_docs', 'imports', 'bank-statements', 'uploads', 'avatars')
ORDER BY id;

-- 2. Storage object policies.
--    EXPECT: policies for docs/receipts limit access to the owner's folder, e.g.
--      bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text
--    FLAG: any policy on these buckets granted to anon/public, or with qual/with_check = 'true',
--          or that mentions a bucket without a folder/owner condition.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3. Row-level security enabled on document and financial tables.
--    EXPECT: relrowsecurity = true for every row.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('user_documents', 'receipts', 'transactions', 'transactions_staging', 'imports',
                    'import_summaries', 'ocr_jobs', 'chat_messages', 'chat_sessions')
ORDER BY c.relname;

-- 4. Table policies on those tables.
--    EXPECT: owner-only conditions such as (auth.uid() = user_id).
--    FLAG: qual or with_check = 'true', roles containing anon, or no policy at all for a table
--          whose rls_enabled = true (that table is then unreadable from the client).
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_documents', 'receipts', 'transactions', 'transactions_staging', 'imports',
                    'import_summaries', 'ocr_jobs', 'chat_messages', 'chat_sessions')
ORDER BY tablename, policyname;

-- 5. Over-broad policies anywhere in public/storage (quick red-flag scan).
--    EXPECT: no rows, except intentionally public reference tables / avatars.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND (qual = 'true' OR with_check = 'true' OR 'anon' = ANY (roles) OR 'public' = ANY (roles))
ORDER BY schemaname, tablename, policyname;

-- 6. Objects stored outside their owner's folder in private buckets.
--    EXPECT: 0 for docs and receipts. (storage.objects.owner is the uploader when uploaded with a
--    user session; service-role uploads have owner NULL and are counted separately.)
SELECT bucket_id,
       count(*) AS total_objects,
       count(*) FILTER (WHERE owner IS NULL) AS service_role_uploads,
       count(*) FILTER (WHERE owner IS NOT NULL AND (storage.foldername(name))[1] <> owner::text) AS outside_owner_folder
FROM storage.objects
WHERE bucket_id IN ('docs', 'receipts')
GROUP BY bucket_id
ORDER BY bucket_id;

-- 7. Receipt rows that still hold a public storage URL (pre-C2-A2 rows).
--    These load only if the bucket is public. After C2-A2 the app signs them on display.
SELECT count(*) FILTER (WHERE file_url LIKE '%/storage/v1/object/public/%'
                         OR image_url LIKE '%/storage/v1/object/public/%') AS rows_with_public_url,
       count(*) AS total_receipts
FROM receipts;

-- 8. Receipt links that cross users (should be impossible; detects past abuse of the
--    pre-C2-A2 forged transaction_id bug).
--    EXPECT: 0.
SELECT count(*) AS cross_user_receipt_links
FROM receipts r
JOIN transactions t ON t.id = r.transaction_id
WHERE r.user_id IS DISTINCT FROM t.user_id;

SELECT count(*) AS cross_user_transaction_receipt_refs
FROM transactions t
JOIN receipts r ON r.id = t.receipt_id
WHERE r.user_id IS DISTINCT FROM t.user_id;

ROLLBACK;

-- 9. Manual check (outside SQL): anonymous access must fail.
--    With the anon key only (no user session), request a known object path:
--      GET {SUPABASE_URL}/storage/v1/object/public/docs/<userId>/<docId>/<file>
--      GET {SUPABASE_URL}/storage/v1/object/public/receipts/<userId>/<file>
--    EXPECT: 400/404 ("Bucket not found"/"Object not found"), never the file.
--    Then, signed in as user A, try createSignedUrl on a path under user B's folder.
--    EXPECT: error (policy denies), never a signed URL.
