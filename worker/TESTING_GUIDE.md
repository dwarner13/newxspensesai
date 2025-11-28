# Manual Testing Checklist - Bank Statement AI Extraction

## Test Document: BMO Statement Page 1

**Expected Transactions:**
1. Sep 17 - SOBEYS HOLLICK KENYON - 76.09 (debit)
2. Sep 18 - 7-ELEVEN STORE 33535 - 9.37 (debit)
3. Sep 18 - KOSMOS RESTAURANT & LOUNGE - 20.23 (debit)
4. Sep 18 - KFC #1709 - 54.06 (debit)
5. Sep 18 - WEST END BINGO - 23.00 (debit)
6. Sep 19 - GORDON FOOD SER PAY/PAY - 1,613.72 (credit)
7. Sep 19 - NATIONAL MONEY MSP/DIV - 51.67 (debit)
8. Sep 19 - B/M PAYT/PAY MTG/HYP - 355.00 (debit)

**Expected Allowed Amounts:**
`["76.09", "9.37", "20.23", "54.06", "23.00", "1,613.72", "51.67", "355.00"]`

## Step 1: Upload & Monitor Worker Logs

### Expected Log Sequence:

```
[BankStatementParser] Structured parser found 0 transactions; trying regex fallback
[BankStatementParser] Regex fallback extracted 0 candidate transactions
[ParsingProcessor] Both parsers found 0 transactions; trying AI extraction
[ParsingProcessor] Extracted 8 allowed amounts from OCR text {
  allowedAmounts: ["1,613.72", "355.00", "76.09", "54.06", "51.67", "23.00", "20.23", "9.37"],
  amountCount: 8
}
[ParsingProcessor] AI extraction found 8 candidate transactions
```

### ✅ Check:
- [ ] `Extracted X allowed amounts` log appears (should be 8)
- [ ] Allowed amounts list includes all 8 expected values
- [ ] No amounts like `1,709.00` or `100.00` appear in allowed amounts
- [ ] `AI extraction found X candidate transactions` (should be 8)

### ⚠️ Warning Logs to Check:
- [ ] If any `needsAmountReview` warnings appear, note which transactions
- [ ] Sample flagged transactions should NOT include any of the 8 real amounts

## Step 2: Inspect Parsed Transaction JSON

### Check Transaction Structure:

Each transaction should have:
```json
{
  "date": "2025-09-17",
  "merchant": "SOBEYS HOLLICK KENYON",
  "description": "Debit Card Purchase, SOBEYS HOLLICK KENYON",
  "amount": 76.09,
  "direction": "debit",
  "source": "ai_inferred"
}
```

### ✅ Amount Validation:

- [ ] **Transaction 1**: SOBEYS → amount is exactly `76.09` (not `76.10` or `76`)
- [ ] **Transaction 2**: 7-ELEVEN → amount is exactly `9.37`
- [ ] **Transaction 3**: KOSMOS → amount is exactly `20.23`
- [ ] **Transaction 4**: KFC #1709 → amount is exactly `54.06` (NOT `1,709.00` or `1709.00`)
- [ ] **Transaction 5**: WEST END BINGO → amount is exactly `23.00` (NOT `1,709.00`)
- [ ] **Transaction 6**: GORDON FOOD SER → amount is exactly `1613.72` or `1,613.72` (credit)
- [ ] **Transaction 7**: NATIONAL MONEY → amount is exactly `51.67`
- [ ] **Transaction 8**: B/M PAYT → amount is exactly `355.00`

### ✅ Vendor Name Validation:

- [ ] "SOBEYS HOLLICK KENYON" (not "SOBEYS" or "HOLLICK")
- [ ] "7-ELEVEN STORE 33535" (not "7-ELEVEN" or "STORE")
- [ ] "KOSMOS RESTAURANT & LOUNGE" (preserves ampersand)
- [ ] "KFC #1709" (includes #1709, doesn't convert to amount)
- [ ] "WEST END BINGO" (not "WEST BINGO" or "WEST")
- [ ] "GORDON FOOD SER PAY/PAY" (not "CORDON" or "GORDON FOOD")
- [ ] "NATIONAL MONEY MSP/DIV" (preserves MSP/DIV)
- [ ] "B/M PAYT/PAY MTG/HYP" (preserves slashes)

### ✅ Completeness Check:

- [ ] Exactly 8 transactions returned (not 7, not 9)
- [ ] No duplicate transactions
- [ ] All dates are valid (YYYY-MM-DD format)
- [ ] All directions are either "debit" or "credit"

## Step 3: Check needsAmountReview Flags

### Expected Behavior:

- [ ] **No transactions** should have `needsAmountReview: true` if AI followed instructions
- [ ] If any are flagged, they should NOT be one of the 8 real transactions
- [ ] Flagged transactions should be clearly logged with merchant and amount

### Example of BAD Result (should NOT happen):

```json
{
  "merchant": "WEST BINGO",
  "amount": 1709.00,
  "needsAmountReview": true  // ❌ This should NOT happen
}
```

## Step 4: Edge Case Checks

### Negative Amounts / Credits:

- [ ] Credit transaction (GORDON FOOD SER) has `direction: "credit"`
- [ ] Credit amount is positive in `amount` field (1,613.72, not -1,613.72)
- [ ] Credit amount appears in allowed amounts list

### Store Numbers:

- [ ] "KFC #1709" does NOT create amount `1709.00`
- [ ] "7-ELEVEN STORE 33535" does NOT create amount `33535.00`
- [ ] Store numbers appear in merchant/description but not as amounts

### Amount Formatting:

- [ ] Large amounts like `1,613.72` are preserved with comma
- [ ] Small amounts like `9.37` don't get padded to `9.370`
- [ ] Amounts match OCR text exactly (no rounding)

## Step 5: Compare Before/After

### Before Fix (Bad):
- ❌ WEST BINGO → 1,709.00 (invented)
- ❌ CORDON → 510.00 (invented)
- ❌ Missing KFC transaction
- ❌ Random 100.00 fees

### After Fix (Good):
- ✅ WEST END BINGO → 23.00 (correct)
- ✅ GORDON FOOD SER → 1,613.72 (correct)
- ✅ KFC #1709 → 54.06 (present and correct)
- ✅ No invented amounts

## Red Flags to Watch For

🚨 **If you see these, something is wrong:**

1. Any amount NOT in the allowed amounts list (without `needsAmountReview` flag)
2. Amounts like `1,709.00` or `100.00` that don't exist in OCR
3. Missing transactions (should have all 8)
4. Vendor names truncated or mangled
5. Store numbers (#1709, STORE 33535) converted to amounts
6. Amounts rounded (e.g., `76.10` instead of `76.09`)

## Success Criteria

✅ **Test passes if:**
- All 8 transactions extracted
- All amounts match allowed amounts exactly
- No invented amounts
- Vendor names preserved correctly
- No `needsAmountReview` flags (or only on truly invalid amounts)

❌ **Test fails if:**
- Any invented amount appears
- Any real transaction is missing
- Vendor names are mangled
- Store numbers become amounts
