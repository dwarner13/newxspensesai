# Smart Import System: Current State Audit & Migration Plan

**Audit date:** 2026-08-04
**Branch:** `sidebar-safe-refactor`
**Auditor:** Claude Code (read-only, no modifications)
**Repository:** `C:\dev\project-bolt-fixed`

---

## 1. Repository and Git State

| Item | Value |
|------|-------|
| Working directory | `C:\dev\project-bolt-fixed` |
| Repository root | `C:/dev/project-bolt-fixed` |
| Current branch | `sidebar-safe-refactor` |
| Modified files | None (clean) |
| Staged files | None |
| Untracked files | None |
| **VERIFIED** | git status shows "nothing to commit, working tree clean" |

### Recent Relevant Commits (on sidebar-safe-refactor)

| Hash | Message |
|------|---------|
| `18face41` | fix(parser): hold statement when totals fail identity, never fall through to weaker strategy |
| `151d5bbf` | fix(parser): recover the trailing transaction swallowed by the totals block |
| `282a9f5f` | fix(parser): disputed rows take sign from description, not the corrupt delta |
| `0bff2bd1` | fix(parser): printed amount is ground truth; dispute, don't override |
| `03cbc768` | fix(ocr): unwrap pdfjs CJS default export |
| `db6c6a81` | fix(ocr): drop pdf-lib, use absolute page ranges on the original PDF |
| `789b98c7` | fix(netlify): move external_node_modules into a [functions] table |
| `e62f5379` | fix(ocr): lenient pdf-lib load for malformed bank PDFs |
| `16544e6b` | fix(ocr): static import of pdf-lib so Netlify esbuild bundles it |
| `02ac3487` | fix(ocr): chunk PDFs into <=5-page Vision calls; hard-fail on partial OCR |

### Existing Branches Related to Import/OCR/Parsing

| Branch | Location |
|--------|----------|
| `feature/day8-ocr-ingestion` | local + remote |
| `feature/day9-ocr-normalize-categorize` | local + remote |
| `feature/day10-ocr-memory-xp` | local + remote |
| `feature/day11-ui-transactions` | local + remote |
| `fix/functions-remove-import-meta` | local + remote |
| `fix/ocr-pdf-parse-only-final` | local + remote |
| `fix/ocr-pdf-parse-only-final-rebased` | remote only |
| `hotfix/netlify-502-supabase-import` | local + remote |

**VERIFIED** — all from `git branch -a` output.

---

## 2. Complete Smart Import System Inventory

### 2.1 Backend — Netlify Functions (Primary Pipeline)

#### Core Pipeline Functions

| File | Lines | Purpose | Status | Treatment |
|------|-------|---------|--------|-----------|
| `netlify/functions/smart-import-init.ts` | 459 | Creates doc record in `user_documents`, uploads to Supabase storage, returns docId/importId. Entry point for frontend uploads. | **Active, complete** | Keep unchanged |
| `netlify/functions/smart-import-finalize.ts` | 204 | Routes uploaded file by type (PDF/image -> OCR, CSV -> parse-csv). Triggers async processing. | **Active, complete** | Keep unchanged |
| `netlify/functions/smart-import-ocr.ts` | 3835 | Large OCR orchestrator: downloads file from storage, runs OCR (Google Vision + chunked PDF), stores text in `user_documents.ocr_text`, triggers normalize-transactions. Contains Google Vision PDF chunking, pdfjs-dist text extraction. | **Active, critical** | Extend carefully |
| `netlify/functions/smart-import-sync.ts` | 1978 | Phase 2 sync: polls for OCR/parse completion, triggers normalize-transactions if needed, triggers commit-import. Orchestrates the async pipeline. | **Active, critical** | Extend carefully |
| `netlify/functions/normalize-transactions.ts` | 1847 | Core normalization: reads OCR text from `user_documents`, detects document type (invoice/receipt/bank statement), runs parseBmoEverydayStatement or AI fallback, writes to `transactions_staging`. Contains `parseBmoStatementTotals()` and `validateIdentity()`. | **Active, critical** | Refactor carefully |
| `netlify/functions/approve-import.ts` | 108 | Sets `approved_at` on import record. Required before commit. Uses `verifyAuth` for JWT-based auth. | **Active, complete** | Keep unchanged |
| `netlify/functions/commit-import.ts` | 1874 | Moves transactions from `transactions_staging` to `transactions`. Runs reconciliation gate (`runReconciliationGate`), Tag categorization, builds `StatementBreakdown`, detects recurring obligations. | **Active, critical** | Extend carefully |
| `netlify/functions/process-statement.ts` | 671 | Standalone OCR endpoint (separate from smart-import pipeline). Receives base64 PDF, runs pdf-parse then Claude Vision -> OpenAI fallback cascade. Writes directly to `transactions_staging` and `import_summaries`. | **Active, alternate path** | Retire only after replacement |

#### OCR and Parsing Support Files

| File | Lines | Purpose | Status | Treatment |
|------|-------|---------|--------|-----------|
| `netlify/functions/_shared/ocr_normalize.ts` | 3106 | Core normalizer: `normalizeOcrResult()` detects doc type, calls `parseBmoEverydayStatement()` or `normalizeBankStatement()` or AI fallback. Contains BMO-specific parser, credit card detection, invoice/receipt parsing. | **Active, critical** | Refactor carefully |
| `netlify/functions/_shared/ocr_parsers.ts` | 365 | Day 8 legacy: `parseInvoiceLike()`, `parseReceiptLike()`, `parseBankStatementLike()` (stub), `normalizeParsed()`. Used by `ocr_normalize.ts` for invoice/receipt paths. | **Active for invoice/receipt** | Extend |
| `netlify/functions/_shared/ocr_providers.ts` | 271 | OCR provider wrappers: `ocrOCRSpace()`, `ocrVision()` (stub), `ocrLocal()` (stub), `bestEffortOCR()`, `runOcrWithProvider()`. | **Active** | Keep unchanged |
| `netlify/functions/_shared/ocr_memory.ts` | 217 | OCR memory/caching for duplicate detection based on text hashes. | **Active** | Keep unchanged |
| `netlify/functions/_shared/ai_fallback_parser.ts` | 365 | `aiFallbackParseTransactions()`: sends OCR text to OpenAI for structured extraction when primary parser fails or coverage is low. | **Active, critical fallback** | Keep unchanged |
| `netlify/functions/_shared/visionStatementParser.ts` | 416 | Two functions: `visionStatementParser()` (OpenAI GPT-4o image URL) and `visionStatementParserBase64()` (Claude Sonnet base64 PDF). Used for Vision-based extraction. | **Active** | Keep unchanged |
| `netlify/functions/_shared/vision/googleVisionClient.ts` | ~60+ | Google Cloud Vision API wrapper using `@google-cloud/vision` SDK. | **Active** | Keep unchanged |
| `netlify/functions/_lib/pdfText.ts` | 211 | PDF text extraction using pdfjs-dist. Used by smart-import-ocr.ts. | **Active** | Keep unchanged |
| `netlify/functions/_shared/bank_parsers.ts` | 98 | Simple CSV bank parser: `parseBank()`, `ensureUnique()`. Only handles `Date,Description,Amount` CSV format. | **Active for CSV path** | Keep unchanged |

#### Other Import-Adjacent Functions

| File | Lines | Purpose | Status | Treatment |
|------|-------|---------|--------|-----------|
| `netlify/functions/smart-import-parse-csv.ts` | 233 | CSV parsing path. | **Active** | Keep unchanged |
| `netlify/functions/byte-ocr-parse.ts` | 214 | Legacy OCR parse endpoint. | **INFERRED: may be dead code** | Verify callers before retiring |
| `netlify/functions/ocr.ts` | 23 | Minimal OCR stub/redirect. | **Likely dead code** | Verify callers |
| `netlify/functions/ocr-ingest-simple.ts` | 244 | Simple OCR ingest endpoint. | **INFERRED: alternate path** | Verify callers |
| `netlify/functions/ocr-job-status.ts` | 159 | Polls OCR job completion status for frontend. | **Active** | Keep unchanged |
| `netlify/functions/vision-ocr.ts` | 50 | Minimal Vision OCR wrapper. | **INFERRED: may be dead code** | Verify callers |
| `netlify/functions/process-spreadsheet.ts` | 367 | Spreadsheet/CSV processing. | **Active** | Keep unchanged |
| `netlify/functions/prime-router.ts` | 1127 | Prime orchestrator. Triggers import pipeline steps. | **Active, out of scope** | Keep unchanged |

#### Shared Support Files (Import-Adjacent)

| File | Purpose | Status |
|------|---------|--------|
| `netlify/functions/_shared/supabase.ts` | Admin Supabase client | Active |
| `netlify/functions/_shared/upload.ts` | Upload utilities | Active |
| `netlify/functions/_shared/storage.ts` | Storage utilities | Active |
| `netlify/functions/_shared/textHash.ts` | Text hash metrics for dedup | Active |
| `netlify/functions/_shared/categorize.ts` | `categorizeTransactionWithLearning()` | Active |
| `netlify/functions/_shared/primeByteAnnouncement.ts` | Byte -> Prime completion announcement | Active |
| `netlify/functions/_shared/verifyAuth.ts` | JWT auth verification | Active |
| `netlify/functions/_shared/merchantNormalize.ts` | Merchant name normalization | Active |
| `netlify/functions/_shared/merchantUtils.ts` | Merchant utilities | Active |
| `netlify/functions/_shared/money.ts` | `getFirstMoney()` — amount parsing | Active |
| `netlify/functions/_shared/recurringDetection.ts` | Recurring obligation detection | Active |
| `netlify/functions/_lib/renderStatementBreakdown.ts` | Statement breakdown rendering | Active |

