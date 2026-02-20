# CRYSTAL Insights Harness

Local harness for validating CRYSTAL insights independently of `/.netlify/functions/chat`.

## Recommended Workflow

1. Run BYTE extraction:
   - `npm run byte:test -- --dir scripts/byte-test/fixtures --contract`
2. Run TAG categorization:
   - `npm run tag:test -- --dir scripts/tag-test/fixtures --contract`
3. Feed TAG output into CRYSTAL:
   - `npm run crystal:test -- --dir scripts/crystal-test/fixtures`
4. Contract gate CRYSTAL:
   - `npm run crystal:contract`

## Grounding Rules (Why It Matters)

CRYSTAL must not hallucinate amounts.

Numeric claims in insights/highlights must be grounded against TAG data:

- `tag.account_summary.*`
- `tag.category_totals[].total`
- `tag.transactions[].amount`
- optional TAG highlights amounts (if present)

Matching rule:

- exact preferred
- tolerance: `+/- 0.01`

If grounding is required (default), ungrounded numbers fail contract with `ungrounded_number`.

## Input Types

- Preferred: TAG output JSON (`*.tag.json`)
- Supported: bundle JSON
  - `{ byte_output?, tag_output?, prior_snapshot? }`
- BYTE-only JSON is not analyzed directly by CRYSTAL harness (graceful review-flag fallback)

## Output Files

- Per-file output:
  - `scripts/crystal-test/output/<filename>.crystal.json`
- Contract report:
  - `scripts/crystal-test/output/contract-report.json`

Console table:

- `FILE | INSIGHTS | FLAGS | CONF(avg) | GROUNDED | NEEDS_REVIEW`

## Contract Gate (CrystalNormalizationRulesContract v1)

Checks include:

- required schema keys present
- `insights.length` between `3` and `--max-insights`
- each insight has valid `type`, non-empty `title/detail`, confidence in `[0,1]`
- grounding validation for numeric claims (critical by default)
- highlights grounding (`largest_spend.amount`, `largest_income.amount` match TAG tx amounts or null)
- `recommended_next_actions` includes `3-6` items with non-empty `action` + `why`
- average confidence meets threshold or is clearly flagged as missing data
- output safety (no internal names, no raw email/identifier leaks)

Exit behavior:

- `--contract` + any FAIL => exit code `1`
- otherwise `0`

## Interpreting FAIL Reasons

- `ungrounded_number:*`
  - numeric claim not found in allowed TAG grounding values
- `too_many_insights` / `too_few_insights`
  - output violates configured insight count bounds
- `missing_actions`
  - recommended actions block invalid or missing
- `largest_spend_not_grounded` / `largest_income_not_grounded`
  - highlight amount not tied to actual TAG transaction amount
- `confidence_below_threshold`
  - average confidence below required floor

## Commands

- Base run:
  - `npm run crystal:test`
- Contract all fixtures:
  - `npm run crystal:contract`
- Contract from-tag fixtures:
  - `npm run crystal:contract:from-tag`
- Scanned-focused threshold:
  - `npm run crystal:contract:scanned`

