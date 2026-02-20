# TAG Fixtures

Local-only fixtures for TAG categorization contract checks.

Do **not** commit real statements or sensitive customer documents.

Suggested folders:

- `scripts/tag-test/fixtures/bank/`
- `scripts/tag-test/fixtures/credit-card/`
- `scripts/tag-test/fixtures/scanned/`
- `scripts/tag-test/fixtures/mixed/`

Preferred TAG input:

- BYTE output JSON from `scripts/byte-test/output/*.json`
- TAG harness auto-detects BYTE JSON and maps it into TAG input payload.

Run all fixtures:

`npm run tag:contract`

