# Vision Pipeline — Architecture A'

**Living engineering record for the XspensesAI Claude Vision / OCR extraction pipeline.**

Last updated: 2026-08-17
Branch: `sidebar-safe-refactor`

---

## Governing Principle

> Fail-open on extraction completion. Fail-closed on financial correctness.

- A Claude Vision technical failure (timeout, API error, malformed response) must NOT strand an upload. The existing flat-text/bank parser fallback path must remain available.
- A financial mismatch (extracted transaction sums vs. printed statement totals) must NOT be hidden by forcing a passing answer. The reconciliation gate remains authoritative.
- No extractor — Vision, flat-text, or future — may bypass the reconciliation gate to reach the ledger.

---

## 1. Accepted Architecture — A'

**Status: ACCEPTED DESIGN (2026-08-17). Implementation in progress.**

### Target Flow

```
PDF upload
  -> smart-import-ocr-background (renamed, 15-min Netlify background timeout)
     -> Google OCR + Claude Vision in parallel (Promise.all)
     -> Persist results:
        - Google OCR text -> user_documents.ocr_text (existing path)
        - Claude Vision structured JSON -> user_documents.extracted_data.claude_vision (new sibling key)
     -> Vision either succeeds or definitively fails (bounded timeout)
     -> user_documents.ocr_status set to 'ready' (existing completion signal)
  -> Browser polls ocr-job-status.ts (existing flow, unchanged)
  -> normalize-transactions.ts:
     -> Check extracted_data.claude_vision FIRST
     -> If valid Vision extraction with transactions: use it
     -> If Vision absent/failed: fall back to existing flat-text/bank parser
     -> Build statementTotals (Vision wins; flat-text stored in flatTextTotals diagnostic key)
  -> Reconciliation gate (commit-import.ts)
  -> Ledger only when correctness requirements pass
```

### Parallel Execution (ACCEPTED DESIGN)

Google OCR and Claude Vision do not depend on each other's output. They run in parallel.

A failure of one must not automatically discard a successful result from the other.

The completion logic must distinguish four outcomes:

| Google OCR | Claude Vision | Behavior |
|-----------|--------------|----------|
| Success | Success | Both persisted. Vision is primary for normalize. |
| Success | Failure | OCR text persisted. Flat-text parser fallback. |
| Failure | Success | Vision result persisted. Vision is primary. |
| Failure | Failure | Upload not stranded. Error surfaced to user. |

Vision failure must be bounded (timeout) and must not leave the browser polling indefinitely.

### Feature Flag

Vision-primary behavior launches behind a feature flag.

**Safe default: OFF.**

Flag OFF preserves existing production behavior exactly.

The existing codebase convention for OCR feature flags is `OCR_PREFER_AI_*`:
- `OCR_PREFER_AI_CREDIT_CARDS` (normalize-transactions.ts:1227)
- `OCR_PREFER_AI_STATEMENTS` (smart-import-sync.ts:47, ocr_normalize.ts:263)

The exact feature-flag name has not yet been selected. Record the actual name here when the implementation commit ships. Safe default must be OFF.

---

## 2. Why Vision Is Needed

### Root Cause

Geometry is discarded by the current flat OCR representation. Google Vision returns text in reading order, but column structure (Withdrawals | Deposits | Balance) is lost. Downstream parsers must infer columns from token order. This produces systematic errors on multi-column bank statements.

### Measured Flat-Text Failures

#### RBC Advantage Banking Fixture

Ground truth (9 transactions):

| Metric | Truth |
|--------|-------|
| Transactions | 9 |
| Withdrawals | $709.11 |
| Deposits | $707.00 |

Flat-text parser result:

| Metric | Extracted | Error |
|--------|-----------|-------|
| Withdrawals | $1,212.59 | +$503.48 fabricated |

Observed problems:
- Running-balance values interpreted as withdrawals
- Amount shifted to wrong date
- Transactions dropped