### 2.2 Frontend Files

#### Smart Import Pipeline (Client-Side)

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/smartImport/runSmartImportPipeline.ts` | Client orchestrator: calls smart-import-init -> finalize -> sync -> normalize -> commit. Main entry for uploads. | **Active, critical** |
| `src/hooks/useSmartImport.ts` | React hook wrapping `runSmartImportPipeline`. | **Active** |
| `src/hooks/useSmartImportUploadState.ts` | Upload state management. | **Active** |
| `src/hooks/useByteImportCompletion.ts` | Detects when Byte finishes import. | **Active** |
| `src/hooks/useByteInlineUpload.ts` | Inline upload from chat. | **Active** |
| `src/hooks/useByteQueueStats.ts` | Upload queue statistics. | **Active** |
| `src/hooks/usePostImportHandoff.ts` | Post-import handoff to Prime. | **Active** |
| `src/hooks/useImportList.ts` | Import list fetching. | **Active** |
| `src/hooks/useUploadQueue.ts` | Upload queue management. | **Active** |
| `src/hooks/useDocumentStats.ts` | Document statistics. | **Active** |

#### Upload/Review UI Pages

| File | Purpose | Status |
|------|---------|--------|
| `src/pages/UploadV2/UploadPageV2.tsx` | Primary upload page (V2). | **Active** |
| `src/pages/dashboard/ReviewStatementPage.tsx` | Statement review UI with staged row editing. | **Active** |
| `src/pages/dashboard/SmartImportAI.tsx` | Smart Import AI page. | **Active** |
| `src/pages/dashboard/SmartImportAIPage.tsx` | Smart Import AI page variant. | **May be duplicate** |
| `src/pages/dashboard/SmartImportChatPage.tsx` | Chat-based import page. | **Active** |
| `src/pages/dashboard/BulkUploadPage.tsx` | Bulk upload page. | **Active** |
| `src/components/smart-import/SmartImportUploadStatusPanel.tsx` | Upload status display. | **Active** |
| `src/components/smart-import/ImportList.tsx` | Import list component. | **Active** |
| `src/components/upload/StatementHistory.tsx` | Statement upload history. | **Active** |

#### Legacy/Deprecated Upload Components

| File | Status |
|------|--------|
| `src/components/AIBankStatementUploader.jsx` | **INFERRED: legacy** |
| `src/components/DocumentUpload.jsx` | **INFERRED: legacy** |
| `src/components/EphemeralUploadComponent.jsx` | **INFERRED: legacy** |
| `src/components/SmartDocumentUpload.jsx` | **INFERRED: legacy** |
| `src/components/SmartUploadDemo.jsx` | **INFERRED: legacy** |

### 2.3 Configuration

| File | Lines | Purpose |
|------|-------|---------|
| `netlify.toml` | 48 | Build config, function timeouts (smart-import-sync: 180s, smart-import-ocr: 120s, normalize-transactions: 120s, auto-commit-import: 120s) |

### 2.4 Database Migrations (Import-Related)

| File | Purpose |
|------|---------|
| `sql/migrations/20251018_smart_import_schema.sql` | Original smart import schema |
| `sql/migrations/20260220_imports_approved_at.sql` | `approved_at` column on imports |
| `sql/migrations/20260225_ocr_schema_drift_columns.sql` | OCR-related schema columns |
| `sql/migrations/20260301_imports_statement_breakdown.sql` | `statement_breakdown_json` JSONB column |
| `sql/migrations/20260304_import_summaries_ocr_cols.sql` | OCR columns on import_summaries |
| `sql/migrations/20260304_process_statement_staging_cols.sql` | Staging table columns for process-statement |
| `sql/migrations/20260312_import_summaries_unique_import_id.sql` | Unique constraint on import_id |
| `sql/migrations/20260323_staging_data_json_cols.sql` | data_json columns for staging |
| `sql/migrations/20260325_user_documents_file_hash.sql` | File hash column on user_documents |

**VERIFIED** — all from `ls sql/migrations/`.

### 2.5 Test Files

| File | Purpose | Coverage |
|------|---------|----------|
| `netlify/functions/_shared/__tests__/ocr_normalize.test.ts` | Tests `toTransactions` and `categorize` from ocr_normalize | Receipt/invoice only; **no bank statement tests** |
| `netlify/functions/_shared/__tests__/ocr_parsers.test.ts` | Tests invoice/receipt parsers | No bank statement tests |
| `netlify/functions/_shared/__tests__/ocr_providers.test.ts` | Tests OCR provider wrappers | Provider-level only |
| `netlify/functions/_shared/__tests__/ocr_handler.test.ts` | OCR handler smoke tests | |
| `netlify/functions/_shared/__tests__/ocr_memory.test.ts` | OCR memory/caching tests | |
| `netlify/functions/_shared/__tests__/ocr_integration_tx.test.ts` | OCR integration tests | |
| `netlify/functions/_shared/__tests__/ocr_integration_memory.test.ts` | OCR memory integration | |
| `netlify/functions/_shared/__tests__/ocr_guardrails.test.ts` | OCR guardrail tests | |
| `tests/smart-import/commitImport.test.ts` | Commit-import flow tests | Mock-based, no real data |
| `src/lib/smartImport/runSmartImportPipeline.contract.test.ts` | Pipeline contract test | |
| `scripts/test-e2e-commit-import.ts` | E2E commit test script | |
| `scripts/ocr-strength-check.ts` | OCR strength checking | |
| `scripts/reprocess-bmo-statement.ts` | BMO reprocessing script | |
| `scripts/statement-qa-gate-smoke.ts` | QA gate smoke test | |
| `tests/ocr-optimization-policy.test.ts` | OCR optimization policy | |

---

## 3. End-to-End Execution Path Trace

### Stage 1: Upload

- **File:** `src/lib/smartImport/runSmartImportPipeline.ts`
- **Function:** `runSmartImportPipeline()`
- **Input:** `{ userId, file, base64, fileName, mimeType, ... }`
- **Action:** Calls `POST /.netlify/functions/smart-import-init`
- **Output:** `{ docId, importId }`
- **Storage:** `user_documents` row + file in Supabase storage `docs` bucket
- **On failure:** Returns error to UI. **Fails closed.** VERIFIED at `smart-import-init.ts:1-459`.

### Stage 2: Finalize/Route

- **File:** `netlify/functions/smart-import-finalize.ts`
- **Function:** Handler routes by file type
- **Input:** `{ docId, importId }`
- **Action:** PDF/image -> triggers `smart-import-ocr`; CSV -> triggers `smart-import-parse-csv`
- **Output:** Status update on imports row
- **On failure:** Sets import status to failed. **Fails closed.** VERIFIED at `smart-import-finalize.ts:1-204`.

### Stage 3: OCR Extraction

- **File:** `netlify/functions/smart-import-ocr.ts` (primary path) or `netlify/functions/process-statement.ts` (alternate path)
- **Function:** OCR orchestrator
- **Input:** Document from Supabase storage
- **Action (smart-import-ocr):** Downloads file, runs Google Vision (chunked for large PDFs), stores raw text in `user_documents.ocr_text`, triggers normalize-transactions
- **Action (process-statement):** Receives base64, runs pdf-parse then Claude Vision -> OpenAI cascade
- **Output:** Raw OCR text stored in `user_documents.ocr_text` (smart-import-ocr) or directly to `transactions_staging` (process-statement)
- **On failure:** Sets status to `ocr_failed`. **Fails closed** for smart-import-ocr path. VERIFIED at `smart-import-ocr.ts` (3835 lines). Process-statement writes `extraction_failed` to import_summaries on error. VERIFIED at `process-statement.ts:644-660`.

### Stage 4: Issuer Detection

- **File:** `netlify/functions/normalize-transactions.ts:78-105`
- **Function:** `detectIssuerFromRawText()`
- **Input:** Raw OCR text
- **Action:** Scans header (first 1200 chars) + footer (last 1200 chars) against `ISSUER_PATTERNS` array. Scores by frequency to avoid false matches from transaction body (e.g., "CAPITAL ONE-MC" bill payment).
- **Output:** Issuer name string or null
- **On failure:** Returns null (graceful). **Fails open** — import proceeds without issuer. VERIFIED at `normalize-transactions.ts:78-105`.

### Stage 5: Parsing/Normalization

- **File:** `netlify/functions/normalize-transactions.ts` (handler calls `normalizeOcrResult` from `_shared/ocr_normalize.ts`)
- **Function:** `normalizeOcrResult()` at `ocr_normalize.ts:60-368`
- **Input:** Raw OCR text string, userId, OpenAI client
- **Decision tree:**
  1. Income report (FreshBooks) -> `parseIncomeReportRows()` (ocr_normalize.ts:119-137)
  2. Invoice -> `extractInvoiceData()` (ocr_normalize.ts:149-177)
  3. Receipt -> `parseReceiptLike()` (ocr_parsers.ts:216-307)
  4. **BMO Everyday Banking** -> `parseBmoEverydayStatement()` (ocr_normalize.ts:190-248)
  5. General bank statement -> `normalizeBankStatement()` (ocr_normalize.ts:251-268)
  6. AI fallback -> `aiFallbackParseTransactions()` (ai_fallback_parser.ts) if primary parser returns 0 or low coverage
- **Output:** `NormalizedTransaction[]` written to `transactions_staging` table
- **On failure:** Returns empty array. AI fallback may still produce transactions. **Partially fails open** — empty staging rows mean nothing commits but no explicit block. VERIFIED at `ocr_normalize.ts:60-368` and `normalize-transactions.ts:1100-1190`.

### Stage 5b: Statement Totals Capture (BMO only)

- **File:** `netlify/functions/normalize-transactions.ts:1048-1085`
- **Function:** `parseBmoStatementTotals()` at `normalize-transactions.ts:207-448`
- **Input:** Raw OCR text
- **Action:** Extracts `totalDeducted` and `totalAdded` from BMO summary block. Multiple strategies: labeled-then-number, closing totals inline, separate labeled lines, walk-forward. All gated by `validateIdentity()` which checks `opening - deducted + added ≈ closing (±$0.05)`.
- **Output:** `{ totalDeducted, totalAdded, source }` written to `imports.statement_breakdown_json.statementTotals`
- **On failure:** Returns null (non-BMO or unparseable). **Fails closed** — no totals means reconciliation gate in commit-import will skip rather than block. VERIFIED at `normalize-transactions.ts:207-448, 1048-1085`.

### Stage 6: Review

- **File:** `src/pages/dashboard/ReviewStatementPage.tsx`
- **Action:** User reviews staged rows. Can edit category, flip sign, modify amount.
- **Storage:** Edits go to `transactions_staging.data_json` via `tx-update-amount` or similar endpoints.
- **On failure:** User can cancel. **Fails closed.** VERIFIED — commit requires explicit approval.

### Stage 7: Approval

- **File:** `netlify/functions/approve-import.ts:25-108`
- **Function:** Handler sets `approved_at` timestamp
- **Input:** `{ importId }` + JWT auth
- **Action:** Verifies import status is `parsed`, sets `approved_at`
- **Output:** Import record updated
- **On failure:** Returns error. **Fails closed.** VERIFIED at `approve-import.ts:25-108`.

### Stage 8: Commit

- **File:** `netlify/functions/commit-import.ts:923-end`
- **Function:** Main handler
- **Input:** `{ importId }` + x-user-id header
- **Gates (in order):**
  1. Import exists and belongs to user (line 1037-1105) — **VERIFIED**
  2. Import status is `parsed` (line 1108-1135) — **VERIFIED**
  3. Import is approved (`approved_at` non-null, line 1139-1154) — **VERIFIED**
  4. Staged rows exist (poll loop, line 1207-1248) — **VERIFIED**
  5. **Reconciliation gate** (`runReconciliationGate`, line 1406-1444) — see Section 4
- **Action:** Categorizes via Tag learning, inserts into `transactions`, builds StatementBreakdown, detects recurring obligations
- **On failure:** Various status codes (400, 403, 404, 409, 422, 500). **Fails closed** for auth/status checks. **See Section 4 for reconciliation gate behavior.** VERIFIED at `commit-import.ts:923-1700+`.

### Stage 9: Dashboard Display

- **Files:** `src/pages/dashboard/TransactionsPageV2.tsx`, `src/pages/PrimeChatV2/usePrimeBriefingData.ts`, `src/pages/DashboardV2/useDashboardData.ts`
- **Action:** Query `transactions` table filtered by user_id
- **Input:** Committed transactions
- **VERIFIED** — all reference `commit-import` or `approve-import` endpoints in Grep results.

### Stage 10: AI Assistant Access

- **File:** `netlify/functions/_shared/financial-snapshot.ts`, `netlify/functions/_shared/tx_pipeline.ts`
- **Action:** Prime reads committed transactions via tool calls
- **VERIFIED** — references in `src/pages/PrimeChatV2/PrimeChatV2.tsx` and backend tools.

---

## 4. Specific Claim Verification

### Claim A: `validateIdentity()` is called only from inside `parseBmoStatementTotals`

**VERIFIED TRUE**

`validateIdentity` is defined as a closure inside `parseBmoStatementTotals()` at `normalize-transactions.ts:238-261`. It is called at lines 303, 317, 382, 401, 413, 436 — all within `parseBmoStatementTotals()`. Grep confirms no other file references `validateIdentity`.

### Claim B: A `no_statement_totals` result produces `gated: false` or otherwise allows an unverified import to proceed

**VERIFIED TRUE**

At `commit-import.ts:774-776`:
```typescript
if (!stmtTotals || typeof stmtTotals !== 'object') {
    console.log('[CommitImport][Gate] No statementTotals present, skipping gate (non-BMO or extraction failed)', { importId });
    return { gated: false, reason: 'no_statement_totals' };
}
```

When `statementTotals` is absent (non-BMO statements, or BMO extraction failure), the gate returns `gated: false`, allowing the import to proceed without reconciliation. This is the **core safety gap**: any statement that doesn't produce `statementTotals` bypasses the only deterministic verification check.

### Claim C: There is a correctness or validation-gate issue near line 774 of `commit-import.ts`

**VERIFIED TRUE**

Lines 770-776 of `commit-import.ts` contain the gate bypass described in Claim B. The `sbd_read_failed` path (line 767) also returns `gated: false`, meaning a database read error silently skips verification rather than blocking. This is a correctness issue: database failures should fail closed.

Additionally, line 766-767:
```typescript
console.warn('[CommitImport][Gate] Could not read SBD, skipping gate', { importId, error: readErr.message });
return { gated: false, reason: 'sbd_read_failed' };
```

### Claim D: The current pipeline mainly processes flattened raw-text strings rather than words or tokens with bounding boxes and coordinates

**VERIFIED TRUE**

Evidence:
1. `smart-import-ocr.ts` stores OCR output as `user_documents.ocr_text` — a flat string. VERIFIED.
2. `normalize-transactions.ts` reads this flat text and passes it to `normalizeOcrResult()`. VERIFIED at line 1048: `parseBmoStatementTotals(guardedOcrInputText)` — a string.
3. `ocr_normalize.ts:60-77` — `normalizeOcrResult()` signature takes `text: string`.
4. `parseBmoEverydayStatement()` in `ocr_normalize.ts` works on line-split text with regex.
5. The `NormalizedTransaction` type at `ocr_normalize.ts:17-45` has optional `raw_line_text`, `printed_amount`, `delta_amount`, `running_balance`, `source_page` fields — these capture some positional data per-transaction but there is no word-level bounding box or coordinate data anywhere in the pipeline.
6. Google Vision API returns per-word bounding boxes, but `smart-import-ocr.ts` and `googleVisionClient.ts` extract only `fullText` from the response. VERIFIED at `googleVisionClient.ts:11-17` — `VisionTextResult` has only `fullText: string` and `pages` (page-level text, not word-level).

The pipeline discards all positional/geometric data from the OCR provider.

### Claim E: Non-BMO statements bypass some or all statement-total validation

**VERIFIED TRUE**

1. `parseBmoStatementTotals()` at `normalize-transactions.ts:273` is gated by `/bank of montreal|everyday banking/i.test(text)` for strategy 0b. Strategies 1-3 are more general but search for BMO-specific patterns like "Closing totals" (line 396), "total amounts deducted/added" (line 407-408).
2. Even if a non-BMO statement happens to have matching text, `parseBmoStatementTotals` returns null for most non-BMO formats.
3. In `commit-import.ts:774-776`, when `statementTotals` is null/absent, the reconciliation gate returns `gated: false` — no reconciliation for non-BMO statements.
4. `process-statement.ts` has a `statementSummary` field in its Claude Vision prompt that requests `totalDeducted`/`totalAdded`, but this goes to `import_summaries` and is NOT read by `runReconciliationGate()`, which only reads `imports.statement_breakdown_json.statementTotals`. VERIFIED at `commit-import.ts:770-772`.

### Claim F: AI-generated or OCR-derived transactions can currently be committed without independent deterministic verification

**VERIFIED TRUE**

1. For non-BMO statements: no reconciliation gate fires (Claim E). The AI fallback parser (`ai_fallback_parser.ts`) or Claude Vision (`process-statement.ts`) produces transactions that go directly to staging, then commit, with no deterministic cross-check against printed totals.
2. For BMO statements where `parseBmoStatementTotals()` succeeds: the gate does compare row sums to printed totals. But if `validateIdentity()` rejects all strategies (e.g., bookend balances unavailable), `parseBmoStatementTotals` returns null, and the gate is skipped.
3. The `process-statement.ts` alternate path (which uses Claude Vision -> OpenAI cascade) writes directly to `transactions_staging` without any statement-total verification. It records `integrity_verified: true` in `ai_activity_events` at line 606 regardless of actual verification.

### Claim G: Any February fabricated-data fix remains uncommitted, incomplete, or vulnerable to regression

**UNVERIFIED**

The term "February fabricated-data fix" does not match any commit message or code comment in the current git log or codebase. Recent parser fixes (commits `18face41`, `151d5bbf`, `282a9f5f`, `0bff2bd1`) address disputed rows, trailing transactions, and identity validation, but none reference "fabricated data" specifically. Without knowing which specific fix is referenced, this claim cannot be confirmed or refuted from the current repository state.

---

## 5. Existing Work That Must Be Protected

| System | Status | Evidence |
|--------|--------|----------|
| **Authentication** | Working. JWT-based via `verifyAuth.ts`, x-user-id header in commit-import. | VERIFIED at `approve-import.ts:34`, `commit-import.ts:958-984` |
| **User ownership / RLS** | Working. All staging/transaction queries filter by `user_id`. | VERIFIED at `commit-import.ts:1257, 1041-1042` |
| **File upload** | Working. `smart-import-init.ts` handles uploads to Supabase storage. | VERIFIED |
| **OCR provider integration** | Working. Google Vision via `googleVisionClient.ts`, OCR.Space via `ocr_providers.ts`, Claude Vision via `visionStatementParser.ts` and `process-statement.ts`. | VERIFIED |
| **Upload history** | Working. `src/components/upload/StatementHistory.tsx`, `src/hooks/useImportList.ts`. | VERIFIED |
| **Review and approval UI** | Working. `ReviewStatementPage.tsx` + `approve-import.ts`. Approval gate in commit-import enforced. | VERIFIED at `commit-import.ts:1139-1154` |
| **Transaction categorization** | Working. Tag learning via `categorize.ts`, called during commit. | VERIFIED at `commit-import.ts:1342-1357` |
| **Database tables** | Live with user data. Tables: `transactions`, `transactions_staging`, `imports`, `import_summaries`, `user_documents`, `ocr_jobs`. | VERIFIED |
| **Dashboard integration** | Working. `TransactionsPageV2.tsx`, `useDashboardData.ts`, `usePrimeBriefingData.ts`. | VERIFIED |
| **AI chat integration** | Working. Prime reads transactions via `financial-snapshot.ts`, `tx_pipeline.ts`. | VERIFIED |
| **BMO parser** | Working with recent fixes. `parseBmoEverydayStatement()` in `ocr_normalize.ts`, `parseBmoStatementTotals()` in `normalize-transactions.ts`. Commits `18face41` through `0bff2bd1` fix disputed rows, trailing transactions, identity validation. | VERIFIED |
| **Duplicate detection** | Working. Hash-based dedup in staging (`transactions_staging.hash`), unique constraint on `transactions` table. | VERIFIED at `process-statement.ts:98-103, 546`, `commit-import.ts:1480-1482` |
| **Existing safety gates** | Working: approval gate, status checks, idempotency guard, reconciliation gate (BMO only). | VERIFIED |
| **Error reporting** | Working. `safeLog()` throughout pipeline, console.error/warn at all critical points. | VERIFIED |
| **Netlify config** | Working. `netlify.toml` with function timeouts, esbuild CJS format, external modules. | VERIFIED |

---

## 6. Confirmed Defects vs. Architectural Limitations

### CONFIRMED DEFECTS

#### D1: Reconciliation gate fails open on missing statementTotals

- **Severity:** HIGH
- **User impact:** Non-BMO statements (and BMO statements where totals extraction fails) can commit AI-generated transactions without any deterministic verification against the bank's printed totals.
- **File/Line:** `commit-import.ts:774-776`
- **Immediate fix required:** Yes — add a warning flag or hold status for unreconciled imports
- **Phase:** Safety phase

#### D2: Database read error skips reconciliation gate

- **Severity:** MEDIUM
- **User impact:** If `imports.statement_breakdown_json` cannot be read (transient DB error), import proceeds unverified.
- **File/Line:** `commit-import.ts:766-767` — `return { gated: false, reason: 'sbd_read_failed' }`
- **Immediate fix required:** Yes — should return `gated: true` on DB read failure
- **Phase:** Safety phase

#### D3: `process-statement.ts` records `integrity_verified: true` unconditionally

- **Severity:** MEDIUM
- **User impact:** False positive integrity signal in activity events regardless of whether any verification occurred.
- **File/Line:** `process-statement.ts:606`
- **Immediate fix required:** No (cosmetic), but misleading
- **Phase:** Safety phase

#### D4: ISSUER_PATTERNS duplicated across files

- **Severity:** LOW
- **User impact:** Maintenance burden. Adding a new bank requires editing 2+ files.
- **File/Lines:** `normalize-transactions.ts:57-76`, `commit-import.ts:34-53`
- **Immediate fix required:** No
- **Phase:** Migration phase

#### D5: BMO detection in `ocr_normalize.ts` hardcodes `EDMONTON` location

- **Severity:** MEDIUM
- **User impact:** BMO customers outside Edmonton may not get the primary BMO parser (falls back to general parser or AI).
- **File/Line:** `ocr_normalize.ts:192-194` — `EDMONTON[\s,]*AB`
- **Immediate fix required:** No (fallback path works), but limits BMO coverage
- **Phase:** Migration phase — note: the broader BMO detection at line 223-225 does NOT require Edmonton, so this is only for the primary detection branch.

#### D6: OpenAI fallback in `process-statement.ts` mislabels source as `claude_vision`

- **Severity:** LOW
- **User impact:** Incorrect `source` field in import_summaries when OpenAI is actually used.
- **File/Line:** `process-statement.ts:447` — `source: 'claude_vision'` comment says "label as claude_vision per spec fallback bucket"
- **Immediate fix required:** No
- **Phase:** Migration phase

### ARCHITECTURAL LIMITATIONS

#### L1: No positional/geometric data preserved from OCR

- **Severity:** HIGH (for multi-bank support)
- **User impact:** Column alignment detection relies on regex heuristics over flat text. BMO's 3-column layout (Deducted/Added/Balance) is handled by specialized parsers, but other banks with different column layouts will fail.
- **File/Lines:** `googleVisionClient.ts:11-17` (discards bounding boxes), `ocr_normalize.ts:60-77` (takes flat string)
- **Immediate fix required:** No (current BMO path works)
- **Phase:** Migration phase

#### L2: Two parallel extraction paths with different quality

- **Severity:** MEDIUM
- **User impact:** `smart-import-ocr.ts` (Google Vision -> normalize-transactions) and `process-statement.ts` (pdf-parse -> Claude Vision -> OpenAI) are separate pipelines with different parsing, validation, and storage behavior. Quality varies depending on which path is used.
- **File/Lines:** `smart-import-ocr.ts`, `process-statement.ts`
- **Immediate fix required:** No
- **Phase:** Migration phase — consolidate into one path

#### L3: AI fallback parser has no deterministic verification

- **Severity:** HIGH (for correctness)
- **User impact:** When the primary regex parser fails, `aiFallbackParseTransactions()` sends OCR text to GPT-4o-mini which returns unverified transactions. These go to staging with no cross-check against statement totals.
- **File/Lines:** `ai_fallback_parser.ts:1-365`, `ocr_normalize.ts:330-362`
- **Immediate fix required:** No (approval gate provides user review)
- **Phase:** Migration phase

#### L4: `ocr_normalize.ts` is 3106 lines with deeply nested decision tree

- **Severity:** MEDIUM (maintainability)
- **User impact:** Adding support for a new bank requires understanding the full 3106-line file and its interactions with `normalize-transactions.ts` (1847 lines). Risk of regression is high.
- **File/Line:** `ocr_normalize.ts` entire file
- **Immediate fix required:** No
- **Phase:** Migration phase

#### L5: No canonical document artifact (structured intermediate representation)

- **Severity:** HIGH (for multi-bank support)
- **User impact:** There is no standardized intermediate format between OCR extraction and transaction normalization. Each parser (BMO, general, AI fallback, Vision) produces slightly different shapes. Adding a new bank requires a new parser branch.
- **File/Lines:** Multiple — `ocr_normalize.ts`, `ai_fallback_parser.ts`, `visionStatementParser.ts`, `process-statement.ts`
- **Immediate fix required:** No
- **Phase:** Migration phase

#### L6: Statement-total reconciliation only works for BMO chequing

- **Severity:** HIGH
- **User impact:** Credit card statements, other banks' chequing statements, and non-Canadian banks have no reconciliation gate.
- **File/Line:** `normalize-transactions.ts:207-448` — `parseBmoStatementTotals` is BMO-specific
- **Immediate fix required:** No (approval gate provides user review)
- **Phase:** Migration phase

---

## 7. Test Coverage Assessment

### What Exists

| Category | Files | Coverage |
|----------|-------|----------|
| OCR normalize unit tests | `__tests__/ocr_normalize.test.ts` | Receipt and invoice only. **No bank statement tests.** |
| OCR parsers unit tests | `__tests__/ocr_parsers.test.ts` | Invoice/receipt parsing only. `parseBankStatementLike` is a stub. |
| OCR providers tests | `__tests__/ocr_providers.test.ts` | Provider wrapper tests |
| Commit-import tests | `tests/smart-import/commitImport.test.ts` | Mock-based flow tests. Tests status validation, not transaction correctness. |
| Pipeline contract test | `src/lib/smartImport/runSmartImportPipeline.contract.test.ts` | Frontend pipeline contract |
| OCR guardrails | `__tests__/ocr_guardrails.test.ts` | PII/guardrail tests |
| E2E scripts | `scripts/test-e2e-commit-import.ts` | E2E commit test (script, not unit test) |
| Statement QA | `scripts/statement-qa-gate-smoke.ts` | QA gate smoke test |
| OCR strength | `scripts/ocr-strength-check.ts` | OCR quality checking |
| BMO reprocess | `scripts/reprocess-bmo-statement.ts` | BMO reprocessing utility |

### What Is Missing

| Category | Impact | Priority |
|----------|--------|----------|
| **BMO bank statement parser unit tests** | Cannot verify `parseBmoEverydayStatement()` correctness without PDF fixtures | HIGH |
| **Statement totals extraction tests** | `parseBmoStatementTotals()` has no unit tests despite 4 strategies + identity validation | HIGH |
| **Reconciliation gate tests** | `runReconciliationGate()` has no unit tests | HIGH |
| **PDF fixtures** | Only `test/data/05-versions-space.pdf` (generic) and `uploads/test-statement.pdf`. No real bank statement fixtures. | HIGH |
| **Golden expected transaction JSON** | No golden files to compare parser output against. | HIGH |
| **Debit vs credit sign tests** | No tests verify sign conventions across BMO/credit card/general parsers | HIGH |
| **Running-balance check tests** | No tests verify balance column is correctly excluded | MEDIUM |
| **Year rollover tests** | No tests for Dec->Jan date transitions | MEDIUM |
| **Credit card CR notation tests** | No tests for credit card payment/credit notation | MEDIUM |
| **Multi-line transaction tests** | No tests for wrapped descriptions | MEDIUM |
| **Multi-page statement tests** | No tests for page boundary handling | MEDIUM |
| **Non-BMO statement tests** | No tests for TD, RBC, CIBC, Scotiabank, etc. | HIGH |
| **Duplicate detection tests** | Hash-based dedup exists but has no targeted tests | MEDIUM |
| **Failed OCR handling tests** | No tests for corrupted PDFs, empty OCR text | MEDIUM |
| **Reconciliation failure path tests** | No tests for `parsed_unreconciled` status handling in UI | MEDIUM |

---

## 8. Migration Option Evaluation

### Option A — Stabilize Current System Only

| Dimension | Assessment |
|-----------|------------|
| **Existing work preserved** | All |
| **Existing work at risk** | None |
| **Required changes** | Fix D1 (gate fails open), D2 (DB error skips gate), add tests, add PDF fixtures |
| **Complexity** | Low |
| **Correctness risk** | Low — fixes only tighten existing gates |
| **Rollback difficulty** | Trivial — each fix is a small, independent commit |
| **Time-to-MVP impact** | Fast — fixes can ship incrementally |
| **Limitation** | Does not address L1-L6. Multi-bank support remains impossible. BMO chequing is the only bank with deterministic verification. |

### Option B — Incrementally Replace Extraction Pipeline

| Dimension | Assessment |
|-----------|------------|
| **Existing work preserved** | Upload, review, approval, commit, dashboard, AI chat, database schema, auth, categorization |
| **Existing work at risk** | `ocr_normalize.ts` internals (parsers refactored), `normalize-transactions.ts` totals capture (generalized). `process-statement.ts` may be retired. |
| **Required changes** | 1. Fix safety defects first (Option A). 2. Introduce canonical document artifact type. 3. Add positional extraction from Google Vision response. 4. Write bank-specific extractors as plugins. 5. Generalize reconciliation gate. |
| **Complexity** | Medium — requires careful interface design between new extractors and existing commit/review pipeline |
| **Correctness risk** | Medium — new extractors must be tested against fixtures before replacing existing parsers |
| **Rollback difficulty** | Easy — new extractors can be toggled with feature flags; existing parsers remain as fallback |
| **Time-to-MVP impact** | Moderate — safety fixes ship immediately, extraction improvements follow |
| **Limitation** | Requires discipline to not break existing BMO path while adding new banks |

### Option C — Build Separate V2 Engine, Switch Over Later

| Dimension | Assessment |
|-----------|------------|
| **Existing work preserved** | All (V1 runs in parallel) |
| **Existing work at risk** | None initially, but eventual migration carries risk |
| **Required changes** | New extraction engine, new staging format, new reconciliation, new commit path. Eventually migrate all UI and API consumers. |
| **Complexity** | High — two parallel systems to maintain |
| **Correctness risk** | High — V2 must achieve parity with V1 before switchover |
| **Rollback difficulty** | Easy before switchover, hard after |
| **Time-to-MVP impact** | Slow — no user-visible improvements until V2 is complete |
| **Limitation** | Doubles maintenance burden. Risk of V2 never completing. |

### Recommendation: **Option B**

Based on verified repository evidence:

1. The existing upload/review/approval/commit pipeline is sound and well-tested at the integration level.
2. The extraction/parsing layer (`ocr_normalize.ts`, `normalize-transactions.ts`) is the specific area that needs improvement for multi-bank support.
3. The safety defects (D1, D2) can be fixed immediately without touching the extraction layer.
4. The positional data gap (L1) and missing canonical artifact (L5) are the root causes of most architectural limitations.
5. Option B allows shipping safety fixes immediately while incrementally improving extraction.

---

## 9. Phase 1A: Detailed Investigation (2026-08-04)

### Task 1: Frontend Upload Components and Their Backend Paths

Every frontend component that initiates an upload, and which backend path it reaches:

#### Path A: Smart Import Pipeline (smart-import-init -> finalize -> ocr -> normalize)

| Component | Call Site | Mechanism |
|-----------|----------|-----------|
| `PrimeChatV2.tsx` (drag-drop / paperclip) | `src/pages/PrimeChatV2/PrimeChatV2.tsx:464` | Calls `runSmartImportPipeline()` directly. VERIFIED. |
| `ByteUploadPanel.tsx` (Byte chat upload) | `src/components/chat/ByteUploadPanel.tsx:136` | Calls `uploadFiles()` from `useSmartImport` hook, which calls `runSmartImportPipeline()`. Also directly calls `smart-import-finalize` at line 451. VERIFIED. |
| `UploadPageV2.tsx` | `src/pages/UploadV2/UploadPageV2.tsx:480,707` | Uses `useSmartImport` hook -> `runSmartImportPipeline()`. VERIFIED. |
| `ByteUnifiedCard.tsx` | `src/components/smart-import/ByteUnifiedCard.tsx:154` | Calls `onUploadFiles` prop, which is wired to `useSmartImport.uploadFiles()` -> `runSmartImportPipeline()`. VERIFIED. |
| `SmartImportUploadStatusPanel.tsx` | `src/components/smart-import/SmartImportUploadStatusPanel.tsx:242,260` | Calls `smart-import-finalize` directly. VERIFIED. |
| `UploadSpeedTest.tsx` (dev page) | `src/pages/dev/UploadSpeedTest.tsx:75` | Calls `smart-import-init` directly. VERIFIED. |
| `uploadWithProgress.ts` (library) | `src/lib/upload/uploadWithProgress.ts:31` | Calls `runSmartImportPipeline()`. VERIFIED. |
| `useByteInlineUpload.ts` | `src/hooks/useByteInlineUpload.ts:72` | Calls `uploadFiles()` from `useSmartImport`. VERIFIED. |

The canonical entry point is `runSmartImportPipeline()` at `src/lib/smartImport/runSmartImportPipeline.ts:780`, which calls `smart-import-init` (line 480) then `smart-import-finalize` (line 624). VERIFIED.

#### Path B: process-statement.ts (direct base64 POST)

| Component | Call Site | Mechanism |
|-----------|----------|-----------|
| `StatementUpload.tsx` | `src/ui/components/Upload/StatementUpload.tsx:34` | Calls `requestOcrProcessing()` which POSTs to `/.netlify/functions/process-statement`. VERIFIED. |
| `SmartImportAI.tsx` | `src/pages/dashboard/SmartImportAI.tsx:8` | Renders `StatementUpload` component. Upload goes through `requestOcrProcessing()` -> `process-statement`. VERIFIED. |
| `BatchProcessingOptimizer.ts` | `src/systems/BatchProcessingOptimizer.ts:423` | Calls `requestOcrProcessing()` -> `process-statement`. VERIFIED. |
| `documentHandler.ts` | `src/lib/documentHandler.ts:260` | Calls `requestOcrProcessing()` -> `process-statement`. VERIFIED. |
| `ocrService.ts` (client) | `src/client/services/ocrService.ts:40` | Calls `requestOcrProcessing()` -> `process-statement`. VERIFIED. |
| `OCRTester.tsx` (tester page) | `src/components/tools/OCRTester.tsx:69` | Uses `OCRService.processImage()` from `ocrService.ts`, which calls `requestOcrProcessing()`. VERIFIED. |

All Path B callers go through `requestOcrProcessing()` at `src/lib/ocr/requestOcrProcessing.ts:37-53`, which POSTs base64 to `/.netlify/functions/process-statement`. VERIFIED.

#### Summary

Two live frontend paths exist. The primary upload flow (PrimeChatV2, ByteUploadPanel, UploadPageV2) uses Path A. The SmartImportAI page and OCR tester page use Path B.

---

### Task 2: End-to-End Trace of Both Extraction Paths

#### Path A: Smart Import Pipeline

```
1. runSmartImportPipeline() -> POST smart-import-init
   - Creates user_documents row + imports row
   - Uploads file to Supabase storage (docs bucket)
   VERIFIED: runSmartImportPipeline.ts:480

