# Code Review & Improvements

## Conceptual Review

### ✅ Strengths

1. **Three-layer defense**: Pre-extraction + constrained prompt + post-validation creates redundancy
2. **Preserves flagged transactions**: Doesn't drop invalid amounts, allows manual review
3. **Scoped correctly**: Only affects bank_statement AI fallback path
4. **Deterministic extraction**: Regex can't invent amounts like AI can

### ⚠️ Potential Edge Cases & Improvements

#### 1. Negative Amounts / Credits
**Current**: Handles credits but could be more explicit

**Improvement**: Already handled in validation (normalizes negatives), but consider:
- Extract negative amounts from OCR if they appear as `-76.09` or `(76.09)`
- Update prompt to explicitly mention credits can be positive amounts with `direction: "credit"`

#### 2. Store Numbers False Positives
**Current**: Regex might extract `1709.00` from "KFC #1709" if OCR adds decimals

**Improvement Added**: Filter logic to check context, but could be enhanced:
- Check if amount appears near "#" or "STORE" keywords
- Consider amounts > 1000 without context as suspicious

#### 3. Year False Positives
**Current**: Might extract `2025.00` if statement has "Year: 2025"

**Improvement Added**: Basic filtering for years 1900-2100

#### 4. Multiple Currencies
**Current**: Assumes CAD/USD, no currency detection

**Future**: Could extract currency symbols and validate per-currency

#### 5. Vendor Name Splitting
**Current**: AI prompt says "preserve exactly" but OCR might glue rows

**Future**: Post-process vendor names to detect if two transactions were merged

## Suggested Code Improvements

### 1. Enhanced Amount Extraction (Already Added)

```typescript
// Filter out obvious false positives
const filtered = uniqueAmounts.filter(amt => {
  const numValue = parseFloat(amt.replace(/,/g, ''));
  
  // Skip years
  if (numValue >= 1900 && numValue <= 2100 && amt.includes('.')) {
    const context = rawText.substring(Math.max(0, index - 20), index + 20).toLowerCase();
    if (context.includes('year') || context.includes('date')) {
      return false;
    }
  }
  
  return true;
});
```

### 2. Better Negative Amount Handling

```typescript
// In extractAmountsFromText, also match negative amounts:
const negativePattern = /\((\d{1,3}(?:,\d{3})*\.\d{2})\)/g;
// Extract but normalize to positive for whitelist
```

### 3. Store Number Detection

```typescript
// In extractAmountsFromText, check context:
const index = rawText.indexOf(amt);
const before = rawText.substring(Math.max(0, index - 10), index);
if (before.includes('#') || before.includes('STORE')) {
  // Likely a store number, skip
  return false;
}
```

## Next Small Improvements

### 1. Handle Negative Amounts Robustly

**File**: `worker/src/parse/amountUtils.ts`

Add support for extracting amounts in parentheses or with minus signs:

```typescript
// In extractAmountsFromText, add:
const negativePattern = /\((\d{1,3}(?:,\d{3})*\.\d{2})\)/g;
const negativeMatches = [...rawText.matchAll(negativePattern)].map(m => m[1]);
// Add to allAmounts (as positive for whitelist)
```

### 2. Better Vendor Splitting

**File**: `worker/src/parse/bank.ts`

Add post-processing to detect merged transactions:

```typescript
// After AI extraction, check for suspiciously long vendor names
const suspiciousLength = 60; // characters
const mergedVendors = validatedTransactions.filter(tx => 
  tx.merchant.length > suspiciousLength
);

// Could split on common patterns like "AND", "&", or date patterns
```

### 3. Surface needsAmountReview in UI

**Frontend File**: `src/components/chat/_legacy/ByteDocumentChat.tsx`

Add visual indicator for flagged transactions:

```typescript
// In transaction preview table
{transaction.needsAmountReview && (
  <span className="text-yellow-600 text-xs">
    ⚠️ Amount needs review
  </span>
)}
```

**Backend**: Already returns `needsAmountReview` flag, frontend just needs to display it.

## Testing Strategy

### Unit Tests (Created)
- `worker/src/parse/__tests__/amountUtils.test.ts`
- Tests extraction, validation, edge cases

### Integration Test (Future)
- Mock OCR text → Extract amounts → Mock AI response → Validate
- Verify no invented amounts slip through

### Manual Testing Checklist (Created)
- `worker/TESTING_GUIDE.md`
- Step-by-step verification for BMO statement

## Running Tests

```bash
cd worker
pnpm test                    # Run all tests
pnpm test amountUtils         # Run specific test file
pnpm test --coverage          # With coverage report
pnpm test --watch             # Watch mode
```

## Summary

The implementation is **sound and well-scoped**. The three-layer defense (extract → constrain → validate) should prevent invented amounts while preserving flexibility for edge cases.

**Key Safeguards:**
1. ✅ Deterministic regex extraction
2. ✅ Explicit AI constraints
3. ✅ Post-validation with flagging
4. ✅ Preserves flagged transactions for review

**Recommended Next Steps:**
1. Run manual test with BMO statement
2. Add unit tests (provided)
3. Monitor for edge cases in production
4. Add UI indicator for `needsAmountReview` flag










