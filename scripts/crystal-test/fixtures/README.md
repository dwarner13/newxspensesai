# CRYSTAL Fixtures

Local-only fixture folder for CRYSTAL insights contract checks.

Do **not** commit real statements or sensitive customer documents.

Recommended fixture folders:

- `scripts/crystal-test/fixtures/from-tag/`
- `scripts/crystal-test/fixtures/from-byte-tag/`
- `scripts/crystal-test/fixtures/scanned/`

Preferred input:

- TAG output JSON (`*.tag.json`) from `scripts/tag-test/output/`
- Bundle JSON shape:
  - `{ "tag_output": {...}, "byte_output": {...}, "prior_snapshot": {...} }`

Run contract gate:

- `npm run crystal:contract`