2. POST smart-import-finalize
   - Routes PDF/image -> smart-import-ocr (async)
   - Routes CSV -> smart-import-parse-csv (async)
   VERIFIED: smart-import-finalize.ts:1-204

3. smart-import-ocr (async, 120s timeout)
   - Downloads file from Supabase storage
   - Runs Google Vision API (via googleVisionClient.ts)
   - Stores raw text in user_documents.ocr_text
   - Calls normalize-transactions internally
   VERIFIED: smart-import-ocr.ts (3835 lines)

4. normalize-transactions
   - Reads OCR text from user_documents
   - Calls normalizeOcrResult() from ocr_normalize.ts
   - Decision tree: BMO -> parseBmoEverydayStatement, else -> normalizeBankStatement + AI fallback
   - Also downloads PDF for Claude Vision fallback (line 1164-1178)
   - Captures BMO statement totals via parseBmoStatementTotals() -> writes to imports.statement_breakdown_json.statementTotals (line 1055-1085)
   - Writes to transactions_staging with data_json envelope (line 1359-1386)
   - Fields: import_id, user_id, data_json{date, posted_at, merchant, description, amount, type, currency, category, fx_note, confidence, confidence_flags, account_name, category_source, importRunId, documentId, raw_line_text, printed_amount, delta_amount, running_balance, source_page}, hash
   VERIFIED: normalize-transactions.ts:1329-1386

