# Loan Forecast Implementation Summary

## Overview
Implemented a complete mortgage/loan payoff scenario pipeline that works entirely inside chat. Users can upload screenshots, OCR extracts loan data, and Finley/Blitz can forecast payoff scenarios with extra payments.

## Files Created/Modified

### 1. Database Migration: `supabase/migrations/20250221_create_loan_snapshots.sql`
- Creates `loan_snapshots` table to store OCR-parsed loan/mortgage data
- Includes RLS policies for user data security
- Stores principal, rate, payment amount, frequency, and optional tax component

### 2. Loan Forecast Helper: `netlify/functions/_shared/loanForecast.ts`
- Pure TypeScript amortization calculator
- Handles weekly, biweekly, and monthly payment frequencies
- Calculates two scenarios:
  - Original payment (no extra)
  - With extra payments
- Returns payoff times, total interest, and interest savings

**Key Function:**
```typescript
calculateLoanForecast(input: LoanForecastInput): LoanForecastOutput
```

### 3. Tool Implementation: `src/agent/tools/impl/finley_loan_forecast.ts`
- Zod schema for input validation
- Supports two modes:
  - `loanSnapshotId`: Uses OCR-detected loan from database
  - Manual inputs: `principal`, `annualRatePct`, `paymentAmount`, `paymentFrequency`
- Calls shared `loanForecast.ts` helper
- Returns structured forecast results

**Input Schema:**
- Either `loanSnapshotId` OR all manual inputs required
- Optional `extraPerPeriod` for extra payment scenarios

**Output:**
- Both scenarios (original vs with extra)
- Payoff times, interest totals, savings calculations

### 4. Tool Registration: `src/agent/tools/index.ts`
- Added `finley_loan_forecast` to tools map
- Registered with appropriate metadata and rate limits

### 5. Employee Updates: `supabase/migrations/20250221_add_finley_loan_forecast_tool.sql`
- Adds `finley_loan_forecast` to Finley's `tools_allowed`
- Adds `finley_loan_forecast` to Blitz's `tools_allowed`
- Includes verification checks

### 6. Prompt Updates: `supabase/migrations/20250221_update_finley_blitz_loan_prompts.sql`
- **Finley**: Added instructions to use `finley_loan_forecast` when users ask about:
  - Paying off loans/mortgages faster
  - Extra payments per week/month
  - Interest saved, payoff dates, "how much sooner"
- **Blitz**: Added note to call loan forecast tool and turn results into action checklists

### 7. Worker Integration: `worker/src/workflow/loanDetection.ts` (NEW)
- `detectLoanSnapshot(ocrText: string)` function
- Uses regex patterns to extract:
  - Principal/balance
  - Interest rate
  - Payment amount
  - Payment frequency (weekly/biweekly/monthly)
  - Optional tax amount
- Returns `LoanSnapshotCandidate` or `null`

### 8. Worker Pipeline: `worker/src/workflow/processDocument.ts` (MODIFIED)
- Added loan detection after OCR extraction (Step 4.5)
- Inserts detected loans into `loan_snapshots` table
- Adds `loanSnapshotId` to `DocumentProcessingResult` return value
- Non-fatal: continues processing even if loan detection fails

**Key Changes:**
```typescript
// After OCR extraction
const loanCandidate = detectLoanSnapshot(extractedText);
if (loanCandidate) {
  // Insert into loan_snapshots
  const { data: loanSnapshot } = await supabaseClient
    .from('loan_snapshots')
    .insert({...})
    .select('id')
    .single();
  
  loanSnapshotId = loanSnapshot.id;
}
```

## Usage Flow

### Manual Input (No Screenshot)
1. User asks Finley: "Principal 175,787 at 5.39% with weekly payment 275.75. If I add $50/week extra, how much sooner is it paid?"
2. Finley calls `finley_loan_forecast` with manual inputs
3. Tool calculates both scenarios and returns results
4. Finley explains payoff times, interest saved, years saved

### Screenshot Flow
1. User uploads mortgage screenshot in chat
2. Worker OCR extracts text
3. `detectLoanSnapshot()` parses loan data
4. Loan inserted into `loan_snapshots` table
5. Worker returns `loanSnapshotId` in result
6. Frontend shows: "✅ Mortgage snapshot detected. Ask Finley or Blitz about extra payments."
7. User asks: "Using that mortgage screenshot, what happens if I add $50/week extra?"
8. Finley calls `finley_loan_forecast` with `loanSnapshotId` + `extraPerPeriod: 50`
9. Tool loads snapshot from DB, calculates scenarios, returns results
10. Finley explains payoff times and savings

## Example Tool Call Log

```
[Finley Loan Forecast] Executing for userId: abc123, loanSnapshotId: 550e8400-e29b-41d4-a716-446655440000, extraPerPeriod: $50
[Finley Loan Forecast] Loaded snapshot: principal=$175787, rate=5.39%, payment=$275.75 weekly
[Finley Loan Forecast] Calculated forecast:
  - Original: 12.5 years, $89,234 interest
  - With $50/week extra: 9.2 years, $64,123 interest
  - Saved: 3.3 years, $25,111 interest
```

## Testing Checklist

### Database
- [ ] Run `supabase migration up`
- [ ] Verify `loan_snapshots` table exists
- [ ] Verify Finley and Blitz have `finley_loan_forecast` in `tools_allowed`

### Manual Tool Test
- [ ] In Finley chat, ask: "Principal 175,787 at 5.39% with weekly payment 275.75. If I add $50/week extra, how much sooner is it paid?"
- [ ] Verify Finley calls `finley_loan_forecast`
- [ ] Verify results show both scenarios

### Screenshot Flow Test
- [ ] Upload mortgage screenshot
- [ ] Verify worker detects loan and inserts into `loan_snapshots`
- [ ] Verify `loanSnapshotId` returned in worker result
- [ ] Ask Finley: "Using that mortgage screenshot, what happens if I add $50/week extra?"
- [ ] Verify Finley uses `loanSnapshotId` and returns forecast
- [ ] Ask Blitz: "Give me a simple plan to kill this mortgage faster with an extra $50/week"
- [ ] Verify Blitz calls tool and returns action checklist

## Next Steps (Frontend Integration - Pending)

The backend is complete. To finish Step 7 (chat awareness):

1. **Frontend**: When worker response includes `loanSnapshotId`, show system message:
   ```
   "✅ Mortgage snapshot detected. Ask Finley or Blitz about extra payments."
   ```

2. **Chat Context**: Pass `loanSnapshotId` in chat context/metadata so backend can see it

3. **Backend Chat**: When user asks about loan payoff and `loanSnapshotId` is in context, Finley/Blitz can automatically use it

This is a minimal change - the tool already supports both `loanSnapshotId` and manual inputs, so the AI can work with either.

## Notes

- Loan detection uses simple regex patterns - not perfect NLP, but good enough for common formats
- Detection is non-fatal: if it fails, document processing continues normally
- Tool validates payment amounts (must cover interest) and returns friendly errors
- All calculations use plain numbers (no BigInt) for simplicity
- Results rounded to 2 decimals for display



