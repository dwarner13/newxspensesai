# FINLEY Fixtures

Local-only fixtures for FINLEY planning/coaching contract checks.

Do **not** commit real statements or sensitive customer data.

Recommended fixture folders:

- `scripts/finley-test/fixtures/from-tag-crystal/`
- `scripts/finley-test/fixtures/minimal/`
- `scripts/finley-test/fixtures/scanned/`

Preferred input shape:

```json
{
  "tag_output": {},
  "crystal_output": {},
  "user_preferences": {}
}
```

TAG-only JSON is supported for missing-data validation paths.