5. commit-import (user-triggered after approval)
   - Reads staged rows from transactions_staging
   - Runs runReconciliationGate() -> checks imports.statement_breakdown_json.statementTotals
   - Gate ONLY fires if statementTotals is present (BMO only)
   - Categorizes via Tag learning
   - Inserts into transactions table
   VERIFIED: commit-import.ts:1406-1454
```

**Reconciliation gate runs:** Only if `statementTotals` was captured by `parseBmoStatementTotals()` in step 4. VERIFIED.

#### Path B: process-statement.ts

```
1. POST process-statement with { base64, fileName, mimeType, userId, importId }
   VERIFIED: process-statement.ts:469-488

2. pdf-parse extracts raw text + computes confidence
   VERIFIED: process-statement.ts:125-136

3. ALWAYS calls Claude Vision -> OpenAI cascade (pdf-parse heuristic parser bypassed)
   - Claude Vision receives the full PDF as base64
   - Prompt requests BOTH transactions AND statementSummary in ONE JSON response
   - statementSummary contains { totalDeducted, totalAdded, openingBalance, closingBalance }
   - Falls back to OpenAI text parsing if Claude fails
   VERIFIED: process-statement.ts:506-507, 199-252

4. Writes to transactions_staging (flat fields, NO data_json envelope)
   - Fields: import_id, occurred_at, description, amount, currency, vendor_raw, category_suggested, source_line, hash, status, source
   - NO user_id field
   - NO data_json wrapper
   VERIFIED: process-statement.ts:529-541