#### BMO Everyday Banking Fixture

Six pages, 148 transactions.

Ground truth:

| Metric | Truth |
|--------|-------|
| Opening balance | $2,264.43 |
| Total deducted | $14,966.05 |
| Total added | $13,526.02 |
| Closing balance | $824.40 |

Identity: opening - deducted + added = closing. Closes exactly.

Flat-text parser result:

| Metric | Extracted | Error |
|--------|-----------|-------|
| Rows | 145 | -3 missing |
| Debits | $16,218.88 | +$1,252.83 excess |

Observed problems:
- Opening balance ingested as a transaction
- Row-boundary bleed between pages
- Missing transactions

---

## 3. Claude Vision Proof

**Status: PROVEN on RBC and BMO fixtures.**

Claude Vision (claude-sonnet-4-6) was tested independently against the same fixtures using the prompt from `process-statement.ts:199-252`. No per-bank tuning was applied. The prompt is bank-agnostic.

Test script: `scripts/vision-smoke.mjs` (standalone, not part of production pipeline).

#### RBC Result — EXACT MATCH

| Metric | Vision | Truth | Delta |
|--------|--------|-------|-------|
| Transactions | 9 | 9 | 0 |
| Withdrawals | $709.11 | $709.11 | $0.00 |
| Deposits | $707.00 | $707.00 | $0.00 |
| Opening | -$5.71 | -$5.71 | $0.00 |
| Closing | -$7.82 | -$7.82 | $0.00 |

#### BMO Result — EXACT MATCH

| Metric | Vision | Truth | Delta |
|--------|--------|-------|-------|
| Transactions | 148 | 148 | 0 |
| Debits | $14,966.05 | $14,966.05 | $0.00 |
| Credits | $13,526.02 | $13,526.02 | $0.00 |
| Opening | $2,264.43 | $2,264.43 | $0.00 |
| Closing | $824.40 | $824.40 | $0.00 |

#### PC Financial — NOT YET PROVEN

A PC Financial fixture exists but has not completed the same structured proof pass. Do not mark it as proven without evidence.

---

## 4. Reconciliation Gate

**Status: SHIPPED (production).**

The reconciliation gate is the principal safety boundary. It lives in `commit-import.ts` (lines ~737-884).

Behavior:
- Compares extracted transaction sums (from staging rows) against printed statement totals within tolerance ($0.05)
- Missing or unreadable printed totals HOLD the import (`parsed_unreconciled`)
- A mismatch HOLDS the import
- Only a passing gate allows commit to the `transactions` ledger
- User-attested balances provide an alternate path when parser cannot read printed totals (`tx-update-amount.ts` attestation flow)

**Rule: Do not weaken reconciliation to accommodate an extractor.** Any future extractor replacement should be judged against statement truth and reconciliation results, not merely whether it produces plausible-looking transaction rows.

### statementTotals Precedence (ACCEPTED DESIGN)

