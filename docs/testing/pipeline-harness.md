# Full Pipeline Harness

Local harness to run and validate:

`BYTE -> TAG -> CRYSTAL -> FINLEY -> PRIME_SUMMARY`

No chat endpoint changes are required.

## Run

- Base:
  - `npm run pipe:test`
- Contract gate (all fixtures):
  - `npm run pipe:contract`
- Bank fixtures:
  - `npm run pipe:contract:bank`
- Credit-card fixtures:
  - `npm run pipe:contract:credit`

## Recommended Workflow

1. Generate BYTE outputs with `byte:test`.
2. Use those BYTE JSON files as pipeline fixtures.
3. Run pipeline contract gate.
4. Inspect per-stage outputs and contract reasons.

## Inputs

Supported fixture types:

- `.pdf`, `.txt`, `.md` (BYTE runs from document text)
- `.json` BYTE outputs
- `.json` bundle:
  - `{ document_text?, byte_output?, user_prefs?, user_name?, mode? }`

## Output Layout

Per fixture file:

- `scripts/pipeline-test/output/<name>/byte.json`
- `scripts/pipeline-test/output/<name>/tag.json`
- `scripts/pipeline-test/output/<name>/crystal.json`
- `scripts/pipeline-test/output/<name>/finley.json`
- `scripts/pipeline-test/output/<name>/prime.txt`
- `scripts/pipeline-test/output/<name>/contract.json`

Global report:

- `scripts/pipeline-test/output/contract-report.json`

## Contract Checks (v1)

- Stage schema validity and safe fallback behavior
- Grounding checks for Crystal and Finley
- Prime secrecy checks (no internal worker/system names)
- Prime numeric grounding against allowed TAG/Crystal/Byte values
- Prime structure:
  - statement reference
  - key totals when available
  - 3-6 next actions
- Prime length <= configured max (default 1200 chars)

## Prime Grounding + Secrecy

Prime output must not reveal internal internals and must keep all numeric claims grounded.

Examples of forbidden terms:

- `BYTE`, `TAG`, `CRYSTAL`, `FINLEY`
- `OrchCtx`, `worker_chain`, `deterministic_path`, `JSON mode`, `prompt`

## Debug Stage Failures

- If BYTE fails: verify extraction quality and fixture readability.
- If TAG fails: inspect transfer/payment and spend flags.
- If CRYSTAL fails: check ungrounded numeric claims.
- If FINLEY fails: verify no invented date hints or target amounts.
- If Prime fails: inspect `prime.txt` for internal leaks, ungrounded numbers, missing actions, or excessive length.