5. Writes to import_summaries (NOT imports)
   - Stores institution, confidence_score, period, transaction_count, raw_ocr_text
   - statementSummary from Claude Vision goes to import_summaries, NOT imports.statement_breakdown_json
   VERIFIED: process-statement.ts:559-582

6. Writes to ai_activity_events with integrity_verified: true (hardcoded)
   VERIFIED: process-statement.ts:590-607
```

**Reconciliation gate runs:** NO. `process-statement.ts` writes `statementSummary` to `import_summaries`, but `runReconciliationGate()` in `commit-import.ts` reads from `imports.statement_breakdown_json.statementTotals` (line 770-772). These are different tables and different field names. The gate will always see `stmtTotals = null` for Path B imports and return `gated: false`. VERIFIED.

---

### Task 3: Staging Field Shape Comparison

#### Path A (normalize-transactions.ts) writes:

```typescript
// normalize-transactions.ts:1359-1386
{
  import_id: importRecord.id,        // from imports table
  user_id: userIdText,                // present
  data_json: {                        // JSONB envelope
    date, posted_at, merchant, description, amount,
    type, currency, category, fx_note, confidence,
    confidence_flags, account_name, category_source,
    importRunId, documentId, raw_line_text,
    printed_amount, delta_amount, running_balance, source_page
  },
  hash                                // SHA-256, composite key with import_id
}
```
VERIFIED at `normalize-transactions.ts:1359-1386`.

#### Path B (process-statement.ts) writes:

```typescript
// process-statement.ts:529-541
{
  import_id: importRunId,             // client-generated (import_TIMESTAMP_RANDOM)
  occurred_at: t.date,                // flat field
  description: t.merchant,            // flat field
  amount: t.amount,                   // flat field
  currency: 'CAD',                    // flat field
  vendor_raw: t.merchant,             // flat field
  category_suggested: t.category,     // flat field
  source_line: null,                  // flat field
  hash: hashTransaction(...),         // different hash algorithm (SHA-256 of importId|date|merchant|amount)
  status: 'pending_review',           // flat field
  source: extraction.source,          // flat field
  // NO user_id
  // NO data_json envelope
}
```
VERIFIED at `process-statement.ts:529-541`.

#### Critical Differences

| Field | Path A | Path B | Impact |
|-------|--------|--------|--------|
| `user_id` | Present | **MISSING** | `commit-import.ts:1257` filters staging by `user_id`. Path B rows may not be found. VERIFIED. |
| `data_json` | JSONB envelope with 20+ fields | **NOT USED** — flat columns | `commit-import.ts:1307` reads `row.data_json`. Path B rows have `data_json = null`, so `tx` will be `{}` and all fields will be undefined. VERIFIED. |
| `hash` | `SHA-256(date-amount-merchant)` with occurrence counter | `SHA-256(importId\|date\|merchant\|amount)` | Different hash inputs, but both serve dedup. No functional conflict. VERIFIED. |
| `import_id` | From `imports` table UUID | Client-generated `import_TIMESTAMP_RANDOM` | Path B's import_id may not exist in the `imports` table, so `commit-import.ts:1037-1042` will return 404. INFERRED. |
| `confidence`, `printed_amount`, `raw_line_text`, etc. | Present in `data_json` | **Not captured** | Tag categorization in commit-import reads these from `data_json`. VERIFIED. |

**Conclusion:** Path B staging rows are structurally incompatible with `commit-import.ts`. They lack `user_id` (security filter fails), lack `data_json` (all field reads return undefined), and use a client-generated `import_id` that has no corresponding `imports` table row. Path B rows can only be committed through a **separate commit path** or by manual SQL — they cannot flow through the standard `commit-import.ts` handler. VERIFIED.

However, `SmartImportAI.tsx` (line 131-134) calls `approve-import` then `commit-import` after getting an import_id from `process-statement`. This means the SmartImportAI page's commit flow likely fails silently or produces empty transactions when using Path B. INFERRED — would need runtime testing to confirm.

---

### Task 4: Why Two Paths Exist

Git history shows the timeline:

| Commit | Date | File | Event |
|--------|------|------|-------|
| `cf6991b5` | Early (initial) | `smart-import-init.ts` | Smart Import pipeline created as part of initial guardrails + pipeline feature. VERIFIED. |
| `54682fb3` | Before process-statement | — | Settings/data cleanup tools. |
| `9e347e32` | 2026-03-20 | — | "March 20: hasAnalytics fixed, Claude Haiku advisor summary" |
| `28f143a1` | After | `process-statement.ts` | "fix: global Unicode sweep across all source files" — file already existed. |
| `b106eb7c` | Later | `process-statement.ts` | "fix: credit card AI bypass for RBC/credit card parsing" |

`smart-import-init.ts` was created first as part of the comprehensive Smart Import pipeline (commit `cf6991b5`). `process-statement.ts` was added later as a **standalone endpoint** — likely built to provide a simpler, direct-to-staging path that bypasses the multi-step smart-import pipeline. The `requestOcrProcessing.ts` wrapper (line 1-4: "Canonical OCR Processing Entrypoint") labels it as the "canonical" OCR path, suggesting it was intended to replace or supplement the earlier pipeline for statement-specific use cases. VERIFIED from git log + code comments.

The two paths diverged because:
1. `process-statement.ts` does its own Claude Vision -> OpenAI extraction in one step (no Google Vision, no smart-import-ocr intermediary)
2. It writes flat staging rows without the `data_json` envelope that `commit-import.ts` expects
3. It was not refactored to match when `commit-import.ts` switched to reading `data_json`

---

### Task 5: OCR Tester Page

**File:** `src/pages/OCRTesterPage.tsx` (line 1-11) renders `src/components/tools/OCRTester.tsx`.
**Route:** INFERRED — would be `/ocr-tester` or similar based on App.tsx routing.

**Extraction path used:** Path B (`process-statement.ts`).

Evidence:
- `OCRTester.tsx:3` imports `OCRService` from `@/client/services/ocrService`
- `OCRTester.tsx:69` calls `OCRService.processImage(mockFile)`
- `src/client/services/ocrService.ts:40` calls `requestOcrProcessing({ file, userId })`
- `requestOcrProcessing.ts:53` POSTs to `/.netlify/functions/process-statement`
VERIFIED.

Additionally, `OCRTester.tsx:4` imports `parseReceiptText` from `@/utils/ocrService`, which is a **deprecated** client-side parser (line 8-11 of that file: "DEPRECATED: Frontend OCR bypasses guardrails. Use backend smart-import-ocr pipeline."). The tester page uses this for text-mode processing (line 38) while using `process-statement` for image-mode (line 69). VERIFIED.

---

### Task 6: Claude Vision Call Structure in process-statement.ts

**Transactions and statementSummary are returned in the SAME single API call.** VERIFIED.

Evidence:
- `process-statement.ts:199-252`: The `CLAUDE_EXTRACTION_PROMPT` requests both `"transactions": [...]` and `"statementSummary": { totalDeducted, totalAdded, openingBalance, closingBalance }` in one JSON schema.
- `process-statement.ts:254-332`: `extractWithClaudeVision()` makes ONE `fetch()` call to `https://api.anthropic.com/v1/messages`, parses the response, and returns both `transactions` and `statementSummary` from the same parsed JSON object.
- Lines 325-330: `statementSummary` is extracted from `parsed.statementSummary` — the same `parsed` object that `transactions` comes from (line 306).

