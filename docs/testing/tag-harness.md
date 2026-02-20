# TAG Categorization Harness

Local development harness for validating TAG categorization independently of `/.netlify/functions/chat`.

## Recommended Workflow

1. Run BYTE harness first to generate structured extraction JSON:
   - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract`
2. Feed BYTE output JSON into TAG harness:
   - `npm run tag:test -- --dir scripts/tag-test/fixtures`
3. Run TAG contract gate:
   - `npm run tag:contract`

TAG harness auto-detects BYTE output JSON and maps:

- `doc_type` -> `statement_type`
- `statement_period`
- `account_summary`
- `transactions[]`

## Run Commands

- Base run:
  - `npm run tag:test`
- Custom directory:
  - `npm run tag:test -- --dir scripts/tag-test/fixtures/mixed`
- Contract mode:
  - `npm run tag:test -- --contract --dir scripts/tag-test/fixtures`
- Strict contract mode:
  - `npm run tag:contract`
- Per-bucket quick runs:
  - `npm run tag:contract:bank`
  - `npm run tag:contract:credit`

## Supported Inputs

- `.json` (preferred)
  - BYTE output JSON recommended
  - direct TAG payload JSON also supported
- `.txt` / `.md`
  - raw extracted text
- `.pdf`
  - parsed via shared PDF text extractors when available

## Output Files

- Per-file TAG output:
  - `scripts/tag-test/output/<filename>.tag.json`
- Contract report:
  - `scripts/tag-test/output/contract-report.json`
- Sanitized share-safe output:
  - `scripts/tag-test/output/sanitized/*.tag.json`
  - `scripts/tag-test/output/sanitized/contract-report.json`

Console summary:

- `FILE | STMT_TYPE | TX_COUNT | SPEND_COUNT | CONFIDENCE(avg) | WARNINGS/FLAGS | NEEDS_REVIEW`

## Contract Gate (TagNormalizationRulesContract v1)

When `--contract` is enabled, each file is checked for:

- required schema keys present
- transaction field validity (amount/category/is_spend/confidence)
- transfer separation rule:
  - transfer/payment-like descriptions must map to `Transfer` or `Credit Card Payment`
  - `is_spend` must be `false`
- cash withdrawal rule:
  - ATM/withdrawal-like descriptions should be `Cash Withdrawal` and `is_spend=false`
  - exception allowed if `needs_review=true` with ambiguous reason
- confidence threshold:
  - default `0.7` (digital), `0.5` (scanned path)
  - override with `--min-confidence`
- prime-ready summary integrity:
  - `one_paragraph` non-empty
  - `next_actions` length 3-6

Exit behavior:

- `--contract` + any FAIL => process exits with code `1`
- otherwise exits `0`

## Interpreting Failures

- `transfer_separation_violation:*`
  - transaction appears to be transfer/payment but is categorized as spend
- `cash_withdrawal_rule_violation:*`
  - ATM/withdrawal transaction not mapped to `Cash Withdrawal` non-spend
- `missing_key:*`
  - output schema is incomplete
- `empty_output_with_nonempty_input`
  - input had transactions but TAG returned none without review gating
- `confidence_below_threshold`
  - average confidence too low and output not clearly review-gated

## Fixture Safety

Fixtures are local-only and must not include committed real statements.

Committed files should remain only:

- `scripts/tag-test/fixtures/**/.gitkeep`
- `scripts/tag-test/fixtures/README.md`

## Sharing Outputs Safely

Use one command to run contract checks and sanitize artifacts:

- `npm run tag:contract:safe`

Per-bucket safe commands:

- `npm run tag:contract:bank:safe`
- `npm run tag:contract:credit:safe`

Share only files from:

- `scripts/tag-test/output/sanitized/*`

