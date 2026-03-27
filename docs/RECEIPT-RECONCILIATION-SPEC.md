# RECEIPT-RECONCILIATION-SPEC

## PIPELINE ARCHITECTURE FIX — Split OCR from normalize/commit

### PROBLEM

`smart-import-ocr.ts` does OCR + normalize + poll + commit all in one 60-second Netlify function. It consistently times out.

### FIX

Split into two phases.

---

## PHASE 1 — smart-import-ocr.ts (KEEP, MODIFY)

- Do OCR extraction only
- Save OCR text to `user_documents` (already does this)
- At the end, REMOVE all the `.then()` polling/commit code (lines after normalize fetch call)
- Instead, after the normalize fetch, fire-and-forget a call to a NEW function: `auto-commit-import`
- Pass: `{ importId, userId, docId }`
- Do NOT await it. Just `fetch()` and `.catch()` for logging.
- The normalize fetch should also NOT be awaited in `.then()` — just fire and forget
- Total OCR function should finish in ~10 seconds

---

## PHASE 2 — NEW FILE: netlify/functions/auto-commit-import.ts

- Accepts POST with `{ docId, userId }`
- Uses `admin()` Supabase client (same pattern as other functions)

### Steps

1. **Poll transactions_staging** every 3 seconds for up to 90 seconds, looking for rows matching this docId via:
   ```sql
   SELECT import_id FROM imports WHERE document_id = docId AND user_id = userId
   ```
   Then check staging rows by that `import_id`.

2. **Once staging rows found**, read them all.

3. **Map to transactions table format:**
   | Target Column   | Source                                              |
   |-----------------|-----------------------------------------------------|
   | `id`            | `crypto.randomUUID()`                               |
   | `user_id`       | `row.user_id`                                       |
   | `merchant_name` | `row.data_json?.merchant \|\| "Unknown"`            |
   | `amount`        | `row.data_json?.amount \|\| 0`                      |
   | `date`          | `row.data_json?.date \|\| null`                     |
   | `type`          | `row.data_json?.type === "Credit" ? "income" : "expense"` |
   | `category`      | `row.tag_category \|\| "Other"`                     |
   | `import_id`     | `row.import_id`                                     |

4. **Insert into transactions table.**

5. **Update imports status** to `"committed"`.

6. **Log results.**

---

## netlify.toml Addition

```toml
[functions."auto-commit-import"]
  timeout = 120
```

---

## CRITICAL RULES

- Do NOT modify any protected files:
  - `runSmartImportPipeline.ts`
  - `process-statement.ts`
  - `commit-import.ts`
  - `approve-import.ts`
  - `smart-import-sync.ts`
- Only modify `smart-import-ocr.ts` (remove polling/commit code, add fire-and-forget call to `auto-commit-import`)
- Create `auto-commit-import.ts` as a new standalone function