**Implication for independent verification:** Because both come from the same LLM response, the `statementSummary` totals are NOT independently derived from the document — they are the LLM's best guess at both the transactions and the totals. If the LLM misreads a column, both the transactions AND the totals will be wrong in the same direction, making the "verification" circular. This means `statementSummary` from `process-statement.ts` **cannot serve as independent verification** without a separate deterministic extraction step. VERIFIED.

---

### Task 7: Hardcoded EDMONTON Check

**Exact location:** `netlify/functions/_shared/ocr_normalize.ts:194`

```typescript
/EDMONTON[\s,]*AB/i.test(normalizedText)
```

**Code paths that depend on it:**

1. **Primary BMO detection (lines 192-218):** The `if` block at line 192-194 requires BOTH `Your\s*Everyday\s*Banking\s*statement` AND `EDMONTON[\s,]*AB` to trigger `parseBmoEverydayStatement()`. If EDMONTON is not in the text, this block is skipped entirely. VERIFIED.

2. **Fallback BMO detection (lines 223-248):** A second `if` block at lines 223-225 checks for `Everyday\s*Banking` OR `For\s*the\s*period\s*ending` — this does NOT require EDMONTON. If the primary block at 192 fails due to missing EDMONTON, this fallback still runs `parseBmoEverydayStatement()` and returns transactions if found. VERIFIED.

