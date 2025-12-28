# Pull Request

## Description

<!-- Describe your changes here -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring

## Checklist

- [ ] `pnpm test` green (all tests pass)
- [ ] Headers present in smoke test (8 core headers + any endpoint-specific headers)
- [ ] SQL idempotent verified (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)
- [ ] Reports updated (PLAN, CHANGELOG, VALIDATION, RESULTS if applicable)

## Testing

<!-- Describe how you tested your changes -->

- [ ] Unit tests pass
- [ ] Manual smoke test completed
- [ ] Headers verified (X-Guardrails, X-PII-Mask, X-Memory-Hit, etc.)

## Database Changes

<!-- If this PR includes database changes -->

- [ ] SQL migrations use `IF NOT EXISTS` or `ON CONFLICT DO NOTHING`
- [ ] Migrations are idempotent (safe to run multiple times)
- [ ] RLS policies added if creating new user-scoped tables

## Documentation

<!-- If this PR includes documentation changes -->

- [ ] README.md updated (if needed)
- [ ] Code comments added/updated
- [ ] Day reports updated (if applicable)

## Security

<!-- If this PR touches security-sensitive code -->

- [ ] PII masking verified
- [ ] Guardrails tested
- [ ] Rate limiting tested (if applicable)
- [ ] RLS policies verified (if applicable)

## Related Issues

<!-- Link related issues here -->

Closes #

---

**Note**: Please ensure all checklist items are completed before requesting review.
