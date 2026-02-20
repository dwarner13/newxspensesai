# Supabase Schema Patch: `user_documents` missing `ocr_status` and `metadata`

## Why this patch exists

Runtime errors were blocking OCR/normalize flow in environments where `user_documents` did not have:

- `ocr_status`
- `metadata`

Observed failures:

- `column user_documents.ocr_status does not exist`
- `column user_documents.metadata does not exist`

This patch adds those columns so OCR state and safe extraction markers can be tracked consistently.

## SQL applied

```sql
alter table public.user_documents
  add column if not exists ocr_status text;

alter table public.user_documents
  add column if not exists metadata jsonb;

alter table public.user_documents
  alter column metadata set default '{}'::jsonb;

update public.user_documents
set metadata = '{}'::jsonb
where metadata is null;

create index if not exists idx_user_documents_ocr_status
  on public.user_documents (ocr_status);
```

## Runtime policy after patch

- OCR start -> `ocr_status='processing'`
- OCR success -> `ocr_status='ready'`
- OCR failure -> `ocr_status='failed'`

No raw OCR text is required for readiness and no raw OCR text is logged by this patch.

## Rollback notes

Only rollback if required by an emergency release:

```sql
drop index if exists idx_user_documents_ocr_status;
alter table public.user_documents drop column if exists metadata;
alter table public.user_documents drop column if exists ocr_status;
```

Rollback risk:

- OCR/normalize code expects these columns when present and includes compatibility fallbacks.
- Dropping the columns can reintroduce runtime errors in older paths.
