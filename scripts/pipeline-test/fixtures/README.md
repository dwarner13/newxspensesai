# Pipeline Fixtures

Local-only fixtures for full pipeline tests:

`BYTE -> TAG -> CRYSTAL -> FINLEY -> PRIME_SUMMARY`

Do **not** commit real statements or sensitive files.

Supported fixture inputs:

- PDF/text (BYTE runs first)
- BYTE output JSON
- bundle JSON:
  - `{ "document_text"?, "byte_output"?, "user_prefs"?, "user_name"?, "mode"? }`

