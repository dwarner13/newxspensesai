# BYTE Extraction Harness

Local development harness for validating BYTE extraction independently of the chat endpoint.

## Run

- Supported file types: `.pdf`, `.txt`, `.md`, `.json`, `.csv`
- Default docs folder: `scripts/byte-test/docs/`
- Contract fixtures folder: `scripts/byte-test/fixtures/`
- Local fixture categories:
  - `scripts/byte-test/fixtures/bank/`
  - `scripts/byte-test/fixtures/credit-card/`
  - `scripts/byte-test/fixtures/scanned/`
  - `scripts/byte-test/fixtures/split-columns/`
  - `scripts/byte-test/fixtures/single-amount/`
- Place local PDFs in the fixture folders above. They are ignored by git and should never be committed.
- Base run:
  - `npm run byte:test`
- Custom directory:
  - `npm run byte:test -- --dir path/to/custom/docs`
- Contract mode:
  - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract`
- Contract mode + strict fail on review warnings:
  - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract --fail-on-review`
- Quick contract scripts:
  - `npm run byte:contract:bank`
  - `npm run byte:contract:credit`
  - `npm run byte:contract:scan`
- Custom thresholds:
  - `npm run byte:test -- --contract --min-confidence 0.7 --max-totals-mismatch 5`

## Outputs

- Console summary table:
  - `FILE | DOC_TYPE | TX_COUNT | CONFIDENCE | WARNINGS | NEEDS_REVIEW`
- Per-file detail lines:
  - opening/closing balances
  - total deposits/withdrawals
  - totals mismatch flag
  - page kinds detected
  - extraction time per file
- Full normalized JSON written to:
  - `scripts/byte-test/output/<filename>.json`
- Contract report (when `--contract` is enabled):
  - `scripts/byte-test/output/contract-report.json`
- Sanitized share-safe outputs:
  - `scripts/byte-test/output/sanitized/*.json`
  - generated via `npm run byte:sanitize`

## Confidence Guide

- `0.9-1.0`: clean extraction, likely reliable
- `0.6-0.8`: mostly good, minor OCR/layout issues
- `0.3-0.5`: partial extraction, review required
- `0.0-0.2`: low-quality extraction, likely unusable without manual checks

## Warning Codes

- `doc_type_uncertain`
- `missing_year_in_dates`
- `transaction_date_missing`
- `suspiciously_low_transaction_count`
- `totals_mismatch`
- `multiple_accounts_detected`
- `no_transactions_extracted`

## Contract PASS/FAIL

When `--contract` is enabled, each file is evaluated against ByteNormalizationRulesContract(v1).

Core checks include:

- required schema keys are present
- `doc_type` is not `unknown` unless confidence is low (`< 0.4`)
- `pages_detected` has at least one entry
- statement-like docs with zero transactions require `needs_review=true` and `no_transactions_extracted`
- confidence meets threshold OR output is explicitly review-gated with warnings
- `multiple_accounts_detected` implies `needs_review=true`

Exit code behavior:

- `--contract` + any FAIL => process exits with code `1`
- otherwise exits `0`

## Recommended Thresholds

- Digital statements: `--min-confidence 0.6` (default behavior)
- Scanned OCR-heavy docs: `0.3` baseline (auto-applied when folder path includes `scanned`)
- Totals mismatch absolute threshold: `$5` default plus `1%` relative tolerance

## Example Commands

- Validate all fixtures:
  - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract`
- Strict mode for CI-like local gating:
  - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract --fail-on-review`
- Tune for stricter confidence:
  - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract --min-confidence 0.75`
- Run one fixture bucket quickly:
  - `npm run byte:contract:bank`
- Sanitize outputs before sharing:
  - `npm run byte:sanitize`

## Debug Extraction Issues

- If extraction is empty:
  - verify OCR text quality and page readability
  - check if pages were marked `legal/info` only
- If `totals_mismatch` appears:
  - inspect split debit/credit columns vs single amount signs
  - verify transaction direction inference
- If confidence is low:
  - test with cleaner digital PDFs first
  - compare `description_raw` lines to source document

## Safety Notes

- Harness masks long account/card number patterns in saved output.
- Sanitizer additionally masks long identifiers and emails in output JSON.
- Always run `npm run byte:sanitize` before sharing test artifacts.
- Harness does not modify chat endpoint behavior or production responses.

