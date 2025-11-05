# Pull Request Checklist

Please verify the following before requesting review:

## Tests
- [ ] `pnpm test` passes locally
- [ ] All new tests are included and passing
- [ ] No breaking changes (or breaking changes are documented)

## Database Migrations
- [ ] SQL migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for idempotency
- [ ] Migrations are backward compatible
- [ ] Migration file paths follow convention: `netlify/functions/_shared/sql/day*_*.sql`

## Local Smoke Testing
- [ ] `netlify dev` runs without errors
- [ ] Core headers present on responses:
  - [ ] `X-Guardrails`
  - [ ] `X-PII-Mask`
  - [ ] `X-Memory-Hit`
  - [ ] `X-Memory-Count`
  - [ ] `X-Session-Summary`
  - [ ] `X-Session-Summarized`
  - [ ] `X-Employee`
  - [ ] `X-Route-Confidence`
- [ ] OCR headers present (if OCR changes):
  - [ ] `X-OCR-Provider`
  - [ ] `X-OCR-Parse`
  - [ ] `X-Transactions-Saved`
  - [ ] `X-Categorizer`
  - [ ] `X-Vendor-Matched`
  - [ ] `X-XP-Awarded`

## Documentation
- [ ] Reports updated:
  - [ ] `PLAN.md` (implementation plan)
  - [ ] `CHANGELOG.md` (files changed, functional changes)
  - [ ] `VALIDATION.md` (testing steps)
  - [ ] `RESULTS.md` (test results)
- [ ] Code comments added where necessary
- [ ] Breaking changes documented (if any)

## Code Quality
- [ ] No linter errors
- [ ] TypeScript compiles without errors
- [ ] No console.log statements left in production code (use console.warn/error where appropriate)
- [ ] Error handling is non-blocking where appropriate

## Security
- [ ] PII masking applied before storage/logging
- [ ] Guardrails applied to user inputs
- [ ] No sensitive data exposed in logs or responses

---

## Description

<!-- Describe your changes here -->

## Related Issues

<!-- Link related issues here -->

## Testing Notes

<!-- Add any specific testing instructions or notes here -->
