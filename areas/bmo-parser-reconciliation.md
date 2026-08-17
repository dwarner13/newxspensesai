# BMO Parser & Reconciliation Gate

**Engineering record for the BMO flat-text parser and the reconciliation gate.**

Last updated: 2026-08-17
Branch: `sidebar-safe-refactor`

See also: `areas/vision-pipeline.md` (Vision architecture), `docs/SMART_IMPORT_CURRENT_STATE_AND_MIGRATION_PLAN.md` (full pipeline audit).

---

## Overview

The BMO flat-text parser is the most mature bank-specific parser in the pipeline. It is also the primary example of why flat-text parsing is insufficient for production accuracy and why Claude Vision is being integrated (see `areas/vision-pipeline.md`).

The reconciliation gate is the safety boundary between extraction and the financial ledger. It is bank-agnostic but was originally built around BMO's printed totals format.

---

## BMO Flat-Text Parser

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `parseBmoEverydayStatement()` | `_shared/ocr_normalize.ts` | Extracts individual transactions from flat OCR text |
| `parseBmoStatementTotals()` | `normalize-transactions.ts:207-448` | Extracts printed summary totals (opening, closing, deducted, added) |
| `validateIdentity()` | `normalize-transactions.ts` (closure inside `parseBmoStatementTotals`) | Verifies opening - deducted + added = closing |

### Detection

Two detection paths in `ocr_normalize.ts`:

1. **Primary** (~line 192): Requires `Your\s*Everyday\s*Banking\s*statement` in text. EDMONTON restriction was removed (commit `369e090d`).
2. **Fallback** (~line 223): Checks for `Everyday\s*Banking` OR `For\s*the\s*period\s*ending`. Does not require city.

Both call `parseBmoEverydayStatement()` with the same input.

### `parseBmoStatementTotals` Strategies

`parseBmoStatementTotals()` attempts four strategies to extract printed totals, in order:

| Strategy | What it looks for |
|----------|-----------------|
| 0b | `summary_quadruplet` — four consecutive numbers near BMO header text |
| 1 | `Closing totals` line pattern |
| 2 | `total amounts deducted` / `total amounts added` line patterns |
| 3 | General number extraction near statement summary text |

Each candidate is verified by `validateIdentity()`: `opening - deducted + added = closing` must hold within tolerance.

If all strategies fail, `parseBmoStatementTotals` returns `null`. This means no `statementTotals` are persisted and the reconciliation gate cannot run its primary check.

### Known Flat-Text Accuracy Problems (BMO)

Measured against the 6-page, 148-transaction BMO Everyday Banking fixture:

| Problem | Detail |
|---------|--------|
| Row count | 145 extracted vs. 148 truth (-3 missing) |
| Debit total | $16,218.88 vs. $14,966.05 truth (+$1,252.83 excess) |
| Opening balance as transaction | Opening balance ingested as a debit |
| Row-boundary bleed | Page breaks corrupt transaction boundaries |

Root cause: flat OCR text loses column geometry. See `areas/vision-pipeline.md` Section 2.

---

## Reconciliation Gate

### Location

`commit-import.ts` — `runReconciliationGate()` (lines ~737-884).

### Mechanism

1. Reads `imports.statement_breakdown_json.statementTotals`
2. Sums all `transactions_staging` rows for the import (debit/credit)
3. Compares row sums against printed totals
4. Tolerance: $0.05
5. Pass -> `imports.status = 'parsed'` (Import button unlocks)
6. Fail -> `imports.status = 'parsed_unreconciled'` (held for review)

### Fail-Closed Behavior

The gate fails closed. Specifically:

| Condition | Result |
|-----------|--------|
| `statementTotals` present, sums match within $0.05 | PASS |
| `statementTotals` present, sums mismatch | HOLD (`parsed_unreconciled`) |
| `statementTotals` absent, no attested balances | HOLD (`parsed_unreconciled`) |
| `statementTotals` absent, user-attested balances match | PASS |
| `statementTotals` absent, user-attested balances mismatch | HOLD |
| `statementTotals` present but non-finite (garbage data) | Status unchanged, error reported |

### `tx-update-amount` Re-Gating

When a user edits a staging row amount via `tx-update-amount.ts`, the gate is re-run:

1. Row amount updated in `transactions_staging.data_json`
2. All staging rows re-summed
3. Compared against `statementTotals` (or attested balances)
4. `imports.status` flipped accordingly

This replicates the gate logic without importing it (the gate in `commit-import.ts` is PROTECTED — never imported or edited from `tx-update-amount.ts`).

### Attestation Flow

When the parser cannot read printed totals (non-BMO, or BMO extraction failure), users can attest balances:

1. User supplies opening and closing balances via `tx-update-amount.ts` `attestBalances` path
2. Attested values stored in `imports.statement_breakdown_json.attestedBalances`
3. Gate re-runs: `opening - rowDeducted + rowAdded = closing` within $0.05
4. Attestation blocked when parser-derived `statementTotals` already exist

### Important Constraints

- The reconciliation gate must never be weakened to accommodate an extractor
- `integrity_verified` defaults to `false` (commit `369e090d`)
- Non-BMO statements that lack `statementTotals` are held, not auto-committed
- This is the correct behavior — the gate is the principal safety boundary

---

## Document Maintenance Rule

After changes to the parser or reconciliation gate, update this document with:

1. What changed and commit SHA
2. Whether the gate behavior was affected
3. Any newly discovered constraint