When both Vision and flat-text produce totals:
- Vision result writes to `imports.statement_breakdown_json.statementTotals`
- Flat-text result writes to `imports.statement_breakdown_json.flatTextTotals` (diagnostic key)
- Guard: if `statementTotals.source !== 'claude_vision'`, do not overwrite with flat-text result (prevents crash-retakeover from moving Vision's value into the diagnostic key)

---

## 5. OCR Completion Signal

**Status: PROVEN (production behavior).**

| Claim | Status |
|-------|--------|
| `ocr_jobs` table exists | FALSE — table does not exist |
| `ocr_jobs` insert in smart-import-ocr.ts:2395 | Fails silently (table missing) |
| Real completion signal | `user_documents.ocr_status` column |
| Browser polling mechanism | `ocr-job-status.ts` reads `user_documents` primarily (:37-41) |
| Stale detection | `user_documents.updated_at` |

**Do not build future orchestration around `ocr_jobs`.** The table does not exist. The `ocr_status` field on `user_documents` is the real signal.

`ocr-job-status.ts` has a secondary query against `ocr_jobs` (:63-71) which silently returns null. When `job` is null, status determination falls through to `doc.ocr_status` (:99-117).

---

## 6. Background-Function Runtime Proof

**Status: PROVEN.**

A deployed Netlify Pro background-function probe executed successfully for:

> **60,209 ms** (60.2 seconds)

This exceeds the synchronous function cap (~26s) and proves the background-function mechanism is viable for the combined OCR + Vision orchestration.

| Detail | Value |
|--------|-------|
| Test commit | `324bb1c` |
| Mechanism | `-background` suffix on function filename |
| In-repo precedent | `tag-background-sweep.ts` |
| Probe status | Removed after verification |

This does not prove every possible Netlify timeout/rate-limit scenario. It proves that this deployment can execute a background function beyond the old synchronous concern.

---

## 7. Compatibility SELECT Bug Fix

**Status: SHIPPED.**

| Detail | Value |
|--------|-------|
| Commit | `cee10bd9` |
| Message | `fix(normalize): stop requesting nonexistent columns in document SELECT tiers` |
| File | `netlify/functions/normalize-transactions.ts` |
| Function | `fetchDocumentWithCompatibility()` (:112-136) |

### What Was Wrong

Tiers 1-3 of the progressive SELECT requested two columns that do not exist in the live `user_documents` schema:

- `extracted_text_hash`
- `extracted_text_length`

PostgREST rejects unknown column names, so Tiers 1-3 always failed. Only Tier 4 (5 minimal columns: `id, storage_path, mime_type, original_name, status`) succeeded.

### What the Fix Did

Removed the two nonexistent column names from Tiers 1-3. No columns added. No other changes.

Tier 1 now contains 16 columns, all verified against the live schema:

```
id, user_id, storage_path, mime_type, original_name, status,
ocr_text, ocr_text_hash, ocr_text_length,
extracted_data, normalized_json, metadata,
extraction_quality, pages_detected, ocr_completed_at, ocr_engine
```

### Behavioral Effect

This is not zero behavioral change. Restoring Tier 1 makes existing OCR/structured fields visible to normalize, so the no-input guard (:892) can correctly allow documents with real stored OCR/structured data to proceed instead of rejecting them based on the stripped Tier 4 row.

However:
- The idempotency guard (:754) does not newly activate (see warning below)
- `doc.user_id` is never read — all user_id usage comes from the caller's POST body
- No write path changes its target user or scope

### WARNING: Do Not Add `transaction_count` to SELECT Tiers

`transaction_count` exists in the live `user_documents` schema but is deliberately NOT selected by any tier.

The idempotency guard at :754 reads:

```typescript
if ((metadata.normalized_cached === true && (doc?.transaction_count ?? 0) > 0) || doc?.normalized_json)
```

Because `transaction_count` is not selected, `doc?.transaction_count` is always `undefined`, `?? 0` yields `0`, and `0 > 0` is `false`. The left clause is unreachable.

Live verification at time of decision (2026-08-17):

| Query | Count |
|-------|-------|
| `normalized_json IS NOT NULL` | 0 |
| `metadata->>'normalized_cached' = 'true'` | 92 |
| Among those 92: `transaction_count > 0` | 0 |
| Among those 92: `transaction_count` null/0 | 92 |

Adding `transaction_count` to the SELECT would make the left clause reachable. While 0 rows would fire today (all 92 have `transaction_count` of 0/null), the coupling is unintended and that data can change. Future changes to selected fields must re-evaluate the idempotency guard.

---

## 8. Vision Storage Decision

**Status: ACCEPTED DESIGN.**

Claude Vision structured output is persisted in the existing `user_documents.extracted_data` JSONB column under a sibling key:

```json
{
  "extracted_data": {
    "claude_vision": {
      "transactions": [...],
      "period": { "start": "...", "end": "..." },
      "accountSummary": { ... },
      "statementSummary": { ... },
      "institution": "BMO"
    }
  }
}
```

Design rules:
- No new table created solely for Vision extraction
- `normalized_json` is NOT used as the raw Vision storage location (it participates in existing normalization/idempotency behavior)
- `extracted_data` is already selected by Tier 1 (post-fix), so normalize-transactions can read Vision output without further SELECT changes

---

## 9. Rename: smart-import-ocr to Background Function

**Status: PENDING.**

Renaming `smart-import-ocr.ts` to `smart-import-ocr-background.ts` activates Netlify's 15-minute background function timeout (vs. ~26s synchronous cap on Pro).

Known blast radius for the rename (callers that build the URL by name):

| File | Line(s) | Reference |
|------|---------|-----------|
| `smart-import-finalize.ts` | :136 | `fetch(.../.netlify/functions/smart-import-ocr, ...)` |
| `prime-router.ts` | :569, :757 | `callFn(event, "smart-import-ocr", ...)` |
| `netlify.toml` | :41-42 | `[functions."smart-import-ocr"] timeout = 120` |

All must be updated atomically in the rename commit.

---

## 10. Known Security Backlog

**KNOWN ISSUE / BACKLOG — OUTSIDE A' IMPLEMENTATION SCOPE.**

`normalize-transactions.ts` does not call `verifyAuth` or perform any JWT/auth check. The handler at :1740 destructures `userId` directly from the POST body and trusts it.

Current internal callers are server-side functions (`smart-import-sync`, `prime-router`), but the endpoint is publicly addressable at `/.netlify/functions/normalize-transactions`.

This is recorded for awareness. Do not fix it within the Vision implementation commits without separate approval. Do not mix security work into the A' implementation scope.

---

## 11. Implementation Status

| Status | Item |
|--------|------|
| COMPLETE | Claude Vision fixture proof — RBC (exact match, 9/9 txns, $0.00 delta) |
| COMPLETE | Claude Vision fixture proof — BMO (exact match, 148/148 txns, $0.00 delta) |
| COMPLETE | Reconciliation gate (shipped, production) |
| COMPLETE | Netlify background runtime proof — 60,209 ms (commit `324bb1c`) |
| COMPLETE | Compatibility SELECT bug fix (commit `cee10bd9`) |
| NEXT | Convert `smart-import-ocr` to background function (`-background` suffix) |
| PENDING | Run Google OCR + Claude Vision in parallel inside background function |
| PENDING | Persist Claude Vision result to `extracted_data.claude_vision` |
| PENDING | Vision-primary normalize consumption in `normalize-transactions.ts` |
| PENDING | Vision `statementTotals` precedence (Vision wins, flat-text diagnostic) |
| PENDING | Feature flag gating (`OCR_PREFER_VISION` or similar) |
| PENDING | End-to-end BMO application upload acceptance test |
| PENDING | End-to-end RBC application upload acceptance test |
| PENDING | PC Financial fixture validation |

---

## 12. Decision History

### 2026-08-17 — Architecture A' Accepted

**Why:**
- Flat-text OCR loses geometry, producing systematic errors on multi-column bank statements
- Failures were demonstrated on real RBC and BMO fixtures (fabricated amounts, missing rows)
- Claude Vision produced exact results on those same fixtures without per-bank tuning
- The reconciliation gate provides the ledger safety boundary
- Deployed background execution >60 seconds was independently proven
- Flat text remains valuable as fallback (fail-open on extraction)

**Warning:** Do not revert to flat-text-primary merely because it is cheaper. Any future extractor replacement should be judged against statement truth and reconciliation results, not merely whether it produces plausible-looking transaction rows.

---

## Document Maintenance Rule

After each significant Vision/OCR implementation milestone, update this document with:

1. What actually shipped
2. Commit SHA
3. Acceptance-test result
4. Newly discovered constraint
5. Next unresolved step

**Never mark a design as shipped until code is committed.**
