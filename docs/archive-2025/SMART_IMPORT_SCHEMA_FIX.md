# Smart Import Schema Fix Summary

## Problem
When clicking "Add these to your Transactions" in Smart Import AI, the insert failed with:
- Error: `PGRST204 - Could not find the 'confidence' column of 'transactions' in the schema cache`
- The `confidence` column doesn't exist in all Supabase environments

## Solution
Made the `persistTransactions` function schema-safe with automatic fallback:

1. **Schema-Safe Payload Building**: Only includes `confidence` if transactions have confidence values
2. **Automatic Retry**: If insert fails with PGRST204 and confidence was included, automatically retries without confidence
3. **Better Error Logging**: Logs detailed error information including payload shape and error codes
4. **Graceful Degradation**: Transactions are saved successfully even if confidence column is missing

## Files Modified

### `src/utils/primeFlows.ts`
- Updated `persistTransactions()` function to handle missing `confidence` column gracefully
- Added automatic retry logic when PGRST204 error occurs
- Improved error logging with payload shape and error details
- Added schema documentation in function comments

### `supabase/migrations/add_confidence_column.sql` (NEW)
- SQL migration file to add the `confidence` column if missing
- Run this migration in Supabase SQL editor if you want confidence support

## Final Insert Payload

The insert payload now includes only these fields (confidence is optional):

```typescript
{
  user_id: string,
  document_id: string | null,
  date: string,                    // YYYY-MM-DD format
  posted_at: string,              // ISO timestamp
  amount: number,                  // Absolute value
  type: 'income' | 'expense',
  merchant: string | null,
  description: string,
  category: string,
  confidence?: number,              // OPTIONAL - only included if column exists
  source_type: 'ocr_bank_statement',
  receipt_url: null,
  created_at: string,              // ISO timestamp
  updated_at: string                // ISO timestamp
}
```

## SQL Migration

To add the `confidence` column to your Supabase `transactions` table:

```sql
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS confidence numeric;

COMMENT ON COLUMN public.transactions.confidence IS 'Confidence score (0.0-1.0) for transaction categorization. NULL if not available.';
```

Run this in your Supabase SQL editor if you want confidence scores to be stored.

## Testing

1. **Without confidence column**: Insert should succeed, confidence is omitted from payload
2. **With confidence column**: Insert should succeed, confidence is included in payload
3. **Error handling**: Schema mismatch errors are logged clearly with helpful messages
4. **Transactions page**: Still works correctly, handles missing confidence gracefully (hides confidence bar if null/undefined)

## Notes

- The Transactions page (`DashboardTransactionsPage.tsx`) already handles missing confidence gracefully
- Confidence UI only renders if `transaction.confidence` is truthy
- Default confidence of 0.9 is used in UI mapping, but UI won't render if confidence is null/undefined from DB








