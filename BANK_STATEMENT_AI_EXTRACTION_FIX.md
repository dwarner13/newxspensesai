# Bank Statement AI Extraction Fix - Summary

## Problem
The AI extraction step for bank statements was inventing amounts and mangling vendor names. For example:
- Converting "KFC #1709" into amount 1,709.00
- Inventing amounts like 100.00 that don't exist
- Missing real transactions like KFC #1709
- Rounding or changing actual amounts

## Solution
Implemented strict amount validation for bank statement AI extraction:
1. Extract allowed amounts from OCR text before AI extraction
2. Constrain AI prompt to only use those allowed amounts
3. Validate transactions after AI extraction
4. Flag transactions with invalid amounts for review

## Files Modified

### 1. `worker/src/parse/amountUtils.ts` (NEW)
Created utility functions for amount extraction and validation:
- `extractAmountsFromText(rawText: string): string[]` - Extracts all dollar amounts from OCR text
- `validateTransactions(transactions, allowedAmounts): Transaction[]` - Validates transactions against allowed amounts

**Key Features:**
- Matches patterns like `76.09`, `1,613.72`, `355.00`
- Handles amounts with and without thousands separators
- Preserves exact formatting for comparison
- Flags transactions with `needsAmountReview: true` if amount not found in OCR

### 2. `worker/src/parse/bank.ts` (MODIFIED)
Updated `ParsingProcessor` class to use strict amount validation for bank statements:

**Changes:**
1. **Before AI extraction** (lines 473-481):
   - Extract allowed amounts from OCR text for bank statements
   - Log extracted amounts for debugging

2. **AI extraction call** (line 483):
   - Pass `allowedAmounts` to `aiExtractTransactionsFromText()`
   - Only applies to `docType === 'bank_statement'`

3. **Post-validation** (lines 488-502):
   - Validate transactions against allowed amounts
   - Log warnings for flagged transactions
   - Keep flagged transactions but mark them for review

4. **AI extraction method** (lines 541-679):
   - Updated signature to accept `allowedAmounts` parameter
   - **Strict prompt for bank statements** with amount constraints:
     - Explicitly lists allowed amounts
     - Warns against inventing numbers
     - Instructs to ignore store numbers (e.g., #1709)
     - Preserves vendor names exactly
     - Requires amounts to match allowed list exactly
   - **Standard prompt for receipts** (unchanged)
   - Improved JSON parsing to handle both array and object responses
   - Increased `max_tokens` to 2000 for more transactions

## Updated AI Prompt (Bank Statements)

The new strict prompt includes:

```
CRITICAL RULES:
1. Valid transaction amounts MUST be copied EXACTLY from the statement text.
2. The ONLY valid amounts you may use are: [list of allowed amounts]
3. Do NOT invent new numbers, move decimal points, or convert store numbers (e.g., KFC #1709) into amounts like 1,709.00
4. Ignore numbers that look like IDs or store numbers (e.g., #1709, STORE 33535); they are NOT amounts
5. Extract every line that has a date and a dollar amount
6. If two consecutive lines both start with a date, treat them as two separate transactions, not one
7. Preserve vendor names exactly as they appear
8. Do NOT round amounts or change them in any way
9. Be conservative - only extract if you're confident it's a transaction
```

## Expected Behavior

### For BMO Statement Example:
**Before:**
- WEST BINGO → 1,709.00 (wrong)
- CORDON → 510.00 (wrong)
- Missing KFC #1709 transaction

**After:**
- Extracts allowed amounts: `["76.09", "9.37", "20.23", "54.06", "23.00", "1,613.72", "51.67", "355.00"]`
- AI constrained to use only these amounts
- All 8 transactions extracted correctly:
  - SOBEYS HOLLICK KENYON → 76.09
  - 7-ELEVEN STORE 33535 → 9.37
  - KOSMOS RESTAURANT & LOUNGE → 20.23
  - KFC #1709 → 54.06 ✅ (now included)
  - WEST END BINGO → 23.00 ✅ (correct amount)
  - GORDON FOOD SER PAY/PAY → 1,613.72 (credit)
  - NATIONAL MONEY MSP/DIV → 51.67
  - B/M PAYT/PAY MTG/HYP → 355.00

## Logging

New logs added:
- `[ParsingProcessor] Extracted X allowed amounts from OCR text` - Shows extracted amounts
- `[ParsingProcessor] X transactions have amounts not found in OCR text` - Warns about flagged transactions

## Non-Regression

- ✅ Receipt parsing unchanged (no amount constraints)
- ✅ Structured parser unchanged (only affects AI fallback)
- ✅ Regex fallback unchanged (only affects AI fallback)
- ✅ Only applies when both parsers find 0 transactions
- ✅ Only applies to `docType === 'bank_statement'`

## Testing

No test suite found in worker project. To test manually:

1. Upload a bank statement PDF
2. Check worker logs for:
   - `Extracted X allowed amounts from OCR text`
   - `AI extraction found X candidate transactions`
   - Any warnings about flagged transactions
3. Verify transactions in result:
   - All amounts should match amounts from OCR text
   - No invented amounts (like 1,709.00 from KFC #1709)
   - All real transactions included

## Limitations & TODOs

1. **Amount extraction regex**: Currently matches `\d{1,3}(?:,\d{3})*\.\d{2}` - may miss some edge cases
2. **Flagged transactions**: Currently kept but marked - could be filtered out in future
3. **JSON parsing**: Handles both array and object responses, but could be more robust
4. **Amount normalization**: Comparison handles commas, but could handle more formats

## Code Changes Summary

**New File:**
- `worker/src/parse/amountUtils.ts` - Amount extraction and validation utilities

**Modified File:**
- `worker/src/parse/bank.ts`:
  - Added import for `amountUtils`
  - Updated `parseDocument()` to extract and validate amounts for bank statements
  - Updated `aiExtractTransactionsFromText()` with strict prompt and amount constraints

**Total Lines Changed:** ~150 lines added/modified