**Impact assessment:** The EDMONTON check gates ONLY the first detection branch. The fallback at line 223 covers BMO statements without EDMONTON. However, the primary branch is tried first and would be the faster path (no second condition evaluation). For non-Edmonton BMO customers, the fallback at 223 will catch them. The EDMONTON check is therefore a **performance optimization that accidentally became a correctness gate** for the primary branch, but the fallback branch prevents it from being a total blocker. VERIFIED.

**Other EDMONTON references (non-blocking):**
- `apply-category-rules.ts:145` — merchant category rule `SS EDMONTON` -> Groceries. Unrelated. VERIFIED.
- `process-statement.ts:239` — prompt instruction to strip city suffixes. Unrelated. VERIFIED.
- `ai_fallback_parser.ts:62` — prompt instruction to strip city suffixes. Unrelated. VERIFIED.
- `pii-patterns.ts:213` — PII allowlist for city names. Unrelated. VERIFIED.

---

### Task 8: Consumers of ai_activity_events.integrity_verified

| Consumer | File:Line | What it does | Impact |
|----------|-----------|-------------|--------|
| **Crystal Analytics** | `crystalAnalytics.ts:7` | Gates Crystal analytics: only runs when `integrity_verified=true`. Calls `isCustodianVerified()`. | HIGH — false `integrity_verified: true` from `process-statement.ts:606` will let Crystal run on unverified imports. VERIFIED. |
| **`isCustodianVerified()`** | `crystalQueries.ts:169-192` | Reads `ai_activity_events.details.integrity_verified` (or `details.integrity.verified`) for a specific `import_run_id`. Returns boolean. | Called by Crystal only. VERIFIED. |
| **Byte->Prime announcement** | `primeByteAnnouncement.ts:91` | Reads `integrity_verified` from event details to include in Prime's announcement message. | LOW — cosmetic, affects announcement text only. VERIFIED. |
| **ByteActivityItem (frontend)** | `src/components/prime/ByteActivityItem.tsx:32` | Reads `metadata.integrity_verified` to display a verification badge in the activity feed. | LOW — cosmetic UI badge. VERIFIED. |
| **smart-import-sync.ts** | `smart-import-sync.ts:1809` | Writes `integrity_verified: false` (correct default). | Write-only, not a consumer. VERIFIED. |
| **`custodianIntegrityCheck.ts`** | `custodianIntegrityCheck.ts:160` | Writes `integrity_verified: integrityResult.verified` (uses actual check result). | Write-only, not a consumer. VERIFIED. |

**Summary:** Crystal Analytics is the only system that makes a **gating decision** based on `integrity_verified`. The hardcoded `true` in `process-statement.ts:606` allows Crystal to run on Path B imports that were never actually verified. Prime announcement and the activity feed badge are cosmetic. VERIFIED.

---

### Task 9: Function Timeouts and auto-commit-import

**netlify.toml timeout settings:** VERIFIED at `netlify.toml:26-48`.

| Function | Timeout (seconds) |
|----------|-------------------|
| `apply-category-rules` | 30 |
| `prime-router` | 60 |
| `smart-import-sync` | 180 |
| `chat` | 60 |
| `process-spreadsheet` | 60 |
| `smart-import-ocr` | 120 |
| `normalize-transactions` | 120 |
| `auto-commit-import` | 120 |

**auto-commit-import status:** The file `netlify/functions/auto-commit-import.ts` does **not exist** on the current branch. Git history shows it was created in commit `a190569d` ("feat: split OCR from normalize/commit — new auto-commit-import function") and modified in `086c91f9`, then removed in `735e6aed` ("fix: revert to Haiku with improved BMO column parsing prompt"). VERIFIED.

No current code references `auto-commit-import` except `netlify.toml:47`. It is a **stale config entry**. Netlify silently ignores timeout settings for nonexistent functions, so this has no runtime impact. VERIFIED.

---

### Task 10: Feature Flag Mechanism

#### Frontend Flags (env-var based, `VITE_` prefix, requires rebuild)

**File:** `src/lib/featureFlags.ts` (59 lines). VERIFIED.

| Flag | Env Var | Purpose |
|------|---------|---------|
| `isPostImportTriggersDisabled()` | `VITE_DISABLE_POST_IMPORT_TRIGGERS` | Disables post-import Prime/Crystal triggers |
| `isNavRevampV1Enabled()` | `VITE_NAV_REVAMP_V1` | Sidebar navigation revamp |
| `isLegacyNavVisible()` | `VITE_SHOW_LEGACY_NAV` | Show legacy nav alongside revamp |
| `isRailRevampV1Enabled()` | `VITE_RAIL_REVAMP_V1` | Desktop rail quick-action revamp |
| `isPrimeUploadNarrationEnabled()` | `VITE_PRIME_UPLOAD_NARRATION` or `VITE_PRIME_NARRATION_FLOW` | Upload narration in Prime chat |
| `isSmartImportOpsDashboardV1Enabled()` | `VITE_SMART_IMPORT_OPS_DASHBOARD_V1` | Smart Import operational dashboard |

All use `flagEnabled()` helper (truthy: `'1'`, `'true'`, `'yes'`, `'on'`). VERIFIED.

**Flipping requires:** Redeploy (Vite embeds env vars at build time). VERIFIED.

#### Backend Flags (env-var based, process.env, requires redeploy)

| Flag | Env Var | File:Line | Purpose |
|------|---------|-----------|---------|
| AI credit card bypass | `OCR_PREFER_AI_CREDIT_CARDS=1` | `normalize-transactions.ts:1186` | Use AI parser for credit card statements |
| AI statement preference | `OCR_PREFER_AI_STATEMENTS=1` | `smart-import-sync.ts:47` | Prefer AI parser for all statements |
| LLM Prime summaries | `PRIME_SUMMARY_ALLOW_LLM=1` | `prime-summary.ts:1515,1713` | Enable LLM-generated advisor summaries |
| Disable recurring detection | `DISABLE_RECURRING=1` | `commit-import.ts:1559` | Skip recurring obligation detection |
| OCR debug logging | `OCR_DEBUG=1` | `smart-import-sync.ts:40` | Extra OCR debug output |
| Normalize soft timeout | `NORMALIZE_DEV_SOFT_TIMEOUT_MS` | `normalize-transactions.ts:55` | Dev soft timeout |

**Flipping requires:** Redeploy (Netlify reads env vars at function cold start). Can be set in Netlify dashboard (no code change needed), but still requires a function restart. VERIFIED.

#### No database-backed or per-user flag system exists. VERIFIED — grep for `feature_flag` in the codebase returns no database table or per-user lookup.

---

### Task 11: Recommended Primary Extraction Path

**Recommendation: Path A (Smart Import Pipeline) is the primary path.**

Rationale based on verified evidence:

1. **Path A writes `data_json` envelope** that `commit-import.ts` expects (line 1307). Path B writes flat columns that produce empty `tx = {}` in commit-import. VERIFIED.
2. **Path A includes `user_id`** in staging rows. Path B does not, breaking the security filter at `commit-import.ts:1257`. VERIFIED.
3. **Path A captures statement totals** via `parseBmoStatementTotals()` and writes them to `imports.statement_breakdown_json.statementTotals`, which is the only location `runReconciliationGate()` reads. Path B writes totals to `import_summaries` (wrong table). VERIFIED.
4. **Path A creates proper `imports` table rows** with status tracking, approval workflow, and document linkage. Path B uses client-generated import IDs with no corresponding `imports` row. VERIFIED.
5. **Path A is used by the primary upload surfaces** (PrimeChatV2, ByteUploadPanel, UploadPageV2). Path B is used by SmartImportAI and the OCR tester. VERIFIED.

**Do NOT remove or disable Path B.** It serves the SmartImportAI page and the OCR tester, and its Claude Vision extraction prompt (`process-statement.ts:199-252`) is the most comprehensive multi-bank prompt in the codebase. Path B's prompt and extraction logic should eventually be **absorbed into Path A** as a Vision-based extraction strategy.

---

### Task 12: Phase 1B Change Designs (Do Not Implement)

#### Change 1: Reconciliation Gate Fix (commit-import.ts:766-776)

**Files:** `netlify/functions/commit-import.ts`
**Lines:** 766-776

