# Test Suite Setup

## Directory Structure

```
worker/
├── src/
│   └── parse/
│       ├── amountUtils.ts
│       ├── bank.ts
│       └── __tests__/
│           ├── amountUtils.test.ts          # Unit tests for amount extraction/validation
│           └── bankExtraction.integration.test.ts  # Integration tests (placeholder)
├── package.json
└── vitest.config.ts (optional)
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test amountUtils

# Watch mode (for development)
pnpm test:watch

# With coverage
pnpm test:coverage
```

## Test Files Created

1. **`worker/src/parse/__tests__/amountUtils.test.ts`**
   - Unit tests for `extractAmountsFromText()`
   - Unit tests for `validateTransactions()`
   - Integration test with BMO statement example
   - Edge case tests (store numbers, deduplication, etc.)

2. **`worker/src/parse/__tests__/bankExtraction.integration.test.ts`**
   - Placeholder for future integration tests
   - Would test full pipeline: OCR → Extract → AI → Validate

## Test Coverage Goals

- ✅ Amount extraction handles all formats
- ✅ Validation flags invented amounts
- ✅ Store numbers not extracted as amounts
- ✅ Credits handled correctly
- ✅ Comma formatting differences handled










