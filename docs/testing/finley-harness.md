# FINLEY Planning Harness

Local harness for validating FINLEY planning/coaching output independently of `/.netlify/functions/chat`.

## Recommended Workflow

1. BYTE extraction:
   - `npm run byte:test -- --contract --dir scripts/byte-test/fixtures`
2. TAG categorization:
   - `npm run tag:test -- --contract --dir scripts/tag-test/fixtures`
3. CRYSTAL insights:
   - `npm run crystal:test -- --contract --dir scripts/crystal-test/fixtures`
4. FINLEY planning/coaching:
   - `npm run finley:test -- --contract --dir scripts/finley-test/fixtures`

## Reminder Confirmation Principle

FINLEY can only suggest reminders/goals.

Prime/UI must confirm with the user before any reminder/goal is actually created.

## Grounding Rules

FINLEY must not invent dates or amounts.

Allowed dates:

- date values present in `tag_output.account_summary` (when available)
- explicit dates found in grounded crystal insights

Allowed amounts:

- `tag_output.category_totals[].total`
- `tag_output.account_summary` totals/balances
- `crystal_output.highlights` amounts

If an amount/date is not grounded, FINLEY should use `null` and ask Prime a confirmation question.

## Contract Gate (FinleyNormalizationRulesContract v1)

Core checks:

- required schema keys present
- `plan.steps` count in `3..maxSteps`
- each step has non-empty `step` + `reason` and valid `difficulty`
- reminders with `date_hint=null` require date-confirmation question in `questions_for_prime`
- no invented dates (critical when enabled)
- no invented amounts (critical when enabled)
- reminder language is suggestive, not commanding
- no internal system leaks or raw PII patterns

Exit behavior:

- `--contract` + any FAIL => exit code `1`
- otherwise `0`

## Interpreting Failures

- `invented_date_hint:*`
  - reminder date does not exist in allowed grounded date set
- `invented_target_amount:*`
  - suggested goal amount does not exist in grounded amount set
- `reminder_commanding_language`
  - reminder phrasing implies execution instead of suggestion
- `missing_date_confirmation_question`
  - reminders need confirmation question when dates are unknown
- `too_many_steps` / `too_few_steps`
  - plan step count violates contract limits

## Example Commands

- Base run:
  - `npm run finley:test`
- Contract all fixtures:
  - `npm run finley:contract`
- Contract from tag+crystal fixtures:
  - `npm run finley:contract:from-tag-crystal`
- Stricter config:
  - `npm run finley:test -- --contract --max-steps 5 --min-confidence 0.75`