**Current behavior:**
- Line 766-767: DB read error -> `gated: false` (import proceeds unverified)
- Line 774-776: No statementTotals -> `gated: false` (import proceeds unverified)

**Proposed change:**
```
Line 766-767: Change to gated: true, reason: 'sbd_read_failed'
Line 774-776: Change to gated: true, reason: 'no_statement_totals'
```

Both cases should set import status to `parsed_unreconciled` (same as line 1416) and return HTTP 422 with `reconciliation` details explaining why.

**Risk level:** MEDIUM. This will cause ALL non-BMO imports and ALL imports where `parseBmoStatementTotals` returned null to be held for review instead of auto-committing. Users who were previously committing without review will now see the ReviewStatementPage. The SmartImportAI page's commit flow will also be affected.

**Mitigation:** Add an env-var override: `RECONCILIATION_GATE_LENIENT=1` that preserves current behavior. Default OFF (strict). This allows rollback without code change.

**Tests required:**
1. Unit test: `runReconciliationGate()` with `stmtTotals = null` returns `gated: true`
2. Unit test: `runReconciliationGate()` with DB read error returns `gated: true`
3. Unit test: `runReconciliationGate()` with valid totals and matching rows returns `gated: false`
4. Unit test: `runReconciliationGate()` with `RECONCILIATION_GATE_LENIENT=1` and no totals returns `gated: false`
5. Integration test: full commit flow with non-BMO import -> verify `parsed_unreconciled` status

**Definition of done:** All non-BMO imports land in `parsed_unreconciled` status and are visible on ReviewStatementPage. Existing BMO reconciliation behavior unchanged. `RECONCILIATION_GATE_LENIENT=1` restores old behavior.

**Rollback plan:** Set `RECONCILIATION_GATE_LENIENT=1` in Netlify env vars (no code change, no redeploy of functions needed — just restart). Or revert the commit.

---

#### Change 2: EDMONTON Check Fix (ocr_normalize.ts:192-194)

**File:** `netlify/functions/_shared/ocr_normalize.ts`
**Lines:** 192-194

**Current behavior:**
```typescript
if (
  /Your\s*Everyday\s*Banking\s*statement/i.test(normalizedText) &&
  /EDMONTON[\s,]*AB/i.test(normalizedText)  // <-- THIS LINE
)
```

**Proposed change:** Remove the EDMONTON check from line 194. The condition becomes:
```typescript
if (
  /Your\s*Everyday\s*Banking\s*statement/i.test(normalizedText)
)
```

The fallback at line 223-225 already handles BMO detection without EDMONTON, so this change makes the primary branch match. Both branches call `parseBmoEverydayStatement()` with the same input.

**Risk level:** LOW. The fallback branch at line 223 already catches non-Edmonton BMO statements and calls the exact same parser. Removing the EDMONTON gate from the primary branch just means non-Edmonton statements take the faster primary path instead of falling through to the fallback. No behavioral change for Edmonton statements.

**Tests required:**
1. Unit test: BMO statement text with "Your Everyday Banking statement" but WITHOUT "EDMONTON AB" -> verify `parseBmoEverydayStatement()` is called
2. Unit test: BMO statement text WITH "EDMONTON AB" -> verify same parser called (regression)
3. Unit test: Non-BMO statement text -> verify BMO parser NOT called (regression)

**Definition of done:** BMO statements from any Canadian city hit the primary parser. Non-BMO statements still skip it.

**Rollback plan:** Revert the commit. No env-var needed — the change is safe and low-risk.

---

#### Change 3: integrity_verified Fix (process-statement.ts:606)

**File:** `netlify/functions/process-statement.ts`
**Line:** 606

**Current behavior:**
```typescript
integrity_verified: true,  // hardcoded, no actual verification
```

**Proposed change:**
```typescript
integrity_verified: false,
```

**Risk level:** LOW. Crystal Analytics (`crystalAnalytics.ts:7`) gates on this field. Setting it to `false` will prevent Crystal from running on Path B imports until a separate Custodian integrity check writes `integrity_verified: true`. This is the **correct** behavior — Crystal should not run on unverified data.

**Impact:** Crystal analytics will stop generating insights for imports that come through `process-statement.ts`. Since these imports also cannot be committed through `commit-import.ts` (Task 3 findings), this is a non-issue — the data was never reaching the dashboard anyway.

**Tests required:**
1. Unit test: verify `process-statement.ts` writes `integrity_verified: false` to `ai_activity_events`
2. Integration test: verify Crystal does NOT run for Path B imports (call `isCustodianVerified()` with a Path B import_run_id, expect `false`)

**Definition of done:** `integrity_verified` in `ai_activity_events` is `false` for all Path B imports. Crystal gate correctly blocks.

**Rollback plan:** Revert the commit. Or change the value back to `true` (one-line change).

---

#### Change 4: ReviewStatementPage Held-State UI

**File:** `src/pages/dashboard/ReviewStatementPage.tsx`
**Current state:** The page already handles `parsed_unreconciled` imports. It shows:
- Split-pane: PDF viewer (left) + staging rows (right) — line 55-80
- Bank-printed totals vs row sums comparison — line 69
- Amount edit capability with re-reconciliation — line 75-77
- Custodian explanation prompt — line 40-51
- Commit button that unlocks when gate passes — line 7
VERIFIED at `ReviewStatementPage.tsx:1-80`.

The page also already has references in:
- `StatementHistory.tsx:114,128` — shows "Needs review" badge for `parsed_unreconciled` status
- `UploadPageV2.tsx:480,707` — detects held state and provides navigation to review page
- `StatementProcessingOverlay.tsx:94` — detects held state
VERIFIED.

**Proposed change:** After Change 1 (gate fix) sends ALL non-BMO imports to `parsed_unreconciled`, the ReviewStatementPage needs to handle the case where `bankTotals` is null (no printed totals available). Currently it assumes bank totals exist.

Specific additions needed:
1. **Line ~69 area:** When `bankTotals` is null, show a message: "Statement totals could not be extracted. Review transactions against your PDF before importing." instead of the reconciliation delta display.
2. **Commit button:** Should remain enabled when `bankTotals` is null (user-approved bypass), since there's nothing to reconcile against. The user's review IS the verification.
3. **Custodian explanation:** When `bankTotals` is null, skip the Custodian AI call (no gap to explain). Show a static message instead.

**Risk level:** LOW. The ReviewStatementPage is already built for the held-state use case. These are UI-only changes that add a null-totals code path.

**Tests required:**
1. Manual test: upload a non-BMO PDF -> verify it lands on ReviewStatementPage with "totals not available" message
2. Manual test: verify commit button is enabled and commits successfully
3. Manual test: verify an actual BMO statement still shows reconciliation delta

**Definition of done:** Non-BMO held imports show a clear explanation. User can review and commit. BMO held imports show the existing reconciliation delta.

**Rollback plan:** Revert the commit. Or set `RECONCILIATION_GATE_LENIENT=1` (Change 1 rollback) so non-BMO imports never reach this page.

---

### Phase 1A UNVERIFIED Additions

Items from this investigation that could not be fully confirmed:

8. **SmartImportAI commit flow with Path B:** The SmartImportAI page (`src/pages/dashboard/SmartImportAI.tsx:131`) calls `approve-import` then `commit-import` after getting an importId from `process-statement`. Whether this actually succeeds at runtime (given the staging field incompatibility in Task 3) could not be verified without running the application. INFERRED: likely fails silently or produces empty transactions.
9. **OCRTesterPage route:** The route for `OCRTesterPage.tsx` was not found in `App.tsx` routing. It may be behind a dev-only route or no longer mounted. INFERRED.
10. **auto-commit-import runtime impact:** While the file is deleted and the netlify.toml entry is stale, whether Netlify logs warnings about the missing function on each deploy could not be confirmed. INFERRED: no impact.

---

## UNVERIFIED Section

Items that could not be confirmed from the current repository:

1. **Claim G ("February fabricated-data fix"):** No commit, comment, or code reference matches this term. Cannot verify its status.
2. **`auto-commit-import` function:** Referenced in `netlify.toml` (line 47: timeout = 120) but the file `netlify/functions/auto-commit-import.ts` does not exist. This may be a stale config entry or the function may have been renamed/removed. INFERRED: stale config.
3. **Supabase Edge Functions:** No `supabase/functions/` directory found. INFERRED: not used.
4. **`ByteCopilotPanel.tsx` status:** Referenced in MEMORY.md as dead code but not independently verified in this audit.
5. **`functions_old/` directory:** Contains duplicate test files (e.g., `functions_old/_shared/__tests__/ocr_normalize.test.ts`). INFERRED: legacy backup, not active.
6. **Actual OCR provider in production:** CLAUDE.md says "Primary OCR: Google Vision via /netlify/functions/" but `ocr_providers.ts` shows Google Vision is a stub (`throw new Error`). The actual Google Vision integration is in `_shared/vision/googleVisionClient.ts` via the `@google-cloud/vision` SDK, used by `smart-import-ocr.ts`. The `ocr_providers.ts` wrappers appear to be legacy stubs. INFERRED but not fully verified.
7. **Whether `process-statement.ts` is called from any frontend path:** Grep found references in several frontend files, but the primary path appears to be `smart-import-init -> finalize -> ocr -> normalize`. `process-statement.ts` may be an alternate entry point used by specific upload components. INFERRED.

---

*End of audit. This document should be treated as a snapshot of the repository at commit `18face41` on branch `sidebar-safe-refactor`.*
